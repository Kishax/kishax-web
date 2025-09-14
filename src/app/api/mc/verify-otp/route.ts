import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// OTP検証スキーマ
const VerifyOtpSchema = z.object({
  mcid: z.string().min(1, "MCIDが必要です"),
  uuid: z.string().min(1, "UUIDが必要です"),
  otp: z.string().length(6, "OTPは6桁である必要があります"),
  scenario: z
    .enum(["mc_to_account", "account_to_mc"])
    .optional()
    .default("mc_to_account"),
});

/**
 * @swagger
 * /api/mc/verify-otp:
 *   post:
 *     summary: Verify OTP for MC-Kishax account linking
 *     description: Verifies OTP for both scenarios - MC auth to account creation, and account creation to MC linking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mcid:
 *                 type: string
 *                 description: Minecraft player ID
 *               uuid:
 *                 type: string
 *                 description: Minecraft player UUID
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP code
 *               scenario:
 *                 type: string
 *                 enum: ["mc_to_account", "account_to_mc"]
 *                 description: Verification scenario
 *             required:
 *               - mcid
 *               - uuid
 *               - otp
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 result:
 *                   type: object
 *       400:
 *         description: Invalid OTP or request data
 *       500:
 *         description: Internal server error
 *     tags:
 *       - Minecraft OTP Verification
 */
export async function POST(req: NextRequest) {
  try {
    console.log("MC OTP Verification: Starting request processing");

    const body = await req.json();

    // バリデーション
    const validation = VerifyOtpSchema.safeParse(body);
    if (!validation.success) {
      console.error("Validation failed:", validation.error);
      return NextResponse.json(
        {
          success: false,
          message: "入力データが無効です",
          errors: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { mcid, uuid, otp, scenario } = validation.data;

    console.log(
      `Processing OTP verification for MC player: ${mcid} (${uuid}), scenario: ${scenario}`,
    );

    if (scenario === "mc_to_account") {
      return await handleMcToAccountVerification(mcid, uuid, otp);
    } else {
      return await handleAccountToMcVerification(mcid, uuid, otp);
    }
  } catch (error) {
    console.error("MC OTP Verification error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "OTP検証中にエラーが発生しました。",
      },
      { status: 500 },
    );
  }
}

/**
 * MC認証後のアカウント作成におけるOTP検証
 */
async function handleMcToAccountVerification(
  mcid: string,
  uuid: string,
  otp: string,
) {
  // 1. MinecraftPlayerから対応するユーザーを探す
  const mcPlayer = await prisma.minecraftPlayer.findFirst({
    where: {
      mcid,
      uuid,
      confirmed: true,
    },
    include: {
      user: true,
    },
  });

  if (!mcPlayer) {
    return NextResponse.json(
      {
        success: false,
        message: "対応するMinecraftプレイヤーが見つかりません。",
      },
      { status: 400 },
    );
  }

  if (!mcPlayer.user) {
    return NextResponse.json(
      {
        success: false,
        message: "Kishaxアカウントとの連携が見つかりません。",
      },
      { status: 400 },
    );
  }

  // 2. UserのOTPを確認
  if (!mcPlayer.user.otp || mcPlayer.user.otp !== otp) {
    return NextResponse.json(
      {
        success: false,
        message: "無効なOTPです。",
      },
      { status: 400 },
    );
  }

  // 3. OTPの有効期限確認
  if (
    !mcPlayer.user.otpExpires ||
    new Date() > new Date(mcPlayer.user.otpExpires)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "OTPが期限切れです。",
      },
      { status: 400 },
    );
  }

  // 4. OTPを削除し、メール認証を完了
  const updatedUser = await prisma.user.update({
    where: { id: mcPlayer.user.id },
    data: {
      otp: null,
      otpExpires: null,
      emailVerified: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(
    `OTP verified and account activated for user: ${updatedUser.id} -> MC: ${mcid}`,
  );

  // 5. MC側に認証完了を通知
  try {
    const { mcApi } = await import("@/lib/mc-message-client");
    await mcApi.sendAuthConfirm(mcid, uuid);
    console.log(`Auth confirmation sent to MC server for player: ${mcid}`);
  } catch (mcApiError) {
    console.error("Failed to send auth confirmation to MC server:", mcApiError);
    // MC通知失敗でも、認証自体は成功とする
  }

  return NextResponse.json({
    success: true,
    message: "OTP検証が完了し、アカウントが有効化されました。",
    result: {
      userId: updatedUser.id,
      username: updatedUser.username,
      emailVerified: true,
      mcLinked: true,
    },
  });
}

/**
 * アカウント作成後のMC連携におけるOTP検証
 */
async function handleAccountToMcVerification(
  mcid: string,
  uuid: string,
  otp: string,
) {
  // この機能は後の実装で対応
  // 現時点では、MC認証後→アカウント作成の流れに焦点
  return NextResponse.json(
    {
      success: false,
      message: "アカウント作成後のMC連携機能は現在開発中です。",
    },
    { status: 501 },
  );
}
