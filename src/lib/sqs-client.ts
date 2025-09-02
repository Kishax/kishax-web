import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
} from "@aws-sdk/client-sqs";

interface SqsConfig {
  region: string;
  queueUrl: string;
  maxMessages?: number;
  waitTimeSeconds?: number;
}

interface SqsMessage {
  type: string;
  source: string;
  timestamp: string;
  data: unknown;
}

// Default configuration
const defaultConfig: SqsConfig = {
  region: process.env.AWS_REGION || "ap-northeast-1",
  queueUrl: process.env.MC_TO_WEB_QUEUE_URL || "",
  maxMessages: 10,
  waitTimeSeconds: 20,
};

export class SqsMessageProcessor {
  private sqsClient: SQSClient;
  private config: SqsConfig;
  private isPolling: boolean = false;
  private pollingInterval?: NodeJS.Timeout;
  private messageHandlers: Map<string, (message: SqsMessage) => Promise<void>> =
    new Map();

  constructor(config: SqsConfig = defaultConfig) {
    this.config = { ...defaultConfig, ...config };
    this.sqsClient = new SQSClient({
      region: this.config.region,
    });
  }

  /**
   * メッセージタイプ別のハンドラーを登録
   */
  registerHandler(
    messageType: string,
    handler: (message: SqsMessage) => Promise<void>,
  ) {
    this.messageHandlers.set(messageType, handler);
    console.log(`SQS handler registered for message type: ${messageType}`);
  }

  /**
   * SQSポーリング開始
   */
  startPolling(intervalMs: number = 5000) {
    if (this.isPolling) {
      console.warn("SQS polling is already running");
      return;
    }

    this.isPolling = true;
    console.log("Starting SQS polling...");

    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollMessages();
      } catch (error) {
        console.error("SQS polling error:", error);
      }
    }, intervalMs);
  }

  /**
   * SQSポーリング停止
   */
  stopPolling() {
    if (!this.isPolling) {
      return;
    }

    this.isPolling = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
    console.log("SQS polling stopped");
  }

  /**
   * メッセージ受信・処理
   */
  private async pollMessages() {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.config.queueUrl,
        MaxNumberOfMessages: this.config.maxMessages,
        WaitTimeSeconds: this.config.waitTimeSeconds,
        MessageAttributeNames: ["All"],
      });

      const response = await this.sqsClient.send(command);
      const messages = response.Messages || [];

      if (messages.length > 0) {
        console.debug(`Received ${messages.length} SQS messages`);
      }

      for (const message of messages) {
        try {
          await this.processMessage(message);
          await this.deleteMessage(message);
        } catch (error) {
          console.error(
            `Failed to process message ${message.MessageId}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error("Failed to poll SQS messages:", error);
    }
  }

  /**
   * 個別メッセージ処理
   */
  private async processMessage(message: Message) {
    if (!message.Body) {
      console.warn("Received message without body");
      return;
    }

    try {
      const messageData = JSON.parse(message.Body);
      const messageType = messageData.type || "unknown";
      const source =
        message.MessageAttributes?.source?.StringValue || "unknown";
      const timestamp =
        message.MessageAttributes?.timestamp?.StringValue ||
        new Date().toISOString();

      const sqsMessage: SqsMessage = {
        type: messageType,
        source,
        timestamp,
        data: messageData,
      };

      console.debug(`Processing message: ${messageType} from ${source}`);

      // 登録されたハンドラーで処理
      const handler = this.messageHandlers.get(messageType);
      if (handler) {
        await handler(sqsMessage);
      } else {
        console.warn(`No handler registered for message type: ${messageType}`);
        // デフォルトハンドラーで処理
        await this.handleDefaultMessage(sqsMessage);
      }
    } catch (error) {
      console.error("Failed to process message body:", error);
    }
  }

  /**
   * メッセージ削除
   */
  private async deleteMessage(message: Message) {
    if (!message.ReceiptHandle) {
      console.warn("Cannot delete message: no receipt handle");
      return;
    }

    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.config.queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      });

      await this.sqsClient.send(command);
      console.debug(`Deleted message: ${message.MessageId}`);
    } catch (error) {
      console.error(`Failed to delete message ${message.MessageId}:`, error);
    }
  }

  /**
   * デフォルトメッセージハンドラー
   */
  private async handleDefaultMessage(message: SqsMessage) {
    switch (message.type) {
      case "mc_web_auth_response":
        await this.handleAuthResponse(message);
        break;
      case "mc_web_player_status":
        await this.handlePlayerStatus(message);
        break;
      case "mc_web_server_info":
        await this.handleServerInfo(message);
        break;
      case "mc_otp_response":
        await this.handleOtpResponse(message);
        break;
      default:
        console.warn(`Unhandled message type: ${message.type}`);
    }
  }

  /**
   * MC認証レスポンス処理
   */
  private async handleAuthResponse(message: SqsMessage) {
    const data = message.data as {
      playerName: string;
      playerUuid: string;
      success: boolean;
      message: string;
    };
    const { playerName, playerUuid, success, message: responseMessage } = data;
    console.log(
      `MC Auth Response: ${playerName} (${playerUuid}) - ${success ? "Success" : "Failed"}: ${responseMessage}`,
    );

    // ここで既存のUI更新やコールバック処理を実行
    // 例：認証ステータス更新、UI通知など
  }

  /**
   * プレイヤーステータス処理
   */
  private async handlePlayerStatus(message: SqsMessage) {
    const data = message.data as {
      playerName: string;
      playerUuid: string;
      status: string;
      serverName: string;
    };
    const { playerName, status, serverName } = data;
    console.log(`Player Status: ${playerName} is ${status} on ${serverName}`);

    // プレイヤーステータス更新処理
  }

  /**
   * サーバー情報処理
   */
  private async handleServerInfo(message: SqsMessage) {
    const data = message.data as {
      serverName: string;
      status: string;
      playerCount: number;
      additionalData?: unknown;
    };
    const { serverName, status, playerCount } = data;
    console.log(
      `Server Info: ${serverName} is ${status} with ${playerCount} players`,
    );

    // サーバー情報更新処理
  }

  /**
   * OTPレスポンス処理
   */
  private async handleOtpResponse(message: SqsMessage) {
    const data = message.data as {
      mcid: string;
      uuid: string;
      success: boolean;
      message: string;
      timestamp: number;
    };
    const { mcid, uuid, success, message: responseMessage } = data;
    console.log(
      `OTP Response: ${mcid} (${uuid}) - ${success ? "Success" : "Failed"}: ${responseMessage}`,
    );

    // OTPレスポンスをグローバルキャッシュに保存
    global.otpResponses = global.otpResponses || new Map();
    global.otpResponses.set(`${mcid}_${uuid}`, {
      success,
      message: responseMessage,
      timestamp: data.timestamp,
      received: true,
    });
  }

  /**
   * リソース解放
   */
  destroy() {
    this.stopPolling();
    // SQS Client は自動的にクリーンアップされる
  }
}

// シングルトンインスタンス
let sqsProcessor: SqsMessageProcessor | null = null;

export function getSqsMessageProcessor(
  config?: Partial<SqsConfig>,
): SqsMessageProcessor {
  if (!sqsProcessor) {
    sqsProcessor = new SqsMessageProcessor(config as SqsConfig);
  }
  return sqsProcessor;
}

export function initializeSqsPolling(config?: Partial<SqsConfig>) {
  const processor = getSqsMessageProcessor(config);

  // デフォルトハンドラーを登録
  processor.registerHandler("mc_web_auth_response", async (message) => {
    console.log("MC Auth Response received:", message.data);
    // 認証レスポンス処理
  });

  processor.registerHandler("mc_web_player_status", async (message) => {
    console.log("Player Status received:", message.data);
    // プレイヤーステータス処理
  });

  processor.registerHandler("mc_web_server_info", async (message) => {
    console.log("Server Info received:", message.data);
    // サーバー情報処理
  });

  processor.registerHandler("mc_otp_response", async (message) => {
    console.log("OTP Response received:", message.data);
    const data = message.data as {
      mcid: string;
      uuid: string;
      success: boolean;
      message: string;
      timestamp: number;
    };

    // OTPレスポンスをグローバルキャッシュに保存
    global.otpResponses = global.otpResponses || new Map();
    global.otpResponses.set(`${data.mcid}_${data.uuid}`, {
      success: data.success,
      message: data.message,
      timestamp: data.timestamp,
      received: true,
    });
  });

  // ポーリング開始
  processor.startPolling();

  return processor;
}
