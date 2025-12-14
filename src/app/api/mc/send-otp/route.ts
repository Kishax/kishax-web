import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// OTP送信回数制限の設定
const OTP_RATE_LIMIT = {
  MAX_ATTEMPTS: 5, // 最大送信回数
  TIME_WINDOW: 15 * 60 * 1000, // 15分間のウィンドウ
  COOLDOWN: 30 * 1000, // 30秒のクールダウン
};

// OTP送信リクエストの形式
const SendOtpRequestSchema = z.object({
  authToken: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // リクエストの検証
    const validation = SendOtpRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request format",
        },
        { status: 400 },
      );
    }

    const { authToken } = validation.data;

    // プレイヤー情報を取得
    const player = await prisma.minecraftPlayer.findFirst({
      where: { authToken },
    });

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid auth token",
        },
        { status: 400 },
      );
    }

    // トークンの有効期限チェック
    if (!player.tokenExpires || new Date() > new Date(player.tokenExpires)) {
      return NextResponse.json(
        {
          success: false,
          message: "Auth token has expired",
        },
        { status: 400 },
      );
    }

    // 既に認証済みの場合
    if (player.confirmed) {
      return NextResponse.json(
        {
          success: false,
          message: "Player already authenticated",
        },
        { status: 400 },
      );
    }

    // OTP送信回数制限チェック
    const currentTime = new Date();
    const timeWindowStart = new Date(
      currentTime.getTime() - OTP_RATE_LIMIT.TIME_WINDOW,
    );

    // 最近のOTP送信履歴を確認（プレイヤーのupdatedAtでOTP送信を判断）
    const recentOtpCount = await prisma.minecraftPlayer.count({
      where: {
        id: player.id,
        updatedAt: {
          gte: timeWindowStart,
        },
        otp: {
          not: null, // OTPが設定されている = 送信履歴
        },
      },
    });

    if (recentOtpCount >= OTP_RATE_LIMIT.MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          success: false,
          message: `OTP送信回数が上限（${OTP_RATE_LIMIT.MAX_ATTEMPTS}回/15分）に達しました。しばらく待ってからお試しください。`,
        },
        { status: 429 },
      );
    }

    // 連続送信のクールダウンチェック（OTPが存在する場合のみ）
    const lastOtpTime = player.otp ? player.updatedAt : null;
    if (
      lastOtpTime &&
      currentTime.getTime() - lastOtpTime.getTime() < OTP_RATE_LIMIT.COOLDOWN
    ) {
      const remainingCooldown = Math.ceil(
        (OTP_RATE_LIMIT.COOLDOWN -
          (currentTime.getTime() - lastOtpTime.getTime())) /
          1000,
      );
      return NextResponse.json(
        {
          success: false,
          message: `OTP送信のクールダウン中です。${remainingCooldown}秒後に再試行してください。`,
        },
        { status: 429 },
      );
    }

    // 6桁のOTPを生成
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10分間有効

    // OTPをデータベースに保存
    await prisma.minecraftPlayer.update({
      where: { id: player.id },
      data: {
        otp,
        otpExpires,
        updatedAt: new Date(),
      },
    });

    console.log(`Generated OTP ${otp} for player ${player.mcid}`);

    // MC側にOTPを送信（Redis/SQS経由）
    try {
      const { mcApi } = await import("@/lib/mc-message-client");
      await mcApi.sendOtp(player.mcid, player.uuid, otp);
      console.log("OTP sent to MC via Redis/SQS");
    } catch (error) {
      console.error("Failed to send OTP to MC:", error);
      // Don't fail the request if notification fails, OTP is already stored
    }

    // MCからのレスポンスをRedis Pub/Subでリアルタイム待機（最大30秒）
    let mcResponse = { success: false, message: "レスポンス待機中..." };

    try {
      const { waitForOtpResponse } = await import("@/lib/redis");
      const response = await waitForOtpResponse(
        player.mcid,
        player.uuid,
        30000,
      );

      if (response) {
        mcResponse = {
          success: response.success,
          message: response.message,
        };
      } else {
        mcResponse = {
          success: false,
          message:
            "マインクラフトサーバーからの応答がタイムアウトしました。プレイヤーがオンラインか確認してください。",
        };
      }
    } catch (pubsubError) {
      console.error("Error waiting for OTP response via Pub/Sub:", pubsubError);
      mcResponse = {
        success: false,
        message: "応答待機中にエラーが発生しました。",
      };
    }

    return NextResponse.json({
      success: true,
      message: "OTP generated and sent to Minecraft server",
      mcResponse: mcResponse,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
