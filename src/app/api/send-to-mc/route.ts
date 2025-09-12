import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis-client";

interface SendToMcRequest {
  messageType: string;
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendToMcRequest = await request.json();

    if (!body.messageType) {
      return NextResponse.json(
        { success: false, error: "messageType is required" },
        { status: 400 },
      );
    }

    if (!body.data) {
      return NextResponse.json(
        { success: false, error: "data is required" },
        { status: 400 },
      );
    }

    const redisClient = getRedisClient();
    const result = await redisClient.publishToMc(body.messageType, body.data);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageType: result.messageType,
        message: "Message sent successfully to MC via Redis",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to send message",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in send-to-mc API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
