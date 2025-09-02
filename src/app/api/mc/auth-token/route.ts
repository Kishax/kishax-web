import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// MC側からのSQSメッセージの形式
const AuthTokenMessageSchema = z.object({
  mcid: z.string(),
  uuid: z.string(),
  authToken: z.string(),
  expiresAt: z.string().datetime(),
  action: z.string(),
});

/**
 * @swagger
 * /api/mc/auth-token:
 *   post:
 *     summary: Receive auth token from Minecraft server
 *     description: SQS endpoint to receive authentication tokens from MC server via Velocity
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
 *                 description: 32-character authentication token
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Token expiration timestamp
 *               action:
 *                 type: string
 *                 description: Action type (e.g. 'confirm')
 *             required:
 *               - mcid
 *               - uuid
 *               - authToken
 *               - expiresAt
 *               - action
 *     responses:
 *       200:
 *         description: Auth token processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 playerId:
 *                   type: string
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 *     tags:
 *       - Minecraft SQS
 */
export async function POST(req: NextRequest) {
  try {
    console.log("Received auth token message from MC server");

    const body = await req.json();

    // メッセージの検証
    const validation = AuthTokenMessageSchema.safeParse(body);
    if (!validation.success) {
      console.error("Invalid auth token message format:", validation.error);
      return NextResponse.json(
        {
          success: false,
          message: "Invalid message format",
          error: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { mcid, uuid, authToken, expiresAt, action } = validation.data;

    console.log(
      `Processing auth token for player: ${mcid} (${uuid}), action: ${action}`,
    );

    // MinecraftPlayerの作成または更新
    const player = await prisma.minecraftPlayer.upsert({
      where: { mcid },
      update: {
        uuid,
        authToken,
        tokenExpires: new Date(expiresAt),
        updatedAt: new Date(),
      },
      create: {
        mcid,
        uuid,
        authToken,
        tokenExpires: new Date(expiresAt),
        confirmed: false,
      },
    });

    console.log(
      `Auth token updated for player ${mcid}, expires at: ${expiresAt}`,
    );

    return NextResponse.json({
      success: true,
      message: "Auth token processed successfully",
      playerId: player.id,
    });
  } catch (error) {
    console.error("Error processing auth token:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
