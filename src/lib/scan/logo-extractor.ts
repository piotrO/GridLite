import { Page } from "playwright";
import sharp from "sharp";
import { Buffer } from "buffer";
import { isDebugMode } from "./extraction-utils";

const DEBUG_MODE = isDebugMode("logo");

export async function extractLogo(
  page: Page,
  baseUrl: string,
): Promise<string | null> {
  try {
    // 1. Proxy browser console logs to the server for debugging
    page.on("console", (msg) => {
      const text = msg.text();
      if (text.startsWith("[LogoExtractor]")) {
        console.log(text);
      }
    });

    // 2. Wait for Load State
    await page.waitForLoadState("domcontentloaded");

    // 3. Execute Logic
    const logoUrl = await page.evaluate(
      async ({ baseUrl, debugMode }) => {
        console.log("[LogoExtractor] Starting extraction...");

        // --- HELPER: Validation ---
        const validateImage = (url: string): Promise<boolean> => {
          return new Promise((resolve) => {
            if (url.startsWith("data:")) {
              resolve(true); // Data URIs are instant
              return;
            }
            const img = new Image();
            const timer = setTimeout(() => resolve(false), 5000); // 5s timeout

            img.onload = () => {
              clearTimeout(timer);
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                resolve(true);
              } else {
                resolve(false);
              }
            };

            img.onerror = () => {
              clearTimeout(timer);
              resolve(false);
            };

            img.src = url;
          });
        };

        // --- HELPER: URL Normalization ---
        const isHomeUrl = (href: string | null): boolean => {
          if (!href) return false;
          try {
            const targetUrl = new URL(href, baseUrl);
            const baseUrlObj = new URL(baseUrl);
            const targetPath = targetUrl.pathname.replace(/\/$/, "");
            const basePath = baseUrlObj.pathname.replace(/\/$/, "");
            return (
              targetUrl.origin === baseUrlObj.origin && targetPath === basePath
            );
          } catch {
            return false;
          }
        };

        // new: Extract simplified brand name from hostname
        let brandName = "";
        try {
          const urlObj = new URL(baseUrl);
          const parts = urlObj.hostname.split(".");
          // simplistic: longest part that isn't common TLD/www
          const ignore = new Set([
            "www",
            "com",
            "org",
            "net",
            "co",
            "io",
            "app",
            "dev",
            "shop",
            "store",
          ]);
          brandName =
            parts
              .filter((p) => !ignore.has(p))
              .sort((a, b) => b.length - a.length)[0] || "";
        } catch (e) {
          /* ignore */
        }

        // --- HELPER: Scoring ---
        const scoreElement = (
          el: Element,
        ): { score: number; reasons: string[] } => {
          let score = 0;
          const reasons: string[] = [];

          const parentLink = el.closest("a");
          const container = el.parentElement;

          // "Bubble Up" Attributes
          const attributesToCheck = [
            el.className.toString(),
            el.id,
            el.getAttribute("alt"),
            el.getAttribute("aria-label"),
            el.getAttribute("src"), // NEW
            el.getAttribute("data-src"), // NEW
            parentLink?.className.toString(),
            parentLink?.id,
            parentLink?.getAttribute("aria-label"),
            container?.className.toString(),
            container?.id,
          ];

          const combinedText = attributesToCheck.join(" ").toLowerCase();

          // 1. Penalties (Arrows, Icons, Socials)
          const negativeKeywords = [
            "arrow",
            "chevron",
            "cart",
            "search",
            "bag",
            "close",
            // "menu" - REMOVED: Logos are often in the menu structure
            "facebook",
            "instagram",
            "twitter",
            "button",
            "icon",
            "pic",
            "action",
          ];
          for (const kw of negativeKeywords) {
            if (combinedText.includes(kw)) {
              score -= 50;
              reasons.push(`penalty:${kw}`);
            }
          }

          // 2. Positive Keywords
          if (combinedText.includes("logo")) {
            score += 40; // Increased from 25
            reasons.push("keyword:logo");
          }
          if (combinedText.includes("brand")) {
            score += 25; // Increased from 15
            reasons.push("keyword:brand");
          }
          if (combinedText.includes("home")) {
            score += 10;
            reasons.push("keyword:home");
          }

          // NEW: Brand Name Match
          if (brandName && combinedText.includes(brandName.toLowerCase())) {
            score += 60; // Increased from 40
            reasons.push(`brand-match:${brandName}`);
          }

          // 3. Structure
          const closestHeader = el.closest("header, .header, .navbar, .nav");
          if (closestHeader) {
            score += 10;
            reasons.push("in:header");
          }

          if (parentLink && isHomeUrl(parentLink.getAttribute("href"))) {
            score += 35;
            reasons.push("link:root");
          }

          // 4. Geometry
          const rect = el.getBoundingClientRect();
          if (rect.width < 5 || rect.height < 5)
            return { score: -1000, reasons: ["invisible"] };

          // Aspect Ratio:
          const aspect = rect.width / rect.height;

          // Standard wide logos (2:1 or 3:1)
          if (aspect > 1.5 && aspect < 6) {
            score += 10;
            reasons.push("aspect:wide");
          }
          // Square logos (approx 1.0) - Allow if valid, give bonus if "logo" or brand match found
          else if (aspect >= 0.8 && aspect <= 1.5) {
            const isStrongMatch = reasons.some(
              (r) =>
                r.startsWith("keyword:logo") || r.startsWith("brand-match"),
            );
            // If it's square AND has "logo" in name/class/alt, it's very likely the logo
            if (isStrongMatch) {
              score += 5;
              reasons.push("aspect:square-valid");
            }
          }

          // Size checks
          if (rect.width > 80 && rect.width < 600) {
            score += 10;
            reasons.push("size:medium");
          }

          // Position checks
          if (rect.top < 150) {
            score += 10;
            reasons.push("pos:top");
          }
          if (rect.left < window.innerWidth / 3) {
            score += 15;
            reasons.push("pos:left");
          }

          return { score, reasons };
        };

        // --- STRATEGY A: Schema.org (With Validation) ---
        try {
          console.log("[LogoExtractor] Strategy A: Checking Schema.org");
          const schemas = Array.from(
            document.querySelectorAll('script[type="application/ld+json"]'),
          );
          for (const schema of schemas) {
            const json = JSON.parse(schema.textContent || "{}");
            const objects = Array.isArray(json)
              ? json
              : json["@graph"] || [json];

            for (const obj of objects) {
              if (
                (obj["@type"] === "Organization" || obj["@type"] === "Brand") &&
                obj.logo
              ) {
                const url =
                  typeof obj.logo === "string" ? obj.logo : obj.logo.url;
                console.log(
                  "[LogoExtractor] Found schema logo candidate:",
                  url,
                );

                const isValid = await validateImage(url);
                if (isValid) {
                  console.log(
                    "[LogoExtractor] Schema logo validated successfully.",
                  );
                  return url;
                } else {
                  console.warn(
                    "[LogoExtractor] Schema logo failed validation (404/Error). Skipping.",
                  );
                }
              }
            }
          }
        } catch (e) {
          console.warn("[LogoExtractor] Schema parsing error", e);
        }

        // --- STRATEGY B: DOM Scan ---
        console.log("[LogoExtractor] Strategy B: Checking DOM images");
        const images = Array.from(
          document.querySelectorAll('img, svg, object[type="image/svg+xml"]'),
        );
        console.log(`[LogoExtractor] Found ${images.length} raw images`);

        // 1. Score ALL images first
        const candidates = images
          .map((img) => {
            if (img.getAttribute("aria-hidden") === "true")
              return { el: img, score: -1000, reasons: ["aria-hidden"] };
            const { score, reasons } = scoreElement(img);
            return { el: img, score, reasons };
          })
          .filter((c) => c.score > 0); // Filter out garbage

        // 2. Sort by highest score
        candidates.sort((a, b) => b.score - a.score);

        console.log(
          `[LogoExtractor] Found ${candidates.length} viable candidates after scoring.`,
        );

        if (debugMode) {
          console.log("[LogoExtractor] Top 10 Candidates Debug:");
          candidates.slice(0, 10).forEach((candidate, index) => {
            const isSvg = candidate.el.tagName.toLowerCase() === "svg";
            const logHtml = candidate.el.outerHTML.substring(0, 100) + "...";
            console.log(
              `[LogoExtractor] #${index + 1} Score: ${candidate.score} (${
                isSvg ? "SVG" : "IMG"
              }) ` +
                JSON.stringify({
                  reasons: candidate.reasons,
                  html: logHtml,
                }),
            );
          });
        }

        // 3. Iterate and Validate
        for (const candidate of candidates) {
          const isSvg = candidate.el.tagName.toLowerCase() === "svg";

          // Detailed logging (only in debug mode)
          if (debugMode) {
            const logHtml = candidate.el.outerHTML.substring(0, 75) + "...";

            console.log(
              `[LogoExtractor] Candidate ${isSvg ? "SVG" : "IMG"}: ` +
                JSON.stringify({
                  score: candidate.score,
                  reasons: candidate.reasons,
                  html: logHtml,
                }),
            );
          }

          let candidateUrl = "";

          if (isSvg) {
            try {
              const serializer = new XMLSerializer();
              let svgStr = serializer.serializeToString(candidate.el);
              // Fix xmlns if missing so browsers render it
              if (!svgStr.includes('xmlns="http://www.w3.org/2000/svg"')) {
                svgStr = svgStr.replace(
                  "<svg",
                  '<svg xmlns="http://www.w3.org/2000/svg"',
                );
              }
              candidateUrl =
                "data:image/svg+xml;base64," +
                window.btoa(unescape(encodeURIComponent(svgStr)));
            } catch (e) {
              console.warn("[LogoExtractor] SVG Serialization failed", e);
              continue;
            }
          } else {
            // Standard Image
            candidateUrl =
              candidate.el.getAttribute("src") ||
              candidate.el.getAttribute("data-src") ||
              "";
          }

          if (!candidateUrl) continue;

          // Validate
          console.log("[LogoExtractor] Validating image availability...");
          const isValid = await validateImage(candidateUrl);

          if (isValid) {
            console.log("[LogoExtractor] Validation PASSED. Returning.");
            return candidateUrl;
          } else {
            console.log(
              "[LogoExtractor] Validation FAILED (fetch error). Next candidate...",
            );
          }
        }

        return null;
      },
      { baseUrl, debugMode: DEBUG_MODE },
    );

    // Post-processing: Ensure absolute URL
    let finalUrl = logoUrl;
    if (logoUrl && !logoUrl.startsWith("data:")) {
      try {
        finalUrl = new URL(logoUrl, baseUrl).href;
      } catch (e) {
        console.warn(`[LogoExtractor] Failed to resolve absolute URL`, e);
        return null;
      }
    }

    if (!finalUrl) return null;

    // Standardize: ALways return PNG Data URI
    try {
      console.log("[LogoExtractor] Standardizing logo to PNG Data URI...");
      return await standardizeToPngDataUri(finalUrl);
    } catch (e) {
      console.error(
        "[LogoExtractor] Standardization failed, returning original",
        e,
      );
      return finalUrl;
    }
  } catch (error) {
    console.error("Error extracting logo:", error);
    return null;
  }
}

/**
 * Helper: Ensure content is always a PNG Data URI
 */
async function standardizeToPngDataUri(url: string): Promise<string> {
  try {
    let buffer: Buffer;

    // 1. Get Buffer from URL or Data URI
    if (url.startsWith("data:")) {
      const parts = url.split(",");
      const base64 = parts[1];
      if (!base64) return url; // Invalid data URI, return as-is (fallback)
      buffer = Buffer.from(base64, "base64");
    } else {
      console.log(`[LogoExtractor] Fetching image for standardization: ${url}`);
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // 2. Convert to PNG using sharp (Always)
    const image = sharp(buffer);

    // Optional: Resize if too large? For now, just format conversion.
    // const metadata = await image.metadata();

    const pngBuffer = await image.png().toBuffer();
    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  } catch (error) {
    console.warn("[LogoExtractor] Standardization error:", error);
    return url; // Fallback to original if conversion completely fails
  }
}
