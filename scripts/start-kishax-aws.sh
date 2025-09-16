#!/bin/sh

# kishax-api Worker startup script for Web side

echo "🚀 Starting kishax-api worker on Web side..."

# Environment variables for kishax-api
export MC_WEB_SQS_ACCESS_KEY_ID=${MC_WEB_SQS_ACCESS_KEY_ID}
export MC_WEB_SQS_SECRET_ACCESS_KEY=${MC_WEB_SQS_SECRET_ACCESS_KEY}
export AWS_REGION=${AWS_REGION:-ap-northeast-1}
export MC_TO_WEB_QUEUE_URL=${MC_TO_WEB_QUEUE_URL}
export WEB_TO_MC_QUEUE_URL=${WEB_TO_MC_QUEUE_URL}
export REDIS_URL=${REDIS_URL:-redis://localhost:6379}
export QUEUE_MODE=${QUEUE_MODE:-WEB}
export WEB_API_KEY=${WEB_API_KEY}
export WEB_API_URL=${WEB_API_URL:-http://localhost:3000}

# Log configuration
export LOG_LEVEL=${LOG_LEVEL:-INFO}
export AWS_SDK_LOG_LEVEL=${AWS_SDK_LOG_LEVEL:-WARN}
export LETTUCE_LOG_LEVEL=${LETTUCE_LOG_LEVEL:-WARN}

# Check if JAR exists
if [ ! -f "/app/lib/kishax-api.jar" ]; then
  echo "❌ kishax-api.jar not found at /app/lib/kishax-api.jar"
  exit 1
fi

# Check required environment variables
if [ -z "$MC_WEB_SQS_ACCESS_KEY_ID" ] || [ -z "$MC_WEB_SQS_SECRET_ACCESS_KEY" ]; then
  echo "⚠️ Warning: AWS credentials not provided, SQS functionality will be disabled"
fi

if [ -z "$MC_TO_WEB_QUEUE_URL" ] || [ -z "$WEB_TO_MC_QUEUE_URL" ]; then
  echo "⚠️ Warning: SQS Queue URLs not provided, some functionality may be limited"
fi

echo "📡 Connecting to Redis at: $REDIS_URL"
echo "🌍 AWS Region: $AWS_REGION"

# Start kishax-api worker in background
java -jar /app/lib/kishax-api.jar &
KISHAX_PID=$!

echo "✅ kishax-api worker started with PID: $KISHAX_PID"

# Create PID file for later cleanup
echo $KISHAX_PID >/app/kishax-api.pid

# Function to handle shutdown
cleanup() {
  echo "🛑 Stopping kishax-api worker..."
  if [ -f "/app/kishax-api.pid" ]; then
    PID=$(cat /app/kishax-api.pid)
    kill $PID 2>/dev/null
    rm -f /app/kishax-api.pid
    echo "✅ kishax-api worker stopped"
  fi
}

# Set up signal handlers
trap cleanup TERM INT

# Wait for background process
wait $KISHAX_PID
