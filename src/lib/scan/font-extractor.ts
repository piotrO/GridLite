import { Page } from "playwright";

/**
 * Result of the font extraction process
 */
export interface FontResult {
  primaryFontFamily: string;
  fontFileBase64: string | null;
  fontFormat: "woff2" | "woff" | "ttf" | "otf" | null;
  isSystemFont: boolean;
}

/**
 * Extracts the primary brand font from a page.
 * Intercepts font files during a reload and matches the computed font-family style.
 */
export async function extractBrandFonts(page: Page): Promise<FontResult> {
  const fontFiles = new Map<
    string,
    { buffer: Buffer; contentType: string; initiator: string }
  >();
  const cssFiles = new Map<string, string>();

  // 1. Setup Network Interception
  const handleResponse = async (response: any) => {
    const url = response.url().toLowerCase();
    const contentType =
      (await response.headerValue("content-type").catch(() => "")) || "";

    // Check for font extensions or font mime types
    const isCss = contentType.includes("text/css") || url.endsWith(".css");

    if (isCss) {
      try {
        const text = await response.text();
        cssFiles.set(url, text);
      } catch (e) {
        // console.warn(`[FontExtractor] Failed to capture CSS for ${url}`);
      }
    }

    // Check for font extensions or font mime types
    const isFont =
      /\.(woff2?|ttf|otf)(\?|$)/.test(url) ||
      contentType.includes("font") ||
      url.includes("use.typekit.net");

    if (isFont) {
      try {
        // Race buffer collection with a short timeout to prevent hangs
        const bufferPromise = response.body();
        const timeoutPromise = new Promise<Buffer>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout getting body")), 3000),
        );

        const buffer = await Promise.race([bufferPromise, timeoutPromise]);
        const initiator =
          (await response.request().headerValue("referer")) || "";

        // If buffer is empty, it might be a preflight or error, ignore
        if (buffer.length > 0) {
          // console.log(`[FontExtractor] Captured ${buffer.length} bytes from ${url}`);
          fontFiles.set(response.url(), { buffer, contentType, initiator });
        }
      } catch (e) {
        // console.warn(`[FontExtractor] Failed to capture font buffer for ${url}:`, e);
      }
    }
  };

  page.on("response", handleResponse);

  try {
    // 2. Reload page to trigger font requests
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
    } catch (e) {
      console.warn("Reload timeout exceeded, proceeding with extraction...");
    }

    // Wait a bit for fonts to actually request/load if they are lazy loaded or css initiated
    await page.waitForTimeout(2000);

    // 3. Analyze DOM for computed styles
    const computedStyles = (await page.evaluate(`(() => {
      const h1 = document.querySelector("h1");
      const body = document.body;

      // Get computed style
      const h1Style = h1 ? window.getComputedStyle(h1).fontFamily : "";
      const bodyStyle = window.getComputedStyle(body).fontFamily;

      const clean = (str) => {
        if (!str) return "";
        // Split by comma to get stack, take first one
        // Remove single or double quotes
        return str.split(",")[0].trim().replace(/['"]/g, "");
      };

      return {
        h1Font: clean(h1Style),
        bodyFont: clean(bodyStyle),
        fullH1Stack: h1Style,
      };
    })()`)) as { h1Font: string; bodyFont: string; fullH1Stack: string };

    const primaryFont = computedStyles.h1Font || computedStyles.bodyFont;

    if (!primaryFont) {
      return {
        primaryFontFamily: "system-ui",
        fontFileBase64: null,
        fontFormat: null,
        isSystemFont: true,
      };
    }

    // 4. Match Logic
    let match: { url: string; buffer: Buffer; contentType: string } | undefined;

    // Strategy A: Direct Name Match
    for (const [url, data] of fontFiles.entries()) {
      if (
        url
          .toLowerCase()
          .includes(primaryFont.toLowerCase().replace(/\s+/g, "-")) ||
        url
          .toLowerCase()
          .includes(primaryFont.toLowerCase().replace(/\s+/g, ""))
      ) {
        match = { url, ...data };
        break;
      }
    }

    // Strategy B: Fallback (check CSS initiators)
    if (!match && fontFiles.size > 0) {
      console.log(
        `[Font Extraction] No direct name match for '${primaryFont}'. Checking CSS initiators...`,
      );

      for (const [fontUrl, fontData] of fontFiles.entries()) {
        const initiatorUrl = fontData.initiator;
        if (!initiatorUrl) continue;

        const cssContent = cssFiles.get(initiatorUrl);
        if (!cssContent) continue;

        // Check if this CSS file mentions the primary font
        // Simple check: does the font name appear in the CSS?
        // More robust: check if it appears in a font-family declaration?
        // For now, let's trust that if the CSS *that loaded this font* mentions the target font name, likely it's the one.
        const fontNameRegex = new RegExp(
          `font-family:[^;]*${primaryFont.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
          "i",
        );

        if (
          cssContent.includes(primaryFont) || // Broad check
          fontNameRegex.test(cssContent) // Specific CSS property check
        ) {
          console.log(
            `[Font Extraction] Found match via CSS initiator (${initiatorUrl}) for font: ${fontUrl}`,
          );
          match = { url: fontUrl, ...fontData };
          break;
        }
      }
    }

    // Strategy C: Last Resort Fallback (largest captured font)
    if (!match && fontFiles.size > 0) {
      const candidates = Array.from(fontFiles.entries())
        .filter(([_, data]) => data.buffer.length > 4000) // > 4KB
        .sort((a, b) => b[1].buffer.length - a[1].buffer.length); // Largest first

      if (candidates.length > 0) {
        console.log(
          `[Font Extraction] No match found. Falling back to largest captured font: ${candidates[0][0]}`,
        );
        match = { url: candidates[0][0], ...candidates[0][1] };
      }
    }

    const getFormat = (url: string, contentType: string) => {
      const lowerUrl = url.toLowerCase();
      const lowerCT = contentType.toLowerCase();

      if (lowerUrl.includes(".woff2") || lowerCT.includes("woff2"))
        return "woff2" as const;
      if (lowerUrl.includes(".woff") || lowerCT.includes("woff"))
        return "woff" as const;
      if (lowerUrl.includes(".ttf") || lowerCT.includes("ttf"))
        return "ttf" as const;
      if (lowerUrl.includes(".otf") || lowerCT.includes("otf"))
        return "otf" as const;

      // Secondary check with regex if needed
      if (/\.woff2($|\?)/.test(lowerUrl)) return "woff2" as const;
      if (/\.woff($|\?)/.test(lowerUrl)) return "woff" as const;
      if (/\.ttf($|\?)/.test(lowerUrl)) return "ttf" as const;
      if (/\.otf($|\?)/.test(lowerUrl)) return "otf" as const;

      return null;
    };

    const format = match ? getFormat(match.url, match.contentType) : null;

    return {
      primaryFontFamily: primaryFont,
      fontFileBase64: match ? match.buffer.toString("base64") : null,
      fontFormat: format,
      isSystemFont: !match || !format,
    };
  } finally {
    // Cleanup listener
    page.removeListener("response", handleResponse);
  }
}
