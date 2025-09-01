import { createClient } from 'redis'

type RedisClientType = ReturnType<typeof createClient>

// Redisクライアントのシングルトンインスタンス
let redisClient: RedisClientType | null = null

/**
 * Redisクライアントを取得
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000
      }
    })

    redisClient.on('error', (error) => {
      console.error('Redis connection error:', error)
    })

    redisClient.on('connect', () => {
      console.log('Redis connected successfully')
    })

    redisClient.on('disconnect', () => {
      console.log('Redis disconnected')
    })

    await redisClient.connect()
  }

  return redisClient
}

/**
 * Redisクライアントを閉じる
 */
export async function closeRedisClient() {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}

/**
 * OTPレスポンスをRedisに保存
 */
export async function setOtpResponse(mcid: string, uuid: string, response: { success: boolean; message: string; timestamp: number }) {
  const client = await getRedisClient()
  const key = `otp_response:${mcid}_${uuid}`
  const value = JSON.stringify({ ...response, received: true })
  
  // 5分間のTTLを設定
  await client.setEx(key, 300, value)
  console.log(`OTP response saved to Redis: ${key}`)
}

/**
 * OTPレスポンスをRedisから取得
 */
export async function getOtpResponse(mcid: string, uuid: string): Promise<{ success: boolean; message: string; timestamp: number; received: boolean } | null> {
  try {
    const client = await getRedisClient()
    const key = `otp_response:${mcid}_${uuid}`
    const value = await client.get(key)
    
    if (value) {
      // 取得後は削除
      await client.del(key)
      return JSON.parse(value)
    }
    
    return null
  } catch (error) {
    console.error('Error getting OTP response from Redis:', error)
    return null
  }
}

/**
 * OTPレスポンスが存在するかチェック
 */
export async function hasOtpResponse(mcid: string, uuid: string): Promise<boolean> {
  try {
    const client = await getRedisClient()
    const key = `otp_response:${mcid}_${uuid}`
    const exists = await client.exists(key)
    return exists === 1
  } catch (error) {
    console.error('Error checking OTP response in Redis:', error)
    return false
  }
}

/**
 * Redis Pub/SubでOTPレスポンスを待機
 */
export async function waitForOtpResponse(mcid: string, uuid: string, timeoutMs: number = 30000): Promise<{ success: boolean; message: string; timestamp: number } | null> {
  // For subscriptions, we need a dedicated client that is duplicated from the main one.
  const client = await getRedisClient();
  const subscriber = client.duplicate();
  await subscriber.connect();

  const channelName = `otp_response:${mcid}_${uuid}`;

  return new Promise((resolve) => {
    let timeoutId: NodeJS.Timeout | undefined;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      // Unsubscribe and quit the duplicated client.
      // Errors are ignored as we are cleaning up.
      subscriber.unsubscribe(channelName).catch(() => {});
      subscriber.quit().catch(() => {});
    };

    const listener = (message: string) => {
      try {
        const data = JSON.parse(message);
        resolve({
          success: data.success,
          message: data.message,
          timestamp: data.timestamp,
        });
      } catch (e) {
        console.error('Error parsing OTP response message:', e);
        resolve(null);
      } finally {
        cleanup();
      }
    };

    subscriber.on('error', (err) => {
      console.error('Redis subscriber error:', err);
      resolve(null);
      cleanup();
    });

    timeoutId = setTimeout(() => {
      console.log(`Timeout waiting for OTP response on ${channelName}`);
      resolve(null);
      cleanup();
    }, timeoutMs);

    // Subscribe to the channel and start listening.
    subscriber.subscribe(channelName, listener);
    console.log(`🔔 Subscribed to OTP response channel: ${channelName}`);
  });
}