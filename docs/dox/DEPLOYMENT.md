# Deployment Guide

Docker, Kubernetes, and CI/CD deployment for Grid8.

---

## Overview

Grid8 supports multiple deployment methods:

1. **Local Development** - Docker Compose
2. **Staging/Production** - Kubernetes with Helm
3. **CI/CD** - GitLab CI/CD pipelines

---

## Local Development

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Yarn or npm
- MongoDB (or use Docker)
- Redis (or use Docker)

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd grid8

# Start infrastructure (MongoDB, Redis)
docker-compose -f docker-compose.infra.yml up -d

# Install dependencies for a service
cd auth
yarn install

# Copy environment file
cp .env.example .env

# Start development server
yarn dev
```

### Docker Compose - Full Stack

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  auth:
    build: ./auth
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://root:password@mongodb:27017/grid8_auth?authSource=admin
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis

  asset:
    build: ./asset
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://root:password@mongodb:27017/grid8_asset?authSource=admin
      - AUTH_SERVICE_URL=http://auth:3000
    depends_on:
      - mongodb
      - auth

  dco:
    build: ./dco
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://root:password@mongodb:27017/grid8_dco?authSource=admin
      - AUTH_SERVICE_URL=http://auth:3000
      - ASSET_SERVICE_URL=http://asset:3000
    depends_on:
      - mongodb
      - auth
      - asset

  # ... additional services

volumes:
  mongodb_data:
  redis_data:
```

### Running Individual Services

```bash
# Terminal 1: Auth service
cd auth && yarn dev

# Terminal 2: Asset service
cd asset && yarn dev

# Terminal 3: DCO service
cd dco && yarn dev

# Terminal 4: Frontend
cd frontenX && yarn dev
```

---

## Docker Images

### Dockerfile Template

```dockerfile
# Base stage
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Dependencies stage
FROM base AS deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# Production stage
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nodejs
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Building Images

```bash
# Build single service
docker build -t grid8/auth:latest ./auth

# Build all services
docker-compose build

# Push to registry
docker push registry.example.com/grid8/auth:latest
```

---

## Kubernetes Deployment

### Namespace Structure

```
dco-development-*        # Development environment
dco-staging-*            # Staging environment
dco-production-*         # Production environment
```

### Deployment Manifest

```yaml
# auth/deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: dco-production
  labels:
    app: auth
    tier: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth
  template:
    metadata:
      labels:
        app: auth
    spec:
      containers:
        - name: auth
          image: registry.example.com/grid8/auth:latest
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3000"
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: auth-secrets
                  key: JWT_SECRET
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: auth-secrets
                  key: MONGODB_URI
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Service Manifest

```yaml
# auth/deploy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: dco-production
spec:
  selector:
    app: auth
  ports:
    - protocol: TCP
      port: 3000
      targetPort: 3000
  type: ClusterIP
```

### Ingress Configuration

```yaml
# ingress/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grid8-ingress
  namespace: dco-production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api/auth
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 3000
          - path: /api/asset
            pathType: Prefix
            backend:
              service:
                name: asset-service
                port:
                  number: 3000
          - path: /api/dco
            pathType: Prefix
            backend:
              service:
                name: dco-service
                port:
                  number: 3000
          # ... additional paths
```

### ConfigMap

```yaml
# config/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grid8-config
  namespace: dco-production
data:
  LOG_LEVEL: "info"
  S3_REGION: "eu-west-1"
  S3_BUCKET: "grid8-prod-assets"
```

### Secrets

```yaml
# secrets/auth-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: auth-secrets
  namespace: dco-production
type: Opaque
stringData:
  JWT_SECRET: "your-production-jwt-secret"
  MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/grid8"
  REDIS_PASSWORD: "redis-password"
```

---

## Helm Charts

### Chart Structure

```
helm/
├── Chart.yaml
├── values.yaml
├── values-dev.yaml
├── values-staging.yaml
├── values-prod.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── configmap.yaml
    ├── secrets.yaml
    └── _helpers.tpl
```

### values.yaml

```yaml
# Default values
replicaCount: 1

image:
  repository: registry.example.com/grid8
  pullPolicy: IfNotPresent
  tag: "latest"

services:
  auth:
    enabled: true
    port: 3000
    replicas: 2
  asset:
    enabled: true
    port: 3000
    replicas: 2
  dco:
    enabled: true
    port: 3000
    replicas: 3

mongodb:
  enabled: false
  uri: ""

redis:
  enabled: false
  url: ""

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: api.example.com
      paths:
        - path: /api
          pathType: Prefix

resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Helm Commands

```bash
# Install/upgrade
helm upgrade --install grid8 ./helm \
  -f values-prod.yaml \
  --namespace dco-production \
  --create-namespace

# Check status
helm status grid8 -n dco-production

# Rollback
helm rollback grid8 1 -n dco-production

# Uninstall
helm uninstall grid8 -n dco-production
```

---

## GitLab CI/CD

### .gitlab-ci.yml Template

```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_REGISTRY: registry.example.com
  IMAGE_TAG: $CI_COMMIT_SHORT_SHA

# Test stage
test:
  stage: test
  image: node:18
  script:
    - yarn install
    - yarn lint
    - yarn test
  rules:
    - if: $CI_MERGE_REQUEST_ID

# Build stage
build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $DOCKER_REGISTRY
    - docker build -t $DOCKER_REGISTRY/grid8/$SERVICE_NAME:$IMAGE_TAG .
    - docker push $DOCKER_REGISTRY/grid8/$SERVICE_NAME:$IMAGE_TAG
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

# Deploy to development
deploy-dev:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config set-context --current --namespace=dco-development
    - kubectl set image deployment/$SERVICE_NAME $SERVICE_NAME=$DOCKER_REGISTRY/grid8/$SERVICE_NAME:$IMAGE_TAG
  environment:
    name: development
    url: https://dev.internaldisxt.com
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"

# Deploy to production
deploy-prod:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config set-context --current --namespace=dco-production
    - kubectl set image deployment/$SERVICE_NAME $SERVICE_NAME=$DOCKER_REGISTRY/grid8/$SERVICE_NAME:$IMAGE_TAG
  environment:
    name: production
    url: https://api.example.com
  when: manual
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

### Service-Specific CI/CD

```yaml
# auth/.gitlab-ci.yml
include:
  - project: 'grid8/ci-templates'
    file: '/templates/node-service.yml'

variables:
  SERVICE_NAME: auth
  SERVICE_PORT: 3000
```

---

## Deployment Procedures

### Development Deployment

```bash
# 1. Merge to develop branch
git checkout develop
git merge feature/my-feature
git push origin develop

# 2. CI/CD automatically deploys to dev namespace
# 3. Verify at https://dev.internaldisxt.com
```

### Production Deployment

```bash
# 1. Merge to main branch
git checkout main
git merge develop
git push origin main

# 2. CI/CD builds and waits for manual approval
# 3. Manually trigger production deployment in GitLab UI
# 4. Verify at https://api.example.com
```

### Rollback Procedure

```bash
# Using kubectl
kubectl rollout undo deployment/auth-service -n dco-production

# Using Helm
helm rollback grid8 -n dco-production

# Check rollout status
kubectl rollout status deployment/auth-service -n dco-production
```

---

## Monitoring & Logging

### Health Checks

All services expose:
- `GET /health` - Basic health
- `GET /ready` - Readiness (includes dependencies)

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3
```

### Log Aggregation

```bash
# View logs for a service
kubectl logs -f deployment/auth-service -n dco-production

# View logs with stern
stern auth -n dco-production
```

---

## Database Migrations

### MongoDB Migrations

```bash
# Run migrations manually
cd auth
yarn migrate:up

# Rollback
yarn migrate:down
```

### Backup Procedures

```bash
# MongoDB backup
mongodump --uri="$MONGODB_URI" --out=/backups/$(date +%Y%m%d)

# Restore
mongorestore --uri="$MONGODB_URI" /backups/20240115
```

---

## Troubleshooting

### Common Issues

**1. Pods not starting**
```bash
# Check pod status
kubectl get pods -n dco-production

# Describe pod for events
kubectl describe pod <pod-name> -n dco-production

# Check logs
kubectl logs <pod-name> -n dco-production
```

**2. Service not reachable**
```bash
# Check service endpoints
kubectl get endpoints <service-name> -n dco-production

# Test from within cluster
kubectl run test --rm -it --image=busybox -- wget -qO- http://auth-service:3000/health
```

**3. Environment variable issues**
```bash
# Check environment in pod
kubectl exec -it <pod-name> -n dco-production -- env | grep -E 'MONGO|REDIS|JWT'
```

**4. Database connection issues**
```bash
# Test MongoDB connection
kubectl run mongo-test --rm -it --image=mongo:6 -- mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"
```

### Known Issues

1. **Environment variables getting mixed up on K8s updates**
   - Solution: Always verify environment after deployment
   - Use `kubectl describe pod` to check env values

2. **MongoDB password special characters**
   - Solution: URL encode passwords with special characters

---

*See [ENVIRONMENT.md](./ENVIRONMENT.md) for environment variable reference.*
