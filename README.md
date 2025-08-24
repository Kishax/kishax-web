# KishaX

次世代認証システム搭載のモダンWebアプリケーション

[![Visit Website](https://img.shields.io/badge/Visit_Website-007BFF?style=for-the-badge)](https://kishax.net/)
[![Vulnerabilities](https://img.shields.io/badge/Vulnerabilities-0-success?style=for-the-badge)](https://github.com/your-username/kishax-nextjs)

## 🚀 クイックスタート

### 環境設定
```bash
cp .env.example .env
```

### 開発方法を選択

#### 🔥 方法A: ホスト実行（推奨）
```bash
npm run docker:db    # PostgreSQLのみ起動
npm run db:push      # DBスキーマ反映
npm run dev          # 開発サーバー起動
```

#### 🐳 方法B: Docker実行
```bash
npm run docker:dev   # DB+APP同時起動
npm run db:push      # DBスキーマ反映
```

→ http://localhost:3000

## 🎯 主要機能

- **認証システム**: NextAuth.js v5 + OAuth (Google/Discord/Twitter)
- **データベース**: PostgreSQL + Prisma ORM
- **チャート**: Chart.js統合
- **Minecraft連携**: 独自認証システム
- **API仕様書**: OpenAPI 3.0 + Scalar UI
- **セキュリティ**: CSRF保護、XSS対策

## 📋 コマンド一覧

### 開発
```bash
npm run dev          # 開発サーバー
npm run build        # 本番ビルド
npm run lint         # コード検証
```

### Docker
```bash
npm run docker:dev   # 全サービス起動
npm run docker:db    # PostgreSQLのみ
npm run docker:down  # 停止
```

### データベース
```bash
npm run db:push      # スキーマ反映
npm run db:studio    # GUI管理画面
npm run db:migrate   # マイグレーション
```

### 4. デプロイ後設定
```bash
# データベース初期化
npx prisma migrate deploy
```

## 🏗️ 技術スタック

- **フレームワーク**: Next.js 15 + React 19
- **認証**: NextAuth.js v5
- **データベース**: PostgreSQL + Prisma
- **スタイリング**: Tailwind CSS v4
- **コンテナ**: Docker Compose

## 🤝 コントリビューション

開発者・サポーター・アドバイザーを募集中！  
CSS/HTML、Node.jsサーバーコードに興味がある方は [support@kishax.net](<mailto:support@kishax.net>) まで。

---

Based on [mlgta](https://github.com/takayamaekawa/mlgta) - TypeScript版として最初に開発
