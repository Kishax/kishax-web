# Multi-stage Dockerfile for development and production
FROM node:22-alpine AS base

# 作業ディレクトリを設定
WORKDIR /app

# 基本パッケージをインストール
RUN apk add --no-cache git postgresql-client

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./
COPY prisma ./prisma/

# 依存関係をインストール（devDependenciesも含む、ビルド時に必要）
RUN npm ci

# Prismaクライアントを生成
RUN npx prisma generate

# Development base - kishax-api JARを含める
FROM base AS dev-base

# 開発環境用パッケージをインストール（curl、openjdk21追加）
RUN apk add --no-cache curl openjdk21-jre

# sqs-redis-bridge JARをMaven Centralからダウンロード（環境変数でバージョン指定）
ARG SQS_BRIDGE_VERSION=1.0.4

# Create lib directory
RUN mkdir -p /app/lib

# Copy local JAR if exists, otherwise download from Maven Central
COPY sqs-redis-bridge-*-with-dependencies.jar* /tmp/
RUN if [ -f "/tmp/sqs-redis-bridge-${SQS_BRIDGE_VERSION}-with-dependencies.jar" ]; then \
        cp "/tmp/sqs-redis-bridge-${SQS_BRIDGE_VERSION}-with-dependencies.jar" /app/lib/sqs-redis-bridge.jar ; \
    else \
        curl -o /app/lib/sqs-redis-bridge.jar https://repo1.maven.org/maven2/net/kishax/api/sqs-redis-bridge/${SQS_BRIDGE_VERSION}/sqs-redis-bridge-${SQS_BRIDGE_VERSION}-with-dependencies.jar ; \
    fi

# Development stage - with sqs-redis-bridge JAR
FROM dev-base AS development
ENV NODE_ENV=development
# Copy startup script
COPY scripts/start-kishax-aws.sh /app/scripts/
RUN chmod +x /app/scripts/start-kishax-aws.sh
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production stage - without sqs-redis-bridge JAR (ECS runs it independently)
FROM base AS production
ENV NODE_ENV=production

# アプリケーションのソースコードをコピー
COPY . .

# Next.jsアプリケーションをビルド
RUN npm run build

# 非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# ファイルの所有権を変更
RUN chown -R nextjs:nodejs /app
USER nextjs

# ポート3000を公開
EXPOSE 3000

# アプリケーションを起動（本番ではsqs-redis-bridgeを起動しない）
CMD ["npm", "start"]

# Default to production
FROM production
