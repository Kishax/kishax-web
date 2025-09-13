interface McMessageData {
  type: string;
  timestamp: string;
  data: unknown;
}

interface McMessageHandler {
  (message: McMessageData): void;
}

interface ApiResponse {
  success: boolean;
  messageType?: string;
  message: string;
  error?: string;
}

// Helper to get the base URL
function getBaseUrl() {
  if (typeof window !== "undefined") {
    // Client-side
    return "";
  }
  // Server-side
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export class McMessageClient {
  private eventSource: EventSource | null = null;
  private messageHandlers: Map<string, McMessageHandler[]> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor() {
    this.connect();
  }

  private connect() {
    // EventSource is only available in the browser
    if (typeof window === "undefined") {
      return;
    }

    try {
      this.eventSource = new EventSource("/api/mc-messages");

      this.eventSource.onopen = () => {
        console.log("Connected to MC messages stream");
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const messageData: McMessageData = JSON.parse(event.data);
          this.handleMessage(messageData);
        } catch (error) {
          console.error("Failed to parse MC message:", error, event.data);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error("MC messages stream error:", error);
        this.isConnected = false;

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(
            `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
          );

          setTimeout(() => {
            this.disconnect();
            this.connect();
          }, this.reconnectDelay * this.reconnectAttempts);
        } else {
          console.error("Max reconnection attempts reached");
        }
      };
    } catch (error) {
      console.error("Failed to connect to MC messages stream:", error);
    }
  }

  private handleMessage(message: McMessageData) {
    console.debug("Received MC message:", message);

    // Handle heartbeat messages
    if (message.type === "heartbeat") {
      return;
    }

    // Handle connection messages
    if (message.type === "connected") {
      console.log("MC message stream connected:", message.data);
      return;
    }

    // Dispatch to registered handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers && handlers.length > 0) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in handler for ${message.type}:`, error);
        }
      });
    } else {
      // Default handling for known message types
      this.handleDefaultMessage(message);
    }

    // Also dispatch as window events (for backwards compatibility)
    if (typeof window !== "undefined") {
      const eventName = this.getEventName(message.type);
      window.dispatchEvent(
        new CustomEvent(eventName, { detail: message.data }),
      );
    }
  }

  private handleDefaultMessage(message: McMessageData) {
    switch (message.type) {
      case "mc_web_auth_response":
        this.handleAuthResponse(message);
        break;
      case "mc_web_player_status":
        this.handlePlayerStatus(message);
        break;
      case "mc_web_server_info":
        this.handleServerInfo(message);
        break;
      case "mc_otp_response":
        this.handleOtpResponse(message);
        break;
      default:
        console.warn(`Unhandled MC message type: ${message.type}`);
    }
  }

  private handleAuthResponse(message: McMessageData) {
    const data = message.data as {
      playerName: string;
      playerUuid: string;
      success: boolean;
      message: string;
    };

    console.log(
      `MC Auth Response: ${data.playerName} (${data.playerUuid}) - ${data.success ? "Success" : "Failed"}: ${data.message}`,
    );
  }

  private handlePlayerStatus(message: McMessageData) {
    const data = message.data as {
      playerName: string;
      playerUuid: string;
      status: string;
      serverName: string;
    };

    console.log(
      `Player Status: ${data.playerName} is ${data.status} on ${data.serverName}`,
    );
  }

  private handleServerInfo(message: McMessageData) {
    const data = message.data as {
      serverName: string;
      status: string;
      playerCount: number;
      additionalData?: unknown;
    };

    console.log(
      `Server Info: ${data.serverName} is ${data.status} with ${data.playerCount} players`,
    );
  }

  private handleOtpResponse(message: McMessageData) {
    const data = message.data as {
      mcid: string;
      uuid: string;
      success: boolean;
      message: string;
      timestamp: number;
    };

    console.log(
      `OTP Response: ${data.mcid} (${data.uuid}) - ${data.success ? "Success" : "Failed"}: ${data.message}`,
    );

    // Store in global cache (matching existing pattern)
    if (typeof global !== "undefined") {
      global.otpResponses = global.otpResponses || new Map();
      global.otpResponses.set(`${data.mcid}_${data.uuid}`, {
        success: data.success,
        message: data.message,
        timestamp: data.timestamp,
        received: true,
      });

      // Auto-cleanup after 30 seconds
      setTimeout(() => {
        if (global.otpResponses) {
          global.otpResponses.delete(`${data.mcid}_${data.uuid}`);
        }
      }, 30000);
    }
  }

  private getEventName(messageType: string): string {
    const eventMap: Record<string, string> = {
      mc_web_auth_response: "mcAuthResponse",
      mc_web_player_status: "mcPlayerStatus",
      mc_web_server_info: "mcServerInfo",
      mc_otp_response: "mcOtpResponse",
    };

    return eventMap[messageType] || messageType;
  }

  /**
   * Register handler for specific message type
   */
  onMessage(messageType: string, handler: McMessageHandler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);

    console.log(`Registered handler for MC message type: ${messageType}`);
  }

  /**
   * Remove handler for specific message type
   */
  offMessage(messageType: string, handler: McMessageHandler) {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Send message to MC via API
   */
  async sendToMc(
    messageType: string,
    data: Record<string, unknown>,
  ): Promise<ApiResponse> {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/send-to-mc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageType,
          data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send message");
      }

      return result;
    } catch (error) {
      console.error("Failed to send message to MC:", error);
      return {
        success: false,
        message: "Failed to send message to MC",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if connected to message stream
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from message stream
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.messageHandlers.clear();
  }
}

// Singleton instance
let mcMessageClientInstance: McMessageClient | null = null;

export function getMcMessageClient(): McMessageClient {
  if (!mcMessageClientInstance) {
    mcMessageClientInstance = new McMessageClient();
  }
  return mcMessageClientInstance;
}

// Convenience API - mirrors the existing sqs-client API
export const mcApi = {
  // Web → MC message sending
  sendAuthConfirm: (playerName: string, playerUuid: string) =>
    getMcMessageClient().sendToMc("web_mc_auth_confirm", {
      playerName,
      playerUuid,
    }),

  sendAccountLink: (
    playerName: string,
    playerUuid: string,
    kishaxUserId: string,
  ) =>
    getMcMessageClient().sendToMc("web_mc_account_link", {
      playerName,
      playerUuid,
      kishaxUserId,
    }),

  sendOtp: (playerName: string, playerUuid: string, otp: string) =>
    getMcMessageClient().sendToMc("web_mc_otp", {
      playerName,
      playerUuid,
      otp,
    }),

  sendTeleport: (playerName: string, location: string) =>
    getMcMessageClient().sendToMc("web_mc_command", {
      commandType: "teleport",
      playerName,
      data: { location },
    }),

  sendServerSwitch: (playerName: string, serverName: string) =>
    getMcMessageClient().sendToMc("web_mc_command", {
      commandType: "server_switch",
      playerName,
      data: { server: serverName },
    }),

  sendMessage: (playerName: string, message: string) =>
    getMcMessageClient().sendToMc("web_mc_command", {
      commandType: "message",
      playerName,
      data: { message },
    }),

  // Server/Player requests
  requestServerStatus: (playerName: string, serverName?: string) =>
    getMcMessageClient().sendToMc("web_mc_player_request", {
      requestType: "server_status",
      playerName,
      data: { serverName },
    }),

  requestPlayerList: (playerName: string, serverName?: string) =>
    getMcMessageClient().sendToMc("web_mc_player_request", {
      requestType: "player_list",
      playerName,
      data: { serverName },
    }),



  requestServerInfo: (playerName: string, serverName?: string) =>
    getMcMessageClient().sendToMc("web_mc_player_request", {
      requestType: "server_info",
      playerName,
      data: { serverName },
    }),
};
