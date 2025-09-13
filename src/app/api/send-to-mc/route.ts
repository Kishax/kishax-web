import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis-client";

interface SendToMcRequest {
  messageType: string;
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック - APIキー認証、内部認証、またはセッション認証
    const apiKey = request.headers.get("X-API-Key");
    const expectedApiKey = process.env.WEB_API_KEY;
    const internalToken = request.headers.get("X-Internal-Token");
    const expectedInternalToken = process.env.INTERNAL_API_KEY || "local-dev-api-key";
    let isAuthenticated = false;

    // APIキー認証を試行
    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      isAuthenticated = true;
      console.log("API key auth successful");
    } else if (apiKey && expectedApiKey && apiKey !== expectedApiKey) {
      // APIキーが提供されたが間違っている場合
      console.error("Invalid API key provided");
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    } else if (internalToken && internalToken === expectedInternalToken) {
      // 内部認証トークンによる認証
      isAuthenticated = true;
      console.log("Internal token auth successful");
    } else {
      // APIキーが提供されていない場合、セッション認証を試行
      try {
        const { auth } = await import("@/lib/auth");
        const session = await auth();
        console.log("Session auth check:", { hasSession: !!session, hasUser: !!session?.user });
        if (session?.user) {
          isAuthenticated = true;
          console.log("Session auth successful for user:", session.user.id);
        } else {
          console.log("No valid session found");
        }
      } catch (error) {
        console.error("Session auth error:", error);
      }
    }

    if (!isAuthenticated) {
      console.error("Authentication failed - no valid API key, internal token, or session");
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 },
      );
    }

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
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key, X-Internal-Token",
    },
  });
}
