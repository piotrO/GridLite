# Grid8 API Requirements for GridLite Integration

This document outlines all the API endpoints needed from grid8.com to fully integrate GridLite's data storage, export, and workflow capabilities.

---

## Current Grid8 Integration Status

Your app currently uses Grid8 (`grid8.bannerbros.net`) for:

- ✅ Brand CRUD operations
- ✅ Brand avatar/logo uploads
- ⚠️ Brand profile data stored as JSON in `notes.book` field (workaround)

**Not yet integrated with Grid8:**

- ❌ Campaigns
- ❌ Strategies
- ❌ Creatives/Designs
- ❌ Ad Templates
- ❌ Export/Asset Storage
- ❌ AI-generated images

---

## Summary: Priority Endpoints

### Must Have (Core Functionality)

1. **Brand API** - ✅ Already working, needs native `brandProfile` field
2. **Campaign API** - Store campaign state across sessions
3. **Creative API** - Store designs, layer mods, and copy
4. **Asset Upload API** - Store AI-generated images and logos
5. **Export API** - Server-side export generation

### Nice to Have (Enhanced Experience)

6. **Template API** - Cloud-managed templates instead of local
7. **AI Generation API** - Server-side AI for consistency
8. **Preview Hosting** - Shareable preview URLs

---

## Required API Endpoints

### 1. Authentication & User Management

| Endpoint           | Method | Description              | Arguments             |
| ------------------ | ------ | ------------------------ | --------------------- |
| `/api/auth/login`  | POST   | User authentication      | `{ email, password }` |
| `/api/auth/me`     | GET    | Get current user profile | Bearer token          |
| `/api/auth/logout` | POST   | Invalidate session       | Bearer token          |

**Required Response:**

```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    organizationId: string;
  };
  token: string;
  refreshToken?: string;
}
```

---

### 2. Brand Management (Currently Implemented)

| Endpoint                      | Method | Description       | Arguments                                               |
| ----------------------------- | ------ | ----------------- | ------------------------------------------------------- |
| `/api/corp/brand`             | GET    | List all brands   | `?q=&sortType=desc&sortField=createdAt&page=1&limit=20` |
| `/api/corp/brand`             | POST   | Create new brand  | See request body below                                  |
| `/api/corp/brand/:id`         | GET    | Get single brand  | Brand ID in URL                                         |
| `/api/corp/brand/:id`         | PUT    | Update brand      | Brand ID + body                                         |
| `/api/corp/brand/:id`         | DELETE | Delete brand      | Brand ID                                                |
| `/api/asset/avatar/brand/:id` | POST   | Upload brand logo | FormData with `image` file                              |

**Create/Update Brand Request Body:**

```typescript
{
  name: string;
  dcmProfileId?: string;
  adAccounts?: string[];
  notes?: {
    innovation?: string;
    book?: string;  // Currently JSON-stringified brand profile
  };
  // NEEDED: Native brand profile field instead of notes.book workaround
  brandProfile?: {
    url?: string;
    logo?: string;
    businessName?: string;
    shortName?: string;
    industry?: string;
    tagline?: string;
    colors?: string[];  // hex color array
    font?: string;
    tone?: string;
    personality?: string[];
    brandSummary?: string;
    targetAudiences?: { name: string; description: string }[];
    analyzedAt?: string;  // ISO date
  };
}
```

> [!IMPORTANT]
> **Request**: Add native `brandProfile` field to brands API instead of storing in `notes.book` as JSON string.

---

### 3. Campaign Management (NEW - Required)

Campaigns represent an ad creation project linking brand → strategy → creatives.

| Endpoint            | Method | Description          | Arguments                        |
| ------------------- | ------ | -------------------- | -------------------------------- |
| `/api/campaign`     | GET    | List campaigns       | `?brandId=&status=&page=&limit=` |
| `/api/campaign`     | POST   | Create campaign      | See request body below           |
| `/api/campaign/:id` | GET    | Get campaign details | Campaign ID                      |
| `/api/campaign/:id` | PUT    | Update campaign      | Campaign ID + body               |
| `/api/campaign/:id` | DELETE | Delete campaign      | Campaign ID                      |

**Campaign Request/Response Schema:**

```typescript
interface Campaign {
  _id: string;
  brandId: string; // Reference to brand
  name: string;
  status: "draft" | "in-progress" | "complete" | "exported";
  thumbnail?: string; // URL to preview image

  // Strategy data (from AI strategist)
  strategy?: {
    recommendation: "AWARENESS" | "CONVERSION" | "ENGAGEMENT";
    campaignAngle: string;
    headline: string;
    subheadline: string;
    rationale: string;
    callToAction: string;
    heroVisualConcept?: string;
    adFormats: string[];
    targetingTips: string[];
  };

  // Raw website analysis data
  websiteAnalysis?: {
    rawText?: string;
    currentPromos: string[];
    uniqueSellingPoints: string[];
    seasonalContext: string | null;
    callsToAction: string[];
    keyProducts: string[];
  };

  createdAt: string;
  updatedAt: string;
}
```

---

### 4. Creative/Design Management (NEW - Required)

Creatives are the actual ad designs within a campaign.

| Endpoint            | Method | Description          | Arguments                   |
| ------------------- | ------ | -------------------- | --------------------------- |
| `/api/creative`     | GET    | List creatives       | `?campaignId=&page=&limit=` |
| `/api/creative`     | POST   | Create creative      | See request body below      |
| `/api/creative/:id` | GET    | Get creative details | Creative ID                 |
| `/api/creative/:id` | PUT    | Update creative      | Creative ID + body          |
| `/api/creative/:id` | DELETE | Delete creative      | Creative ID                 |

**Creative Request/Response Schema:**

```typescript
interface Creative {
  _id: string;
  campaignId: string; // Reference to campaign
  brandId: string; // Reference to brand
  name: string;

  // Design direction (from AI designer)
  designDirection: {
    conceptName: string;
    visualStyle: string;
    colorScheme: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
    typography: {
      headlineStyle: string;
      bodyStyle: string;
    };
    layoutSuggestion: string;
    animationIdeas: string[];
    moodKeywords: string[];
    heroImagePrompt?: string;
  };

  // Copy content
  copy: {
    headline: string;
    bodyCopy?: string;
    ctaText: string;
  };

  // Layer modifications for template
  layerModifications?: LayerModification[];

  // Asset URLs
  heroImageUrl?: string; // AI-generated image
  logoUrl?: string; // Brand logo to use

  // Template reference
  templateId: string; // e.g., "template000"

  // Selected sizes for export
  sizes: string[]; // e.g., ["300x250", "728x90"]

  status: "draft" | "approved" | "exported";
  createdAt: string;
  updatedAt: string;
}

interface LayerModification {
  layerName: string;
  positionDelta?: { x?: number; y?: number };
  scaleFactor?: number;
  sizes?: string[]; // Apply only to specific sizes
}
```

---

### 5. Template Management (NEW - Required)

Templates are reusable ad structures with multiple sizes.

| Endpoint                           | Method | Description                       | Arguments           |
| ---------------------------------- | ------ | --------------------------------- | ------------------- |
| `/api/template`                    | GET    | List available templates          | `?page=&limit=`     |
| `/api/template/:id`                | GET    | Get template details              | Template ID         |
| `/api/template/:id/sizes`          | GET    | List available sizes for template | Template ID         |
| `/api/template/:id/manifest/:size` | GET    | Get manifest.js for specific size | Template + Size IDs |

**Template Schema:**

```typescript
interface Template {
  _id: string;
  name: string;
  description?: string;
  thumbnail: string; // Preview image URL
  category?: string; // e.g., "display", "social", "video"

  sizes: TemplateSize[];

  // Dynamic value definitions
  dynamicValues: DynamicValueDefinition[];

  createdAt: string;
  updatedAt: string;
}

interface TemplateSize {
  id: string; // e.g., "300x250"
  name: string; // e.g., "Medium Rectangle"
  width: number;
  height: number;
  available: boolean;
  manifestUrl: string; // URL to manifest.js
  previewUrl: string; // URL to index.html
}

interface DynamicValueDefinition {
  id: string;
  name: string; // e.g., "s0_headline"
  type: "text" | "image" | "color" | "url";
  defaultValue?: string;
  shotLevel: boolean;
}
```

---

### 6. Asset/File Storage (NEW - Required)

For storing AI-generated images, exported ZIPs, and other assets.

| Endpoint                    | Method | Description           | Arguments                                                                                                        |
| --------------------------- | ------ | --------------------- | ---------------------------------------------------------------------------------------------------------------- | ---- | ------- |
| `/api/asset/upload`         | POST   | Upload file           | FormData with [file](file:///Users/piotrostiak/Dev/ai/grid-lite/src/types/designer.ts#5-18) + `type` + `brandId` |
| `/api/asset/:id`            | GET    | Get asset metadata    | Asset ID                                                                                                         |
| `/api/asset/:id`            | DELETE | Delete asset          | Asset ID                                                                                                         |
| `/api/asset/brand/:brandId` | GET    | List assets for brand | Brand ID + `?type=image                                                                                          | logo | export` |

**Upload Request:**

```typescript
// FormData fields:
{
  file: File;
  type: "hero_image" | "logo" | "export_zip" | "thumbnail";
  brandId: string;
  campaignId?: string;
  creativeId?: string;
}
```

**Asset Response:**

```typescript
interface Asset {
  _id: string;
  url: string; // CDN URL to access file
  filename: string;
  mimeType: string;
  size: number; // bytes
  type: string; // hero_image, logo, export_zip, etc.
  brandId: string;
  campaignId?: string;
  creativeId?: string;
  createdAt: string;
}
```

---

### 7. Export Management (NEW - Required)

Track export history and provide hosted ad previews.

| Endpoint                           | Method | Description                | Arguments              |
| ---------------------------------- | ------ | -------------------------- | ---------------------- |
| `/api/export`                      | POST   | Create export job          | See request body below |
| `/api/export/:id`                  | GET    | Get export status/download | Export ID              |
| `/api/export/creative/:creativeId` | GET    | List exports for creative  | Creative ID            |
| `/api/export/:id/download`         | GET    | Download ZIP file          | Export ID              |
| `/api/export/:id/preview`          | GET    | Get hosted preview URLs    | Export ID              |

**Export Request:**

```typescript
interface ExportRequest {
  creativeId: string;
  sizes: string[]; // Which sizes to export
  format: "zip" | "hosted"; // ZIP download or hosted preview

  // All dynamic values to bake in
  dynamicValues: {
    headline?: string;
    bodyCopy?: string;
    ctaText?: string;
    imageUrl?: string;
    logoUrl?: string;
    colors?: string[];
  };

  layerModifications?: LayerModification[];
}
```

**Export Response:**

```typescript
interface ExportResult {
  _id: string;
  status: "pending" | "processing" | "complete" | "failed";
  downloadUrl?: string; // For ZIP format
  previewUrls?: {
    // For hosted format
    [size: string]: string;
  };
  createdAt: string;
  expiresAt?: string; // When hosted previews expire
}
```

---
