# Grid8 Player Library

Reference documentation for the Grid8 JavaScript player library.

---

## Overview

Grid8 Player is a JavaScript library for creating interactive rich media ads built on the GSAP animation platform. It uses a shot-based animation system with support for interactive elements.

**Key Features:**
- Shot-based animation timeline
- GSAP-powered animations
- Interactive elements (hover, click, swipe)
- Responsive scaling
- Cross-platform compatibility

---

## Quick Start

### Basic Setup

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <script src="/grid8/player.js"></script>
</head>
<body>
  <div id="ad-container"></div>

  <script>
    const player = new Grid8Player({
      container: '#ad-container',
      manifest: manifestData,
      autoplay: true
    });
  </script>
</body>
</html>
```

### Manifest Structure

```javascript
const manifest = {
  // Ad metadata
  meta: {
    name: "Summer Campaign",
    version: 1,
    dimensions: { width: 300, height: 250 }
  },

  // Assets
  assets: {
    images: [
      { id: "bg", url: "background.jpg" },
      { id: "product", url: "product.png" }
    ],
    fonts: [
      { id: "heading", family: "Roboto", url: "roboto.woff2" }
    ]
  },

  // Shots (animation scenes)
  shots: [
    {
      id: "intro",
      duration: 2,
      elements: [/* ... */],
      animations: [/* ... */]
    },
    {
      id: "product",
      duration: 3,
      elements: [/* ... */],
      animations: [/* ... */]
    }
  ],

  // Interactions
  interactions: [
    {
      type: "click",
      target: "#cta-button",
      action: "openUrl",
      url: "https://example.com"
    }
  ],

  // Global settings
  settings: {
    clickUrl: "https://example.com",
    backgroundColor: "#ffffff",
    loop: true,
    loopDelay: 1
  }
};
```

---

## Configuration Options

### Player Options

```javascript
const player = new Grid8Player({
  // Required
  container: '#ad-container',    // DOM element or selector
  manifest: manifestData,        // Manifest object or URL

  // Playback
  autoplay: true,                // Start automatically
  loop: true,                    // Loop animation
  loopDelay: 1,                  // Seconds between loops
  startShot: 0,                  // Starting shot index

  // Display
  responsive: true,              // Scale to container
  maintainAspectRatio: true,     // Preserve aspect ratio
  backgroundColor: '#ffffff',    // Background color

  // Debug
  debug: false,                  // Show debug overlay
  showTimeline: false,           // Show timeline controls

  // Callbacks
  onReady: () => {},             // Player ready
  onPlay: () => {},              // Playback started
  onPause: () => {},             // Playback paused
  onComplete: () => {},          // Animation complete
  onShotChange: (shotId) => {},  // Shot changed
  onClick: () => {},             // Ad clicked
  onError: (err) => {}           // Error occurred
});
```

---

## Manifest Reference

### Meta Section

```javascript
meta: {
  name: "Ad Name",
  version: 1,
  dimensions: {
    width: 300,
    height: 250
  },
  format: "banner",           // banner, video, rich-media
  framerate: 60,              // Animation framerate
  totalDuration: 15           // Total duration (seconds)
}
```

### Assets Section

```javascript
assets: {
  images: [
    {
      id: "bg",               // Reference ID
      url: "image.jpg",       // Asset URL
      preload: true           // Preload before play
    }
  ],
  videos: [
    {
      id: "promo",
      url: "video.mp4",
      poster: "poster.jpg",
      muted: true,
      loop: false
    }
  ],
  fonts: [
    {
      id: "heading",
      family: "CustomFont",
      url: "font.woff2",
      weight: 700,
      style: "normal"
    }
  ],
  audio: [
    {
      id: "music",
      url: "audio.mp3",
      volume: 0.5
    }
  ]
}
```

### Shots Section

```javascript
shots: [
  {
    id: "intro",
    duration: 3,              // Duration in seconds
    transition: {
      type: "fade",           // fade, slide, wipe, none
      duration: 0.5
    },
    elements: [
      {
        id: "headline",
        type: "text",
        content: "Summer Sale",
        style: {
          x: 20,
          y: 50,
          width: 260,
          fontSize: 32,
          fontFamily: "heading",
          color: "#000000",
          textAlign: "center"
        }
      },
      {
        id: "product",
        type: "image",
        asset: "product",
        style: {
          x: 50,
          y: 80,
          width: 200,
          height: 150,
          opacity: 1
        }
      }
    ],
    animations: [
      {
        target: "#headline",
        from: { y: -50, opacity: 0 },
        to: { y: 50, opacity: 1 },
        duration: 0.8,
        delay: 0.2,
        ease: "power2.out"
      }
    ]
  }
]
```

### Element Types

**Text Element:**
```javascript
{
  id: "text1",
  type: "text",
  content: "Hello World",
  style: {
    x: 0, y: 0,
    width: 300,
    fontSize: 24,
    fontFamily: "Arial",
    fontWeight: 700,
    color: "#000000",
    textAlign: "left",        // left, center, right
    lineHeight: 1.2,
    letterSpacing: 0,
    textTransform: "none",    // none, uppercase, lowercase
    textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
  }
}
```

**Image Element:**
```javascript
{
  id: "img1",
  type: "image",
  asset: "product",           // Reference to assets.images
  style: {
    x: 0, y: 0,
    width: 100, height: 100,
    opacity: 1,
    objectFit: "cover",       // cover, contain, fill
    borderRadius: 0,
    filter: "none"            // CSS filters
  }
}
```

**Shape Element:**
```javascript
{
  id: "shape1",
  type: "shape",
  shape: "rectangle",         // rectangle, circle, line
  style: {
    x: 0, y: 0,
    width: 100, height: 50,
    backgroundColor: "#007bff",
    borderRadius: 5,
    borderWidth: 0,
    borderColor: "#000000",
    opacity: 1
  }
}
```

**Video Element:**
```javascript
{
  id: "video1",
  type: "video",
  asset: "promo",
  style: {
    x: 0, y: 0,
    width: 300, height: 250
  },
  playback: {
    autoplay: true,
    muted: true,
    loop: false,
    controls: false
  }
}
```

**Button Element:**
```javascript
{
  id: "cta",
  type: "button",
  content: "Shop Now",
  style: {
    x: 100, y: 200,
    width: 100, height: 40,
    backgroundColor: "#28a745",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 4,
    cursor: "pointer"
  },
  hover: {
    backgroundColor: "#218838",
    scale: 1.05
  }
}
```

### Animations Section

```javascript
animations: [
  {
    target: "#element-id",    // Element selector
    from: {                   // Starting state
      x: 0,
      opacity: 0,
      scale: 0.5,
      rotation: 0
    },
    to: {                     // Ending state
      x: 100,
      opacity: 1,
      scale: 1,
      rotation: 360
    },
    duration: 1,              // Seconds
    delay: 0,                 // Delay before start
    ease: "power2.out",       // GSAP easing
    repeat: 0,                // Repeat count (-1 = infinite)
    yoyo: false,              // Reverse on repeat
    stagger: 0                // Stagger for multiple targets
  }
]
```

**GSAP Easing Options:**
- `"none"` / `"linear"`
- `"power1.in"` / `"power1.out"` / `"power1.inOut"`
- `"power2.in"` / `"power2.out"` / `"power2.inOut"`
- `"power3.in"` / `"power3.out"` / `"power3.inOut"`
- `"power4.in"` / `"power4.out"` / `"power4.inOut"`
- `"back.in"` / `"back.out"` / `"back.inOut"`
- `"bounce.in"` / `"bounce.out"` / `"bounce.inOut"`
- `"elastic.in"` / `"elastic.out"` / `"elastic.inOut"`

### Interactions Section

```javascript
interactions: [
  // Click interaction
  {
    type: "click",
    target: "#cta-button",    // Element or "global"
    action: "openUrl",
    url: "https://example.com",
    newTab: true
  },

  // Hover interaction
  {
    type: "hover",
    target: "#product",
    action: "playAnimation",
    animation: "product-zoom"
  },

  // Swipe interaction
  {
    type: "swipe",
    direction: "left",
    action: "nextShot"
  },

  // Custom action
  {
    type: "click",
    target: "#custom-btn",
    action: "custom",
    handler: "onCustomClick"  // Custom function name
  }
]
```

**Available Actions:**
- `openUrl` - Open URL (click tracking)
- `playAnimation` - Play named animation
- `pauseAnimation` - Pause animation
- `goToShot` - Jump to specific shot
- `nextShot` - Go to next shot
- `prevShot` - Go to previous shot
- `playVideo` - Play video element
- `pauseVideo` - Pause video element
- `custom` - Call custom handler

---

## API Methods

### Playback Control

```javascript
// Play
player.play();

// Pause
player.pause();

// Stop (reset to beginning)
player.stop();

// Toggle play/pause
player.toggle();

// Seek to time (seconds)
player.seek(2.5);

// Go to shot
player.goToShot('intro');
player.goToShot(0);          // By index

// Next/previous shot
player.nextShot();
player.prevShot();
```

### State

```javascript
// Get current state
player.isPlaying();          // boolean
player.isPaused();           // boolean
player.getCurrentShot();     // shot object
player.getCurrentTime();     // seconds
player.getDuration();        // total duration
player.getProgress();        // 0-1

// Get manifest
player.getManifest();
```

### Dynamic Updates

```javascript
// Update element
player.updateElement('headline', {
  content: 'New Text',
  style: { color: '#ff0000' }
});

// Update from feed data
player.updateFromFeed({
  headline: 'Dynamic Headline',
  product_image: 'https://cdn.example.com/product.jpg',
  cta_text: 'Buy Now'
});

// Update click URL
player.setClickUrl('https://new-url.com');
```

### Events

```javascript
// Listen to events
player.on('ready', () => console.log('Ready'));
player.on('play', () => console.log('Playing'));
player.on('pause', () => console.log('Paused'));
player.on('complete', () => console.log('Complete'));
player.on('shotChange', (shot) => console.log('Shot:', shot.id));
player.on('click', () => console.log('Clicked'));
player.on('error', (err) => console.error(err));

// Remove listener
player.off('play', handler);

// One-time listener
player.once('ready', handler);
```

### Destruction

```javascript
// Destroy player instance
player.destroy();
```

---

## Debugging

### Debug Mode

```javascript
const player = new Grid8Player({
  container: '#ad',
  manifest: data,
  debug: true,           // Enable debug overlay
  showTimeline: true     // Show timeline controls
});
```

### Debug Methods

```javascript
// Log manifest
player.debugManifest();

// Log current state
player.debugState();

// Get animation timeline
player.getTimeline();    // Returns GSAP timeline

// Slow motion
player.setTimeScale(0.5);
```

### Console Commands

When `debug: true`:
```javascript
// Access player from console
window.__grid8Player

// Inspect elements
window.__grid8Player.getElement('headline')

// Manual animation testing
window.__grid8Player.getTimeline().pause();
window.__grid8Player.getTimeline().progress(0.5);
```

---

## Feed Integration

### Mapping Feed Data

```javascript
// Manifest with feed placeholders
const manifest = {
  shots: [{
    elements: [{
      id: "headline",
      type: "text",
      content: "{{headline}}"    // Feed variable
    }, {
      id: "product",
      type: "image",
      asset: "{{product_image}}" // Feed variable
    }]
  }]
};

// Apply feed data
player.updateFromFeed({
  headline: "Summer Sale - 50% Off",
  product_image: "https://cdn.example.com/summer.jpg"
});
```

### Batch Rendering

```javascript
// Generate multiple variants
const feedData = [
  { headline: "Sale A", product: "img1.jpg" },
  { headline: "Sale B", product: "img2.jpg" },
  { headline: "Sale C", product: "img3.jpg" }
];

feedData.forEach(async (row, index) => {
  const player = new Grid8Player({
    container: `#ad-${index}`,
    manifest: template
  });

  await player.ready();
  player.updateFromFeed(row);

  // Capture screenshot
  const screenshot = await player.captureFrame();
});
```

---

## Best Practices

### Performance

1. **Preload assets** - Set `preload: true` for critical images
2. **Optimize images** - Use appropriate formats and sizes
3. **Limit animations** - Avoid too many simultaneous animations
4. **Use CSS transforms** - Animate `x`, `y`, `scale`, `rotation` (GPU accelerated)
5. **Avoid layout thrashing** - Don't animate `width`, `height` during playback

### Accessibility

1. **Pause on hover** - Allow users to pause animations
2. **Respect prefers-reduced-motion** - Detect and honor system settings
3. **Provide alt text** - Include descriptions for images
4. **Keyboard navigation** - Support keyboard interaction

```javascript
// Respect reduced motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  player.setTimeScale(0);  // Disable animations
}
```

### Cross-Browser

1. **Test on target browsers** - Chrome, Firefox, Safari, Edge
2. **Use fallbacks** - Provide static fallback for no-JS
3. **Check GSAP support** - GSAP supports IE11+
4. **Font loading** - Use font-display: swap

---

## Examples

### Basic Banner

```javascript
const manifest = {
  meta: {
    dimensions: { width: 300, height: 250 }
  },
  assets: {
    images: [
      { id: "bg", url: "bg.jpg" },
      { id: "logo", url: "logo.png" }
    ]
  },
  shots: [{
    id: "main",
    duration: 5,
    elements: [
      { id: "bg", type: "image", asset: "bg", style: { x: 0, y: 0, width: 300, height: 250 }},
      { id: "headline", type: "text", content: "Summer Sale", style: { x: 20, y: 50, fontSize: 28 }},
      { id: "cta", type: "button", content: "Shop Now", style: { x: 100, y: 200, width: 100, height: 35 }}
    ],
    animations: [
      { target: "#headline", from: { opacity: 0 }, to: { opacity: 1 }, duration: 0.5 }
    ]
  }],
  interactions: [
    { type: "click", target: "global", action: "openUrl", url: "https://example.com" }
  ]
};
```

### Multi-Shot Animation

```javascript
const manifest = {
  shots: [
    {
      id: "intro",
      duration: 2,
      elements: [
        { id: "logo", type: "image", asset: "logo", style: { x: 100, y: 100 }}
      ],
      animations: [
        { target: "#logo", from: { scale: 0 }, to: { scale: 1 }, ease: "back.out" }
      ],
      transition: { type: "fade", duration: 0.3 }
    },
    {
      id: "product",
      duration: 3,
      elements: [
        { id: "product", type: "image", asset: "product", style: { x: 50, y: 50 }},
        { id: "price", type: "text", content: "$29.99", style: { x: 150, y: 200 }}
      ],
      animations: [
        { target: "#product", from: { x: -100 }, to: { x: 50 }, ease: "power2.out" },
        { target: "#price", from: { opacity: 0 }, to: { opacity: 1 }, delay: 0.5 }
      ]
    },
    {
      id: "cta",
      duration: 2,
      elements: [
        { id: "button", type: "button", content: "Buy Now", style: { x: 100, y: 180 }}
      ],
      animations: [
        { target: "#button", from: { scale: 0.8 }, to: { scale: 1 }, ease: "elastic.out", repeat: -1, yoyo: true }
      ]
    }
  ],
  settings: {
    loop: true,
    loopDelay: 2
  }
};
```

---

*See the existing `frontenX/grid8player_documentation.md` for additional implementation details.*
