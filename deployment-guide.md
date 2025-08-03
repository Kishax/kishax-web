# KishaX Next.js App Runner Deployment Guide

## 🚀 デプロイ手順

### 1. Secrets Manager設定

```bash
# 環境変数をSecrets Managerに保存
aws secretsmanager create-secret \
  --name "kishax-apprunner-secrets" \
  --description "KishaX App Runner環境変数" \
  --secret-string '{
    "NEXTAUTH_URL": "https://your-domain.awsapprunner.com",
    "NEXTAUTH_SECRET": "your-super-secret-key-minimum-32-chars",
    "DATABASE_URL": "postgresql://user:pass@rds-endpoint:5432/db",
    "GOOGLE_CLIENT_ID": "your-google-client-id",
    "GOOGLE_CLIENT_SECRET": "your-google-client-secret",
    "DISCORD_CLIENT_ID": "your-discord-client-id",
    "DISCORD_CLIENT_SECRET": "your-discord-client-secret",
    "TWITTER_CLIENT_ID": "your-twitter-client-id",
    "TWITTER_CLIENT_SECRET": "your-twitter-client-secret",
    "MC_SOCKET_HOST": "your-minecraft-server-host",
    "MC_SOCKET_PORT": "9999",
    "EMAIL_HOST": "smtp.gmail.com",
    "EMAIL_PORT": "587",
    "EMAIL_USER": "your-email@gmail.com",
    "EMAIL_PASS": "your-app-password"
  }' \
  --region ap-northeast-1
```

### 2. RDS PostgreSQL作成

```bash
aws rds create-db-instance \
  --db-instance-identifier kishax-postgres \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --backup-retention-period 7 \
  --storage-encrypted true
```

### 3. VPCコネクタ作成

```bash
aws apprunner create-vpc-connector \
  --vpc-connector-name kishax-vpc-connector \
  --subnets subnet-xxxxxxxxx subnet-yyyyyyyyy \
  --security-groups sg-xxxxxxxxx
```

### 4. App Runnerサービス作成

```bash
aws apprunner create-service \
  --service-name kishax-web \
  --source-configuration '{
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/your-username/kishax-nextjs",
      "SourceCodeVersion": {
        "Type": "BRANCH",
        "Value": "main"
      },
      "CodeConfiguration": {
        "ConfigurationSource": "REPOSITORY"
      }
    },
    "AutoDeploymentsEnabled": true
  }' \
  --instance-configuration '{
    "Cpu": "0.25 vCPU",
    "Memory": "0.5 GB"
  }' \
  --network-configuration '{
    "EgressConfiguration": {
      "EgressType": "VPC",
      "VpcConnectorArn": "arn:aws:apprunner:region:account:vpcconnector/kishax-vpc-connector"
    }
  }'
```

## 📊 脆弱性状況

✅ **0 vulnerabilities** - 完全にクリーン

## 🏗️ アーキテクチャ

```
GitHub → App Runner → RDS PostgreSQL
    ↓         ↓
 Auto Deploy  VPC Connect
```

## 🔐 セキュリティ機能

- NextAuth.js - OAuth + ローカル認証
- Secrets Manager - 機密情報管理
- VPC - セキュアなDB接続
- セキュリティヘッダー - XSS/Clickjacking対策
- CSRF保護 - 内蔵

## 🎯 主要機能

- ✅ ホームページ（認証状態対応）
- ✅ サインイン/サインアップ
- ✅ Google/Discord/Twitter OAuth
- ✅ チャート機能（Chart.js）
- ✅ Minecraft認証システム
- ✅ API Documentation（Scalar UI）
- ✅ PostgreSQL対応

## 💰 費用概算（東京リージョン）

- App Runner (0.25 vCPU, 0.5GB): ~$7/月
- RDS PostgreSQL (db.t3.micro): ~$13/月
- VPCコネクタ: ~$7/月
- **合計**: ~$27/月

## 🔧 デプロイ後の設定

### 1. データベースマイグレーション

```bash
# ローカルで実行
npx prisma migrate deploy
```

### 2. OAuth設定更新

各プロバイダーでリダイレクトURIを更新：
- Google: `https://your-domain.awsapprunner.com/api/auth/callback/google`
- Discord: `https://your-domain.awsapprunner.com/api/auth/callback/discord`
- Twitter: `https://your-domain.awsapprunner.com/api/auth/callback/twitter`

### 3. NEXTAUTH_URL更新

```bash
aws secretsmanager update-secret \
  --secret-id "kishax-apprunner-secrets" \
  --secret-string '{"NEXTAUTH_URL": "https://actual-domain.awsapprunner.com"}' \
  --region ap-northeast-1
```

## 📚 API Documentation

デプロイ後、以下でAPI仕様書を確認：
- `https://your-domain.awsapprunner.com/docs`