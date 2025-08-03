# App Runner用のDockerfile（必要に応じて）
FROM node:22-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./
COPY prisma ./prisma/

# 依存関係をインストール
RUN npm ci --only=production

# Prismaクライアントを生成
RUN npx prisma generate

# アプリケーションのソースコードをコピー
COPY . .

# Next.jsアプリケーションをビルド
RUN npm run build

# ポート3000を公開
EXPOSE 3000

# 非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# ファイルの所有権を変更
RUN chown -R nextjs:nodejs /app
USER nextjs

# アプリケーションを起動
CMD ["npm", "start"]