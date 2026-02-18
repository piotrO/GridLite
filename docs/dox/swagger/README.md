# Swagger API Documentation

OpenAPI/Swagger YAML files for all Grid8 microservices.

---

## File Index

### Auth Service

| File | Description |
|------|-------------|
| `auth-main.yaml` | Main auth service definition |
| `auth-auth.yaml` | Authentication endpoints (login, logout, refresh) |
| `auth-users.yaml` | User management endpoints (CRUD) |
| `auth-access.yaml` | Access control and logging endpoints |

### Asset Service

| File | Description |
|------|-------------|
| `asset-main.yaml` | Main asset service definition |
| `asset-asset.yaml` | Asset upload and management endpoints |
| `asset-avatar.yaml` | Avatar/profile image endpoints |
| `asset-color.yaml` | Brand color management endpoints |

### DCO Service

| File | Description |
|------|-------------|
| `dco-main.yaml` | Main DCO service definition |
| `dco-ads.yaml` | Ad/creative management endpoints |
| `dco-feed.yaml` | Data feed endpoints |
| `dco-setups.yaml` | Setup configuration endpoints |

### Corp Service

| File | Description |
|------|-------------|
| `corp-main.yaml` | Main corp service definition |
| `corp-brand.yaml` | Brand management endpoints |
| `corp-project.yaml` | Project management endpoints |
| `corp-team.yaml` | Team management endpoints |

### Comment Service

| File | Description |
|------|-------------|
| `comment-main.yaml` | Main comment service definition |
| `comment-comment.yaml` | Comment CRUD and threading endpoints |

### DPA Service

| File | Description |
|------|-------------|
| `dpa-feeds.yaml` | Feed processing endpoints |

---

## Usage

### View in Swagger UI

These files can be loaded into Swagger UI for interactive documentation:

```bash
# Using Docker
docker run -p 8080:8080 -e SWAGGER_JSON=/docs/auth-main.yaml -v $(pwd):/docs swaggerapi/swagger-ui
```

### Live Swagger Documentation

Services expose Swagger UI at runtime:

- **Auth:** `https://dev.internaldisxt.com/api/auth/docs/`
- **Asset:** `https://dev.internaldisxt.com/api/asset/docs/`
- **DCO:** `https://dev.internaldisxt.com/api/dco/docs/`
- **Corp:** `https://dev.internaldisxt.com/api/corp/docs/`
- **Comment:** `https://dev.internaldisxt.com/api/comment/docs/`

### Combine Files

To create a combined API spec:

```bash
# Using swagger-cli
npx swagger-cli bundle auth-main.yaml -o auth-combined.yaml
```

---

## File Naming Convention

```
{service}-{route}.yaml

Examples:
- auth-main.yaml      → Main service definition
- auth-users.yaml     → /users routes
- asset-avatar.yaml   → /avatar routes
```

---

*Source files located in each service's `routes/*/doc.yaml`*
