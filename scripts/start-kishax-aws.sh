#!/bin/sh

# sqs-redis-bridge Worker startup script for Web side

echo "🚀 Starting sqs-redis-bridge worker on Web side..."

# AWS SQS Configuration
export MC_WEB_SQS_ACCESS_KEY_ID=${MC_WEB_SQS_ACCESS_KEY_ID}
export MC_WEB_SQS_SECRET_ACCESS_KEY=${MC_WEB_SQS_SECRET_ACCESS_KEY}
export AWS_REGION=${AWS_REGION:-ap-northeast-1}
export MC_TO_WEB_QUEUE_URL=${MC_TO_WEB_QUEUE_URL}
export WEB_TO_MC_QUEUE_URL=${WEB_TO_MC_QUEUE_URL}

# Redis Configuration
export REDIS_URL=${REDIS_URL:-redis://localhost:6379}
export REDIS_CONNECTION_TIMEOUT=${REDIS_CONNECTION_TIMEOUT:-5000}
export REDIS_COMMAND_TIMEOUT=${REDIS_COMMAND_TIMEOUT:-3000}

# Queue Configuration
export QUEUE_MODE=${QUEUE_MODE:-WEB}
export SQS_WORKER_ENABLED=${SQS_WORKER_ENABLED:-true}
export SQS_WORKER_POLLING_INTERVAL_SECONDS=${SQS_WORKER_POLLING_INTERVAL_SECONDS:-5}
export SQS_WORKER_MAX_MESSAGES=${SQS_WORKER_MAX_MESSAGES:-10}
export SQS_WORKER_WAIT_TIME_SECONDS=${SQS_WORKER_WAIT_TIME_SECONDS:-20}
export SQS_WORKER_VISIBILITY_TIMEOUT_SECONDS=${SQS_WORKER_VISIBILITY_TIMEOUT_SECONDS:-30}

# Authentication API Configuration
export AUTH_API_ENABLED=${AUTH_API_ENABLED:-true}
export AUTH_API_PORT=${AUTH_API_PORT:-8080}
export AUTH_API_KEY=${AUTH_API_KEY}

# Web API Configuration
export WEB_API_KEY=${WEB_API_KEY}
export WEB_API_URL=${WEB_API_URL:-http://localhost:3000}

# Database Configuration
export DATABASE_URL=${DATABASE_URL}

# Application Configuration
export APP_SHUTDOWN_GRACE_PERIOD_SECONDS=${APP_SHUTDOWN_GRACE_PERIOD_SECONDS:-10}

# Log configuration
export LOG_LEVEL=${LOG_LEVEL:-INFO}
export AWS_SDK_LOG_LEVEL=${AWS_SDK_LOG_LEVEL:-WARN}
export LETTUCE_LOG_LEVEL=${LETTUCE_LOG_LEVEL:-WARN}

# Check if JAR exists
if [ ! -f "/app/lib/sqs-redis-bridge.jar" ]; then
  echo "❌ sqs-redis-bridge.jar not found at /app/lib/sqs-redis-bridge.jar"
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

# Start sqs-redis-bridge worker in background
java -jar /app/lib/sqs-redis-bridge.jar &
SQS_BRIDGE_PID=$!

echo "✅ sqs-redis-bridge worker started with PID: $SQS_BRIDGE_PID"

# Create PID file for later cleanup
echo $SQS_BRIDGE_PID >/app/sqs-redis-bridge.pid

# Function to handle shutdown
cleanup() {
  echo "🛑 Stopping sqs-redis-bridge worker..."
  if [ -f "/app/sqs-redis-bridge.pid" ]; then
    PID=$(cat /app/sqs-redis-bridge.pid)
    kill $PID 2>/dev/null
    rm -f /app/sqs-redis-bridge.pid
    echo "✅ sqs-redis-bridge worker stopped"
  fi
}

# Set up signal handlers
trap cleanup TERM INT

# Wait for background process
wait $SQS_BRIDGE_PID
