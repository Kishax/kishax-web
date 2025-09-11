import { createClient, RedisClientType } from 'redis';

interface RedisMessage {
  type: string;
  source: string;
  timestamp: string;
  data: unknown;
}

interface RedisClientConfig {
  redisUrl?: string;
  reconnectDelay?: number;
  maxRetriesPerRequest?: number;
}

export class RedisMessageClient {
  private subscriber: RedisClientType;
  private publisher: RedisClientType;
  private messageHandlers: Map<string, (message: RedisMessage) => Promise<void>> = new Map();
  private isConnected: boolean = false;

  constructor(config: RedisClientConfig = {}) {
    const redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Subscriber connection
    this.subscriber = createClient({ url: redisUrl });
    
    // Publisher connection (separate for pub/sub pattern)
    this.publisher = createClient({ url: redisUrl });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.subscriber.on('connect', () => {
      console.log('Redis subscriber connected');
      this.isConnected = true;
    });

    this.subscriber.on('error', (error) => {
      console.error('Redis subscriber error:', error);
      this.isConnected = false;
    });

    this.subscriber.on('end', () => {
      console.log('Redis subscriber connection closed');
      this.isConnected = false;
    });

    this.publisher.on('connect', () => {
      console.log('Redis publisher connected');
    });

    this.publisher.on('error', (error) => {
      console.error('Redis publisher error:', error);
    });
  }

  /**
   * Connect and subscribe to MC→Web messages from kishax-aws
   */
  async subscribeToMcMessages() {
    try {
      // Connect both clients
      await this.subscriber.connect();
      await this.publisher.connect();
      
      // Subscribe to message handler
      await this.subscriber.subscribe('mc_to_web', async (message: string, channel: string) => {
        try {
          const messageData: RedisMessage = JSON.parse(message);
          await this.handleMessage(channel, messageData);
        } catch (error) {
          console.error('Failed to parse Redis message:', error, message);
        }
      });
      
      console.log('Subscribed to mc_to_web Redis channel');
    } catch (error) {
      console.error('Failed to subscribe to mc_to_web channel:', error);
      throw error;
    }
  }

  /**
   * Publish Web→MC message (this will be picked up by kishax-aws)
   */
  async publishToMc(messageType: string, data: Record<string, unknown>) {
    try {
      const message: RedisMessage = {
        type: messageType,
        source: 'web',
        timestamp: new Date().toISOString(),
        data: {
          ...data,
          timestamp: Date.now(),
        },
      };

      await this.publisher.publish('web_to_mc', JSON.stringify(message));
      console.log(`Published message to MC: ${messageType}`);
      return { success: true, messageType };
    } catch (error) {
      console.error('Failed to publish message to MC:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Register message type handler
   */
  registerHandler(messageType: string, handler: (message: RedisMessage) => Promise<void>) {
    this.messageHandlers.set(messageType, handler);
    console.log(`Redis handler registered for message type: ${messageType}`);
  }

  /**
   * Handle received message
   */
  private async handleMessage(channel: string, message: RedisMessage) {
    try {
      console.debug(`Received Redis message on ${channel}: ${message.type}`);
      
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        await handler(message);
      } else {
        console.warn(`No handler registered for message type: ${message.type}`);
        await this.handleDefaultMessage(message);
      }
    } catch (error) {
      console.error(`Error handling Redis message ${message.type}:`, error);
    }
  }

  /**
   * Default message handler for known message types
   */
  private async handleDefaultMessage(message: RedisMessage) {
    switch (message.type) {
      case 'mc_web_auth_response':
        await this.handleAuthResponse(message);
        break;
      case 'mc_web_player_status':
        await this.handlePlayerStatus(message);
        break;
      case 'mc_web_server_info':
        await this.handleServerInfo(message);
        break;
      case 'mc_otp_response':
        await this.handleOtpResponse(message);
        break;
      default:
        console.warn(`Unhandled Redis message type: ${message.type}`);
    }
  }

  private async handleAuthResponse(message: RedisMessage) {
    const data = message.data as {
      playerName: string;
      playerUuid: string;
      success: boolean;
      message: string;
    };
    
    console.log(`MC Auth Response: ${data.playerName} (${data.playerUuid}) - ${data.success ? 'Success' : 'Failed'}: ${data.message}`);
    
    // Dispatch browser event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mcAuthResponse', { detail: data }));
    }
  }

  private async handlePlayerStatus(message: RedisMessage) {
    const data = message.data as {
      playerName: string;
      playerUuid: string;
      status: string;
      serverName: string;
    };
    
    console.log(`Player Status: ${data.playerName} is ${data.status} on ${data.serverName}`);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mcPlayerStatus', { detail: data }));
    }
  }

  private async handleServerInfo(message: RedisMessage) {
    const data = message.data as {
      serverName: string;
      status: string;
      playerCount: number;
      additionalData?: unknown;
    };
    
    console.log(`Server Info: ${data.serverName} is ${data.status} with ${data.playerCount} players`);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mcServerInfo', { detail: data }));
    }
  }

  private async handleOtpResponse(message: RedisMessage) {
    const data = message.data as {
      mcid: string;
      uuid: string;
      success: boolean;
      message: string;
      timestamp: number;
    };
    
    console.log(`OTP Response: ${data.mcid} (${data.uuid}) - ${data.success ? 'Success' : 'Failed'}: ${data.message}`);

    // Store in global cache (same pattern as existing code)
    if (typeof global !== 'undefined') {
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

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mcOtpResponse', { detail: data }));
    }
  }

  /**
   * Connection status
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Cleanup resources
   */
  async disconnect() {
    try {
      await this.subscriber.quit();
      await this.publisher.quit();
      console.log('Redis client disconnected');
    } catch (error) {
      console.error('Error disconnecting Redis client:', error);
    }
  }
}

// Singleton instance
let redisClientInstance: RedisMessageClient | null = null;

export function getRedisClient(config?: RedisClientConfig): RedisMessageClient {
  if (!redisClientInstance) {
    redisClientInstance = new RedisMessageClient(config);
  }
  return redisClientInstance;
}

// Convenience API - mirrors the existing sqs-client API
export const redisApi = {
  // Web → MC message sending
  sendAuthConfirm: (playerName: string, playerUuid: string) =>
    getRedisClient().publishToMc('web_mc_auth_confirm', { playerName, playerUuid }),

  sendAccountLink: (playerName: string, playerUuid: string, kishaxUserId: string) =>
    getRedisClient().publishToMc('web_mc_account_link', { playerName, playerUuid, kishaxUserId }),

  sendOtp: (playerName: string, playerUuid: string, otp: string) =>
    getRedisClient().publishToMc('web_mc_otp', { playerName, playerUuid, otp }),

  sendTeleport: (playerName: string, location: string) =>
    getRedisClient().publishToMc('web_mc_command', { commandType: 'teleport', playerName, data: { location } }),

  sendServerSwitch: (playerName: string, serverName: string) =>
    getRedisClient().publishToMc('web_mc_command', { commandType: 'server_switch', playerName, data: { server: serverName } }),

  sendMessage: (playerName: string, message: string) =>
    getRedisClient().publishToMc('web_mc_command', { commandType: 'message', playerName, data: { message } }),

  // Server/Player requests
  requestServerStatus: (playerName: string, serverName?: string) =>
    getRedisClient().publishToMc('web_mc_player_request', { requestType: 'server_status', playerName, data: { serverName } }),

  requestPlayerList: (playerName: string, serverName?: string) =>
    getRedisClient().publishToMc('web_mc_player_request', { requestType: 'player_list', playerName, data: { serverName } }),

  requestServerInfo: (playerName: string, serverName?: string) =>
    getRedisClient().publishToMc('web_mc_player_request', { requestType: 'server_info', playerName, data: { serverName } }),
};