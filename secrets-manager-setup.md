# AWS Secrets Manager Setup for KishaX

## 1. Secrets Manager Secrets作成

```bash
# KishaX App Runner用のSecrets作成
aws secretsmanager create-secret \
  --name "kishax-apprunner-secrets" \
  --description "KishaX App Runner環境変数" \
  --secret-string '{
    "NEXTAUTH_URL": "https://your-app-runner-domain.awsapprunner.com",
    "NEXTAUTH_SECRET": "your-super-secret-nextauth-key-32-chars-minimum",
    "DATABASE_URL": "postgresql://postgres:password@your-rds-endpoint.amazonaws.com:5432/kishax_db",
    "GOOGLE_CLIENT_ID": "your-google-oauth-client-id",
    "GOOGLE_CLIENT_SECRET": "your-google-oauth-client-secret",
    "DISCORD_CLIENT_ID": "your-discord-oauth-client-id",
    "DISCORD_CLIENT_SECRET": "your-discord-oauth-client-secret",
    "TWITTER_CLIENT_ID": "your-twitter-oauth-client-id",
    "TWITTER_CLIENT_SECRET": "your-twitter-oauth-client-secret",
    "MC_SOCKET_HOST": "your-minecraft-server-host-or-ip",
    "MC_SOCKET_PORT": "9999",
    "EMAIL_HOST": "smtp.gmail.com",
    "EMAIL_PORT": "587",
    "EMAIL_USER": "your-email@gmail.com",
    "EMAIL_PASS": "your-gmail-app-password"
  }' \
  --region ap-northeast-1
```

## 2. App Runner IAMロール設定

App RunnerがSecrets Managerにアクセスできるよう、IAMロールにポリシーを追加：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:kishax-apprunner-secrets-*"
        }
    ]
}
```

## 3. Secrets更新コマンド

```bash
# 特定の値のみ更新する場合
aws secretsmanager update-secret \
  --secret-id "kishax-apprunner-secrets" \
  --secret-string '{
    "NEXTAUTH_URL": "https://new-domain.awsapprunner.com",
    "DATABASE_URL": "postgresql://postgres:newpassword@new-rds-endpoint.amazonaws.com:5432/kishax_db"
  }' \
  --region ap-northeast-1
```

## 4. App Runnerサービス作成時の注意点

- VPCコネクタが必要（RDS接続用）
- 環境変数はapprunner.yamlのsecretsセクションで自動設定
- デプロイ時にSecrets Managerから値が自動取得される

## 5. 本番環境での設定値

### NEXTAUTH_URL
App Runnerのデプロイ後に取得されるURLを設定

### DATABASE_URL
RDS PostgreSQLのエンドポイント情報

### OAuth設定
各プロバイダーの本番用クライアントID/シークレット

### Minecraft設定
本番Minecraftサーバーのホスト・ポート

### Email設定
本番用メールサーバー設定