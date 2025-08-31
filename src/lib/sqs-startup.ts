import { getSQSPoller } from "./sqs-poller"

// Next.js 開発環境でのみSQSポーリングを開始
export function initializeSQSPolling() {
  if (process.env.NODE_ENV === 'development') {
    console.log("Initializing SQS polling for development...")
    
    const poller = getSQSPoller()
    poller.startPolling()

    // プロセス終了時にポーリングを停止
    process.on('SIGINT', () => {
      console.log("Shutting down SQS poller...")
      poller.stopPolling()
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      console.log("Shutting down SQS poller...")
      poller.stopPolling()
      process.exit(0)
    })
  }
}