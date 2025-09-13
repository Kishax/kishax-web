import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { McAuthRequestSchema, McAuthResponseSchema } from "@/lib/schemas";
import { validateRequest, createErrorResponse } from "@/lib/api-middleware";
import jwt from "jsonwebtoken";
import { sendSocketMessage } from "@/lib/socket-client";

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/mc/auth:
 *   post:
 *     summary: Authenticate Minecraft player
 *     description: Complete Minecraft player authentication with one-time password
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: JWT token containing player info
 *               mcid:
 *                 type: string
 *                 description: Minecraft player ID
 *               uuid:
 *                 type: string
 *                 description: Minecraft player UUID
 *               pass:
 *                 type: string
 *                 pattern: '^\\d{6}$'
 *                 description: 6-digit one-time password
 *             required:
 *               - token
 *               - mcid
 *               - uuid
 *               - pass
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     mcid:
 *                       type: string
 *                     uuid:
 *                       type: string
 *       400:
 *         description: Invalid request or authentication failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *     tags:
 *       - Minecraft
 */
export async function POST(req: NextRequest) {
  try {
    // Get optional authentication (no requirement to be logged in)
    const { auth } = await import("@/lib/auth");
    const session = (await auth()) as {
      user: { id: string; name?: string; email?: string };
    } | null;

    // Validate request
    const validation = await validateRequest(McAuthRequestSchema)(req);
    if (validation.error) {
      return validation.error;
    }

    const { token, mcid, uuid, pass } = validation.data;

    // Verify JWT token
    let payload: jwt.JwtPayload;
    try {
      const verifiedPayload = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
      payload = verifiedPayload as jwt.JwtPayload;
    } catch {
      return createErrorResponse(
        "Invalid token",
        "Token verification failed",
        400,
      );
    }

    // Verify token payload matches request
    const tokenData = payload as { mcid: string; uuid: string };
    if (tokenData.mcid !== mcid || tokenData.uuid !== uuid) {
      return createErrorResponse("Invalid access", "Token data mismatch", 400);
    }

    // Get MinecraftPlayer from database
    const player = await prisma.minecraftPlayer.findFirst({
      where: {
        mcid: mcid,
        uuid: uuid,
      },
    });

    if (!player) {
      return createErrorResponse("Invalid access", "Player not found", 400);
    }

    // Check if already confirmed
    if (player.confirmed) {
      const response = McAuthResponseSchema.parse({
        success: false,
        message: "認証済みユーザーです。",
      });
      return NextResponse.json(response);
    }

    // Verify one-time password
    if (!player.otp || player.otp !== pass) {
      // Reset OTP on failed attempt
      await prisma.minecraftPlayer.update({
        where: { id: player.id },
        data: { otp: null, otpExpires: null },
      });

      const response = McAuthResponseSchema.parse({
        success: false,
        message:
          "ワンタイムパスワードが正しくありません。再度OTPを送信してください。",
      });
      return NextResponse.json(response);
    }

    // Check OTP expiration
    if (!player.otpExpires || new Date() > new Date(player.otpExpires)) {
      await prisma.minecraftPlayer.update({
        where: { id: player.id },
        data: { otp: null, otpExpires: null },
      });

      const response = McAuthResponseSchema.parse({
        success: false,
        message:
          "ワンタイムパスワードの有効期限が切れました。再度OTPを送信してください。",
      });
      return NextResponse.json(response);
    }

    // Complete authentication and link with Kishax account if logged in
    const updateData: {
      confirmed: boolean;
      otp: string | null;
      otpExpires: Date | null;
      updatedAt: Date;
      kishaxUserId?: string;
    } = {
      confirmed: true,
      otp: null,
      otpExpires: null,
      updatedAt: new Date(),
    };

    // Link with Kishax account if user is logged in
    if (session?.user?.id) {
      updateData.kishaxUserId = session.user.id;
    }

    await prisma.minecraftPlayer.update({
      where: { id: player.id },
      data: updateData,
    });

    // Send notification to Minecraft server
    try {
      // Try new Redis/SQS method first, fallback to socket
      const { mcApi } = await import("@/lib/mc-message-client");

      try {
        await mcApi.sendAuthConfirm(mcid, uuid);
        console.log("Auth confirmation sent via Redis/SQS");
      } catch (mcApiError) {
        console.warn(
          "Failed to send Redis/SQS message, falling back to socket:",
          mcApiError,
        );

        // Fallback to existing socket method
        const message = {
          web: {
            confirm: {
              who: {
                name: mcid,
                uuid: uuid,
              },
            },
          },
        };
        await sendSocketMessage(JSON.stringify(message) + "\r\n");
        console.log("Auth confirmation sent via socket");
      }
    } catch (error) {
      console.warn("Failed to send auth confirmation:", error);
      // Don't fail the request if notification fails
    }

    const response = McAuthResponseSchema.parse({
      success: true,
      message: session?.user?.id
        ? "WEB認証に成功しました。Kishaxアカウントと連携されました。"
        : "WEB認証に成功しました。",
      user: {
        id: session?.user?.id || "guest",
        mcid: player.mcid,
        uuid: player.uuid,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("MC Auth API error:", error);
    return createErrorResponse(
      "Internal Server Error",
      "Failed to authenticate",
      500,
    );
  }
}
