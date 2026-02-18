# API Integration Guide

How Grid8 services communicate with each other and with external clients.

---

## API Design Principles

### RESTful Conventions

All services follow REST conventions:

| Operation | HTTP Method | URL Pattern | Response Code |
|-----------|-------------|-------------|---------------|
| List | GET | `/resource` | 200 |
| Create | POST | `/resource` | 201 |
| Read | GET | `/resource/:id` | 200 |
| Update | PUT | `/resource/:id` | 200 |
| Partial Update | PATCH | `/resource/:id` | 200 |
| Delete | DELETE | `/resource/:id` | 204 |

### Request/Response Format

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <jwt_token>
X-Request-ID: <uuid>
```

**Response Headers:**
```
Content-Type: application/json
X-Request-ID: <uuid>
X-Response-Time: <ms>
```

---

## Authentication

### JWT Token Structure

```javascript
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "role": "admin",
    "teams": ["team_id_1", "team_id_2"],
    "iat": 1609459200,
    "exp": 1609545600
  }
}
```

### Token Verification Flow

```
┌─────────┐    Request + Token    ┌─────────┐
│ Client  │ ───────────────────▶ │   API   │
└─────────┘                       │ Gateway │
                                  └────┬────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
               Token Valid?    Token Expired?    Token Invalid?
                    │                  │                  │
                    ▼                  ▼                  ▼
              Route Request      401 Response      403 Response
```

### Authenticated Request Example

```javascript
// Client-side
const response = await fetch('https://api.example.com/api/dco/ads', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## Inter-Service Communication

### Service-to-Service Calls

Services call each other via internal HTTP:

```javascript
// dco service calling auth service
const verifyUser = async (token) => {
  const response = await fetch(`${process.env.AUTH_SERVICE_URL}/verify`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Service-Key': process.env.SERVICE_API_KEY
    }
  });
  return response.json();
};
```

### Service URLs (Environment Variables)

```bash
# Development
AUTH_SERVICE_URL=http://localhost:3000
ASSET_SERVICE_URL=http://localhost:3001
DCO_SERVICE_URL=http://localhost:3002
CORP_SERVICE_URL=http://localhost:3003

# Production (Kubernetes)
AUTH_SERVICE_URL=http://auth-service:3000
ASSET_SERVICE_URL=http://asset-service:3000
DCO_SERVICE_URL=http://dco-service:3000
CORP_SERVICE_URL=http://corp-service:3000
```

### Internal API Key Authentication

For service-to-service calls:

```javascript
// Middleware to verify internal service calls
const verifyServiceKey = (req, res, next) => {
  const serviceKey = req.headers['x-service-key'];
  if (serviceKey === process.env.SERVICE_API_KEY) {
    req.isInternalService = true;
    return next();
  }
  // Fall back to JWT verification
  return verifyJWT(req, res, next);
};
```

---

## API Endpoints Reference

### Auth Service Endpoints

```
Base URL: /api/auth

POST   /login                 - User login
POST   /logout                - User logout
POST   /refresh               - Refresh token
POST   /forgot-password       - Request password reset
POST   /reset-password        - Reset password with token
GET    /verify                - Verify JWT token
GET    /users                 - List users (admin)
GET    /users/:id             - Get user
POST   /users                 - Create user
PUT    /users/:id             - Update user
DELETE /users/:id             - Delete user
```

### Asset Service Endpoints

```
Base URL: /api/asset

POST   /upload                - Upload file
POST   /upload-multiple       - Upload multiple files
GET    /:id                   - Get asset
DELETE /:id                   - Delete asset
GET    /:id/download          - Download asset
POST   /avatar/upload         - Upload avatar
GET    /avatar/:userId        - Get avatar
GET    /color/:brandId        - Get brand colors
POST   /color                 - Create color
```

### DCO Service Endpoints

```
Base URL: /api/dco

GET    /ads                   - List ads
POST   /ads                   - Create ad
GET    /ads/:id               - Get ad
PUT    /ads/:id               - Update ad
DELETE /ads/:id               - Delete ad
POST   /ads/:id/duplicate     - Duplicate ad
GET    /ads/:id/versions      - Get version history

GET    /setups                - List setups
POST   /setups                - Create setup
GET    /setups/:id            - Get setup
PUT    /setups/:id            - Update setup

GET    /templates             - List templates
POST   /templates             - Create template
GET    /templates/:id         - Get template
PUT    /templates/:id         - Update template

POST   /preview               - Generate preview
GET    /preview/:id           - Get preview

GET    /feed                  - Get feed data
POST   /feed                  - Upload feed
```

### Corp Service Endpoints

```
Base URL: /api/corp

GET    /brand                 - List brands
POST   /brand                 - Create brand
GET    /brand/:id             - Get brand
PUT    /brand/:id             - Update brand
DELETE /brand/:id             - Delete brand

GET    /project               - List projects
POST   /project               - Create project
GET    /project/:id           - Get project
PUT    /project/:id           - Update project
DELETE /project/:id           - Delete project

GET    /team                  - List teams
POST   /team                  - Create team
GET    /team/:id              - Get team
PUT    /team/:id              - Update team
PUT    /team/:id/members      - Update team members
```

### Comment Service Endpoints

```
Base URL: /api/comment

GET    /                      - List comments
POST   /                      - Create comment
GET    /:id                   - Get comment
PUT    /:id                   - Update comment
DELETE /:id                   - Delete comment
POST   /:id/reply             - Reply to comment
PUT    /:id/resolve           - Mark resolved
```

### Mail Service Endpoints

```
Base URL: /api/mail

POST   /send                  - Send email
GET    /templates             - List templates
POST   /templates             - Create template
GET    /templates/:id         - Get template
PUT    /templates/:id         - Update template
DELETE /templates/:id         - Delete template
GET    /triggers              - List triggers
POST   /triggers              - Create trigger
```

### WebSocket Server Endpoints

```
Base URL: /api/ws

WebSocket: ws://host/api/ws
SSE:       GET /api/ws/events

GET    /notifications         - Get notifications
PUT    /notifications/:id/read - Mark as read
PUT    /notifications/read-all - Mark all as read
```

---

## Request/Response Examples

### Create Ad

**Request:**
```http
POST /api/dco/ads
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Summer Campaign Banner",
  "brand": "507f1f77bcf86cd799439011",
  "project": "507f1f77bcf86cd799439012",
  "setup": "507f1f77bcf86cd799439013",
  "template": "507f1f77bcf86cd799439014",
  "manifest": {
    "shots": [...],
    "interactions": [...]
  }
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "name": "Summer Campaign Banner",
    "brand": "507f1f77bcf86cd799439011",
    "project": "507f1f77bcf86cd799439012",
    "setup": "507f1f77bcf86cd799439013",
    "template": "507f1f77bcf86cd799439014",
    "status": "draft",
    "versions": [{
      "number": 1,
      "manifest": {...},
      "createdAt": "2024-01-15T10:30:00Z"
    }],
    "createdBy": "507f1f77bcf86cd799439016",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Upload Asset

**Request:**
```http
POST /api/asset/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="banner.jpg"
Content-Type: image/jpeg

<binary data>
------WebKitFormBoundary
Content-Disposition: form-data; name="brandId"

507f1f77bcf86cd799439011
------WebKitFormBoundary--
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "filename": "banner.jpg",
    "originalName": "banner.jpg",
    "mimeType": "image/jpeg",
    "size": 125430,
    "url": "https://s3.amazonaws.com/bucket/assets/...",
    "thumbnailUrl": "https://s3.amazonaws.com/bucket/thumbnails/...",
    "dimensions": {
      "width": 300,
      "height": 250
    },
    "brandId": "507f1f77bcf86cd799439011",
    "uploadedBy": "507f1f77bcf86cd799439016",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## Error Handling

### Error Response Format

```javascript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Handling Example

```javascript
// Client-side error handling
try {
  const response = await fetch('/api/dco/ads', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(adData)
  });

  if (!response.ok) {
    const error = await response.json();
    switch (error.error.code) {
      case 'VALIDATION_ERROR':
        handleValidationError(error.error.details);
        break;
      case 'UNAUTHORIZED':
        redirectToLogin();
        break;
      default:
        showError(error.error.message);
    }
  }
} catch (err) {
  showError('Network error');
}
```

---

## Pagination

### Request Parameters

```
GET /api/dco/ads?page=1&limit=20&sort=-createdAt
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `sort` | string | `-createdAt` | Sort field (prefix `-` for desc) |

### Response Format

```javascript
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## Filtering

### Query Parameters

```
GET /api/dco/ads?brand=507f1f77&status=active&createdAt[gte]=2024-01-01
```

### Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| (none) | Equals | `status=active` |
| `[ne]` | Not equals | `status[ne]=archived` |
| `[gt]` | Greater than | `createdAt[gt]=2024-01-01` |
| `[gte]` | Greater or equal | `createdAt[gte]=2024-01-01` |
| `[lt]` | Less than | `size[lt]=1000000` |
| `[lte]` | Less or equal | `size[lte]=1000000` |
| `[in]` | In array | `status[in]=active,draft` |
| `[regex]` | Regex match | `name[regex]=^Summer` |

---

## Rate Limiting

### Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 10 | 1 minute |
| API (authenticated) | 100 | 1 minute |
| File uploads | 20 | 1 minute |
| WebSocket connections | 5 | per user |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459260
```

---

## Webhooks (Future)

### Webhook Events

```javascript
// Event payload structure
{
  "event": "ad.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "507f1f77bcf86cd799439015",
    "name": "Summer Campaign Banner",
    ...
  }
}
```

### Supported Events

- `ad.created`, `ad.updated`, `ad.deleted`
- `asset.uploaded`, `asset.deleted`
- `project.created`, `project.updated`
- `comment.created`, `comment.resolved`

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { Grid8Client } from '@grid8/sdk';

const client = new Grid8Client({
  baseUrl: 'https://api.example.com',
  token: 'your-jwt-token'
});

// List ads
const ads = await client.ads.list({
  brand: 'brand_id',
  status: 'active'
});

// Create ad
const newAd = await client.ads.create({
  name: 'My Ad',
  brand: 'brand_id',
  project: 'project_id'
});

// Upload asset
const asset = await client.assets.upload(file, {
  brandId: 'brand_id'
});
```

---

*See [SERVICES.md](./SERVICES.md) for detailed endpoint documentation per service.*
