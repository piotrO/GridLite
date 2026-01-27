import sharp from "sharp";
import quantize from "@lokesh.dhakar/quantize";
import convert from "color-convert";
import { BrandPalette } from "@/lib/shared/types";
import fs from "fs";
import path from "path";

/**
 * Senior Graphics Programmer Note:
 * We use 'sharp' to extract raw RGB pixels from the buffer
 * and '@lokesh.dhakar/quantize' for the Median Cut algorithm.
 * This approach is more robust in Node.js environments than 'colorthief'.
 */
export async function extractBrandColors(
  imageBuffer: Buffer,
): Promise<BrandPalette> {
  console.log("[ColorExtractor] Starting extraction process...");

  try {
    // DEBUG: Save original image to public folder for preview
    const publicDir = path.join(process.cwd(), "public");
    if (fs.existsSync(publicDir)) {
      fs.writeFileSync(path.join(publicDir, "debug-original.png"), imageBuffer);
      console.log("[ColorExtractor] DEBUG: Saved original image to public/debug-original.png");
    }

    // 1. Resize and get raw RGB pixels. We don't need alpha for palette.
    // 400px is more than enough for color sampling and much faster.
    const sharpInstance = sharp(imageBuffer).resize(600).removeAlpha();

    // DEBUG: Save resized image for preview
    const previewBuffer = await sharpInstance.clone().png().toBuffer();
    if (fs.existsSync(publicDir)) {
      fs.writeFileSync(path.join(publicDir, "debug-resized.png"), previewBuffer);
      console.log("[ColorExtractor] DEBUG: Saved resized image to public/debug-resized.png");
    }

    const { data, info } = await sharpInstance
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log(
      `[ColorExtractor] Image processed: ${info.width}x${info.height}, channels: ${info.channels}`,
    );
    console.log(`[ColorExtractor] Buffer length: ${data.length} bytes`);

    // 2. Create pixel array for quantizer [ [r,g,b], ... ]
    // We sample every 5th pixel for a good balance of accuracy and speed.
    const pixelArray: [number, number, number][] = [];
    for (let i = 0; i < data.length; i += 3 * 5) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Filter out pure white background if it takes up too much space
      if (!(r > 250 && g > 250 && b > 250)) {
        pixelArray.push([r, g, b]);
      }
    }

    console.log(
      `[ColorExtractor] Sampled ${pixelArray.length} pixels for quantization.`,
    );

    if (pixelArray.length === 0) {
      console.log(
        "[ColorExtractor] No valid pixels found for quantization, using fallback.",
      );
      return { primary: "#4F46E5", secondary: "#4F46E5", accent: "#4F46E5" };
    }

    // 3. Run quantization (Median Cut)
    const cmap = quantize(pixelArray, 10);
    const rawPalette = cmap ? cmap.palette() : [];

    console.log("[ColorExtractor] Raw palette generated:", rawPalette);

    // 4. Filter and Sort logic
    const filteredColors = rawPalette
      .map(([r, g, b]) => ({
        hex: `#${convert.rgb.hex([r, g, b])}`,
        hsl: convert.rgb.hsl([r, g, b]), // [H, S, L]
        rgb: [r, g, b],
      }))
      .filter((color) => {
        const [h, s, l] = color.hsl;
        // Skip extreme dark/light/neutral colors to find meaningful brand colors
        return l > 5 && l < 95 && s > 8;
      });

    console.log(
      `[ColorExtractor] Filtered colors (${filteredColors.length}):`,
      filteredColors.map((c) => c.hex),
    );

    // 5. Assign Roles
    const primary = filteredColors[0]?.hex || "#4F46E5";

    // Sort remaining by saturation to find a good accent
    const sortedBySaturation = [...filteredColors.slice(1)].sort(
      (a, b) => b.hsl[1] - a.hsl[1],
    );

    const accent = sortedBySaturation[0]?.hex || primary;
    const secondary = filteredColors[1]?.hex || primary;

    // 6. Capture up to 2 extra meaningful colors if available
    const extraColors =
      filteredColors.length > 3
        ? filteredColors
            .slice(2)
            .filter((c) => c.hex !== accent)
            .slice(0, 2)
            .map((c) => c.hex)
        : undefined;

    const result = { primary, secondary, accent, extraColors };
    console.log("[ColorExtractor] Final Result:", result);

    return result;
  } catch (error) {
    console.error("[ColorExtractor] Error during color extraction:", error);
    // Return a safe default
    return { primary: "#4F46E5", secondary: "#4F46E5", accent: "#4F46E5" };
  }
}
