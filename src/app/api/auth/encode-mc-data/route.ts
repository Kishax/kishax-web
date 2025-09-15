import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const { mcid, uuid, authToken } = await req.json();

    if (!mcid || !uuid || !authToken) {
      return NextResponse.json(
        { error: "MC auth data is required" },
        { status: 400 },
      );
    }

    // Create JWT with MC auth data and 10 minute expiration
    const token = jwt.sign(
      {
        mcid,
        uuid,
        authToken,
        timestamp: Date.now(),
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "10m" },
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Failed to encode MC data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
