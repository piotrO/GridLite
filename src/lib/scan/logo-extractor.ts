import { Page } from "playwright";

/**
 * Resolves a URL against a base URL.
 */
function resolveUrl(url: string, baseUrl: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  try {
    return new URL(url, baseUrl).href;
  } catch (e) {
    return "";
  }
}

/**
 * Extracts the main logo using a weighted scoring system.
 */
export async function extractLogo(
  page: Page,
  baseUrl: string,
): Promise<string | null> {
  // 1. Wait for layout stability
  await page.waitForLoadState("domcontentloaded");
  // Optional: wait slightly for JS-injected logos
  await page.waitForTimeout(1000);

  // 2. Execute scoring logic inside the browser context
  const bestLogo = await page.evaluate((currentBaseUrl) => {
    interface ScoredImage {
      src: string;
      score: number;
      reason: string[]; // For debugging
    }

    const candidates: ScoredImage[] = [];
    const origin = new URL(currentBaseUrl).origin;

    // Helper to serialize SVG
    const svgToDataUrl = (svg: SVGElement) => {
      const svgString = new XMLSerializer().serializeToString(svg);
      return `data:image/svg+xml,${encodeURIComponent(svgString)}`;
    };

    // Select all potential logo elements (images and SVGs)
    const elements = Array.from(document.querySelectorAll("img, svg"));

    elements.forEach((el) => {
      let score = 0;
      const reasons: string[] = [];
      const rect = el.getBoundingClientRect();

      // --- FILTER: INVALID CANDIDATES ---

      // Skip invisible elements
      if (
        rect.width === 0 ||
        rect.height === 0 ||
        el.style.display === "none" ||
        el.style.visibility === "hidden"
      )
        return;
      // Skip tiny icons (tracking pixels, list bullets)
      if (rect.width < 20 || rect.height < 20) return;
      // Skip massive hero images (likely backgrounds)
      if (rect.width > 600 || rect.height > 400) return;

      // --- SCORING: DOM HIERARCHY ---

      // Check ancestors for Header or Footer
      const header = el.closest(
        'header, nav, [role="banner"], .header, #header',
      );
      const footer = el.closest("footer, .footer, #footer");

      if (header) {
        score += 50;
        reasons.push("in-header");
      }
      if (footer) {
        score -= 30; // Logos in footer are rarely the "main" logo
        reasons.push("in-footer");
      }

      // --- SCORING: LINK DESTINATION (CRITICAL) ---

      const parentLink = el.closest("a");
      if (parentLink) {
        const href = parentLink.href;
        // Clean trailing slashes for comparison
        const linkUrl = href.replace(/\/$/, "");
        const rootUrl = origin.replace(/\/$/, "");

        // Points if it links to Home
        if (
          linkUrl === rootUrl ||
          linkUrl === currentBaseUrl.replace(/\/$/, "")
        ) {
          score += 60;
          reasons.push("links-to-home");
        }
      }

      // --- SCORING: TEXT MATCHING ---

      const attributes = [
        el.id,
        el.className.toString(),
        el.getAttribute("alt"),
        (el as HTMLImageElement).src,
      ]
        .join(" ")
        .toLowerCase();

      if (attributes.includes("logo")) {
        score += 20;
        reasons.push("keyword-logo");
      }
      if (attributes.includes("brand")) {
        score += 10;
        reasons.push("keyword-brand");
      }
      if (attributes.includes("icon")) {
        score -= 10; // "menu-icon", "search-icon" usually aren't logos
        reasons.push("keyword-icon");
      }

      // --- SCORING: POSITIONING ---

      // Logos are usually in the top 150px of the page
      if (rect.top < 150) {
        score += 20;
        reasons.push("top-of-page");
      }
      // Logos are usually Left or Center
      // (Assuming standard LTR layout, max width 1920)
      if (
        rect.left < 50 ||
        rect.left + rect.width / 2 < window.innerWidth / 2 + 200
      ) {
        score += 10;
        reasons.push("position-left-center");
      }

      // --- EXTRACT SOURCE ---

      let src = "";
      if (el.tagName.toLowerCase() === "img") {
        src =
          (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src;
      } else if (el.tagName.toLowerCase() === "svg") {
        src = svgToDataUrl(el as SVGElement);
      }

      if (src && src !== window.location.href) {
        candidates.push({ src, score, reason: reasons });
      }
    });

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Debug: Print top candidates to console (visible in Playwright execution context)
    // console.table(candidates.slice(0, 3));

    return candidates.length > 0 ? candidates[0] : null;
  }, baseUrl);

  // 3. Post-Processing & Fallbacks

  // If we found a high-confidence match (score > 60 roughly implies header + home link)
  if (bestLogo && bestLogo.score >= 50) {
    return resolveUrl(bestLogo.src, baseUrl);
  }

  // 4. Fallback: Meta tags (High quality but generic)
  // If DOM scoring failed or confidence is low, trust the OpenGraph image
  const ogImage = await page
    .$eval('meta[property="og:image"], meta[name="og:image"]', (el) =>
      el.getAttribute("content"),
    )
    .catch(() => null);

  if (ogImage) {
    return resolveUrl(ogImage, baseUrl);
  }

  // 5. Fallback: Return the low-confidence DOM match if it exists
  if (bestLogo) {
    return resolveUrl(bestLogo.src, baseUrl);
  }

  // 6. Final Fallback: Apple Touch Icon
  const touchIcon = await page
    .$eval('link[rel="apple-touch-icon"]', (el) => el.getAttribute("href"))
    .catch(() => null);

  if (touchIcon) {
    return resolveUrl(touchIcon, baseUrl);
  }

  return null;
}
