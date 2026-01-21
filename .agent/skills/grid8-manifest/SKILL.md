---
name: Grid8 Manifest Structure
description: Complete specification for Grid8 ad manifest files, including layers, shots, timelines, and animations
---

# Grid8 Manifest Structure Guide

This document provides comprehensive documentation for the Grid8 manifest format used in display advertising templates.

## Overview

The manifest (`manifest.js`) is the configuration file that defines the entire structure of a display ad. It controls:

- Ad dimensions and settings
- Layers (visual elements)
- Shots (timing/scenes)
- Animations and timelines
- Dynamic values for content personalization

---

## File Location

```
/public/templates/{template-name}/{size}/manifest.js
```

Example: `/public/templates/test-template/300x600/manifest.js`

The manifest is loaded via `window.manifest = {...}` and parsed by the Grid8 player.

---

## Top-Level Structure

```javascript
window.manifest = {
  settings: {...},        // Global ad settings
  animationGroups: [...], // Reusable animation presets
  components: [...],      // Custom components
  effects: [...],         // Effects like responsive-fontSize
  transitions: [...],     // Transition effects
  customLevels: [...],    // Z-index layers (overlay, transition, background)
  shots: [...],           // Scenes/keyframes
  layers: [...]           // Visual elements
}
```

---

## Settings Object

```javascript
settings: {
  version: "1.11.43",
  template: "display",
  specs: "DCM",                    // Ad spec (DCM, GWD, etc.)
  adID: "Creative ID",
  width: 300,                      // Ad width in pixels
  height: 600,                     // Ad height in pixels
  webFonts: [                      // Custom fonts
    {
      fontFamily: "Bree",
      fontStyle: "Regular",
      fontUrl: "bree.woff2"
    }
  ],
  dynamicValues: [                 // Dynamic content bindings
    {
      id: "46c8c51c-...",
      name: "s0_headline",         // s{shot}_fieldname format
      shotLevel: false
    }
  ],
  useDynamicCSS: false,
  useWebFonts: true
}
```

### Dynamic Values

Dynamic values allow content to be swapped at runtime. Naming convention:

- `s0_headline` - Headline for shot 0
- `s0_bodycopy` - Body copy for shot 0
- `s0_ctaText` - CTA text for shot 0
- `s0_imageUrl` - Dynamic image URL
- `s0_logoUrl` - Logo image URL

---

## Layers

Layers are the visual elements of the ad. Each layer has a unique name and GUID.

### Layer Structure

```javascript
{
  name: "logo",                           // Unique identifier
  guid: "af6951f4-dfad-4eff-9193-...",   // Unique GUID
  fill: { value: 4294901760 },           // Fill color (ARGB integer)
  blendMode: "pass-through",
  anchor: "50% 50%",                      // Transform origin
  zIndex: null,
  level: "0000-0000-0000-2222",          // Which customLevel
  fileType: "png",                        // svg, png, text, etc.
  isDynamic: true,                        // Can content be swapped?
  dynamicValue: "b028efd5-...",          // Links to settings.dynamicValues

  shots: [...]                            // Per-shot positioning
}
```

### Layer Types

| fileType | Description                         | Example              |
| -------- | ----------------------------------- | -------------------- |
| `text`   | Text layer with typography settings | Headlines, body copy |
| `svg`    | Vector graphics (inline or file)    | Shapes, icons        |
| `png`    | Raster image                        | Photos, logos        |

### Available Layers (Test Template)

| Name           | Type  | Description                     |
| -------------- | ----- | ------------------------------- |
| `bg`           | svg   | Background layer (full ad size) |
| `dynamicimage` | png   | Hero/product image (dynamic)    |
| `shape1`       | svg   | Decorative shape 1              |
| `shape2`       | svg   | Decorative shape 2              |
| `logo`         | png   | Brand logo (dynamic)            |
| `maincopy`     | text  | Main headline                   |
| `subcopy`      | text  | Body copy/subheadline           |
| `cta`          | group | CTA button group container      |
| `bg_cta`       | svg   | CTA button background           |
| `ctacopy_cta`  | text  | CTA button text                 |

### Group Layers

Layers can be grouped. Child layers have a `parent` property:

```javascript
{
  name: "cta",
  isGroup: true,
  animateChildren: true,
  // Children are positioned relative to group
}

{
  name: "ctacopy_cta",
  parent: "d000fa03-...",  // GUID of parent group
}
```

---

## Shots (Per-Layer Positioning)

Each layer has a `shots` array defining its position and size per scene.

### Shot Structure

```javascript
shots: [{
  index: 0,                    // Shot index (matches shots array)
  variant: null,
  guid: "af6951f4-...",
  name: "Rectangle 1",

  pos: { x: 115, y: 332 },     // Position (top-left corner)
  centerPoint: { x: 0.5, y: 0.5 },
  rotation: 0,
  opacity: 1,

  size: {
    w: 71,                     // Current width
    h: 71,                     // Current height
    initW: 71,                 // Original width (for scaling)
    initH: 71                  // Original height (for scaling)
  },

  copyAnimation: "disabled",
  timelines: [...],            // Per-shot animations
  zIndex: "auto"
}]
```

### Position System

- `pos.x` - Horizontal position from left edge (pixels)
- `pos.y` - Vertical position from top edge (pixels)
- Negative values allowed (off-canvas positioning for animations)

### Size System

- `size.w` / `size.h` - Current rendered dimensions
- `size.initW` / `size.initH` - Original dimensions (used for scaling calculations)

> **Important:** When scaling a layer, you must update BOTH `w/h` AND `initW/initH` for proper rendering.

---

## Timelines and Animations

Timelines define when and how animations play within a shot.

### Timeline Structure

```javascript
timelines: [
  {
    id: "189aa78d-...",
    trigger: "Timestamp", // Or animation group ID
    customLabel: "Auto",
    timelineType: "Manual",
    groupAnimationOrder: "Auto",
    toggled: true,

    steps: [
      {
        id: "5b2b68a6-...",
        trigger: "Timestamp",
        customLabel: "Auto",
        groupAnimationOrder: "Auto",

        settings: {
          animationType: "from", // "from" or "to"
          stepType: "Manual",
          enabled: false,
          locked: false,
          preset: "Manual",
          duration: "1.2", // Seconds
          autoDuration: true,
          ease: "expo.out", // GSAP easing
          delay: "1", // Seconds

          // Transform properties
          x: 100, // X offset
          y: 0, // Y offset
          scale: 1,
          rotation: 0,
          opacity: 0,
        },
      },
    ],
  },
];
```

### Animation Types

| animationType | Description                                |
| ------------- | ------------------------------------------ |
| `from`        | Animate FROM these values TO current state |
| `to`          | Animate from current state TO these values |

### Trigger Types

| Trigger         | Description                         |
| --------------- | ----------------------------------- |
| `"Timestamp"`   | Plays at specific time in shot      |
| `"{group-id}"`  | Plays when animation group triggers |
| `"On Hover Ad"` | Plays on mouse hover                |
| `"On Click Ad"` | Plays on click                      |

### Common Easing Functions

- `expo.out` - Fast start, slow end (dramatic)
- `power2.out` - Medium easing
- `back.out` - Overshoot effect
- `elastic.out` - Bouncy effect

---

## Animation Groups

Reusable animation presets that multiple layers can reference.

```javascript
animationGroups: [
  {
    id: "9bd33c4f-...",
    animationType: "from",
    name: "objects-in",
    enabled: false,
    preset: "Manual",

    // Default animation properties
    rotation: 0,
    opacity: 0,
    duration: ".9",
    ease: "expo.out",
    delay: 0,
    x: 0,
    y: "100", // Slide in from bottom
    scale: 1,

    // Stagger settings for multiple elements
    staggerAxis: "xy",
    staggerAmount: 0.25,
    staggerAmountEach: "Each",
    staggerFrom: "start",
  },
];
```

---

## Custom Levels (Z-Index Layers)

Defines the stacking order of layers.

```javascript
customLevels: [
  { name: "overlay", levelType: "static", id: "0000-0000-0000-3333" },
  { name: "transition", levelType: "transition", id: "0000-0000-0000-2222" },
  { name: "background", levelType: "static", id: "0000-0000-0000-1111" },
];
```

Layers reference these via their `level` property.

---

## Global Shots Array

Defines scenes/keyframes for the entire ad.

```javascript
shots: [
  {
    index: 0,
    variant: null,
    duration: 3, // In seconds
    autoDuration: false,
    autoExitURL: true,
    name: "",
    background: "#fff",
  },
];
```

Multi-shot ads have multiple entries; the Grid8 player sequences through them.

---

## Text Layer Properties

Text layers have additional typography settings:

```javascript
{
  name: "maincopy",
  fileType: "text",
  text: "Your Health\nIs Our Priority",

  fontFamily: "Bree",
  fontSize: 27,
  fontStyle: "Regular",
  fontColor: "#707070",

  charSpacing: 0,
  lineSpacing: 24,
  paragraphSpacing: 0,

  textAlign: "center",          // left, center, right
  textTransform: "none",        // uppercase, lowercase, none
  layoutBox: "area",            // area or point

  underline: false,
  strikethrough: false,

  animateText: true,
  textAnimation: { type: "lines" },

  effects: [{
    id: "responsive-fontSize",
    properties: {
      minSize: 0,
      maxSize: 27,
      precision: 1,
      shrink: 1
    }
  }]
}
```

---

## SVG Layers

SVG layers can be inline or file-based:

```javascript
{
  name: "shape1",
  fileType: "svg",
  svgType: "Inline",           // or "Image" for file reference
  svgData: "<svg>...</svg>",   // Inline SVG markup
  cssClasses: ".shape1 .bg1"   // CSS classes for styling
}
```

---

## Modifying Layers Programmatically

### Position Changes

```javascript
// Move layer up 30 pixels
shot.pos.y -= 30;

// Move layer right 20 pixels
shot.pos.x += 20;
```

### Scale Changes

```javascript
// Scale to 120%
const scaleFactor = 1.2;
const centerX = shot.pos.x + shot.size.w / 2;
const centerY = shot.pos.y + shot.size.h / 2;

shot.size.w *= scaleFactor;
shot.size.h *= scaleFactor;
shot.size.initW *= scaleFactor;
shot.size.initH *= scaleFactor;

// Adjust position to keep center point
shot.pos.x = centerX - shot.size.w / 2;
shot.pos.y = centerY - shot.size.h / 2;
```

### Dynamic Content

Modify `text` property for text layers or set dynamic image URLs:

```javascript
layer.text = "New Headline Text";
```

---

## CSS Classes and Styling

Layers with `cssClasses` can be styled via CSS:

```css
.maincopy {
  color: var(--headline-color) !important;
}

.shape1 path {
  fill: var(--shape1-fill);
}
```

---

## Best Practices

1. **Always update both `w/h` and `initW/initH`** when scaling
2. **Use layer names** (not GUIDs) for identification in code
3. **Test animations** after modifying timelines
4. **Maintain center point** when scaling by adjusting position
5. **Keep dynamic values** in sync with `settings.dynamicValues`

---

## Related Files

- `index.html` - Ad HTML structure and initialization
- `styles.css` - Base styles and CSS custom properties
- `grid8player.min.js` - Grid8 runtime player
- `animate.js` - Animation helpers

---

## Example: Finding a Layer by Name

```typescript
const layers = manifest.layers as Array<{
  name: string;
  shots: {
    pos: { x: number; y: number };
    size: { w: number; h: number; initW?: number; initH?: number };
  }[];
}>;

const logoLayer = layers.find((l) => l.name.toLowerCase() === "logo");
if (logoLayer?.shots[0]) {
  // Modify logo position/size
  logoLayer.shots[0].pos.y -= 30; // Move up
}
```
