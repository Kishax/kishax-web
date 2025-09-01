"use client"

import React, { createContext, useContext, useEffect, useRef } from 'react'
import { getSqsMessageProcessor, SqsMessageProcessor } from '@/lib/sqs-client'

interface SqsMessageContextType {
  processor: SqsMessageProcessor | null
  registerHandler: (messageType: string, handler: (message: unknown) => Promise<void>) => void
}

const SqsMessageContext = createContext<SqsMessageContextType>({
  processor: null,
  registerHandler: () => {}
})

export function useSqsMessages() {
  return useContext(SqsMessageContext)
}

interface SqsMessageProviderProps {
  children: React.ReactNode
  autoStart?: boolean
  config?: {
    region?: string
    queueUrl?: string
    maxMessages?: number
    waitTimeSeconds?: number
  }
}

export function SqsMessageProvider({ 
  children, 
  autoStart = true,
  config 
}: SqsMessageProviderProps) {
  const processorRef = useRef<SqsMessageProcessor | null>(null)

  useEffect(() => {
    // SQSプロセッサーを初期化
    try {
      processorRef.current = getSqsMessageProcessor(config)
      
      if (autoStart && processorRef.current) {
        // デフォルトハンドラーを登録
        processorRef.current.registerHandler('mc_web_auth_response', async (message) => {
          console.log('Auth response received:', message.data)
          // カスタムイベントを発火してUIに通知
          window.dispatchEvent(new CustomEvent('mcAuthResponse', { 
            detail: message.data 
          }))
        })

        processorRef.current.registerHandler('mc_web_player_status', async (message) => {
          console.log('Player status received:', message.data)
          window.dispatchEvent(new CustomEvent('mcPlayerStatus', { 
            detail: message.data 
          }))
        })

        processorRef.current.registerHandler('mc_web_server_info', async (message) => {
          console.log('Server info received:', message.data)
          window.dispatchEvent(new CustomEvent('mcServerInfo', { 
            detail: message.data 
          }))
        })

        processorRef.current.registerHandler('mc_otp_response', async (message) => {
          console.log('OTP response received:', message.data)
          const data = message.data as { mcid: string; uuid: string; success: boolean; message: string; timestamp: number }
          
          // OTPレスポンスをグローバルキャッシュに保存
          global.otpResponses = global.otpResponses || new Map()
          global.otpResponses.set(`${data.mcid}_${data.uuid}`, {
            success: data.success,
            message: data.message,
            timestamp: data.timestamp,
            received: true
          })
          
          // カスタムイベントを発火してUIに通知
          window.dispatchEvent(new CustomEvent('mcOtpResponse', { 
            detail: data 
          }))
        })

        // ポーリング開始
        processorRef.current.startPolling()
        console.log('SQS message polling started')
      }
    } catch (error) {
      console.error('Failed to initialize SQS processor:', error)
    }

    // クリーンアップ
    return () => {
      if (processorRef.current) {
        processorRef.current.destroy()
        processorRef.current = null
      }
    }
  }, [autoStart, config])

  const registerHandler = (messageType: string, handler: (message: unknown) => Promise<void>) => {
    if (processorRef.current) {
      processorRef.current.registerHandler(messageType, handler)
    }
  }

  const contextValue: SqsMessageContextType = {
    processor: processorRef.current,
    registerHandler
  }

  return (
    <SqsMessageContext.Provider value={contextValue}>
      {children}
    </SqsMessageContext.Provider>
  )
}