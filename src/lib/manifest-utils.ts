/**
 * Utilities for parsing and manipulating Grid8 ad manifests
 */

import { Typography } from "@/lib/shared/types";

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

    // Also store as __colors for extraction by useAdPreviewBlob
    // This allows injecting colors into dynamicData directly
    (newManifest as Record<string, unknown>).__colors = data.colors;
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
  if (data.typography && data.typography.fontFileBase64) {
    const { primaryFontFamily, fontFileBase64, fontFormat } = data.typography;
    const format = fontFormat || "woff2";
    const fontUrl = `data:font/${format};charset=utf-8;base64,${fontFileBase64}`;

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

    // Check if already exists to avoid duplicates
    const existingFont = webFonts.find(
      (f) => f.fontFamily === primaryFontFamily,
    );

    if (!existingFont) {
      webFonts.push({
        fontFamily: primaryFontFamily,
        fontStyle: "normal", // Defaulting to normal for now
        fontUrl: fontUrl,
        fontFamilyUser: primaryFontFamily,
      });
    }

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

          // Apply brand font if layer has .maincopy or .subcopy class
          // This matches the logic in useAdPreviewBlob
          const shouldApplyFont =
            classes.includes("maincopy") || classes.includes("subcopy");

          if (shouldApplyFont) {
            layer.fontFamily = primaryFontFamily;
          }
        }
      });
    }
  }

  return newManifest;
}

/**
 * Generate the inline script that sets up dynamicData with colors
 */
export function generateDynamicDataScript(colors?: string[]): string {
  if (!colors || colors.length === 0) {
    return "";
  }

  const colorString = colors.slice(0, 3).join("|");
  return `
    <script>
      // Injected by Studio preview
      window.__studioColors = "${colorString}";
    </script>
  `;
}
