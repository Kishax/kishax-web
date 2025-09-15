import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Get current session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { mcAuthToken } = await req.json();

    if (!mcAuthToken) {
      return NextResponse.json(
        { error: "MC auth token is required" },
        { status: 400 },
      );
    }

    // Verify and decode JWT token
    let mcAuthData: { mcid: string; uuid: string; authToken: string };
    try {
      const decoded = jwt.verify(
        mcAuthToken,
        process.env.NEXTAUTH_SECRET!,
      ) as any;
      mcAuthData = decoded;
    } catch (jwtError) {
      console.warn("Invalid MC auth token:", jwtError);
      return NextResponse.json(
        { error: "Invalid or expired MC auth token" },
        { status: 400 },
      );
    }

    // Find the MC player with matching auth token
    const mcPlayer = await prisma.minecraftPlayer.findFirst({
      where: {
        mcid: mcAuthData.mcid,
        uuid: mcAuthData.uuid,
        authToken: mcAuthData.authToken,
        confirmed: true,
      },
    });

    if (!mcPlayer) {
      return NextResponse.json(
        { error: "MC player not found or not confirmed" },
        { status: 404 },
      );
    }

    if (mcPlayer.kishaxUserId) {
      return NextResponse.json(
        { error: "MC account already linked to another user" },
        { status: 400 },
      );
    }

    // Check if token is still valid
    if (
      !mcPlayer.tokenExpires ||
      new Date() > new Date(mcPlayer.tokenExpires)
    ) {
      return NextResponse.json(
        { error: "MC auth token expired" },
        { status: 400 },
      );
    }

    // Link the accounts
    await prisma.minecraftPlayer.update({
      where: { id: mcPlayer.id },
      data: {
        kishaxUserId: session.user.id,
        updatedAt: new Date(),
      },
    });

    // Send notification to MC server for permission update
    try {
      const { mcApi } = await import("@/lib/mc-message-client");
      await mcApi.sendAccountLink(
        mcAuthData.mcid,
        mcAuthData.uuid,
        session.user.id,
      );
    } catch (mcApiError) {
      console.warn(
        "Failed to send account link notification to MC:",
        mcApiError,
      );
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      linked: true,
      message: "MC account linked successfully",
      mcid: mcPlayer.mcid,
    });
  } catch (error) {
    console.error("OAuth MC link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
