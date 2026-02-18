# Database Schemas

MongoDB schema definitions for all Grid8 services.

---

## Overview

Grid8 uses **MongoDB** as the primary database with **Mongoose ODM** for schema definitions. Each microservice manages its own collections.

### Database Architecture

```
MongoDB Cluster
├── grid8_auth
│   ├── users
│   ├── sessions
│   └── accessLogs
├── grid8_asset
│   ├── assets
│   └── colors
├── grid8_dco
│   ├── ads
│   ├── setups
│   ├── templates
│   ├── previews
│   └── diffs
├── grid8_corp
│   ├── brands
│   ├── projects
│   └── teams
├── grid8_comment
│   └── comments
├── grid8_mail
│   ├── templates
│   └── triggers
└── grid8_notifications
    └── notifications
```

---

## Auth Service Schemas

### User

```javascript
// models/user.js
const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false  // Excluded from queries by default
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'user', 'client'],
    default: 'user'
  },
  avatar: {
    type: String,  // S3 URL
    default: null
  },
  teams: [{
    type: Schema.Types.ObjectId,
    ref: 'Team'
  }],
  brands: [{
    type: Schema.Types.ObjectId,
    ref: 'Brand'
  }],
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true  // createdAt, updatedAt
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ teams: 1 });
userSchema.index({ brands: 1 });

// Pre-save hook for password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method for password comparison
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
```

### PublicUser (View)

```javascript
// models/publicUser.js
// Virtual model for public user data
const publicUserSchema = new Schema({
  _id: Schema.Types.ObjectId,
  email: String,
  firstName: String,
  lastName: String,
  avatar: String,
  role: String
});
```

### Access Log

```javascript
// models/access.js
const accessSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['login', 'logout', 'token_refresh', 'password_reset'],
    required: true
  },
  ip: String,
  userAgent: String,
  success: {
    type: Boolean,
    default: true
  },
  metadata: Schema.Types.Mixed
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Index for querying by user and time
accessSchema.index({ user: 1, createdAt: -1 });
```

---

## Asset Service Schemas

### Asset

```javascript
// models/asset.js
const assetSchema = new Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  s3Key: {
    type: String,
    required: true
  },
  dimensions: {
    width: Number,
    height: Number
  },
  duration: Number,  // For video/audio
  metadata: {
    format: String,
    colorSpace: String,
    hasAlpha: Boolean,
    orientation: Number
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand'
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project'
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [String],
  status: {
    type: String,
    enum: ['processing', 'ready', 'error', 'archived'],
    default: 'processing'
  }
}, {
  timestamps: true
});

// Indexes
assetSchema.index({ brand: 1, createdAt: -1 });
assetSchema.index({ project: 1 });
assetSchema.index({ tags: 1 });
assetSchema.index({ mimeType: 1 });
```

### Color

```javascript
// models/color.js
const colorSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  hex: {
    type: String,
    required: true,
    match: /^#[0-9A-Fa-f]{6}$/
  },
  rgb: {
    r: Number,
    g: Number,
    b: Number
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  category: {
    type: String,
    enum: ['primary', 'secondary', 'accent', 'neutral', 'custom'],
    default: 'custom'
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

colorSchema.index({ brand: 1, order: 1 });
```

---

## DCO Service Schemas

### Ad

```javascript
// models/ad.js
const adSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  setup: {
    type: Schema.Types.ObjectId,
    ref: 'Setup'
  },
  template: {
    type: Schema.Types.ObjectId,
    ref: 'Template'
  },
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'active', 'paused', 'archived'],
    default: 'draft'
  },
  currentVersion: {
    type: Number,
    default: 1
  },
  versions: [{
    number: Number,
    manifest: Schema.Types.Mixed,  // Grid8 player manifest
    createdAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    note: String
  }],
  manifest: Schema.Types.Mixed,  // Current version manifest
  previewUrl: String,
  thumbnailUrl: String,
  tags: [String],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
adSchema.index({ brand: 1, project: 1 });
adSchema.index({ status: 1 });
adSchema.index({ slug: 1 });
adSchema.index({ tags: 1 });
adSchema.index({ createdAt: -1 });

// Pre-save slug generation
adSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = slugify(this.name) + '-' + shortid.generate();
  }
  next();
});
```

### Setup

```javascript
// models/setup.js
const setupSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  dimensions: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    }
  },
  format: {
    type: String,
    enum: ['banner', 'video', 'rich-media', 'native', 'social'],
    default: 'banner'
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand'
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project'
  },
  properties: {
    backgroundColor: String,
    borderRadius: Number,
    clickUrl: String,
    targetBlank: { type: Boolean, default: true },
    responsive: { type: Boolean, default: false }
  },
  defaultManifest: Schema.Types.Mixed,
  isGlobal: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

setupSchema.index({ brand: 1, project: 1 });
setupSchema.index({ dimensions: 1 });
```

### Template

```javascript
// models/template.js
const templateSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  category: {
    type: String,
    enum: ['standard', 'rich-media', 'video', 'interactive', 'custom'],
    default: 'standard'
  },
  thumbnail: String,
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand'
  },
  baseManifest: Schema.Types.Mixed,  // Grid8 player base manifest
  editableFields: [{
    name: String,
    path: String,  // JSON path in manifest
    type: {
      type: String,
      enum: ['text', 'image', 'color', 'number', 'boolean', 'select']
    },
    options: [String],  // For select type
    required: Boolean,
    defaultValue: Schema.Types.Mixed
  }],
  assets: [{
    name: String,
    type: String,
    url: String,
    required: Boolean
  }],
  isGlobal: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

templateSchema.index({ brand: 1, category: 1 });
templateSchema.index({ isGlobal: 1 });
```

### Preview

```javascript
// models/preview.js
const previewSchema = new Schema({
  ad: {
    type: Schema.Types.ObjectId,
    ref: 'Ad',
    required: true
  },
  version: Number,
  url: {
    type: String,
    required: true
  },
  screenshotUrl: String,
  expiresAt: Date,
  accessCount: {
    type: Number,
    default: 0
  },
  lastAccessedAt: Date,
  sharedWith: [{
    email: String,
    accessedAt: Date
  }],
  password: String,  // Optional password protection
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

previewSchema.index({ ad: 1 });
previewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });  // TTL index
```

### Diff

```javascript
// models/diff.js
const diffSchema = new Schema({
  ad: {
    type: Schema.Types.ObjectId,
    ref: 'Ad',
    required: true
  },
  fromVersion: Number,
  toVersion: Number,
  changes: [{
    path: String,
    operation: {
      type: String,
      enum: ['add', 'remove', 'replace', 'move']
    },
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed
  }],
  summary: String,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

diffSchema.index({ ad: 1, fromVersion: 1, toVersion: 1 });
```

---

## Corp Service Schemas

### Brand

```javascript
// models/brand.js
const brandSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  logo: String,  // S3 URL
  favicon: String,
  colors: {
    primary: String,
    secondary: String,
    accent: String,
    background: String,
    text: String
  },
  fonts: {
    heading: String,
    body: String
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  teams: [{
    type: Schema.Types.ObjectId,
    ref: 'Team'
  }],
  settings: {
    defaultSetup: Schema.Types.ObjectId,
    allowPublicPreviews: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: true },
    watermarkPreviews: { type: Boolean, default: false }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free'
    },
    expiresAt: Date
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

brandSchema.index({ slug: 1 });
brandSchema.index({ owner: 1 });
brandSchema.index({ teams: 1 });
```

### Project

```javascript
// models/project.js
const projectSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: String,
  description: String,
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  thumbnail: String,
  status: {
    type: String,
    enum: ['planning', 'active', 'review', 'completed', 'archived'],
    default: 'planning'
  },
  members: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'editor', 'viewer'],
      default: 'viewer'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  teams: [{
    type: Schema.Types.ObjectId,
    ref: 'Team'
  }],
  settings: {
    visibility: {
      type: String,
      enum: ['private', 'team', 'brand'],
      default: 'team'
    },
    allowComments: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false }
  },
  deadline: Date,
  tags: [String],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

projectSchema.index({ brand: 1, status: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ teams: 1 });
projectSchema.index({ deadline: 1 });
```

### Team

```javascript
// models/team.js
const teamSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  members: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['lead', 'member'],
      default: 'member'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  permissions: [{
    type: String,
    enum: [
      'create_project',
      'edit_project',
      'delete_project',
      'create_ad',
      'edit_ad',
      'delete_ad',
      'approve_ad',
      'upload_asset',
      'delete_asset',
      'manage_team',
      'view_analytics'
    ]
  }],
  color: String,  // Team color for UI
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

teamSchema.index({ brand: 1 });
teamSchema.index({ 'members.user': 1 });
```

---

## Comment Service Schema

### Comment

```javascript
// models/comment.js
const commentSchema = new Schema({
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  target: {
    type: {
      type: String,
      enum: ['ad', 'asset', 'project', 'preview'],
      required: true
    },
    id: {
      type: Schema.Types.ObjectId,
      required: true
    }
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  },
  thread: {
    type: Schema.Types.ObjectId,
    ref: 'Comment'  // Root comment of thread
  },
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file', 'link']
    },
    url: String,
    name: String
  }],
  position: {  // For positional comments on assets
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    timestamp: Number  // For video
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  edited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: Date
  }]
}, {
  timestamps: true
});

commentSchema.index({ 'target.type': 1, 'target.id': 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ thread: 1 });
commentSchema.index({ resolved: 1 });
```

---

## Mail Service Schemas

### Email Template

```javascript
// models/template.js
const emailTemplateSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  subject: {
    type: String,
    required: true
  },
  htmlContent: {
    type: String,
    required: true
  },
  textContent: String,
  variables: [{
    name: String,
    description: String,
    required: Boolean,
    defaultValue: String
  }],
  category: {
    type: String,
    enum: ['transactional', 'notification', 'marketing', 'system'],
    default: 'transactional'
  },
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});
```

### Email Trigger

```javascript
// models/trigger.js
const triggerSchema = new Schema({
  event: {
    type: String,
    required: true,
    unique: true
  },
  template: {
    type: Schema.Types.ObjectId,
    ref: 'EmailTemplate',
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  conditions: Schema.Types.Mixed,  // Optional conditions for trigger
  delay: {
    type: Number,
    default: 0  // Delay in seconds
  }
}, {
  timestamps: true
});
```

---

## WebSocket Server Schema

### Notification

```javascript
// models/notification.js
const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'mention', 'share', 'comment', 'approval'],
    default: 'info'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  target: {
    type: {
      type: String,
      enum: ['ad', 'project', 'comment', 'user', 'team']
    },
    id: Schema.Types.ObjectId
  },
  actionUrl: String,
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  metadata: Schema.Types.Mixed
}, {
  timestamps: true
});

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 }, { expireAfterSeconds: 2592000 });  // 30 days TTL
```

---

## Common Patterns

### Soft Delete

```javascript
// Add to any schema
{
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}

// Query middleware to exclude deleted
schema.pre(/^find/, function(next) {
  this.where({ deleted: { $ne: true } });
  next();
});
```

### Audit Trail

```javascript
// Add to any schema
{
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}
```

### Virtual Fields

```javascript
// Full name virtual
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Enable virtuals in JSON
userSchema.set('toJSON', { virtuals: true });
```

---

*See [API_INTEGRATION.md](./API_INTEGRATION.md) for how to interact with these schemas via API.*
