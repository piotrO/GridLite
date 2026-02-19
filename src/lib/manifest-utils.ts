/**
 * Utilities for parsing and manipulating Grid8 ad manifests
 */

import { Typography } from "@/lib/shared/types";

/**
 * Generate CSS for custom fonts and inject into HTML head
 */
export function injectFonts(
  html: string,
  typography: Typography | null | undefined,
): string {
  if (!typography || !typography.headerFont) return html;

  const { headerFont, bodyFont, fontCssUrl } = typography;

  // If we have a CSS URL, use that instead of generating inline @font-face
  if (fontCssUrl) {
    const headerFamily = headerFont.fontFamily || "sans-serif";
    const bodyFamily = bodyFont.fontFamily || "sans-serif";

    const cssLink = `<link rel="stylesheet" href="${fontCssUrl}">`;
    const fontClasses = `
    <style>
        .header-font {
            font-family: '${headerFamily}', sans-serif !important;
        }
        
        .body-font {
            font-family: '${bodyFamily}', sans-serif !important;
        }
    </style>
      `;
    // Inject both link and style
    return html.replace("</head>", `${cssLink}\n${fontClasses}\n</head>`);
  }

  // Fallback: Generate inline CSS (old method, kept for backward compatibility or if CSS upload failed)
  // Helper to generate @font-face and font-family string
  const getFontCss = (font: typeof headerFont, name: string) => {
    if (!font || (!font.fontFileBase64 && !font.fontUrl) || !font.fontFormat)
      return "";

    const formatMap: Record<string, string> = {
      ttf: "truetype",
      otf: "opentype",
      woff: "woff",
      woff2: "woff2",
    };
    const cssFormat = formatMap[font.fontFormat] || font.fontFormat;

    let srcRule = "";
    if (font.fontUrl) {
      srcRule = `url('${font.fontUrl}') format('${cssFormat}')`;
    } else if (font.fontFileBase64) {
      const mimeType = `font/${font.fontFormat === "ttf" ? "ttf" : font.fontFormat === "otf" ? "otf" : font.fontFormat}`;
      srcRule = `url(data:${mimeType};base64,${font.fontFileBase64}) format('${cssFormat}')`;
    }

    return `
      @font-face {
          font-family: '${name}';
          src: ${srcRule};
          font-weight: normal;
          font-style: normal;
          font-display: swap;
      }
    `;
  };

  const headerFontName = "CustomHeaderFont";
  const bodyFontName = "CustomBodyFont";

  const headerFontFace = getFontCss(headerFont, headerFontName);
  const bodyFontFace = getFontCss(bodyFont, bodyFontName);

  // For inline, we used CustomHeaderFont alias.
  // But if we want consistency, maybe we should've used real names.
  // But let's keep old behavior for old data.
  const headerFamily = headerFont.isSystemFont
    ? headerFont.fontFamily
    : `'${headerFontName}', ${headerFont.fontFamily}, sans-serif`;
  const bodyFamily = bodyFont.isSystemFont
    ? bodyFont.fontFamily
    : `'${bodyFontName}', ${bodyFont.fontFamily}, sans-serif`;

  const fontCss = `
    <style>
        ${headerFontFace}
        ${bodyFontFace}
        
        .header-font {
            font-family: ${headerFamily} !important;
        }
        
        .body-font {
            font-family: ${bodyFamily} !important;
        }
    </style>
  `;

  return html.replace("</head>", `${fontCss}\n</head>`);
}

/**
 * Deep merge two objects, with source values overriding target
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const output = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        // Recursively merge nested objects
        (output as Record<string, unknown>)[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        );
      } else if (sourceValue !== undefined) {
        // Direct assignment for primitives, arrays, and when target doesn't have the key
        (output as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return output;
}

/**
 * Parse a manifest.js file content into a JavaScript object
 * The file format is: window.manifest = { ... };
 */
export function parseManifestJs(jsContent: string): Record<string, unknown> {
  // Remove the "window.manifest = " prefix and trailing semicolon
  const jsonMatch = jsContent.match(
    /window\.manifest\s*=\s*(\{[\s\S]*\});?\s*$/,
  );

  if (!jsonMatch) {
    throw new Error(
      "Invalid manifest.js format: could not find window.manifest assignment",
    );
  }

  try {
    // The manifest is a JS object literal, not strict JSON
    // We need to evaluate it safely
    // Using Function constructor to parse JS object literal
    const manifestObj = new Function(`return ${jsonMatch[1]}`)();
    return manifestObj;
  } catch (error) {
    throw new Error(`Failed to parse manifest.js: ${error}`);
  }
}

/**
 * Serialize a manifest object back to a manifest.js string
 */
export function serializeManifest(manifest: Record<string, unknown>): string {
  return `window.manifest = ${JSON.stringify(manifest, null, 2)};`;
}

/**
 * Fix relative paths in HTML content by converting them to absolute paths
 * This is necessary when serving HTML from a Blob URL
 */
export function fixRelativePaths(html: string, basePath: string): string {
  // Ensure basePath doesn't have trailing slash
  const base = basePath.replace(/\/$/, "");

  // Helper to check if a path is already absolute
  const isAbsolute = (path: string): boolean => {
    return (
      path.startsWith("/") ||
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("//") ||
      path.startsWith("data:") ||
      path.startsWith("blob:") ||
      path.startsWith("#")
    );
  };

  // Helper to fix a single path
  const fixPath = (path: string): string => {
    if (isAbsolute(path)) return path;
    // Remove ./ prefix if present
    const cleanPath = path.replace(/^\.\//, "");
    return `${base}/${cleanPath}`;
  };

  // Fix src attributes
  html = html.replace(
    /(<(?:script|img|source|video|audio|embed|iframe)[^>]*\s+src\s*=\s*["'])([^"']+)(["'])/gi,
    (match, prefix, path, suffix) => {
      return `${prefix}${fixPath(path)}${suffix}`;
    },
  );

  // Fix href attributes (for link, a tags)
  html = html.replace(
    /(<(?:link|a)[^>]*\s+href\s*=\s*["'])([^"']+)(["'])/gi,
    (match, prefix, path, suffix) => {
      // Don't fix anchor links or javascript:
      if (path.startsWith("#") || path.startsWith("javascript:")) {
        return match;
      }
      return `${prefix}${fixPath(path)}${suffix}`;
    },
  );

  // Fix url() in CSS (inline styles and style tags)
  html = html.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (match, path) => {
    if (isAbsolute(path)) return match;
    const cleanPath = path.replace(/^\.\//, "");
    return `url('${base}/${cleanPath}')`;
  });

  return html;
}

/**
 * Dynamic value data from the Studio UI
 */
export interface DynamicValueData {
  headline?: string;
  bodyCopy?: string;
  ctaText?: string;
  imageUrl?: string;
  price?: string; // Product price (for DPA)
  logoUrl?: string;
  colors?: string[];
  // DPA / Social fields
  label?: string;
  labelColor?: string;
  ctaColor?: string;
  cta?: string;
  bgColor?: string;
  image?: string;
  bgImageUrl?: string; // DPA background image
  layerModifications?: Array<{
    layerName: string;
    positionDelta?: { x?: number; y?: number };
    scaleFactor?: number;
  }>;
  typography?: Typography | null;
}

/**
 * Apply dynamic values from the UI to the manifest
 * This updates the defaultValue fields in the manifest's dynamicValues settings
 * and applies any layer modifications (position/scale changes)
 */
export function applyDynamicValues(
  manifest: Record<string, unknown>,
  data: DynamicValueData,
): Record<string, unknown> {
  // Clone the manifest to avoid mutation
  const newManifest = JSON.parse(JSON.stringify(manifest));

  const settings = newManifest.settings as Record<string, unknown> | undefined;
  if (!settings) return newManifest;

  const dynamicValues = settings.dynamicValues as
    | Array<{
        id: string;
        name: string;
        defaultValue?: string;
      }>
    | undefined;

  if (dynamicValues) {
    // Map UI field names to manifest dynamic value names
    const fieldMapping: Record<string, string> = {
      headline: "s0_headline",
      bodyCopy: "s0_bodycopy",
      ctaText: "s0_ctaText",
      imageUrl: "s0_imageUrl",
      logoUrl: "s0_logoUrl",
      price: "s0_price", // DPA price mapping
      label: "s0_label",
      bgImageUrl: "s0_bgImageUrl",
    };

    // Update each dynamic value
    for (const [uiField, manifestName] of Object.entries(fieldMapping)) {
      const value = data[uiField as keyof DynamicValueData];
      if (value && typeof value === "string") {
        const dynamicValue = dynamicValues.find(
          (dv) => dv.name === manifestName,
        );
        if (dynamicValue) {
          dynamicValue.defaultValue = value;
        }
      }
    }
  }

  // Handle colors - add them to settings.defaults.colors as pipe-separated string
  // This is how Grid8 templates read dynamic data (via grid8player.dynamicData)
  if (data.colors && data.colors.length > 0) {
    if (!settings.defaults) {
      settings.defaults = {};
    }
    // Join colors with pipe separator (Grid8 format)
    (settings.defaults as Record<string, string>).colors = data.colors
      .slice(0, 3)
      .join("|");
  }

  // Handle other DPA specific fields that need to be in dynamicData
  const extraData: Record<string, string> = {};
  if (data.labelColor) extraData.labelColor = data.labelColor;
  if (data.ctaColor) extraData.ctaColor = data.ctaColor;
  if (data.cta) extraData.cta = data.cta;
  if (data.bgColor) extraData.bgColor = data.bgColor;

  if (Object.keys(extraData).length > 0) {
    (newManifest as Record<string, unknown>).__extraData = extraData;
  }

  // Apply layer modifications if provided
  if (data.layerModifications && data.layerModifications.length > 0) {
    console.log(
      "[ManifestUtils] Applying layer modifications:",
      data.layerModifications,
    );

    const layers = newManifest.layers as
      | Array<{
          name: string;
          shots?: Array<{
            pos: { x: number; y: number };
            size: { w: number; h: number; initW?: number; initH?: number };
          }>;
        }>
      | undefined;

    if (layers) {
      console.log(
        "[ManifestUtils] Available layers:",
        layers.map((l) => l.name),
      );

      for (const mod of data.layerModifications) {
        const layer = layers.find(
          (l) => l.name.toLowerCase() === mod.layerName.toLowerCase(),
        );

        if (!layer) {
          console.warn("[ManifestUtils] Layer not found:", mod.layerName);
          continue;
        }
        if (!layer.shots) {
          console.warn("[ManifestUtils] Layer has no shots:", mod.layerName);
          continue;
        }

        console.log(`[ManifestUtils] Modifying layer "${mod.layerName}":`, {
          positionDelta: mod.positionDelta,
          scaleFactor: mod.scaleFactor,
        });

        for (const shot of layer.shots) {
          const oldPos = { x: shot.pos.x, y: shot.pos.y };

          // Apply position delta
          if (mod.positionDelta) {
            if (mod.positionDelta.x !== undefined) {
              shot.pos.x += mod.positionDelta.x;
            }
            if (mod.positionDelta.y !== undefined) {
              shot.pos.y += mod.positionDelta.y;
            }
          }

          // Apply scale factor by modifying size values
          if (mod.scaleFactor && mod.scaleFactor !== 1) {
            // Calculate center point before scaling
            const centerX = shot.pos.x + shot.size.w / 2;
            const centerY = shot.pos.y + shot.size.h / 2;

            // Scale the size values
            shot.size.w *= mod.scaleFactor;
            shot.size.h *= mod.scaleFactor;

            // Also scale initW and initH (used by Grid8 player)
            if (shot.size.initW !== undefined) {
              shot.size.initW *= mod.scaleFactor;
            }
            if (shot.size.initH !== undefined) {
              shot.size.initH *= mod.scaleFactor;
            }

            // Adjust position to keep center point
            shot.pos.x = centerX - shot.size.w / 2;
            shot.pos.y = centerY - shot.size.h / 2;
          }

          console.log(
            `[ManifestUtils] Layer "${mod.layerName}" position changed:`,
            oldPos,
            "->",
            shot.pos,
          );
        }
      }
    } else {
      console.warn("[ManifestUtils] No layers array in manifest");
    }
  }

  // Handle Typography
  if (data.typography && data.typography.headerFont) {
    const { headerFont, bodyFont } = data.typography;

    // 1. Add to webFonts
    if (!settings.webFonts) {
      settings.webFonts = [];
    }
    const webFonts = settings.webFonts as Array<{
      fontFamily: string;
      fontStyle: string;
      fontUrl: string;
      fontFamilyUser?: string;
    }>;

    const addFont = (font: typeof headerFont) => {
      if (
        font &&
        font.fontFamily &&
        font.fontFileBase64 &&
        !font.isSystemFont
      ) {
        const existingFont = webFonts.find(
          (f) => f.fontFamily === font.fontFamily,
        );
        if (!existingFont) {
          const format = font.fontFormat || "woff2";
          const fontUrl = `data:font/${format};charset=utf-8;base64,${font.fontFileBase64}`;

          webFonts.push({
            fontFamily: font.fontFamily,
            fontStyle: "normal",
            fontUrl: fontUrl,
            fontFamilyUser: font.fontFamily,
          });
        }
      }
    };

    addFont(headerFont);
    addFont(bodyFont);

    // 2. Update text layers to use this font
    const layers = newManifest.layers as Array<{
      name: string;
      fileType?: string;
      fontFamily?: string;
      cssClasses?: string;
    }>;

    if (layers) {
      layers.forEach((layer) => {
        if (layer.fileType === "text" && layer.cssClasses) {
          const classes = layer.cssClasses.toLowerCase();

          // Apply Header Font
          if (
            classes.includes("maincopy") ||
            classes.includes("headline") ||
            classes.includes("h1") ||
            classes.includes("h2")
          ) {
            layer.fontFamily = headerFont.fontFamily;
          }

          // Apply Body Font
          if (
            classes.includes("subcopy") ||
            classes.includes("body") ||
            classes.includes("p") ||
            classes.includes("desc")
          ) {
            layer.fontFamily = bodyFont.fontFamily;
          }

          // Apply Header Font to CTA by default (for impact)
          if (classes.includes("cta") || classes.includes("button")) {
            layer.fontFamily = headerFont.fontFamily;
          }
        }
      });
    }
  }

  return newManifest;
}

/**
 * Convert hex color to HSL
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s, l };
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h / 360 + 1 / 3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, h / 360 - 1 / 3);
  }

  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * WCAG relative luminance
 */
function getLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  let r = parseInt(clean.substring(0, 2), 16) / 255;
  let g = parseInt(clean.substring(2, 4), 16) / 255;
  let b = parseInt(clean.substring(4, 6), 16) / 255;

  r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastColor(hex: string): string {
  return getLuminance(hex) > 0.179 ? "#1a1a1a" : "#ffffff";
}

// Shade step → target lightness (0–1). 500 = original color lightness.
const SHADE_LIGHTNESS: Record<number, number> = {
  50: 0.97,
  100: 0.94,
  200: 0.86,
  300: 0.76,
  400: 0.64,
  500: -1, // placeholder — keep original
  600: 0.42,
  700: 0.34,
  800: 0.26,
  900: 0.18,
  950: 0.1,
};

/**
 * Generate a palette of shades from a single hex color.
 * The 500 step is the original color; lighter / darker steps are HSL-shifted.
 */
function generateShades(hex: string): Record<number, string> {
  const { h, s } = hexToHsl(hex);
  const shades: Record<number, string> = {};

  for (const [step, targetL] of Object.entries(SHADE_LIGHTNESS)) {
    const n = Number(step);
    if (n === 500) {
      shades[n] = hex;
    } else {
      shades[n] = hslToHex(h, s, targetL);
    }
  }
  return shades;
}

/**
 * Generate a complete CSS string with Tailwind-like color utility classes.
 *
 * Classes produced (per color role):
 *   .bg-{role}-{step}        → background-color  (for divs, buttons)
 *   .fill-{role}-{step}      → fill on element & child paths  (for SVGs)
 *   .text-over-{role}-{step} → color  (text on top of that shade)
 *
 * Roles: primary (colors[0]), secondary (colors[1]), accent (colors[2])
 * Steps: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
 */
export function generateColorCss(colors: string[]): string {
  const roles = ["primary", "secondary", "accent"] as const;
  let css = "";

  roles.forEach((role, i) => {
    const baseHex = colors[i];
    if (!baseHex) return;

    const shades = generateShades(baseHex);

    for (const [step, hex] of Object.entries(shades)) {
      css += `.bg-${role}-${step}{background-color:${hex} !important}\n`;
      const s = `.fill-${role}-${step}`;
      css += `${s},${s} path,${s} rect,${s} circle,${s} ellipse,${s} polygon,${s} polyline{fill:${hex} !important}\n`;
      css += `.text-over-${role}-${step}{color:${getContrastColor(hex)} !important}\n`;
    }
  });

  return `<style>\n${css}</style>`;
}
