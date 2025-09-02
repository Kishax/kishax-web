import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

interface ApiConfig {
  region: string;
  webToMcQueueUrl: string;
}

interface ApiResponse {
  success: boolean;
  messageId?: string;
  message: string;
  error?: string;
}

// Default configuration - using environment variables for server-side
const defaultConfig: ApiConfig = {
  region: process.env.AWS_REGION || "ap-northeast-1",
  webToMcQueueUrl: process.env.WEB_TO_MC_QUEUE_URL || "",
};

export class KishaxApiClient {
  private config: ApiConfig;
  private sqsClient: SQSClient;

  constructor(config: ApiConfig = defaultConfig) {
    this.config = { ...defaultConfig, ...config };

    // Initialize SQS client with IAM credentials
    this.sqsClient = new SQSClient({
      region: this.config.region,
      credentials: {
        accessKeyId: process.env.MC_WEB_SQS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.MC_WEB_SQS_SECRET_ACCESS_KEY || "",
      },
    });
  }

  /**
   * Web → MC メッセージ送信（汎用）
   */
  async sendToMc(
    messageType: string,
    data: Record<string, unknown>,
  ): Promise<ApiResponse> {
    const payload = {
      type: messageType,
      from: "web",
      to: "mc",
      ...data,
      timestamp: Date.now(),
    };

    return this.sendSqsMessage(payload);
  }

  /**
   * MC認証確認メッセージ送信
   */
  async sendAuthConfirm(
    playerName: string,
    playerUuid: string,
  ): Promise<ApiResponse> {
    return this.sendToMc("web_mc_auth_confirm", {
      playerName,
      playerUuid,
    });
  }

  /**
   * MCへOTP送信
   */
  async sendOtp(
    playerName: string,
    playerUuid: string,
    otp: string,
  ): Promise<ApiResponse> {
    return this.sendToMc("web_mc_otp", {
      playerName,
      playerUuid,
      otp,
    });
  }

  /**
   * MC コマンド送信
   */
  async sendCommand(
    commandType: string,
    playerName: string,
    commandData: Record<string, unknown>,
  ): Promise<ApiResponse> {
    return this.sendToMc("web_mc_command", {
      commandType,
      playerName,
      data: commandData,
    });
  }

  /**
   * プレイヤーリクエスト送信
   */
  async sendPlayerRequest(
    requestType: string,
    playerName: string,
    requestData: Record<string, unknown>,
  ): Promise<ApiResponse> {
    return this.sendToMc("web_mc_player_request", {
      requestType,
      playerName,
      data: requestData,
    });
  }

  /**
   * テレポートコマンド
   */
  async sendTeleportCommand(
    playerName: string,
    location: string,
  ): Promise<ApiResponse> {
    return this.sendCommand("teleport", playerName, { location });
  }

  /**
   * サーバー切り替えコマンド
   */
  async sendServerSwitchCommand(
    playerName: string,
    serverName: string,
  ): Promise<ApiResponse> {
    return this.sendCommand("server_switch", playerName, {
      server: serverName,
    });
  }

  /**
   * メッセージ送信コマンド
   */
  async sendMessageCommand(
    playerName: string,
    message: string,
  ): Promise<ApiResponse> {
    return this.sendCommand("message", playerName, { message });
  }

  /**
   * サーバーステータスリクエスト
   */
  async requestServerStatus(
    playerName: string,
    serverName?: string,
  ): Promise<ApiResponse> {
    return this.sendPlayerRequest("server_status", playerName, { serverName });
  }

  /**
   * プレイヤーリストリクエスト
   */
  async requestPlayerList(
    playerName: string,
    serverName?: string,
  ): Promise<ApiResponse> {
    return this.sendPlayerRequest("player_list", playerName, { serverName });
  }

  /**
   * サーバー情報リクエスト
   */
  async requestServerInfo(
    playerName: string,
    serverName?: string,
  ): Promise<ApiResponse> {
    return this.sendPlayerRequest("server_info", playerName, { serverName });
  }

  /**
   * SQS メッセージ送信（内部メソッド）
   */
  private async sendSqsMessage(
    payload: Record<string, unknown>,
  ): Promise<ApiResponse> {
    try {
      console.debug("Sending SQS message:", payload);

      if (!this.config.webToMcQueueUrl) {
        throw new Error("Web-to-MC queue URL not configured");
      }

      const command = new SendMessageCommand({
        QueueUrl: this.config.webToMcQueueUrl,
        MessageBody: JSON.stringify(payload),
        MessageAttributes: {
          messageType: {
            DataType: "String",
            StringValue: String(payload.type) || "unknown",
          },
          source: {
            DataType: "String",
            StringValue: "kishax-web",
          },
        },
      });

      const result = await this.sqsClient.send(command);
      console.debug("SQS response:", result);

      return {
        success: true,
        messageId: result.MessageId,
        message: "Message sent successfully via SQS",
      };
    } catch (error) {
      console.error("SQS message sending failed:", error);
      return {
        success: false,
        message: "Failed to send SQS message",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// シングルトンインスタンス
let apiClient: KishaxApiClient | null = null;

export function getApiClient(config?: Partial<ApiConfig>): KishaxApiClient {
  if (!apiClient) {
    apiClient = new KishaxApiClient(config as ApiConfig);
  }
  return apiClient;
}

// 便利な関数エクスポート
export const kishaxApi = {
  sendAuthConfirm: (playerName: string, playerUuid: string) =>
    getApiClient().sendAuthConfirm(playerName, playerUuid),

  sendTeleport: (playerName: string, location: string) =>
    getApiClient().sendTeleportCommand(playerName, location),

  sendServerSwitch: (playerName: string, serverName: string) =>
    getApiClient().sendServerSwitchCommand(playerName, serverName),

  sendMessage: (playerName: string, message: string) =>
    getApiClient().sendMessageCommand(playerName, message),

  requestServerStatus: (playerName: string, serverName?: string) =>
    getApiClient().requestServerStatus(playerName, serverName),

  requestPlayerList: (playerName: string, serverName?: string) =>
    getApiClient().requestPlayerList(playerName, serverName),

  requestServerInfo: (playerName: string, serverName?: string) =>
    getApiClient().requestServerInfo(playerName, serverName),
};
