# Grid8 Documentation Index

> Dynamic Creative Optimization (DCO) & Asset Management Platform

Grid8 is a large-scale creative asset management system within the Disxt ecosystem, designed for handling asset hosting and distribution. The platform evolves between DCO (Dynamic Creative Optimization) and DCS (Dynamic Content Serving) approaches.

---

## Documentation Structure

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, service topology, data flow |
| [SERVICES.md](./SERVICES.md) | Detailed microservice documentation |
| [API_INTEGRATION.md](./API_INTEGRATION.md) | Inter-service communication, API patterns |
| [DATABASE_SCHEMAS.md](./DATABASE_SCHEMAS.md) | MongoDB models and data structures |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Environment variables for all services |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Docker, Kubernetes, CI/CD deployment |
| [FRONTEND.md](./FRONTEND.md) | React apps, frontenX, component architecture |
| [WORKFLOWS.md](./WORKFLOWS.md) | Common user workflows and use cases |
| [GRID8_PLAYER.md](./GRID8_PLAYER.md) | Grid8 player library reference |
| [swagger/](./swagger/) | OpenAPI/Swagger YAML files (19 files) |

---

## Quick Reference

### Technology Stack

**Backend:** Node.js, Express.js, Mongoose (MongoDB), Redis
**Frontend:** React 18, Redux Toolkit, ag-grid, Bootstrap
**Cloud:** AWS S3, AWS SES, Docker, Kubernetes
**Real-time:** WebSockets, Server-Sent Events (SSE)
**Build:** GitLab CI/CD, Helm, Docker Compose

### Service Ports (Development)

| Service | Port | Purpose |
|---------|------|---------|
| auth | 3000 | Authentication & user management |
| asset | 3000 | File uploads & image processing |
| dco | 3000 | Creative/ad management |
| corp | 3000 | Organizations, brands, teams |
| comment | 3000 | Comments & discussions |
| mail | 3000 | Email service |
| dpa | 3030 | Data processing & analytics |
| tools | 3000 | Internal utilities |
| websocketserver | 3000 | Real-time notifications |
| frontenX | 3011 | Main application server |
| admin_dashboard | 8080 | Admin React app |
| client_dashboard | 8081 | Client React app |

### API Base URLs

**Development:** `https://dev.internaldisxt.com/api/{service}/`
**Swagger Docs:** `https://dev.internaldisxt.com/api/{service}/docs/`

---

## Project Structure Overview

```
grid8/
├── auth/                 # Authentication service
├── asset/                # Asset management service
├── dco/                  # Dynamic Creative Optimization
├── corp/                 # Corporate/organization management
├── comment/              # Comments service
├── mail/                 # Email service
├── dpa/                  # Data processing/analytics
├── tools/                # Internal tools
├── websocketserver/      # Real-time WebSocket server
├── frontenX/             # Main application (Express + JSX)
├── admin_dashboard/      # React admin panel
├── client_dashboard/     # React client dashboard
├── docs/                 # Astro documentation site
├── ingress/              # API gateway configuration
├── backups/              # Database backups
└── dox/                  # This documentation
```

---

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` in each service
3. Run `docker-compose up` for local development
4. Access services via their respective ports

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup instructions.

---

## Existing Documentation

Additional documentation exists within the codebase:

- `frontenX/GEMINI.md` - Code style and conventions
- `frontenX/grid8player_documentation.md` - Player library docs
- `docs/src/content/docs/guides/` - User guides (Astro/Starlight)
- Individual service `README.md` files

---

*Last updated: 2026-02-02*
