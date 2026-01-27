import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { g as getSession } from './browser.mjs';

function resolveUrl(url, baseUrl) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  try {
    return new URL(url, baseUrl).href;
  } catch (e) {
    return "";
  }
}
async function extractLogo(page, baseUrl) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1e3);
  const bestLogo = await page.evaluate((currentBaseUrl) => {
    const candidates = [];
    const origin = new URL(currentBaseUrl).origin;
    const svgToDataUrl = (svg) => {
      const svgString = new XMLSerializer().serializeToString(svg);
      return `data:image/svg+xml,${encodeURIComponent(svgString)}`;
    };
    const elements = Array.from(document.querySelectorAll("img, svg"));
    elements.forEach((el) => {
      let score = 0;
      const reasons = [];
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || el.style.display === "none" || el.style.visibility === "hidden")
        return;
      if (rect.width < 20 || rect.height < 20) return;
      if (rect.width > 600 || rect.height > 400) return;
      const header = el.closest(
        'header, nav, [role="banner"], .header, #header'
      );
      const footer = el.closest("footer, .footer, #footer");
      if (header) {
        score += 50;
        reasons.push("in-header");
      }
      if (footer) {
        score -= 30;
        reasons.push("in-footer");
      }
      const parentLink = el.closest("a");
      if (parentLink) {
        const href = parentLink.href;
        const linkUrl = href.replace(/\/$/, "");
        const rootUrl = origin.replace(/\/$/, "");
        if (linkUrl === rootUrl || linkUrl === currentBaseUrl.replace(/\/$/, "")) {
          score += 60;
          reasons.push("links-to-home");
        }
      }
      const attributes = [
        el.id,
        el.className.toString(),
        el.getAttribute("alt"),
        el.src
      ].join(" ").toLowerCase();
      if (attributes.includes("logo")) {
        score += 20;
        reasons.push("keyword-logo");
      }
      if (attributes.includes("brand")) {
        score += 10;
        reasons.push("keyword-brand");
      }
      if (attributes.includes("icon")) {
        score -= 10;
        reasons.push("keyword-icon");
      }
      if (rect.top < 150) {
        score += 20;
        reasons.push("top-of-page");
      }
      if (rect.left < 50 || rect.left + rect.width / 2 < window.innerWidth / 2 + 200) {
        score += 10;
        reasons.push("position-left-center");
      }
      let src = "";
      if (el.tagName.toLowerCase() === "img") {
        src = el.currentSrc || el.src;
      } else if (el.tagName.toLowerCase() === "svg") {
        src = svgToDataUrl(el);
      }
      if (src && src !== window.location.href) {
        candidates.push({ src, score, reason: reasons });
      }
    });
    candidates.sort((a, b) => b.score - a.score);
    return candidates.length > 0 ? candidates[0] : null;
  }, baseUrl);
  if (bestLogo && bestLogo.score >= 50) {
    return resolveUrl(bestLogo.src, baseUrl);
  }
  const ogImage = await page.$eval(
    'meta[property="og:image"], meta[name="og:image"]',
    (el) => el.getAttribute("content")
  ).catch(() => null);
  if (ogImage) {
    return resolveUrl(ogImage, baseUrl);
  }
  if (bestLogo) {
    return resolveUrl(bestLogo.src, baseUrl);
  }
  const touchIcon = await page.$eval('link[rel="apple-touch-icon"]', (el) => el.getAttribute("href")).catch(() => null);
  if (touchIcon) {
    return resolveUrl(touchIcon, baseUrl);
  }
  return null;
}

const logoExtractorTool = createTool({
  id: "logo-extractor",
  description: "Extracts the brand logo URL from a webpage using the active browser session",
  inputSchema: z.object({
    sessionId: z.string().describe("Active browser session ID"),
    baseUrl: z.string().url().describe("Base URL for resolving relative paths")
  }),
  outputSchema: z.object({
    logoUrl: z.string().nullable().describe("Extracted logo URL or null if not found"),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    const session = getSession(context.sessionId);
    if (!session) {
      return {
        logoUrl: null,
        success: false,
        error: `No active session found for ID: ${context.sessionId}`
      };
    }
    try {
      const logoUrl = await extractLogo(session.page, context.baseUrl);
      return { logoUrl, success: true };
    } catch (error) {
      return {
        logoUrl: null,
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract logo"
      };
    }
  }
});

export { extractLogo as e, logoExtractorTool as l };
