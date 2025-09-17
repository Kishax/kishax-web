#!/usr/bin/env tsx

/**
 * Redis Checker - Standalone script for monitoring Redis messages
 * This script runs alongside Next.js to handle auth token messages from MC/API
 */

import { redisChecker } from "../lib/redis-checker";

async function main() {
  console.log("🔄 Starting Redis Checker standalone process...");

  try {
    // Redis監視を開始
    await redisChecker.startMonitoring();

    console.log(
      "✅ Redis Checker is now running and monitoring for auth tokens",
    );
    console.log("📡 Listening for 'mc_auth_token' messages from kishax-api...");

    // プロセスを維持
    process.on("SIGINT", async () => {
      console.log("\n🛑 Received SIGINT, shutting down Redis Checker...");
      await redisChecker.stopMonitoring();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("\n🛑 Received SIGTERM, shutting down Redis Checker...");
      await redisChecker.stopMonitoring();
      process.exit(0);
    });

    // プロセスを生存させるための無限ループ
    await new Promise(() => {
      // Empty promise that never resolves - keeps process alive
    });
  } catch (error) {
    console.error("❌ Failed to start Redis Checker:", error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Redis Checker crashed:", error);
    process.exit(1);
  });
}
