#!/usr/bin/env node

const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("redis");

const prisma = new PrismaClient();

// Redisクライアントの初期化
let redisClient = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        lazyConnect: true
      }
    });

    redisClient.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('disconnect', () => {
      console.log('⚠️ Redis disconnected');
    });

    await redisClient.connect();
  }

  return redisClient;
}

class SQSWorker {
  constructor() {
    // AWS認証情報を明示的に設定
    this.sqsClient = new SQSClient({
      region: process.env.AWS_REGION || "ap-northeast-1",
      credentials: {
        accessKeyId: process.env.MC_WEB_SQS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.MC_WEB_SQS_SECRET_ACCESS_KEY || "",
      },
    });
    this.queueUrl = process.env.MC_TO_WEB_QUEUE_URL || "";
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log("SQS Worker is already running");
      return;
    }

    if (!this.queueUrl) {
      console.warn(
        "MC_TO_WEB_QUEUE_URL is not configured. SQS worker disabled.",
      );
      return;
    }

    console.log("🚀 Starting SQS Worker for auth tokens...");
    console.log(`📡 Polling queue: ${this.queueUrl}`);
    this.isRunning = true;

    // 無限ループでポーリング
    while (this.isRunning) {
      try {
        await this.pollMessages();
      } catch (error) {
        console.error("❌ Error in main polling loop:", error);
        // エラーが発生しても5秒待ってから再試行
        await this.sleep(5000);
      }
    }
  }

  stop() {
    console.log("🛑 Stopping SQS Worker...");
    this.isRunning = false;
  }

  async pollMessages() {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20, // ロングポーリング
        VisibilityTimeoutSeconds: 30,
      });

      const response = await this.sqsClient.send(command);

      if (response.Messages && response.Messages.length > 0) {
        console.log(
          `📨 Received ${response.Messages.length} messages from SQS`,
        );

        for (const message of response.Messages) {
          await this.processMessage(message);
        }
      }
    } catch (error) {
      console.error("❌ Error polling SQS messages:", error.message || error);
      throw error; // 上位でキャッチ
    }
  }

  async processMessage(message) {
    try {
      if (!message.Body) {
        console.warn("!  Received message without body");
        return;
      }

      const messageData = JSON.parse(message.Body);
      console.log(`🔍 Processing message type: ${messageData.type}`);

      if (messageData.type === "auth_token") {
        await this.handleAuthTokenMessage(messageData);

        // メッセージを削除
        if (message.ReceiptHandle) {
          await this.deleteMessage(message.ReceiptHandle);
          console.log("✅ Message deleted successfully");
        }
      } else if (messageData.type === "mc_otp_response") {
        await this.handleOtpResponseMessage(messageData);

        // メッセージを削除
        if (message.ReceiptHandle) {
          await this.deleteMessage(message.ReceiptHandle);
          console.log("✅ OTP Response message deleted successfully");
        }
      } else if (messageData.type === "mc_web_auth_response") {
        await this.handleWebAuthResponseMessage(messageData);

        // メッセージを削除
        if (message.ReceiptHandle) {
          await this.deleteMessage(message.ReceiptHandle);
          console.log("✅ Web Auth Response message deleted successfully");
        }
      } else {
        console.warn(`!  Unknown message type: ${messageData.type}`);
      }
    } catch (error) {
      console.error("❌ Error processing SQS message:", error);
      console.error("📄 Message body:", message.Body);
    }
  }

  async handleAuthTokenMessage(data) {
    try {
      console.log(
        `🎮 Processing auth token for player: ${data.mcid} (${data.uuid})`,
      );

      // MinecraftPlayerレコードをupsert
      const player = await prisma.minecraftPlayer.upsert({
        where: { mcid: data.mcid },
        update: {
          uuid: data.uuid,
          authToken: data.authToken,
          tokenExpires: new Date(data.expiresAt),
          updatedAt: new Date(),
        },
        create: {
          mcid: data.mcid,
          uuid: data.uuid,
          authToken: data.authToken,
          tokenExpires: new Date(data.expiresAt),
          confirmed: false,
        },
      });

      console.log(
        `✅ Successfully processed auth token for player: ${data.mcid} (DB ID: ${player.id})`,
      );
    } catch (error) {
      console.error("❌ Error handling auth token message:", error);
      throw error; // 再スロー（メッセージを削除しない）
    }
  }

  async handleOtpResponseMessage(data) {
    try {
      console.log(
        `🔐 Processing OTP response for player: ${data.mcid} (${data.uuid}) - Success: ${data.success}`,
      );
      console.log(`📝 Response message: ${data.message}`);

      // OTPレスポンスをRedisに保存
      const redis = await getRedisClient();
      const key = `otp_response:${data.mcid}_${data.uuid}`;
      const value = JSON.stringify({
        success: data.success,
        message: data.message,
        timestamp: data.timestamp,
        received: true,
      });
      
      // 5分間のTTLを設定
      await redis.setEx(key, 300, value);
      console.log(`📝 OTP response saved to Redis: ${key}`);
      
      // Pub/Subでリアルタイム通知
      const channelName = `otp_response:${data.mcid}_${data.uuid}`;
      await redis.publish(channelName, value);
      console.log(`📡 Published OTP response notification: ${channelName}`);

      console.log(
        `✅ Successfully processed OTP response for player: ${data.mcid} - Status: ${data.success ? 'Success' : 'Failed'}`,
      );
    } catch (error) {
      console.error("❌ Error handling OTP response message:", error);
      throw error; // 再スロー（メッセージを削除しない）
    }
  }

  async deleteMessage(receiptHandle) {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.sqsClient.send(command);
    } catch (error) {
      console.error("❌ Error deleting SQS message:", error);
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * MC側からのWeb認証応答メッセージを処理
   */
  async handleWebAuthResponseMessage(data) {
    try {
      console.log(
        `🔒 Processing web auth response for player: ${data.playerName} (${data.playerUuid})`,
      );
      console.log(`📝 Auth result: ${data.success ? 'Success' : 'Failed'} - ${data.message}`);

      // 必要に応じてWeb側での追加処理を行う
      // 例：統計情報の更新、ログの保存、通知の送信など
      
      // 現在のところ、この応答はログ出力のみで十分
      // MC側で既にDBの更新や権限付与が完了している

      console.log("✅ Web auth response processed successfully");
    } catch (error) {
      console.error(
        `❌ Error processing web auth response: ${data.playerName} (${data.playerUuid})`,
        error,
      );
    }
  }
}

// シグナルハンドリング
const worker = new SQSWorker();

process.on("SIGINT", () => {
  console.log("\n🔄 Received SIGINT, shutting down gracefully...");
  worker.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🔄 Received SIGTERM, shutting down gracefully...");
  worker.stop();
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  worker.stop();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  worker.stop();
  process.exit(1);
});

// ワーカー開始
console.log("🎯 SQS Worker starting...");
worker.start().catch((error) => {
  console.error("💥 Failed to start SQS Worker:", error);
  process.exit(1);
});

