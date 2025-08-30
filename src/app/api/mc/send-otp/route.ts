import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

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

    // MC側にOTPを送信
    try {
      // Try API client for SQS/API Gateway
      const { getApiClient } = await import("@/lib/api-client")
      
      try {
        const apiClient = getApiClient()
        // API client method for sending OTP (to be implemented)
        await apiClient.sendOtp(player.mcid, player.uuid, otp)
        console.log("OTP sent to MC via SQS")
      } catch (sqsError) {
        console.warn("Failed to send OTP via SQS, falling back to socket:", sqsError)
        
        // Fallback to socket method
        const { sendSocketMessage } = await import("@/lib/socket-client")
        const message = {
          minecraft: {
            otp: {
              mcid: player.mcid,
              uuid: player.uuid,
              otp: otp,
              action: "send_otp"
            }
          }
        }
        await sendSocketMessage(JSON.stringify(message) + '\r\n')
        console.log("OTP sent to MC via socket")
      }
    } catch (error) {
      console.error("Failed to send OTP to MC:", error)
      // Don't fail the request if notification fails, OTP is already stored
    }

    return NextResponse.json({
      success: true,
      message: "OTP generated and sent to Minecraft server"
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