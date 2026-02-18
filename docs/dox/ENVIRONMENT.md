# Environment Variables

Configuration reference for all Grid8 services.

---

## Overview

Each service requires environment variables for configuration. Copy `.env.example` to `.env` in each service directory for local development.

---

## Common Variables

These variables are shared across multiple services:

```bash
# Node Environment
NODE_ENV=development|production|test

# MongoDB
MONGODB_URI=mongodb://localhost:27017/grid8_service
MONGODB_USER=
MONGODB_PASS=

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-west-1
S3_BUCKET=grid8-assets

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Service URLs (for inter-service communication)
AUTH_SERVICE_URL=http://localhost:3000
ASSET_SERVICE_URL=http://localhost:3001
DCO_SERVICE_URL=http://localhost:3002
CORP_SERVICE_URL=http://localhost:3003

# Logging
LOG_LEVEL=debug|info|warn|error
```

---

## Auth Service

```bash
# Server
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/grid8_auth

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d

# Password Reset
PASSWORD_RESET_EXPIRES=1h

# Session
SESSION_SECRET=your-session-secret

# Redis (for session storage)
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Bcrypt
BCRYPT_ROUNDS=12

# Email (for password reset)
MAIL_SERVICE_URL=http://localhost:3005

# Admin User (initial setup)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=initial-admin-password
```

---

## Asset Service

```bash
# Server
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/grid8_asset

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-west-1
S3_BUCKET=grid8-assets
S3_BUCKET_THUMBNAILS=grid8-thumbnails

# S3 URL Configuration
S3_ENDPOINT=https://s3.eu-west-1.amazonaws.com
S3_CDN_URL=https://cdn.example.com

# Upload Limits
MAX_FILE_SIZE=52428800  # 50MB in bytes
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/gif,image/webp,video/mp4

# Image Processing
THUMBNAIL_WIDTH=200
THUMBNAIL_HEIGHT=200
THUMBNAIL_QUALITY=80
IMAGE_MAX_WIDTH=4096
IMAGE_MAX_HEIGHT=4096

# Auth Service
AUTH_SERVICE_URL=http://localhost:3000
```

---

## DCO Service

```bash
# Server
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/grid8_dco

# Auth Service
AUTH_SERVICE_URL=http://localhost:3000

# Asset Service
ASSET_SERVICE_URL=http://localhost:3001

# Preview Configuration
PREVIEW_BASE_URL=https://preview.example.com
PREVIEW_EXPIRY_DAYS=7

# DPA Service (for screenshots)
DPA_SERVICE_URL=http://localhost:3030

# Swagger
SWAGGER_ENABLED=true
SWAGGER_PATH=/docs

# Feature Flags
ENABLE_VERSION_DIFF=true
ENABLE_AUTO_SAVE=true
AUTO_SAVE_INTERVAL=30000
```

---

## Corp Service

```bash
# Server
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/grid8_corp

# Auth Service
AUTH_SERVICE_URL=http://localhost:3000

# Asset Service (for logos)
ASSET_SERVICE_URL=http://localhost:3001

# Default Settings
DEFAULT_TEAM_PERMISSIONS=view_analytics,create_ad,edit_ad
MAX_TEAM_MEMBERS=50
MAX_PROJECTS_PER_BRAND=100
```

---

## Comment Service

```bash
# Server
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/grid8_comment

# Auth Service
AUTH_SERVICE_URL=http://localhost:3000

# Notifications
WEBSOCKET_SERVICE_URL=http://localhost:3006

# Comment Settings
MAX_COMMENT_LENGTH=5000
MAX_ATTACHMENTS=5
ENABLE_MENTIONS=true
```

---

## Mail Service

```bash
# Server
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/grid8_mail

# AWS SES
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-west-1

# SES Configuration
SES_FROM_EMAIL=noreply@example.com
SES_FROM_NAME=Grid8

# Mailgun (alternative)
MAILGUN_API_KEY=
MAILGUN_DOMAIN=

# Email Settings
EMAIL_PROVIDER=ses|mailgun
ENABLE_EMAIL_TRACKING=true

# Rate Limiting
EMAIL_RATE_LIMIT=100  # per hour

# Auth Service
AUTH_SERVICE_URL=http://localhost:3000
```

---

## DPA Service

```bash
# Server
PORT=3030

# MongoDB
MONGODB_URI=mongodb://localhost:27017/grid8_dpa

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-west-1
S3_BUCKET=grid8-feeds
S3_BUCKET_SCREENSHOTS=grid8-screenshots

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_HEADLESS=true
PUPPETEER_NO_SANDBOX=true

# Screenshot Settings
SCREENSHOT_WIDTH=1920
SCREENSHOT_HEIGHT=1080
SCREENSHOT_QUALITY=90

# Feed Processing
FEED_PROCESSOR_CONCURRENCY=5
FEED_MAX_ROWS=10000
CSV_DELIMITER=,

# Worker Settings
WORKER_ENABLED=true
WORKER_POLL_INTERVAL=5000

# Auth Service
AUTH_SERVICE_URL=http://localhost:3000
```

---

## Tools Service

```bash
# Server
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/grid8_tools

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-west-1
S3_BUCKET=grid8-tools

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_HEADLESS=true

# Processing Limits
MAX_CSV_SIZE=10485760  # 10MB
MAX_TRANSFORM_ROWS=50000

# Auth Service
AUTH_SERVICE_URL=http://localhost:3000
```

---

## WebSocket Server

```bash
# Server
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/grid8_notifications

# Redis (for pub/sub)
REDIS_URL=redis://localhost:6379
REDIS_CHANNEL=grid8_notifications

# WebSocket
WS_PATH=/ws
WS_PING_INTERVAL=30000
WS_PING_TIMEOUT=5000

# SSE
SSE_PATH=/events
SSE_RETRY_INTERVAL=3000

# Auth Service
AUTH_SERVICE_URL=http://localhost:3000

# Notification Settings
NOTIFICATION_TTL_DAYS=30
MAX_NOTIFICATIONS_PER_USER=1000
```

---

## FrontenX

```bash
# Server
PORT=3011

# Session
SESSION_SECRET=your-session-secret
SESSION_MAX_AGE=86400000  # 24 hours

# Redis (for sessions)
REDIS_URL=redis://localhost:6379

# API Services
AUTH_SERVICE_URL=http://localhost:3000
ASSET_SERVICE_URL=http://localhost:3001
DCO_SERVICE_URL=http://localhost:3002
CORP_SERVICE_URL=http://localhost:3003
COMMENT_SERVICE_URL=http://localhost:3004
MAIL_SERVICE_URL=http://localhost:3005
WEBSOCKET_SERVICE_URL=http://localhost:3006

# S3 (direct uploads)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-west-1
S3_BUCKET=grid8-assets

# Mailgun
MAILGUN_API_KEY=
MAILGUN_DOMAIN=

# Public URLs
PUBLIC_URL=http://localhost:3011
CDN_URL=https://cdn.example.com
PREVIEW_URL=https://preview.example.com

# Feature Flags
ENABLE_ANALYTICS=false
ENABLE_DEBUG_MODE=true
```

---

## Admin Dashboard

```bash
# Build-time variables (prefixed with REACT_APP_)
REACT_APP_API_URL=https://dev.internaldisxt.com/api
REACT_APP_WS_URL=wss://dev.internaldisxt.com/api/ws
REACT_APP_CDN_URL=https://cdn.example.com
REACT_APP_VERSION=$npm_package_version
REACT_APP_ENV=development

# Optional
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_SENTRY_DSN=
REACT_APP_GA_TRACKING_ID=
```

---

## Client Dashboard

```bash
# Build-time variables (prefixed with REACT_APP_)
REACT_APP_API_URL=https://dev.internaldisxt.com/api
REACT_APP_WS_URL=wss://dev.internaldisxt.com/api/ws
REACT_APP_CDN_URL=https://cdn.example.com
REACT_APP_VERSION=$npm_package_version
REACT_APP_ENV=development

# Optional
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_SENTRY_DSN=
```

---

## Kubernetes Secrets

In production, sensitive variables are stored as Kubernetes secrets:

```yaml
# Example: auth-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: auth-secrets
  namespace: dco-production
type: Opaque
data:
  JWT_SECRET: base64-encoded-value
  MONGODB_PASS: base64-encoded-value
  REDIS_PASSWORD: base64-encoded-value
```

### Accessing in Pods

```yaml
# Deployment example
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: auth-secrets
        key: JWT_SECRET
```

---

## Environment-Specific Configurations

### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
MONGODB_URI=mongodb://localhost:27017/grid8_dev
REDIS_URL=redis://localhost:6379
```

### Staging

```bash
NODE_ENV=staging
LOG_LEVEL=info
MONGODB_URI=mongodb://mongo-staging:27017/grid8_staging
REDIS_URL=redis://redis-staging:6379
```

### Production

```bash
NODE_ENV=production
LOG_LEVEL=warn
MONGODB_URI=mongodb+srv://cluster.mongodb.net/grid8_prod
REDIS_URL=redis://redis-prod.cache.amazonaws.com:6379
```

---

## Security Notes

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use strong secrets** - Minimum 32 characters for JWT secrets
3. **Rotate secrets regularly** - Especially in production
4. **Use different secrets per environment** - Dev/staging/production
5. **Escape special characters** - Especially in MongoDB passwords (use URL encoding)

### MongoDB Password Escaping

If your password contains special characters:

```bash
# Original password: p@ss:word/123
# URL encoded: p%40ss%3Aword%2F123
MONGODB_URI=mongodb://user:p%40ss%3Aword%2F123@localhost:27017/db
```

---

*See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment configuration details.*
