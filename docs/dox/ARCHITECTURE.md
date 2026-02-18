# Grid8 System Architecture

## Overview

Grid8 follows a microservice architecture with clear separation of concerns. Services communicate via REST APIs and real-time WebSocket connections, with MongoDB as the primary data store and Redis for caching/sessions.

---

## System Topology

```
                                    ┌─────────────────┐
                                    │    INGRESS      │
                                    │  (API Gateway)  │
                                    └────────┬────────┘
                                             │
            ┌────────────────────────────────┼────────────────────────────────┐
            │                                │                                │
            ▼                                ▼                                ▼
    ┌───────────────┐               ┌───────────────┐               ┌───────────────┐
    │   Frontend    │               │   Frontend    │               │   Frontend    │
    │   frontenX    │               │ admin_dashboard│              │client_dashboard│
    │  (Port 3011)  │               │  (Port 8080)  │               │  (Port 8081)  │
    └───────┬───────┘               └───────┬───────┘               └───────┬───────┘
            │                                │                                │
            └────────────────────────────────┼────────────────────────────────┘
                                             │
                                             ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                           BACKEND SERVICES                                   │
    │                                                                              │
    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
    │  │  auth   │  │  asset  │  │   dco   │  │  corp   │  │ comment │           │
    │  │ :3000   │  │ :3000   │  │ :3000   │  │ :3000   │  │ :3000   │           │
    │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │
    │       │            │            │            │            │                 │
    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐                │
    │  │  mail   │  │   dpa   │  │  tools  │  │ websocketserver │                │
    │  │ :3000   │  │ :3030   │  │ :3000   │  │     :3000       │                │
    │  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘                │
    │       │            │            │                │                          │
    └───────┼────────────┼────────────┼────────────────┼──────────────────────────┘
            │            │            │                │
            ▼            ▼            ▼                ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                           DATA LAYER                                         │
    │                                                                              │
    │     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                │
    │     │   MongoDB    │    │    Redis     │    │    AWS S3    │                │
    │     │  (Primary)   │    │  (Sessions)  │    │  (Storage)   │                │
    │     └──────────────┘    └──────────────┘    └──────────────┘                │
    │                                                                              │
    └─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Responsibilities

### Core Services

| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| **auth** | Authentication, JWT tokens, user management, RBAC | MongoDB |
| **asset** | File uploads, image processing, S3 storage | MongoDB, S3, Sharp |
| **dco** | Creative/ad management, templates, previews | MongoDB, S3 |
| **corp** | Brands, projects, teams, organizations | MongoDB |

### Supporting Services

| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| **comment** | Discussion threads, annotations | MongoDB |
| **mail** | Email sending via AWS SES, templates | AWS SES, MongoDB |
| **dpa** | Feed processing, screenshots, CSV | MongoDB, S3, Puppeteer |
| **tools** | Utilities, data transformation | S3, Puppeteer |
| **websocketserver** | Real-time notifications, SSE | MongoDB, Redis |

---

## Data Flow Patterns

### Authentication Flow

```
Client Request
      │
      ▼
  ┌───────┐     JWT Verify      ┌───────┐
  │ API   │ ──────────────────▶ │ auth  │
  │Gateway│                     │service│
  └───┬───┘                     └───┬───┘
      │                             │
      │◀────── Token Valid ─────────┘
      │
      ▼
  Route to Service
```

### Asset Upload Flow

```
Client Upload
      │
      ▼
  ┌─────────┐    Process    ┌─────────┐    Store    ┌─────┐
  │  asset  │ ────────────▶ │  Sharp  │ ──────────▶ │ S3  │
  │ service │               │  /Jimp  │             └──┬──┘
  └────┬────┘               └─────────┘                │
       │                                               │
       │◀───────────── URL Reference ──────────────────┘
       │
       ▼
  ┌─────────┐
  │ MongoDB │ (metadata)
  └─────────┘
```

### Real-time Notification Flow

```
Event Trigger (any service)
      │
      ▼
  ┌─────────────┐    Publish    ┌─────────┐
  │ Originating │ ────────────▶ │  Redis  │
  │   Service   │               │ Pub/Sub │
  └─────────────┘               └────┬────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ websocketserver │
                            └────────┬────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 │                   │                   │
                 ▼                   ▼                   ▼
            ┌────────┐          ┌────────┐          ┌────────┐
            │Client 1│          │Client 2│          │Client N│
            │  (WS)  │          │  (SSE) │          │  (WS)  │
            └────────┘          └────────┘          └────────┘
```

---

## Service Communication

### Internal Service Calls

Services communicate via HTTP REST APIs:

```javascript
// Example: dco service calling auth service
const response = await fetch(`${AUTH_SERVICE_URL}/api/users/verify`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Service Discovery

In development: Direct URLs via environment variables
In production: Kubernetes service DNS resolution

```
# Development
AUTH_SERVICE_URL=http://localhost:3000

# Production (Kubernetes)
AUTH_SERVICE_URL=http://auth-service.dco-production.svc.cluster.local:3000
```

---

## Security Architecture

### Authentication Layers

1. **JWT Token Verification** - All API requests validated via auth service
2. **Role-Based Access Control (RBAC)** - User roles determine permissions
3. **Service-to-Service Auth** - Internal API keys for microservice communication

### Security Headers

All services implement via Helmet.js:
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

### Data Protection

- Passwords hashed with bcrypt
- Sensitive data encrypted at rest (S3 SSE)
- Redis sessions with expiration
- HTTPS enforced in production

---

## Scalability Considerations

### Horizontal Scaling

```
                    ┌─────────────┐
                    │ Load        │
                    │ Balancer    │
                    └──────┬──────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
  ┌─────────┐         ┌─────────┐         ┌─────────┐
  │ dco     │         │ dco     │         │ dco     │
  │ pod 1   │         │ pod 2   │         │ pod 3   │
  └─────────┘         └─────────┘         └─────────┘
```

### Stateless Design

- No service stores session state locally
- Redis handles all session data
- S3 handles all file storage
- MongoDB handles all persistent data

### Caching Strategy

1. **Redis** - Session data, frequently accessed queries
2. **CDN** - Static assets from S3
3. **Application** - In-memory caching for config

---

## Failure Handling

### Circuit Breaker Pattern

Services implement circuit breakers for external calls:

```
Normal Operation → Failures Detected → Circuit Open → Timeout → Half-Open → Test → Normal/Open
```

### Graceful Degradation

- WebSocket fallback to SSE
- S3 upload retry with exponential backoff
- Database connection pooling with retry

### Health Checks

Each service exposes:
- `GET /health` - Basic health check
- `GET /ready` - Readiness probe (includes dependencies)

---

## Monitoring Points

### Key Metrics

| Metric | Service | Purpose |
|--------|---------|---------|
| Request latency | All | Performance tracking |
| Error rate | All | Reliability |
| Upload size/time | asset | Storage performance |
| WebSocket connections | websocketserver | Real-time load |
| Queue depth | dpa | Processing backlog |

### Logging

- **Morgan** - HTTP request logging
- **Winston** - Application logging (where configured)
- **Structured JSON** - Production log format

---

## Network Topology (Kubernetes)

### Development Namespace
```
dco-development-*
├── auth-deployment
├── asset-deployment
├── dco-deployment
├── corp-deployment
├── comment-deployment
├── mail-deployment
├── dpa-deployment
├── tools-deployment
├── websocketserver-deployment
├── frontenx-deployment
├── admin-dashboard-deployment
└── client-dashboard-deployment
```

### Production Namespace
```
dco-production-*
└── (same structure with production configs)
```

---

*See [SERVICES.md](./SERVICES.md) for detailed service documentation.*
