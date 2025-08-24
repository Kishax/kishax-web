interface ApiConfig {
  baseUrl: string
  region: string
  accessKeyId?: string
  secretAccessKey?: string
}

interface ApiResponse {
  success: boolean
  messageId?: string
  message: string
  error?: string
}

// Default configuration
const defaultConfig: ApiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL || "",
  region: process.env.AWS_REGION || "ap-northeast-1"
}

export class KishaxApiClient {
  private config: ApiConfig

  constructor(config: ApiConfig = defaultConfig) {
    this.config = { ...defaultConfig, ...config }
  }

  /**
   * Web → MC メッセージ送信（汎用）
   */
  async sendToMc(messageType: string, data: Record<string, any>): Promise<ApiResponse> {
    const payload = {
      type: messageType,
      ...data,
      timestamp: Date.now()
    }

    return this.sendRequest('/web-to-mc', payload)
  }

  /**
   * MC認証確認メッセージ送信
   */
  async sendAuthConfirm(playerName: string, playerUuid: string): Promise<ApiResponse> {
    return this.sendToMc('web_mc_auth_confirm', {
      playerName,
      playerUuid
    })
  }

  /**
   * MC コマンド送信
   */
  async sendCommand(commandType: string, playerName: string, commandData: Record<string, any>): Promise<ApiResponse> {
    return this.sendToMc('web_mc_command', {
      commandType,
      playerName,
      data: commandData
    })
  }

  /**
   * プレイヤーリクエスト送信
   */
  async sendPlayerRequest(requestType: string, playerName: string, requestData: Record<string, any>): Promise<ApiResponse> {
    return this.sendToMc('web_mc_player_request', {
      requestType,
      playerName,
      data: requestData
    })
  }

  /**
   * テレポートコマンド
   */
  async sendTeleportCommand(playerName: string, location: string): Promise<ApiResponse> {
    return this.sendCommand('teleport', playerName, { location })
  }

  /**
   * サーバー切り替えコマンド
   */
  async sendServerSwitchCommand(playerName: string, serverName: string): Promise<ApiResponse> {
    return this.sendCommand('server_switch', playerName, { server: serverName })
  }

  /**
   * メッセージ送信コマンド
   */
  async sendMessageCommand(playerName: string, message: string): Promise<ApiResponse> {
    return this.sendCommand('message', playerName, { message })
  }

  /**
   * サーバーステータスリクエスト
   */
  async requestServerStatus(playerName: string, serverName?: string): Promise<ApiResponse> {
    return this.sendPlayerRequest('server_status', playerName, { serverName })
  }

  /**
   * プレイヤーリストリクエスト
   */
  async requestPlayerList(playerName: string, serverName?: string): Promise<ApiResponse> {
    return this.sendPlayerRequest('player_list', playerName, { serverName })
  }

  /**
   * サーバー情報リクエスト
   */
  async requestServerInfo(playerName: string, serverName?: string): Promise<ApiResponse> {
    return this.sendPlayerRequest('server_info', playerName, { serverName })
  }

  /**
   * HTTP リクエスト送信（内部メソッド）
   */
  private async sendRequest(endpoint: string, payload: Record<string, any>): Promise<ApiResponse> {
    const url = `${this.config.baseUrl}${endpoint}`
    
    try {
      console.debug('Sending request to:', url, payload)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // AWS IAM認証が必要な場合は、ここでSignature Version 4を実装
          // 現時点では簡単のためAPIキー認証やJWT認証を使用
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.debug('API response:', result)
      
      return result as ApiResponse

    } catch (error) {
      console.error('API request failed:', error)
      return {
        success: false,
        message: 'Failed to send request',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

// シングルトンインスタンス
let apiClient: KishaxApiClient | null = null

export function getApiClient(config?: Partial<ApiConfig>): KishaxApiClient {
  if (!apiClient) {
    apiClient = new KishaxApiClient(config as ApiConfig)
  }
  return apiClient
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
}