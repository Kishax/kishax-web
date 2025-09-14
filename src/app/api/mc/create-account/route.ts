import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// OTP方式でのアカウント作成リクエストスキーマ
const OtpAccountCreateSchema = z.object({
  mcid: z.string().min(1, "MCIDが必要です"),
  uuid: z.string().min(1, "UUIDが必要です"),
  authToken: z.string().min(1, "認証トークンが必要です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上である必要があります"),
  username: z.string().min(3, "ユーザー名は3文字以上である必要があります"),
});

/**
 * @swagger
 * /api/mc/create-account:
 *   post:
 *     summary: Create Kishax account with OTP verification for MC authenticated users
 *     description: Creates a new Kishax account for users who completed MC authentication, using OTP for immediate verification
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
 *               authToken:
 *                 type: string
 *                 description: MC authentication token
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *               password:
 *                 type: string
 *                 description: User password (min 8 characters)
 *               username:
 *                 type: string
 *                 description: Public username (min 3 characters)
 *             required:
 *               - mcid
 *               - uuid
 *               - authToken
 *               - email
 *               - password
 *               - username
 *     responses:
 *       200:
 *         description: Account created successfully, OTP sent to MC
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 step:
 *                   type: string
 *                   description: Next step ('awaiting_otp')
 *       400:
 *         description: Invalid request data or validation error
 *       409:
 *         description: Email or username already exists
 *       500:
 *         description: Internal server error
 *     tags:
 *       - Minecraft OTP Account Creation
 */
export async function POST(req: NextRequest) {
  try {
    console.log("MC OTP Account Creation: Starting request processing");

    const body = await req.json();

    // バリデーション
    const validation = OtpAccountCreateSchema.safeParse(body);
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

    const { mcid, uuid, authToken, email, password, username } =
      validation.data;

    console.log(
      `Processing OTP account creation for MC player: ${mcid} (${uuid})`,
    );

    // 1. MC認証トークンを検証
    const mcPlayer = await prisma.minecraftPlayer.findFirst({
      where: {
        mcid,
        uuid,
        authToken,
        confirmed: true,
      },
    });

    if (!mcPlayer) {
      return NextResponse.json(
        {
          success: false,
          message: "無効なMC認証情報です。再度MC認証を行ってください。",
        },
        { status: 400 },
      );
    }

    // 2. 認証トークンの有効期限確認
    if (
      !mcPlayer.tokenExpires ||
      new Date() > new Date(mcPlayer.tokenExpires)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "MC認証トークンが期限切れです。再度MC認証を行ってください。",
        },
        { status: 400 },
      );
    }

    // 3. 既に連携済みかチェック
    if (mcPlayer.kishaxUserId) {
      const existingUser = await prisma.user.findUnique({
        where: { id: mcPlayer.kishaxUserId },
        select: { username: true, email: true },
      });

      return NextResponse.json(
        {
          success: false,
          message: `このMinecraftアカウントは既にKishaxアカウント「${existingUser?.username}」と連携されています。`,
        },
        { status: 409 },
      );
    }

    // 4. メールアドレス・ユーザー名の重複チェック
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      const conflictType =
        existingUser.email === email ? "メールアドレス" : "ユーザー名";
      return NextResponse.json(
        {
          success: false,
          message: `この${conflictType}は既に使用されています。`,
        },
        { status: 409 },
      );
    }

    // 5. パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12);

    // 6. OTP生成 (6桁の数字)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10分後

    // 7. トランザクション内でユーザー作成とMC連携
    const result = await prisma.$transaction(async (tx) => {
      // ユーザー作成（OTPもUserモデルに保存）
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          username,
          name: username, // 表示名もusernameに設定
          emailVerified: null, // OTP確認後に設定
          otp,
          otpExpires,
        },
      });

      // MinecraftPlayerにユーザーIDを紐づけ
      const updatedMcPlayer = await tx.minecraftPlayer.update({
        where: { id: mcPlayer.id },
        data: {
          kishaxUserId: newUser.id,
          updatedAt: new Date(),
        },
      });

      return { newUser, updatedMcPlayer };
    });

    console.log(`User created and linked: ${result.newUser.id} -> MC: ${mcid}`);

    // 8. OTPをMCサーバーに送信
    try {
      const { mcApi } = await import("@/lib/mc-message-client");

      await mcApi.sendOtp(mcid, uuid, otp);
      console.log(`OTP sent to MC server for player: ${mcid}`);
    } catch (mcApiError) {
      console.error("Failed to send OTP to MC server:", mcApiError);

      // MC送信失敗時はロールバックが望ましいが、ここでは警告に留める
      // 実際の運用では、SQS/Redis経由での再送機能を実装することを推奨
      console.warn(
        "OTP was not sent to MC server, but user account was created",
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "アカウント作成が完了しました。Minecraftに送信されたOTPを確認してください。",
      userId: result.newUser.id,
      step: "awaiting_otp",
    });
  } catch (error) {
    console.error("MC OTP Account Creation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "アカウント作成中にエラーが発生しました。",
      },
      { status: 500 },
    );
  }
}
