import { NextRequest, NextResponse } from "next/server";

interface OTPResponseData {
  success: boolean;
  message: string;
  timestamp: number;
  received: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mcid = searchParams.get("mcid");
    const uuid = searchParams.get("uuid");

    if (!mcid || !uuid) {
      return NextResponse.json(
        { error: "mcidとuuidは必須です" },
        { status: 400 }
      );
    }

    // グローバルキャッシュからOTPレスポンスを取得
    const otpResponses = global.otpResponses as Map<string, OTPResponseData> | undefined;
    const responseKey = `${mcid}_${uuid}`;
    
    if (!otpResponses || !otpResponses.has(responseKey)) {
      return NextResponse.json(
        { received: false, message: "レスポンス待機中..." },
        { status: 200 }
      );
    }

    const responseData = otpResponses.get(responseKey)!;
    
    // レスポンス取得後は削除（一回限り）
    otpResponses.delete(responseKey);

    return NextResponse.json({
      received: true,
      success: responseData.success,
      message: responseData.message,
      timestamp: responseData.timestamp,
    });

  } catch (error) {
    console.error("Error in OTP response API:", error);
    return NextResponse.json(
      { error: "OTPレスポンス取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}