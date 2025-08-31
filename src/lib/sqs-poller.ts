import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface SQSAuthTokenMessage {
  type: "auth_token"
  mcid: string
  uuid: string
  authToken: string
  expiresAt: number
  action: "create" | "update" | "refresh"
}

export class SQSPoller {
  private sqsClient: SQSClient
  private queueUrl: string
  private isPolling: boolean = false
  private pollInterval: NodeJS.Timeout | null = null

  constructor() {
    // AWS認証情報を明示的に設定
    this.sqsClient = new SQSClient({
      region: process.env.AWS_REGION || "ap-northeast-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
      }
    })
    this.queueUrl = process.env.MC_TO_WEB_QUEUE_URL || ""
  }

  async startPolling() {
    if (this.isPolling) {
      console.log("SQS Polling is already running")
      return
    }

    if (!this.queueUrl) {
      console.warn("MC_TO_WEB_QUEUE_URL is not configured. SQS polling disabled.")
      return
    }

    console.log("Starting SQS polling for auth tokens...")
    this.isPolling = true
    
    // 初回実行
    this.pollMessages()
    
    // 5秒間隔でポーリング
    this.pollInterval = setInterval(() => {
      this.pollMessages()
    }, 5000)
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    this.isPolling = false
    console.log("SQS polling stopped")
  }

  private async pollMessages() {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20, // ロングポーリング
        VisibilityTimeout: 30
      })

      const response = await this.sqsClient.send(command)
      
      if (response.Messages && response.Messages.length > 0) {
        console.log(`Received ${response.Messages.length} messages from SQS`)
        
        for (const message of response.Messages) {
          await this.processMessage(message)
        }
      }
    } catch (error) {
      console.error("Error polling SQS messages:", error)
    }
  }

  private async processMessage(message: any) {
    try {
      if (!message.Body) {
        console.warn("Received message without body")
        return
      }

      const messageData: SQSAuthTokenMessage = JSON.parse(message.Body)
      
      if (messageData.type === "auth_token") {
        await this.handleAuthTokenMessage(messageData)
        
        // メッセージを削除
        if (message.ReceiptHandle) {
          await this.deleteMessage(message.ReceiptHandle)
        }
      } else {
        console.warn("Unknown message type:", messageData.type)
      }
    } catch (error) {
      console.error("Error processing SQS message:", error)
      console.error("Message body:", message.Body)
    }
  }

  private async handleAuthTokenMessage(data: SQSAuthTokenMessage) {
    try {
      console.log(`Processing auth token for player: ${data.mcid} (${data.uuid})`)
      
      // MinecraftPlayerレコードをupsert
      const player = await prisma.minecraftPlayer.upsert({
        where: { mcid: data.mcid },
        update: {
          uuid: data.uuid,
          authToken: data.authToken,
          tokenExpires: new Date(data.expiresAt),
          updatedAt: new Date()
        },
        create: {
          mcid: data.mcid,
          uuid: data.uuid,
          authToken: data.authToken,
          tokenExpires: new Date(data.expiresAt),
          confirmed: false
        }
      })

      console.log(`Successfully processed auth token for player: ${data.mcid} (DB ID: ${player.id})`)
      
    } catch (error) {
      console.error("Error handling auth token message:", error)
      throw error // 再スロー（メッセージを削除しない）
    }
  }

  private async deleteMessage(receiptHandle: string) {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle
      })
      
      await this.sqsClient.send(command)
    } catch (error) {
      console.error("Error deleting SQS message:", error)
    }
  }
}

// シングルトンインスタンス
let sqsPollerInstance: SQSPoller | null = null

export function getSQSPoller(): SQSPoller {
  if (!sqsPollerInstance) {
    sqsPollerInstance = new SQSPoller()
  }
  return sqsPollerInstance
}
