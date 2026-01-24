---
name: app-context
description: High-level overview and summary of the GridLite (BannerBros) functionality, architecture, and agent system.
---

# GridLite (BannerBros) - AI Ad Generation Platform

**GridLite** (branded as "BannerBros") is an **AI-powered display advertising platform** that automates the entire ad creation workflow—from brand intelligence gathering to final creative generation—using a multi-agent AI system built with Mastra and Google Gemini.

## Core Workflow

### 1. Brand Intelligence Scanning (`/scan`)

**Endpoint:** `/api/scan`

- **Input:** User provides a website URL
- **Process:** Automated browser scraping using Playwright with privacy-focused features
- **Extraction:**
  - **Visual Assets:** Logos (multiple formats/sizes), screenshots, favicon
  - **Brand Identity:** Color palette extraction (`#hex`), business name, industry classification
  - **Content Analysis:** Gemini AI analyzes scraped HTML for brand voice, tone, tagline, target audience
- **Output:** Comprehensive brand data stored in `BrandContext`
- **Features:** Re-analysis capability, adblocker integration, anti-bot measures

### 2. Strategic Planning (`/strategy`) - Agent: Sarah

**Endpoint:** `/api/strategy`  
**Agent Definition:** `src/mastra/agents/strategist.ts`

- **Persona:** "Sarah" - Digital Marketing Strategist with 15+ years experience
- **Role:** Campaign direction and strategic positioning
- **Capabilities:**
  - **Strategy Selection:** Awareness, Conversion, or Engagement focus
  - **Professional Copywriting:** Headlines, subheadlines, CTAs with benefit-driven messaging
  - **Visual Concepts:** Hero image recommendations and visual hierarchy suggestions
  - **Conversational Refinement:** Chat-based iteration on strategy and copy
- **State Management:** Campaign strategy stored in `CampaignContext`
- **UI:** Modular components in `src/components/strategy/` with streaming responses

### 3. Creative Design (`/studio`) - Agent: Davinci

**Endpoint:** `/api/designer`  
**Agent Definition:** `src/mastra/agents/designer.ts`

- **Persona:** "Davinci" - Award-winning Creative Director
- **Role:** Visual design execution and layout refinement
- **Capabilities:**
  - **Visual Direction:** Typography, color palettes, style guides
  - **AI Image Generation:** Detailed prompts for hero visuals (via Gemini image generation)
  - **Granular Layer Control:** Modify individual ad elements via natural language
    - Example: "move logo 10px up", "increase headline font size"
  - **Grid8 Manifest Manipulation:** Updates ad layer properties dynamically
- **State Management:** Design recommendations in `CampaignContext`, layer modifications tracked
- **Integration:** Works with `AdPreviewCanvas` for real-time preview updates

### 4. Ad Generation & Preview System

**Core Technology:** Grid8 Manifest format (see `grid8-manifest` skill for full spec)

- **Manifest Structure:** JSON-based ad definitions with layers, shots, timelines, animations
- **Preview System:**
  - `AdPreviewCanvas`: Renders live previews in standard IAB sizes (300x250, 728x90, 160x600, etc.)
  - `AdPreviewItem`: Individual ad instance with dynamic value application
  - `useAdPreviewBlob`: Hook for applying dynamic data to manifests
- **Dynamic Values:** Brand assets (logos, colors, copy) injected via URL params
- **Template System:** Base templates in `public/templates/template000/`

## Architecture & Technical Stack

### Frontend Framework

- **Next.js 14+** with App Router
- **TypeScript** (strict mode)
- **React 18+** with Server Components pattern

### State Management (Refactored Context Architecture)

The app uses **modular, focused contexts** instead of a monolithic AuthContext:

- **`AuthContext`** (`src/contexts/AuthContext.tsx`): Authentication, user sessions
- **`BrandContext`** (`src/contexts/BrandContext.tsx`): Brand scanning data, logos, colors
- **`CreditContext`** (`src/contexts/CreditContext.tsx`): User credits, billing
- **`CampaignContext`** (`src/contexts/CampaignContext.tsx`): Strategy, design, campaign state

### AI & Agent System

- **Mastra Framework:** Agent orchestration (`src/mastra/`)
- **Google Gemini:** Primary LLM for all agents
- **Agent Definitions:**
  - `src/mastra/agents/strategist.ts` - Sarah (Strategy)
  - `src/mastra/agents/designer.ts` - Davinci (Design)
- **Tools:** Custom Mastra tools for manifest manipulation, image generation

### Scraping & Automation

- **Playwright/Puppeteer:** Headless browser automation
- **Privacy Features:** Adblocker integration, anti-fingerprinting, cookies disabled
- **Logo Extraction:** Advanced logic for finding high-resolution brand assets

### UI/Styling

- **Tailwind CSS:** Utility-first styling with custom warm gradient theme
- **shadcn/ui:** Component library (buttons, cards, dialogs)
- **Framer Motion:** Page transitions and animations
- **Design Language:** Warm gradients, glassmorphism removed in favor of flat, friendly aesthetic

### API Routes (App Router Pattern)

```
/api/scan          → Brand intelligence extraction
/api/strategy      → Strategic planning agent (Sarah)
/api/designer      → Creative design agent (Davinci)
/api/user/credits  → Credit management
```

## Key Pages & Components

### Pages

- **`/scan` (ScanPage):** URL input, brand scanning, results display
- **`/strategy` (StrategyPage):** Campaign strategy review, Sarah chat interface
- **`/studio` (StudioPage):** Ad preview canvas, Davinci design refinement

### Critical Components

- **`AdPreviewCanvas`** (`src/components/studio/AdPreviewCanvas.tsx`): Multi-size ad preview grid
- **`ImageBrowser`** (`src/components/ImageBrowser.tsx`): Logo/asset selection from scan results
- **`BrandIdentityCard`** (`src/components/scan/BrandIdentityCard.tsx`): Display brand analysis
- **Strategy Components** (`src/components/strategy/`):
  - `StrategySummary`, `CopyRecommendations`, `VisualDirection`, `StrategyChat`

### Hooks

- **`useDesigner`** (`src/hooks/useDesigner.ts`): Davinci agent interaction, layer modifications
- **`useAdPreviewBlob`** (`src/hooks/useAdPreviewBlob.ts`): Dynamic manifest rendering
- **Context Hooks:** `useAuth`, `useBrand`, `useCampaign`, `useCredits`

## Data Flow Example: Layer Modification

1. **User:** "Move logo 10px to the top" (in `/studio` chat)
2. **`useDesigner` hook:** Sends message to `/api/designer`
3. **Davinci Agent:** Parses intent, identifies target layer by name
4. **Response:** Returns `layerModifications` array with updated coordinates
5. **`StudioPage`:** Receives modifications, updates `CampaignContext`
6. **`AdPreviewCanvas`:** Re-renders with new layer positions
7. **`applyDynamicValues`:** Merges modifications into manifest before rendering

## Development Patterns

### Code Style

- **Clean Code Skill:** Pragmatic, concise, no over-engineering
- **No Unnecessary Comments:** Self-documenting code preferred
- **TypeScript Strict:** Type safety enforced
- **Server Components:** Default to server components unless interactivity needed

### Debugging Setup

- Configured for debugging both client and API routes within IDE
- Mastra dev server runs separately for agent testing

### Git Workflow

- **Remote:** GitLab repository
- **Branch:** `main` with upstream tracking

## User Journey Summary

1. **Scan Phase:** Enter URL → Auto-extract brand DNA → Review results
2. **Strategy Phase:** Review Sarah's recommendations → Chat to refine → Approve direction
3. **Design Phase:** Davinci generates visuals → Preview ads → Chat for layout tweaks
4. **Refinement:** Iterate on copy, images, or layout via natural language
5. **Export:** (Future) Download final ad assets

## Related Skills

- **`grid8-manifest`:** Complete Grid8 manifest specification (layers, shots, animations)
- **`clean-code`:** Coding standards and patterns for this project
- **`nextjs`:** App Router, Server Components, routing patterns
