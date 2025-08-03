# 🐳 KishaX ローカル開発環境セットアップ

## 前提条件

- Docker & Docker Compose
- Node.js 22+
- Git

## 🚀 クイックスタート

### 1. リポジトリクローン & 環境設定

```bash
git clone https://github.com/your-username/kishax-nextjs.git
cd kishax-nextjs
cp .env.example .env
```

### 2. 環境変数設定

`.env`を編集して必要な値を設定：

```bash
# 最低限必要な設定
NEXTAUTH_SECRET=your-super-secret-key-minimum-32-characters-long
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kishax_db

# OAuth設定（開発用は任意）
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. PostgreSQLデータベース起動

```bash
# PostgreSQLデータベースのみ起動
npm run docker:up
# または
npm run docker:db
```

### 4. データベースセットアップ

```bash
# Prismaマイグレーション実行
npm run db:push

# データベース確認（ブラウザで開く）
npm run db:studio
```

### 5. 開発サーバー起動（別ターミナル）

```bash
# Next.js開発サーバー起動
npm run dev
```

アプリケーションが http://localhost:3000 で起動します！

## 📋 利用可能なコマンド

### Docker関連
```bash
npm run docker:up     # PostgreSQL起動（バックグラウンド）
npm run docker:db     # PostgreSQL起動（dbサービスのみ）
npm run docker:down   # Docker環境停止
npm run docker:logs   # PostgreSQLログ確認
```

### データベース関連
```bash
npm run db:push       # スキーマをDBに反映
npm run db:migrate    # マイグレーション実行
npm run db:studio     # Prisma Studio起動
npm run db:reset      # DB初期化
```

### 開発関連
```bash
npm run dev          # 開発サーバー起動（Turbopack）
npm run build        # 本番ビルド
npm run lint         # ESLint実行
```

## 🗃️ Docker Compose構成

### サービス
- **db**: PostgreSQL 16（データベースのみ）

### ポート
- **3000**: Next.jsアプリケーション（ローカル起動）
- **5432**: PostgreSQL
- **5555**: Prisma Studio（ローカル起動）

### ボリューム
- `postgres-data`: データベースデータ永続化

## 🔧 開発のワークフロー

### 1. 日常的な開発
```bash
# 1. PostgreSQL起動
npm run docker:up

# 2. 開発サーバー起動（別ターミナル）
npm run dev

# 3. コード変更...

# 4. 終了時
npm run docker:down
```

### 2. データベーススキーマ変更
```bash
# 1. prisma/schema.prismaを編集

# 2. スキーマをDBに反映
npm run db:push

# 3. 確認
npm run db:studio
```

### 3. 本番環境テスト
```bash
npm run build
npm run start
```

## 🐛 トラブルシューティング

### ポート競合
```bash
# ポート使用状況確認
lsof -i :3000
lsof -i :5432

# Docker環境リセット
npm run docker:down
docker system prune -f
npm run docker:up
```

### データベース接続エラー
```bash
# PostgreSQL状態確認
docker compose ps
docker compose logs db

# データベースリセット
npm run docker:down
docker volume rm kishax-nextjs_postgres-data
npm run docker:up
npm run db:push
```

### 依存関係エラー
```bash
# node_modules再インストール
rm -rf node_modules package-lock.json
npm install

# Prismaクライアント再生成
npx prisma generate
```

## 📚 API Documentation

開発環境でAPI仕様書を確認：
- http://localhost:3000/docs

## 🔒 認証機能テスト

### ローカル認証
1. http://localhost:3000/signup でアカウント作成
2. http://localhost:3000/signin でログイン

### OAuth認証
各プロバイダーの開発者コンソールで localhost:3000 のリダイレクトURIを設定：
- Google: `http://localhost:3000/api/auth/callback/google`
- Discord: `http://localhost:3000/api/auth/callback/discord`
- Twitter: `http://localhost:3000/api/auth/callback/twitter`