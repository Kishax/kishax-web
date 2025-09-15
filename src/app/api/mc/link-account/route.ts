import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, createErrorResponse } from "@/lib/api-middleware";

/**
 * @swagger
 * /api/mc/link-account:
 *   post:
 *     summary: Link Kishax account with authenticated Minecraft player
 *     description: Connect a Kishax user account with an already MC-authenticated player
 *     security:
 *       - sessionAuth: []
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
 *             required:
 *               - mcid
 *               - uuid
 *     responses:
 *       200:
 *         description: Account linking successful
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
 *                     kishaxUserId:
 *                       type: string
 *                     mcid:
 *                       type: string
 *                     uuid:
 *                       type: string
 *       400:
 *         description: Invalid request or linking failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *     tags:
 *       - Minecraft
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication required
    const { session } = await requireAuth();

    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", "ログインが必要です", 401);
    }

    // Parse request body
    const body = await req.json();
    const { mcid, uuid } = body;

    if (!mcid || !uuid) {
      return createErrorResponse(
        "Invalid request",
        "MCIDとUUIDが必要です",
        400,
      );
    }

    // Find the MC-authenticated player
    const mcPlayer = await prisma.minecraftPlayer.findFirst({
      where: {
        mcid: mcid,
        uuid: uuid,
        confirmed: true, // Must be MC-authenticated
      },
    });

    if (!mcPlayer) {
      return createErrorResponse(
        "Player not found",
        "指定されたプレイヤーが見つからないか、MC認証が完了していません",
        400,
      );
    }

    // Check if already linked
    if (mcPlayer.kishaxUserId) {
      // Check if linked to current user
      if (mcPlayer.kishaxUserId === session.user.id) {
        return NextResponse.json({
          success: true,
          message: "既に連携済みです",
          user: {
            kishaxUserId: session.user.id,
            mcid: mcPlayer.mcid,
            uuid: mcPlayer.uuid,
          },
        });
      } else {
        // Linked to different user
        return createErrorResponse(
          "Already linked",
          "このプレイヤーは既に他のKishaxアカウントと連携されています",
          400,
        );
      }
    }

    // Check if current user already has a linked MC account
    const existingLink = await prisma.minecraftPlayer.findFirst({
      where: {
        kishaxUserId: session.user.id,
        confirmed: true,
      },
    });

    if (existingLink) {
      return createErrorResponse(
        "User already linked",
        "このKishaxアカウントは既に別のMinecraftプレイヤーと連携されています",
        400,
      );
    }

    // Link the accounts
    const updatedPlayer = await prisma.minecraftPlayer.update({
      where: { id: mcPlayer.id },
      data: {
        kishaxUserId: session.user.id,
        updatedAt: new Date(),
      },
    });

    // Send notification to Minecraft server for permission update
    try {
      const { mcApi } = await import("@/lib/mc-message-client");

      try {
        await mcApi.sendAccountLink(mcid, uuid, session.user.id);
        console.log("Account link notification sent via Redis/SQS");
      } catch (mcApiError) {
        console.warn(
          "Failed to send Redis/SQS message for account link:",
          mcApiError,
        );

        // Fallback to socket method if available
        const { sendSocketMessage } = await import("@/lib/socket-client");
        const message = {
          web: {
            accountLink: {
              who: {
                name: mcid,
                uuid: uuid,
              },
              kishaxUserId: session.user.id,
            },
          },
        };
        await sendSocketMessage(JSON.stringify(message) + "\r\n");
        console.log("Account link notification sent via socket");
      }
    } catch (error) {
      console.warn("Failed to send account link notification:", error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: "Kishaxアカウントとの連携が完了しました",
      user: {
        kishaxUserId: session.user.id,
        mcid: updatedPlayer.mcid,
        uuid: updatedPlayer.uuid,
      },
    });
  } catch (error) {
    console.error("MC Account Link API error:", error);
    return createErrorResponse(
      "Internal Server Error",
      "アカウント連携中にエラーが発生しました",
      500,
    );
  }
}
