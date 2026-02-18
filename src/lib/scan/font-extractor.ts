import { Page } from "playwright";
import { FontDetail, Typography } from "@/lib/shared/types";

// Removed local FontResult interface, using shared Typography

/**
 * Extracts the primary brand font from a page.
 * Intercepts font files during a reload and matches the computed font-family style.
 */
export async function extractBrandFonts(page: Page): Promise<Typography> {
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
          setTimeout(() => reject(new Error("Timeout getting body")), 1500),
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
      await page.reload({ waitUntil: "networkidle", timeout: 15000 });
    } catch (e) {
      console.warn("Reload timeout exceeded, proceeding with extraction...");
    }

    // Wait briefly for any lazy-loaded fonts
    await page.waitForTimeout(1000);

    // 3. Analyze DOM for computed styles
    const computedStyles = (await page.evaluate(`(() => {
      // Helper to clean font family string
      const clean = (str) => {
        if (!str) return "";
        // Split by comma to get stack, take first one
        // Remove single or double quotes
        return str.split(",")[0].trim().replace(/['"]/g, "");
      };

      /**
       * Analyze fonts for a set of tags and weights
       */
      const getDominantFont = (tags, weights) => {
        const fontScores = {};

        tags.forEach(tag => {
          // Limit to first 100 elements for common tags to avoid performance issues
          const elements = Array.from(document.querySelectorAll(tag)).slice(0, 100);
          
          elements.forEach(el => {
            // Basic heuristics to ignore invisible or empty elements
            if (el.innerText.trim().length === 0) return;
            
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

            const fontFamily = clean(style.fontFamily);
            if (!fontFamily) return;

            // Initialize score for this font if not exists
            if (!fontScores[fontFamily]) fontScores[fontFamily] = 0;

            // Add weighted score
            const weight = weights[tag] || 1;
            fontScores[fontFamily] += weight;
          });
        });

        // Find winner
        let bestFont = "";
        let maxScore = -1;

        for (const [font, score] of Object.entries(fontScores)) {
          if (score > maxScore) {
            maxScore = score;
            bestFont = font;
          }
        }

        return bestFont;
      };

      // Configuration for Headers
      const HEADER_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
      const HEADER_WEIGHTS = {
        h1: 4,
        h2: 3,
        h3: 2,
        h4: 1,
        h5: 1,
        h6: 1
      };

      // Configuration for Body
      // Prioritize P tags heavily as they are the standard for body copy
      const BODY_TAGS = ['p', 'span', 'li', 'article', 'div'];
      const BODY_WEIGHTS = {
        p: 4,
        article: 3,
        li: 2,
        span: 1,
        div: 0.5 // Divs are noisy, give them low weight
      };

      const headerFamily = getDominantFont(HEADER_TAGS, HEADER_WEIGHTS);
      const bodyFamily = getDominantFont(BODY_TAGS, BODY_WEIGHTS);

      // Fallback: If no body font found (e.g. all divs), try document.body
      const finalBodyFamily = bodyFamily || clean(window.getComputedStyle(document.body).fontFamily);
      const finalHeaderFamily = headerFamily || finalBodyFamily; // Fallback to body font if no headers

      return {
        headerFamily: finalHeaderFamily,
        bodyFamily: finalBodyFamily,
        fullH1Stack: finalHeaderFamily,
      };
    })()`)) as {
      headerFamily: string;
      bodyFamily: string;
      fullH1Stack: string;
    };

    const { headerFamily, bodyFamily } = computedStyles;

    // Helper to resolve a font family to a captured file
    const resolveFont = (
      fontName: string,
    ): {
      url: string;
      buffer: Buffer;
      contentType: string;
      isSystem: boolean;
    } | null => {
      if (!fontName) return null;

      // Common system fonts to skip immediately
      const systemFonts = [
        "arial",
        "helvetica",
        "times new roman",
        "times",
        "courier new",
        "courier",
        "verdana",
        "georgia",
        "palatino",
        "garamond",
        "bookman",
        "comic sans ms",
        "trebuchet ms",
        "arial black",
        "impact",
        "system-ui",
        "sans-serif",
        "serif",
        "monospace",
      ];
      if (systemFonts.includes(fontName.toLowerCase())) {
        return {
          url: "",
          buffer: Buffer.from([]),
          contentType: "",
          isSystem: true,
        };
      }

      let match:
        | { url: string; buffer: Buffer; contentType: string }
        | undefined;

      // Strategy A: Direct Name Match
      for (const [url, data] of fontFiles.entries()) {
        if (
          url
            .toLowerCase()
            .includes(fontName.toLowerCase().replace(/\s+/g, "-")) ||
          url.toLowerCase().includes(fontName.toLowerCase().replace(/\s+/g, ""))
        ) {
          match = { url, ...data };
          break;
        }
      }

      // Strategy B: Fallback (check CSS initiators)
      if (!match && fontFiles.size > 0) {
        for (const [fontUrl, fontData] of fontFiles.entries()) {
          const initiatorUrl = fontData.initiator;
          if (!initiatorUrl) continue;

          const cssContent = cssFiles.get(initiatorUrl);
          if (!cssContent) continue;

          const fontNameRegex = new RegExp(
            `font-family:[^;]*${fontName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
            "i",
          );

          if (
            cssContent.includes(fontName) || // Broad check
            fontNameRegex.test(cssContent) // Specific CSS property check
          ) {
            match = { url: fontUrl, ...fontData };
            break;
          }
        }
      }

      if (match) {
        return { ...match, isSystem: false };
      }

      // If no match found but it's not a known system font, we assume it's system or uncapturable
      return {
        url: "",
        buffer: Buffer.from([]),
        contentType: "",
        isSystem: true,
      };
    };

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

      if (/\.woff2($|\?)/.test(lowerUrl)) return "woff2" as const;
      if (/\.woff($|\?)/.test(lowerUrl)) return "woff" as const;
      if (/\.ttf($|\?)/.test(lowerUrl)) return "ttf" as const;
      if (/\.otf($|\?)/.test(lowerUrl)) return "otf" as const;

      return null;
    };

    const buildFontDetail = (
      familyName: string,
      resolved: ReturnType<typeof resolveFont>,
    ): FontDetail => {
      if (!resolved || resolved.isSystem) {
        return {
          fontFamily: familyName || "system-ui",
          fontFileBase64: null,
          fontFormat: null,
          isSystemFont: true,
        };
      }
      return {
        fontFamily: familyName,
        fontFileBase64: resolved.buffer.toString("base64"),
        fontFormat: getFormat(resolved.url, resolved.contentType),
        isSystemFont: false,
      };
    };

    const headerResolved = resolveFont(headerFamily);
    const bodyResolved = resolveFont(bodyFamily);

    return {
      headerFont: buildFontDetail(headerFamily, headerResolved),
      bodyFont: buildFontDetail(bodyFamily, bodyResolved),
    };
  } finally {
    // Cleanup listener
    page.removeListener("response", handleResponse);
  }
}
