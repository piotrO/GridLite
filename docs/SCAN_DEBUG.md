# Scan Workflow Debug Environment Variables

## Overview

The scan workflow now supports conditional debug modes to reduce noise in production while providing detailed logging when needed.

## Environment Variables

### `DEBUG_SCAN=true`

Enables all scan-related debug features globally.

### `DEBUG_COLOR_EXTRACTION=true`

Enables color extraction debugging:

- Saves original screenshots to `public/debug/{name}-original.png`
- Saves analyzed color images to `public/debug/{name}-analyzed.png`
- Logs detailed color frequency analysis

**Example output:**

```
public/debug/
  debug-screenshot-original.png
  debug-screenshot-analyzed.png
  debug-logo-original.png
  debug-logo-analyzed.png
```

### `DEBUG_LOGO_EXTRACTION=true`

Enables logo extraction debugging:

- Logs all candidate logos with scores and reasons
- Shows HTML snippets of each candidate
- Logs validation attempts

**Example logs:**

```
[LogoExtractor] Candidate SVG: {"score":75,"reasons":["keyword:logo","in:header","link:root"],"html":"<svg class='logo'>..."}
[LogoExtractor] Validation PASSED. Returning.
```

### `DEBUG_FONT_EXTRACTION=true`

Enables font extraction debugging (future enhancement - placeholder for now).

## Usage

### Development (Local)

Add to `.env.local`:

```bash
DEBUG_COLOR_EXTRACTION=true
DEBUG_LOGO_EXTRACTION=true
```

### Production Debug Session

Temporarily enable for specific debugging session via environment variables in your hosting platform.

## Performance Impact

| Mode            | Production Impact                     | Development Benefit               |
| --------------- | ------------------------------------- | --------------------------------- |
| Color Debug OFF | No disk I/O                           | Can't troubleshoot color issues   |
| Color Debug ON  | ~50-100ms per scan, ~200KB disk usage | Visual confirmation of extraction |
| Logo Debug OFF  | Minimal logging                       | Limited troubleshooting           |
| Logo Debug ON   | ~10-20ms per scan                     | Detailed candidate scoring        |

## Cleanup

Debug images in `public/debug/` are not automatically cleaned up. To remove them:

```bash
rm -rf public/debug/*.png
```

Or add to `.gitignore`:

```
/public/debug/*.png
```

## Implementation Details

Debug modes are checked at module initialization and cached, so changing environment variables requires a server restart.
