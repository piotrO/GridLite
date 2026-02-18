# Grid8 Microservices Reference

Detailed documentation for each microservice in the Grid8 platform.

---

## Table of Contents

1. [Auth Service](#auth-service)
2. [Asset Service](#asset-service)
3. [DCO Service](#dco-service)
4. [Corp Service](#corp-service)
5. [Comment Service](#comment-service)
6. [Mail Service](#mail-service)
7. [DPA Service](#dpa-service)
8. [Tools Service](#tools-service)
9. [WebSocket Server](#websocket-server)

---

## Auth Service

**Port:** 3000
**Purpose:** Authentication, authorization, and user management

### Directory Structure
```
auth/
├── routes/
│   ├── users/          # User CRUD operations
│   └── auth/           # Login, logout, token refresh
├── models/
│   ├── user.js         # User schema
│   ├── publicUser.js   # Public user data schema
│   └── access.js       # Access control schema
├── middlewares/
│   └── auth.js         # JWT verification middleware
└── config/
    └── passport.js     # Passport.js configuration
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login, returns JWT |
| POST | `/auth/logout` | Invalidate session |
| POST | `/auth/refresh` | Refresh JWT token |
| GET | `/users` | List users (admin) |
| GET | `/users/:id` | Get user by ID |
| POST | `/users` | Create user |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |
| GET | `/verify` | Verify JWT token |

### Models

**User Schema:**
```javascript
{
  email: String,          // unique, required
  password: String,       // hashed with bcrypt
  firstName: String,
  lastName: String,
  role: String,           // admin, user, client
  avatar: String,         // S3 URL
  teams: [ObjectId],      // Team references
  active: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Authentication Flow

1. Client sends credentials to `/auth/login`
2. Service validates against MongoDB
3. JWT token generated with user payload
4. Token returned to client
5. Subsequent requests include token in Authorization header
6. Middleware validates token on protected routes

---

## Asset Service

**Port:** 3000
**Purpose:** File uploads, image processing, asset storage

### Directory Structure
```
asset/
├── routes/
│   ├── asset/          # General asset operations
│   ├── avatar/         # Profile image handling
│   └── color/          # Color/brand assets
├── models/
│   └── asset.js        # Asset metadata schema
├── middlewares/
│   └── upload.js       # Multer S3 configuration
└── utils/
    └── imageProcessor.js
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/asset/upload` | Upload single file |
| POST | `/asset/upload-multiple` | Upload multiple files |
| GET | `/asset/:id` | Get asset metadata |
| DELETE | `/asset/:id` | Delete asset |
| POST | `/avatar/upload` | Upload profile image |
| GET | `/color/:brandId` | Get brand colors |
| POST | `/color` | Create color palette |

### Image Processing

Uses **Sharp** and **Jimp** for:
- Thumbnail generation
- Image resizing
- Format conversion
- Color extraction

```javascript
// Example: Generate thumbnail
const thumbnail = await sharp(buffer)
  .resize(200, 200, { fit: 'cover' })
  .jpeg({ quality: 80 })
  .toBuffer();
```

### S3 Storage Structure

```
s3-bucket/
├── assets/
│   ├── {brandId}/
│   │   ├── {projectId}/
│   │   │   └── {filename}
├── avatars/
│   └── {userId}/
│       └── profile.jpg
└── thumbnails/
    └── {assetId}_thumb.jpg
```

---

## DCO Service

**Port:** 3000
**Purpose:** Dynamic Creative Optimization - ad/creative management

### Directory Structure
```
dco/
├── routes/
│   ├── ads/            # Ad CRUD
│   ├── feed/           # Data feed management
│   ├── setups/         # Ad configurations
│   ├── preview/        # Preview generation
│   └── templates/      # Creative templates
├── models/
│   ├── ad.js           # Ad schema
│   ├── setup.js        # Setup configuration
│   ├── template.js     # Template schema
│   ├── preview.js      # Preview schema
│   ├── diff.js         # Version diff tracking
│   └── accesslog.js    # Access logging
└── swagger/
    └── doc.yaml        # API documentation
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ads` | List ads |
| POST | `/ads` | Create ad |
| GET | `/ads/:id` | Get ad details |
| PUT | `/ads/:id` | Update ad |
| DELETE | `/ads/:id` | Delete ad |
| GET | `/setups` | List setups |
| POST | `/setups` | Create setup |
| GET | `/templates` | List templates |
| POST | `/preview` | Generate preview |
| GET | `/feed` | Get feed data |

### Models

**Ad Schema:**
```javascript
{
  name: String,
  brand: ObjectId,        // Reference to brand
  project: ObjectId,      // Reference to project
  setup: ObjectId,        // Reference to setup
  template: ObjectId,     // Reference to template
  status: String,         // draft, active, archived
  versions: [{
    number: Number,
    manifest: Object,     // Grid8 player manifest
    createdAt: Date
  }],
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**Setup Schema:**
```javascript
{
  name: String,
  dimensions: {
    width: Number,
    height: Number
  },
  format: String,         // banner, video, rich-media
  properties: Object,     // Custom configuration
  brand: ObjectId,
  project: ObjectId
}
```

### Swagger Documentation

Available at: `/api/dco/docs/`

---

## Corp Service

**Port:** 3000
**Purpose:** Organizational structure - brands, projects, teams

### Directory Structure
```
corp/
├── routes/
│   ├── brand/          # Brand management
│   ├── project/        # Project management
│   └── team/           # Team management
└── models/
    ├── brand.js
    ├── project.js
    └── team.js
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/brand` | List brands |
| POST | `/brand` | Create brand |
| GET | `/brand/:id` | Get brand |
| PUT | `/brand/:id` | Update brand |
| GET | `/project` | List projects |
| POST | `/project` | Create project |
| GET | `/project/:id` | Get project |
| GET | `/team` | List teams |
| POST | `/team` | Create team |
| PUT | `/team/:id/members` | Manage team members |

### Models

**Brand Schema:**
```javascript
{
  name: String,
  slug: String,           // URL-friendly identifier
  logo: String,           // S3 URL
  colors: {
    primary: String,
    secondary: String,
    accent: String
  },
  owner: ObjectId,        // User reference
  teams: [ObjectId],      // Team references
  settings: Object,
  active: Boolean,
  createdAt: Date
}
```

**Project Schema:**
```javascript
{
  name: String,
  brand: ObjectId,
  description: String,
  status: String,         // active, completed, archived
  members: [{
    user: ObjectId,
    role: String          // owner, editor, viewer
  }],
  settings: Object,
  createdAt: Date
}
```

**Team Schema:**
```javascript
{
  name: String,
  brand: ObjectId,
  members: [{
    user: ObjectId,
    role: String
  }],
  permissions: [String],
  createdAt: Date
}
```

---

## Comment Service

**Port:** 3000
**Purpose:** Comments and discussions on assets/projects

### Directory Structure
```
comment/
├── routes/
│   └── comment/
└── models/
    └── comment.js
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/comment` | List comments (with filters) |
| POST | `/comment` | Create comment |
| GET | `/comment/:id` | Get comment |
| PUT | `/comment/:id` | Update comment |
| DELETE | `/comment/:id` | Delete comment |
| POST | `/comment/:id/reply` | Reply to comment |

### Models

**Comment Schema:**
```javascript
{
  content: String,
  author: ObjectId,       // User reference
  target: {
    type: String,         // ad, asset, project
    id: ObjectId
  },
  parent: ObjectId,       // For replies
  mentions: [ObjectId],   // Tagged users
  resolved: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Mail Service

**Port:** 3000
**Purpose:** Email sending via AWS SES

### Directory Structure
```
mail/
├── routes/
│   ├── send/           # Send email
│   ├── templates/      # Email templates
│   └── triggers/       # Automated triggers
└── utils/
    └── ses.js          # AWS SES client
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/send` | Send email |
| GET | `/templates` | List templates |
| POST | `/templates` | Create template |
| GET | `/templates/:id` | Get template |
| PUT | `/templates/:id` | Update template |
| GET | `/triggers` | List triggers |
| POST | `/triggers` | Create trigger |

### Email Templates

Templates support variables:
```html
<h1>Hello {{firstName}},</h1>
<p>Your project {{projectName}} has been updated.</p>
```

### Trigger Types

- `user.registered` - Welcome email
- `project.shared` - Project sharing notification
- `comment.mention` - Mentioned in comment
- `password.reset` - Password reset link

---

## DPA Service

**Port:** 3030
**Purpose:** Data Processing & Analytics - feed processing, screenshots

### Directory Structure
```
dpa/
├── routes/
│   └── feeds/          # Feed processing
├── workers/
│   └── feedProcessor.js # Background processing
└── utils/
    ├── s3Helper.js
    ├── screenshot.js    # Puppeteer screenshots
    └── pathUtils.js
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/feeds/process` | Process feed data |
| GET | `/feeds/:id/status` | Get processing status |
| POST | `/screenshot` | Generate screenshot |
| GET | `/screenshot/:id` | Get screenshot |

### Feed Processing

Handles CSV/JSON data feeds for dynamic creative:

```javascript
// Feed processing workflow
1. Upload feed file
2. Parse and validate
3. Transform data
4. Store processed data
5. Trigger creative updates
```

### Screenshot Generation

Uses Puppeteer for headless browser screenshots:

```javascript
const screenshot = await page.screenshot({
  type: 'png',
  fullPage: false,
  clip: { x: 0, y: 0, width: 300, height: 250 }
});
```

---

## Tools Service

**Port:** 3000
**Purpose:** Internal utilities and data transformation

### Directory Structure
```
tools/
├── routes/
│   └── tools/
└── utils/
    ├── csvProcessor.js
    └── transformer.js
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tools/csv/parse` | Parse CSV file |
| POST | `/tools/csv/export` | Export to CSV |
| POST | `/tools/transform` | Data transformation |
| POST | `/tools/validate` | Data validation |

---

## WebSocket Server

**Port:** 3000
**Purpose:** Real-time notifications and updates

### Directory Structure
```
websocketserver/
├── handlers/
│   └── tools.js        # SSE handlers
├── models/
│   └── notification.js
└── index.js
```

### Connection Types

1. **WebSocket** - Full duplex communication
2. **SSE (Server-Sent Events)** - One-way server push

### Message Types

```javascript
// Notification message
{
  type: 'notification',
  payload: {
    id: String,
    title: String,
    message: String,
    target: { type: String, id: String },
    createdAt: Date
  }
}

// Counter update
{
  type: 'counter',
  payload: {
    entity: String,     // comments, notifications
    count: Number
  }
}

// Presence update
{
  type: 'presence',
  payload: {
    userId: String,
    status: String      // online, away, offline
  }
}
```

### Client Connection

```javascript
// WebSocket
const ws = new WebSocket('wss://api.example.com/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleMessage(data);
};

// SSE
const evtSource = new EventSource('/api/ws/events');
evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleMessage(data);
};
```

### Notification Schema

```javascript
{
  user: ObjectId,
  type: String,           // info, warning, success, error
  title: String,
  message: String,
  target: {
    type: String,
    id: ObjectId
  },
  read: Boolean,
  createdAt: Date
}
```

---

## Common Service Patterns

### Middleware Stack

All services use:
```javascript
app.use(helmet());        // Security headers
app.use(morgan('dev'));   // HTTP logging
app.use(express.json());  // JSON parsing
app.use(cors());          // CORS handling
```

### Error Handling

Standard error response:
```javascript
{
  error: {
    code: String,         // ERROR_CODE
    message: String,      // Human readable
    details: Object       // Optional additional info
  }
}
```

### Health Checks

```javascript
// GET /health
{ status: 'ok', timestamp: Date }

// GET /ready
{
  status: 'ok',
  checks: {
    database: 'connected',
    redis: 'connected',
    s3: 'reachable'
  }
}
```

---

*See [API_INTEGRATION.md](./API_INTEGRATION.md) for inter-service communication patterns.*
