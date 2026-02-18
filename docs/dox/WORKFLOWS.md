# Common Workflows

Step-by-step guides for common Grid8 operations.

---

## Table of Contents

1. [User Onboarding](#user-onboarding)
2. [Brand Setup](#brand-setup)
3. [Project Creation](#project-creation)
4. [Ad Creation](#ad-creation)
5. [Asset Management](#asset-management)
6. [Preview & Sharing](#preview--sharing)
7. [Collaboration & Comments](#collaboration--comments)
8. [Feed Management](#feed-management)

---

## User Onboarding

### Creating a New User

**Admin Dashboard:**

1. Navigate to **Users** > **Add User**
2. Fill in user details:
   - Email (required, unique)
   - First Name, Last Name
   - Role (admin, manager, user, client)
   - Initial password
3. Assign to teams (optional)
4. Click **Create User**

**API:**
```bash
POST /api/auth/users
{
  "email": "user@example.com",
  "password": "initial-password",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

### User Login Flow

```
1. User visits login page
2. Enters email and password
3. Auth service validates credentials
4. JWT token returned
5. Token stored in localStorage/cookie
6. Subsequent requests include token in Authorization header
```

### Password Reset

1. User clicks "Forgot Password"
2. Enters email address
3. System sends reset email via Mail service
4. User clicks link in email
5. User enters new password
6. Password updated in Auth service

---

## Brand Setup

### Creating a Brand

**Steps:**

1. Navigate to **Brands** > **New Brand**
2. Enter brand details:
   - Name (required)
   - Slug (auto-generated, can edit)
   - Logo (upload or S3 URL)
3. Configure brand colors:
   - Primary color
   - Secondary color
   - Accent color
4. Set up teams (optional)
5. Configure settings:
   - Default setup
   - Preview permissions
   - Approval workflow
6. Click **Create**

**API:**
```bash
POST /api/corp/brand
{
  "name": "Acme Corporation",
  "slug": "acme",
  "colors": {
    "primary": "#007bff",
    "secondary": "#6c757d",
    "accent": "#28a745"
  },
  "settings": {
    "requireApproval": true
  }
}
```

### Adding Brand Colors

1. Navigate to **Brand** > **Colors**
2. Click **Add Color**
3. Enter:
   - Name (e.g., "Brand Blue")
   - Hex code (#007bff)
   - Category (primary, secondary, accent)
4. Colors available in ad editor color picker

---

## Project Creation

### Creating a Project

1. Navigate to **Projects** > **New Project**
2. Select **Brand**
3. Enter project details:
   - Name
   - Description
   - Status (planning, active, review)
   - Deadline (optional)
4. Add team members:
   - Select users
   - Assign roles (owner, admin, editor, viewer)
5. Configure settings:
   - Visibility (private, team, brand)
   - Allow comments
6. Click **Create**

**API:**
```bash
POST /api/corp/project
{
  "name": "Summer Campaign 2024",
  "brand": "brand_id",
  "description": "Seasonal promotion banners",
  "status": "active",
  "members": [
    { "user": "user_id", "role": "owner" }
  ]
}
```

### Managing Project Members

```
Project Roles:
- Owner: Full control, can delete project
- Admin: Manage members, approve ads
- Editor: Create/edit ads and assets
- Viewer: View only
```

1. Navigate to project
2. Click **Settings** > **Members**
3. Click **Add Member**
4. Search for user
5. Select role
6. Click **Add**

---

## Ad Creation

### Creating a New Ad

1. Navigate to **Project** > **Ads** > **New Ad**
2. Select **Setup** (dimensions, format)
3. Select **Template** (or start from scratch)
4. Enter ad name
5. Click **Create**

### Using the Ad Editor

```
Editor Interface:
┌─────────────────────────────────────────────┐
│ Toolbar (tools, undo, redo, zoom)           │
├─────────────┬───────────────────────────────┤
│  Timeline   │                               │
│  (shots)    │     Canvas                    │
│             │     (preview)                 │
├─────────────┤                               │
│  Layers     │                               │
│  Panel      │                               │
├─────────────┼───────────────────────────────┤
│  Properties │  Assets Panel                 │
└─────────────┴───────────────────────────────┘
```

**Working with Shots:**
1. Click **+** to add new shot
2. Set shot duration
3. Add elements (text, images, shapes)
4. Configure animations (GSAP)
5. Set transitions between shots

**Adding Elements:**
1. Select element type (text, image, shape)
2. Click on canvas to place
3. Configure properties:
   - Position (x, y)
   - Size (width, height)
   - Styling (colors, fonts)
   - Animation (entrance, exit)

### Saving and Versioning

- **Auto-save:** Every 30 seconds (if enabled)
- **Manual save:** Ctrl+S / Cmd+S
- **Version history:** View and restore previous versions
- **Diff view:** Compare changes between versions

### Publishing an Ad

1. Click **Save** to finalize changes
2. Click **Preview** to test
3. Submit for **Review** (if approval required)
4. Approver reviews and **Approves** or **Rejects**
5. Change status to **Active**

---

## Asset Management

### Uploading Assets

**Single Upload:**
1. Navigate to **Assets** > **Upload**
2. Drag and drop file or click to browse
3. File automatically uploaded to S3
4. Thumbnail generated
5. Asset metadata saved

**Bulk Upload:**
1. Navigate to **Assets** > **Bulk Upload**
2. Select multiple files
3. Configure metadata for all (tags, project)
4. Click **Upload All**

**API:**
```bash
POST /api/asset/upload
Content-Type: multipart/form-data

file: <binary>
brandId: brand_id
projectId: project_id
tags: ["banner", "summer"]
```

### Organizing Assets

**Folders:**
- Create folders within projects
- Drag and drop to organize
- Nested folder support

**Tags:**
- Add tags to assets
- Filter by tags
- Bulk tag management

**Search:**
- Search by filename
- Filter by type (image, video, font)
- Filter by date range

### Asset Processing

Images are automatically processed:
1. Original stored in S3
2. Thumbnail generated (200x200)
3. Metadata extracted (dimensions, color space)
4. Format detection
5. Available for use in ads

---

## Preview & Sharing

### Generating a Preview

1. Navigate to ad
2. Click **Preview**
3. Preview generated with current version
4. Preview URL created

**Preview Options:**
- Expiry date (default: 7 days)
- Password protection (optional)
- Watermark (optional)

### Sharing a Preview

**Via Link:**
1. Click **Share** on preview
2. Copy preview URL
3. Share with stakeholders

**Via Email:**
1. Click **Share via Email**
2. Enter recipient email(s)
3. Add custom message
4. Click **Send**

**API:**
```bash
POST /api/dco/preview
{
  "ad": "ad_id",
  "expiresAt": "2024-01-22T00:00:00Z",
  "password": "optional-password"
}

Response:
{
  "url": "https://preview.example.com/abc123",
  "expiresAt": "2024-01-22T00:00:00Z"
}
```

### Tracking Preview Access

- View access count
- See who accessed (if logged in)
- Last access timestamp
- Access log

---

## Collaboration & Comments

### Adding Comments

**On Assets:**
1. Open asset
2. Click on location to add pin
3. Type comment
4. Mention users with @username
5. Click **Post**

**On Ads:**
1. Open ad preview
2. Click **Comment** tool
3. Draw rectangle on area
4. Type comment
5. Click **Post**

**On Projects:**
1. Navigate to project
2. Click **Discussion** tab
3. Type comment
4. Click **Post**

### Comment Features

- **Threading:** Reply to comments
- **Mentions:** @username notifications
- **Attachments:** Add images, files
- **Resolution:** Mark as resolved
- **Filters:** Show all / unresolved / mine

### Real-time Notifications

Notifications appear for:
- New comments on your ads/projects
- @mentions
- Comment replies
- Approval requests
- Status changes

**Notification Settings:**
1. Navigate to **Profile** > **Settings**
2. Configure notification preferences:
   - Email notifications
   - In-app notifications
   - Per-event settings

---

## Feed Management

### Creating a Data Feed

1. Navigate to **Project** > **Feeds** > **New Feed**
2. Upload CSV/JSON file
3. Map columns to fields:
   - Identify primary key
   - Map to ad variables
4. Validate data
5. Click **Import**

**CSV Format Example:**
```csv
id,headline,description,image_url,cta
1,Summer Sale,50% off everything,https://cdn.example.com/1.jpg,Shop Now
2,New Arrivals,Check out our latest,https://cdn.example.com/2.jpg,Browse
```

### Connecting Feed to Ad

1. Open ad in editor
2. Click **Data** tab
3. Select feed source
4. Map feed columns to elements:
   - `{{headline}}` → Text element
   - `{{image_url}}` → Image element
5. Preview with different feed rows

### Dynamic Creative Optimization

**Feed-driven ads:**
```
┌─────────────────┐     ┌─────────────────┐
│   Data Feed     │────▶│   Ad Template   │
│  (CSV/JSON)     │     │                 │
└─────────────────┘     └────────┬────────┘
                                 │
                     ┌───────────┼───────────┐
                     ▼           ▼           ▼
              ┌──────────┐┌──────────┐┌──────────┐
              │  Ad #1   ││  Ad #2   ││  Ad #3   │
              │(row 1)   ││(row 2)   ││(row 3)   │
              └──────────┘└──────────┘└──────────┘
```

### Feed Processing

1. Upload feed to DPA service
2. DPA validates and processes
3. Feed stored in S3
4. Trigger ad regeneration
5. Screenshots generated for each variant

---

## Advanced Workflows

### Bulk Operations

**Bulk Ad Creation:**
1. Create template ad
2. Connect to feed
3. Click **Generate Variants**
4. System creates ad for each feed row

**Bulk Export:**
1. Select multiple ads
2. Click **Export**
3. Choose format (HTML5, images, video)
4. Download as ZIP

### Approval Workflow

```
Draft → Review → Approved → Active
  │       │         │
  │       └──── Rejected (back to Draft)
  │
  └──── Skip Review (if not required)
```

**Configuring Approval:**
1. Brand Settings > Approval
2. Enable "Require Approval"
3. Set approvers (users/roles)
4. Configure notification triggers

### Template Management

**Creating Templates:**
1. Design ad from scratch
2. Click **Save as Template**
3. Define editable fields
4. Set template visibility (global, brand, private)

**Using Templates:**
1. New Ad > Select Template
2. Template manifest loaded
3. Edit only designated fields
4. Save as new ad

---

## Troubleshooting Workflows

### Common Issues

**Upload fails:**
- Check file size (max 50MB)
- Verify file type is allowed
- Check network connectivity
- Retry upload

**Preview not loading:**
- Clear browser cache
- Check preview hasn't expired
- Verify password (if protected)
- Try different browser

**Changes not saving:**
- Check network status
- Verify session is active
- Check for validation errors
- Try manual save (Ctrl+S)

**Comments not appearing:**
- Refresh the page
- Check WebSocket connection
- Clear browser cache
- Verify user permissions

---

*See [SERVICES.md](./SERVICES.md) for detailed API documentation.*
