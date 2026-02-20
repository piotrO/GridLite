import sharp from "sharp";
import convert from "color-convert";
import { BrandPalette } from "@/lib/shared/types";
import fs from "fs";
import path from "path";
import { findProjectRoot, getDirname, isDebugMode } from "./extraction-utils";

const __dirname = getDirname(import.meta.url);

// Cache project root at module level
const PROJECT_ROOT = findProjectRoot(__dirname);
const DEBUG_MODE = isDebugMode("color");

/**
 * Helper: Calculate Euclidean distance between two RGB colors.
 * Used to prevent picking two colors that look nearly identical.
 */
function getColorDistance(
  rgb1: [number, number, number],
  rgb2: [number, number, number],
): number {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
      Math.pow(rgb1[1] - rgb2[1], 2) +
      Math.pow(rgb1[2] - rgb2[2], 2),
  );
}

/**
 * Helper: Convert RGB to Hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + convert.rgb.hex([r, g, b]);
}

async function extractPaletteFromBuffer(
  buffer: Buffer,
  type: "screenshot" | "logo",
  debugName: string = "debug-image",
): Promise<BrandPalette> {
  // DEBUG: Save images for troubleshooting (only when DEBUG_MODE is enabled)
  if (DEBUG_MODE) {
    const debugDir = path.join(PROJECT_ROOT, "public", "debug");

    if (!fs.existsSync(debugDir)) {
      try {
        fs.mkdirSync(debugDir, { recursive: true });
      } catch (e) {
        console.error(`[ColorExtractor] Failed to create debug directory:`, e);
      }
    }

    if (fs.existsSync(debugDir)) {
      try {
        // 1. Save Original
        const originalPath = path.join(debugDir, `${debugName}-original.png`);
        fs.writeFileSync(originalPath, buffer);
      } catch (e) {
        console.error(`[ColorExtractor] Debug save failed:`, e);
      }
    }
  }

  // 1. Resize specifically for analysis (only if larger than 512px)
  // This speeds up analysis and acts as a "denoise" filter.
  const sharpInstance = sharp(buffer)
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha(); // keep alpha so we can skip transparent pixels

  // Save the "Analyzed" version (exactly what goes into raw pixels)
  if (DEBUG_MODE) {
    try {
      const analyzedBuffer = await sharpInstance.clone().png().toBuffer();
      const debugDir = path.join(PROJECT_ROOT, "public", "debug");
      fs.writeFileSync(
        path.join(debugDir, `${debugName}-analyzed.png`),
        analyzedBuffer,
      );
    } catch (e) {
      /* Ignore */
    }
  }

  const { data, info } = await sharpInstance
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels; // should be 4 after ensureAlpha()

  // 2. Build Histogram (Count unique colors)
  // We round values slightly (quantize to nearest 5) to group near-identical compression artifacts.
  const colorCounts = new Map<
    string,
    { r: number; g: number; b: number; count: number }
  >();
  const QUANTIZE_STEP = 1;

  const whiteThreshold = type === "logo" ? 230 : 255;

  for (let i = 0; i < data.length; i += channels) {
    const r0 = data[i];
    const g0 = data[i + 1];
    const b0 = data[i + 2];
    const a = channels >= 4 ? data[i + 3] : 255;

    // Skip transparent / near-transparent pixels
    if (a <= 50) continue;

    let r = r0;
    let g = g0;
    let b = b0;

    // We no longer skip white/near-white backgrounds outright.
    // The user wants white colors to be viable palette candidates.

    // Simple quantization to group noise (e.g. 254 vs 255)
    r = Math.round(r / QUANTIZE_STEP) * QUANTIZE_STEP;
    g = Math.round(g / QUANTIZE_STEP) * QUANTIZE_STEP;
    b = Math.round(b / QUANTIZE_STEP) * QUANTIZE_STEP;

    const key = `${r},${g},${b}`;
    const existing = colorCounts.get(key);

    if (existing) {
      existing.count++;
    } else {
      colorCounts.set(key, { r, g, b, count: 1 });
    }
  }

  // 3. Sort by Frequency
  const sortedCandidates = Array.from(colorCounts.values()).sort(
    (a, b) => b.count - a.count,
  );

  // 4. Select Distinct Colors (Filter out similar shades)
  const selectedColors: {
    hex: string;
    count: number;
    rgb: [number, number, number];
  }[] = [];

  // Minimum distance to consider a color "distinct".
  // We increase this to ensure primary and secondary colors are not too similar.
  // 90 is a stronger heuristic for RGB Euclidean distance to separate shades.
  // We can dynamically reduce this distance if we're struggling to find enough colors.
  let currentMinDistance = 90;

  for (const candidate of sortedCandidates) {
    const candidateRgb: [number, number, number] = [
      candidate.r,
      candidate.g,
      candidate.b,
    ];

    // Check if this candidate is too close to any already selected color
    const isTooClose = selectedColors.some(
      (selected) =>
        getColorDistance(selected.rgb, candidateRgb) < currentMinDistance,
    );

    if (!isTooClose) {
      selectedColors.push({
        hex: rgbToHex(candidate.r, candidate.g, candidate.b),
        rgb: candidateRgb,
        count: candidate.count,
      });
      // Gradually relax the distance constraint as we find more colors
      // to ensure we still find accents and extra colors
      if (selectedColors.length >= 2) {
        currentMinDistance = 45;
      }
    }

    // Stop once we have enough distinct colors
    if (selectedColors.length >= 10) break;
  }

  // Fallback if no colors found (white image)
  if (selectedColors.length === 0) {
    return { primary: "#4F46E5", secondary: null, accent: null };
  }

  const totalPixels = Array.from(colorCounts.values()).reduce(
    (sum, c) => sum + c.count,
    0,
  );

  console.log(
    `[ColorExtractor] Top colors for ${type}:`,
    selectedColors.map(
      (c) => `${c.hex} (${((c.count / totalPixels) * 100).toFixed(1)}%)`,
    ),
  );

  // 5. Assign Roles
  // Primary is simply the most frequent non-white color
  const primary = selectedColors[0].hex;
  const secondary = selectedColors.length > 1 ? selectedColors[1].hex : null;
  const accent = selectedColors.length > 2 ? selectedColors[2].hex : null;

  const extraColors =
    selectedColors.length > 3
      ? selectedColors.slice(3, 5).map((c) => c.hex)
      : undefined;

  return { primary, secondary, accent, extraColors };
}

export function extractColorsFromHtml(html: string): string[] {
  const hexRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
  const rgbRegex = /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/g;
  const rgbaRegex =
    /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([\d.]+)\s*\)/g;

  const colorCounts = new Map<string, number>();

  let match;

  // 1. Hex matches
  while ((match = hexRegex.exec(html)) !== null) {
    const color = match[0].toUpperCase();
    colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
  }

  // 2. RGB matches
  while ((match = rgbRegex.exec(html)) !== null) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    if (r <= 255 && g <= 255 && b <= 255) {
      const color = rgbToHex(r, g, b).toUpperCase();
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
  }

  // 3. RGBA matches (ignoring alpha for simplicity of palette extraction)
  while ((match = rgbaRegex.exec(html)) !== null) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const a = parseFloat(match[4]);
    if (r <= 255 && g <= 255 && b <= 255 && a > 0.1) {
      const color = rgbToHex(r, g, b).toUpperCase();
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
  }

  const totalMatches = Array.from(colorCounts.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  const sortedWithFreq = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({
      color,
      percent: ((count / totalMatches) * 100).toFixed(1),
    }));

  console.log(
    `[ColorExtractor] Top colors in HTML:`,
    sortedWithFreq.slice(0, 10).map((c) => `${c.color} (${c.percent}%)`),
  );

  return sortedWithFreq.map((s) => s.color);
}

export async function extractColorsFromScreenshot(
  imageBuffer: Buffer,
): Promise<BrandPalette> {
  console.log("[ColorExtractor] Extracting from screenshot...");
  return extractPaletteFromBuffer(
    imageBuffer,
    "screenshot",
    "debug-screenshot",
  );
}

export async function extractColorsFromLogo(
  logoUrl: string,
): Promise<BrandPalette> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) throw new Error("Failed to fetch");
    const buffer = Buffer.from(await response.arrayBuffer());
    return extractPaletteFromBuffer(buffer, "logo", "debug-logo");
  } catch (error) {
    console.error("[ColorExtractor] Logo extraction failed:", error);
    return { primary: "#000000", secondary: "#000000", accent: "#000000" };
  }
}
