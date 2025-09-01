import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

// OTP送信回数制限の設定
const OTP_RATE_LIMIT = {
  MAX_ATTEMPTS: 5, // 最大送信回数
  TIME_WINDOW: 15 * 60 * 1000, // 15分間のウィンドウ
  COOLDOWN: 30 * 1000 // 30秒のクールダウン
}

// OTP送信リクエストの形式
const SendOtpRequestSchema = z.object({
  authToken: z.string()
})



/**
 * @swagger
 * /api/mc/send-otp:
 *   post:
 *     summary: Send OTP to Minecraft server
 *     description: Generate OTP and send to MC server for display to player
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               authToken:
 *                 type: string
 *                 description: Authentication token from MC side
 *             required:
 *               - authToken
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request or expired token
 *       500:
 *         description: Internal server error
 *     tags:
 *       - Minecraft OTP
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // リクエストの検証
    const validation = SendOtpRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid request format" 
        },
        { status: 400 }
      )
    }

    const { authToken } = validation.data

    // プレイヤー情報を取得
    const player = await prisma.minecraftPlayer.findFirst({
      where: { authToken }
    })

    if (!player) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid auth token" 
        },
        { status: 400 }
      )
    }

    // トークンの有効期限チェック
    if (!player.tokenExpires || new Date() > new Date(player.tokenExpires)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Auth token has expired" 
        },
        { status: 400 }
      )
    }

    // 既に認証済みの場合
    if (player.confirmed) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Player already authenticated" 
        },
        { status: 400 }
      )
    }

    // OTP送信回数制限チェック
    const currentTime = new Date()
    const timeWindowStart = new Date(currentTime.getTime() - OTP_RATE_LIMIT.TIME_WINDOW)
    
    // 最近のOTP送信履歴を確認（プレイヤーのupdatedAtでOTP送信を判断）
    const recentOtpCount = await prisma.minecraftPlayer.count({
      where: {
        id: player.id,
        updatedAt: {
          gte: timeWindowStart
        },
        otp: {
          not: null // OTPが設定されている = 送信履歴
        }
      }
    })
    
    if (recentOtpCount >= OTP_RATE_LIMIT.MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          success: false,
          message: `OTP送信回数が上限（${OTP_RATE_LIMIT.MAX_ATTEMPTS}回/15分）に達しました。しばらく待ってからお試しください。`
        },
        { status: 429 }
      )
    }
    
    // 連続送信のクールダウンチェック
    const lastOtpTime = player.updatedAt
    if (lastOtpTime && (currentTime.getTime() - lastOtpTime.getTime()) < OTP_RATE_LIMIT.COOLDOWN) {
      const remainingCooldown = Math.ceil((OTP_RATE_LIMIT.COOLDOWN - (currentTime.getTime() - lastOtpTime.getTime())) / 1000)
      return NextResponse.json(
        {
          success: false,
          message: `OTP送信のクールダウン中です。${remainingCooldown}秒後に再試行してください。`
        },
        { status: 429 }
      )
    }

    // 6桁のOTPを生成
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10分間有効

    // OTPをデータベースに保存
    await prisma.minecraftPlayer.update({
      where: { id: player.id },
      data: {
        otp,
        otpExpires,
        updatedAt: new Date()
      }
    })

    console.log(`Generated OTP ${otp} for player ${player.mcid}`)

    // MC側にOTPを送信（SQS経由）
    try {
      const { getApiClient } = await import("@/lib/api-client")
      const apiClient = getApiClient()
      await apiClient.sendOtp(player.mcid, player.uuid, otp)
      console.log("OTP sent to MC via SQS")
    } catch (error) {
      console.error("Failed to send OTP to MC:", error)
      // Don't fail the request if notification fails, OTP is already stored
    }

    // MCからのレスポンスを待機（最大30秒）
    let responseReceived = false
    let mcResponse = { success: false, message: "レスポンス待機中..." }
    
    // ポーリングでレスポンスを確認（最大30回、1秒間隔）
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      try {
        const otpResponses = global.otpResponses as Map<string, { success: boolean; message: string; timestamp: number; received: boolean }> | undefined
        const responseKey = `${player.mcid}_${player.uuid}`
        
        if (otpResponses && otpResponses.has(responseKey)) {
          const data = otpResponses.get(responseKey)
          if (data) {
            mcResponse = {
              success: data.success,
              message: data.message
            }
          }
          responseReceived = true
          // レスポンス取得後は削除
          otpResponses.delete(responseKey)
          break
        }
      } catch (pollError) {
        console.error("Error polling for OTP response:", pollError)
      }
    }
    
    if (!responseReceived) {
      mcResponse = {
        success: false,
        message: "マインクラフトサーバーからの応答がタイムアウトしました。プレイヤーがオンラインか確認してください。"
      }
    }

    return NextResponse.json({
      success: true,
      message: "OTP generated and sent to Minecraft server",
      mcResponse: mcResponse
    })

  } catch (error) {
    console.error("Send OTP error:", error)
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error" 
      },
      { status: 500 }
    )
  }
}