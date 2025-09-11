#!/bin/sh

# kishax-aws Worker startup script for Web side

echo "🚀 Starting kishax-aws worker on Web side..."

# Environment variables for kishax-aws
export MC_WEB_SQS_ACCESS_KEY_ID=${MC_WEB_SQS_ACCESS_KEY_ID}
export MC_WEB_SQS_SECRET_ACCESS_KEY=${MC_WEB_SQS_SECRET_ACCESS_KEY}
export AWS_REGION=${AWS_REGION:-us-east-1}
export MC_TO_WEB_QUEUE_URL=${MC_TO_WEB_QUEUE_URL}
export WEB_TO_MC_QUEUE_URL=${WEB_TO_MC_QUEUE_URL}
export REDIS_URL=${REDIS_URL:-redis://localhost:6379}

# Log configuration
export LOG_LEVEL=${LOG_LEVEL:-INFO}
export AWS_SDK_LOG_LEVEL=${AWS_SDK_LOG_LEVEL:-WARN}
export LETTUCE_LOG_LEVEL=${LETTUCE_LOG_LEVEL:-WARN}

# Check if JAR exists
if [ ! -f "/app/lib/kishax-aws.jar" ]; then
  echo "❌ kishax-aws.jar not found at /app/lib/kishax-aws.jar"
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

# Start kishax-aws worker in background
java -jar /app/lib/kishax-aws.jar &
KISHAX_PID=$!

echo "✅ kishax-aws worker started with PID: $KISHAX_PID"

# Create PID file for later cleanup
echo $KISHAX_PID >/app/kishax-aws.pid

# Function to handle shutdown
cleanup() {
  echo "🛑 Stopping kishax-aws worker..."
  if [ -f "/app/kishax-aws.pid" ]; then
    PID=$(cat /app/kishax-aws.pid)
    kill $PID 2>/dev/null
    rm -f /app/kishax-aws.pid
    echo "✅ kishax-aws worker stopped"
  fi
}

# Set up signal handlers
trap cleanup TERM INT

# Wait for background process
wait $KISHAX_PID

