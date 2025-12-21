import { getRedisClient } from "./redis-client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AuthTokenMessage {
  mcid: string;
  uuid: string;
  authToken: string;
  expiresAt: string;
  action: string;
}

export class RedisChecker {
  private static instance: RedisChecker | null = null;
  private isRunning = false;

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): RedisChecker {
    if (!RedisChecker.instance) {
      RedisChecker.instance = new RedisChecker();
    }
    return RedisChecker.instance;
  }

  /**
   * Redis監視を開始
   */
  async startMonitoring() {
    if (this.isRunning) {
      console.log("Redis checker is already running");
      return;
    }

    this.isRunning = true;
    console.log("🚀 Starting Redis checker for auth tokens...");

    try {
      const redisClient = getRedisClient();

      // auth_token メッセージのハンドラーを登録
      redisClient.registerHandler("mc_auth_token", async (message) => {
        await this.handleAuthToken(message.data as AuthTokenMessage);
      });

      // Redis接続を開始
      await redisClient.subscribeToMcMessages();
      console.log("✅ Redis checker started successfully");
    } catch (error) {
      console.error("❌ Failed to start Redis checker:", error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * 認証トークンメッセージを処理
   */
  private async handleAuthToken(data: AuthTokenMessage) {
    try {
      console.log(
        `📥 Received auth token for player: ${data.mcid} (${data.uuid})`,
      );

      const { mcid, uuid, authToken, expiresAt } = data;

      // データベースに認証トークンを保存/更新
      await prisma.minecraftPlayer.upsert({
        where: { mcid },
        update: {
          uuid,
          authToken,
          tokenExpires: new Date(expiresAt),
          confirmed: true, // MC認証完了時は confirmed を true に設定
          updatedAt: new Date(),
        },
        create: {
          mcid,
          uuid,
          authToken,
          tokenExpires: new Date(expiresAt),
          confirmed: false, // 新規作成時は confirmed を false に設定
        },
      });

      console.log(
        `✅ Auth token saved to database for ${data.mcid} - Action: ${data.action}`,
      );

      // MC側に保存完了を通知
      await this.notifyTokenSaved(data.mcid, data.uuid, data.authToken);

      // 期限切れトークンのクリーンアップ（定期的に実行）
      await this.cleanupExpiredTokens();
    } catch (error) {
      console.error(`❌ Failed to handle auth token for ${data.mcid}:`, error);
    }
  }

  /**
   * MC側に認証トークン保存完了を通知
   */
  private async notifyTokenSaved(
    mcid: string,
    uuid: string,
    authToken: string,
  ) {
    try {
      const redisClient = getRedisClient();
      await redisClient.publishToMc("mc_auth_token_saved", {
        mcid,
        uuid,
        authToken,
        savedAt: new Date().toISOString(),
      });
      console.log(`📤 Notified MC that auth token is saved for ${mcid}`);
    } catch (error) {
      console.error(
        `❌ Failed to notify MC about token save for ${mcid}:`,
        error,
      );
    }
  }

  /**
   * 期限切れ認証トークンをクリーンアップ
   */
  private async cleanupExpiredTokens() {
    try {
      const result = await prisma.minecraftPlayer.deleteMany({
        where: {
          tokenExpires: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        console.log(`🧹 Cleaned up ${result.count} expired auth tokens`);
      }
    } catch (error) {
      console.error("❌ Failed to cleanup expired tokens:", error);
    }
  }

  /**
   * Redis監視を停止
   */
  async stopMonitoring() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log("🛑 Stopping Redis checker...");

    try {
      const redisClient = getRedisClient();
      await redisClient.disconnect();
      console.log("✅ Redis checker stopped successfully");
    } catch (error) {
      console.error("❌ Error stopping Redis checker:", error);
    }
  }

  /**
   * 監視状態を取得
   */
  get running(): boolean {
    return this.isRunning;
  }
}

// デフォルトエクスポート
export const redisChecker = RedisChecker.getInstance();

// 自動スタート関数（必要に応じて呼び出し）
export async function startRedisChecker() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_REDIS_CHECKER === "true"
  ) {
    try {
      await redisChecker.startMonitoring();
    } catch (error) {
      console.error("❌ Failed to auto-start Redis checker:", error);
    }
  }
}

// プロセス終了時のクリーンアップ
if (typeof process !== "undefined") {
  process.on("SIGINT", async () => {
    console.log("\n🛑 Received SIGINT, stopping Redis checker...");
    await redisChecker.stopMonitoring();
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n🛑 Received SIGTERM, stopping Redis checker...");
    await redisChecker.stopMonitoring();
    await prisma.$disconnect();
    process.exit(0);
  });
}
