# Multi-stage Dockerfile for development and production
FROM node:22-alpine AS base

# 作業ディレクトリを設定
WORKDIR /app

# 開発に必要なパッケージをインストール（curl、openjdk21追加）
RUN apk add --no-cache git curl openjdk21-jre postgresql-client

# kishax-aws JARをMaven Centralからダウンロード（環境変数でバージョン指定）
ARG KISHAX_AWS_VERSION=1.0.2

# Create lib directory
RUN mkdir -p /app/lib

# Copy local JAR if exists, otherwise download from Maven Central
COPY kishax-aws-*-with-dependencies.jar* /tmp/
RUN if [ -f "/tmp/kishax-aws-${KISHAX_AWS_VERSION}-with-dependencies.jar" ]; then \
        cp "/tmp/kishax-aws-${KISHAX_AWS_VERSION}-with-dependencies.jar" /app/lib/kishax-aws.jar ; \
    else \
        curl -o /app/lib/kishax-aws.jar https://repo1.maven.org/maven2/net/kishax/aws/kishax-aws/${KISHAX_AWS_VERSION}/kishax-aws-${KISHAX_AWS_VERSION}-with-dependencies.jar ; \
    fi

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./
COPY prisma ./prisma/

# 依存関係をインストール（devDependenciesも含む、ビルド時に必要）
RUN npm ci

# Prismaクライアントを生成
RUN npx prisma generate

# Development stage
FROM base AS development
ENV NODE_ENV=development
# Copy startup script
COPY scripts/start-kishax-aws.sh /app/scripts/
RUN chmod +x /app/scripts/start-kishax-aws.sh
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
ENV NODE_ENV=production

# アプリケーションのソースコードをコピー
COPY . .

# Next.jsアプリケーションをビルド
RUN npm run build

# 非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy startup script and set permissions
COPY scripts/start-kishax-aws.sh /app/scripts/
RUN chmod +x /app/scripts/start-kishax-aws.sh

# ファイルの所有権を変更
RUN chown -R nextjs:nodejs /app
USER nextjs

# ポート3000を公開
EXPOSE 3000

# アプリケーションを起動（kishax-awsワーカーも含む）
CMD ["sh", "-c", "/app/scripts/start-kishax-aws.sh & npm start"]

# Default to production
FROM production
