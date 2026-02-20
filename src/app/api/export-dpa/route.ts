import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { chromium, Browser, Page } from "playwright";
import {
  parseManifestJs,
  serializeManifest,
  applyDynamicValues,
  fixRelativePaths,
  DynamicValueData,
  injectFonts,
} from "@/lib/manifest-utils";
import { Typography } from "@/lib/shared/types";

// Allow up to 5 minutes for large product exports (10+ products × multiple languages)
export const maxDuration = 300;

interface DpaExportProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  imageUrl?: string;
  vendor?: string;
}

interface DpaExportRequest {
  templatePath: string;
  size: string; // e.g., "1080x1080"
  products: DpaExportProduct[];
  brandData: {
    logoUrl?: string;
    colors?: string[];
    labelColor?: string;
    ctaColor?: string;
    bgColor?: string;
    bgImageUrl?: string;
    typography?: Typography;
  };
  localizations?: Record<
    string,
    {
      products: {
        productId: string;
        title: string;
        vendor: string;
        ctaText: string;
      }[];
    }
  >;
}

/**
 * Generate a complete HTML string for a product ad
 * This replicates the client-side blob generation in useAdPreviewBlob
 */
async function generateProductHtml(
  templatePath: string,
  size: string,
  product: DpaExportProduct,
  brandData: DpaExportRequest["brandData"],
  baseUrl: string,
): Promise<string> {
  const publicDir = path.join(process.cwd(), "public");
  const basePath = `${baseUrl}/templates/${templatePath}/${size}`;
  const templateDir = path.join(publicDir, "templates", templatePath, size);

  // Read HTML template
  const htmlPath = path.join(templateDir, "index.html");
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Template HTML not found: ${htmlPath}`);
  }
  let html = fs.readFileSync(htmlPath, "utf-8");

  // Read manifest.js
  const manifestPath = path.join(templateDir, "manifest.js");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  const manifestJs = fs.readFileSync(manifestPath, "utf-8");

  // Parse manifest
  const baseManifest = parseManifestJs(manifestJs);

  // Build dynamic data from product
  const dynamicData: DynamicValueData = {
    headline: product.title,
    bodyCopy: product.vendor || "",
    ctaText: (product as any).ctaText || "SHOP NOW",
    cta: (product as any).ctaText || "SHOP NOW",
    price: `${product.currency} ${product.price.toFixed(2)}`,
    label: "New Arrival",
    imageUrl: product.imageUrl || "",
    image: product.imageUrl || "",
    logoUrl: brandData.logoUrl,
    bgImageUrl: brandData.bgImageUrl,
    colors: brandData.colors,
    labelColor: brandData.labelColor?.replace("#", "") || "F97316",
    ctaColor: brandData.ctaColor?.replace("#", "") || "4F46E5",
    bgColor: brandData.bgColor?.replace("#", "") || "FFFFFF",
    typography: brandData.typography,
  };

  // Apply dynamic values to manifest
  const modifiedManifest = applyDynamicValues(baseManifest, dynamicData);

  // Extract colors for injection
  const colors = (modifiedManifest as { __colors?: string[] }).__colors;
  delete (modifiedManifest as { __colors?: string[] }).__colors;

  // Serialize the modified manifest
  const inlineManifest = serializeManifest(modifiedManifest);

  // Replace external manifest.js with inline script
  html = html.replace(
    /<script\s+src=["']manifest\.js["']\s*><\/script>/i,
    `<script>${inlineManifest}</script>`,
  );

  // Replace external GSAP CDN with inline script (CDN unreachable from server)
  const gsapPath = path.join(templateDir, "gsap.min.js");
  if (fs.existsSync(gsapPath)) {
    const gsapJs = fs.readFileSync(gsapPath, "utf-8");
    html = html.replace(
      /<script\s+src=["']https?:\/\/[^"']*gsap[^"']*["']\s*><\/script>/i,
      `<script>${gsapJs}<\/script>`,
    );
  }

  // Inline all remaining local .js files referenced in the HTML
  // This makes the HTML fully self-contained (no dependency on <base> tag for scripts)
  const localScriptPattern =
    /<script\s+src=["']([^"']+\.js)["']\s*><\/script>/gi;
  let match;
  while ((match = localScriptPattern.exec(html)) !== null) {
    const scriptSrc = match[1];
    // Skip absolute URLs (already handled above) and already-inlined scripts
    if (scriptSrc.startsWith("http")) continue;
    const scriptPath = path.join(templateDir, scriptSrc);
    if (fs.existsSync(scriptPath)) {
      const scriptContent = fs.readFileSync(scriptPath, "utf-8");
      html = html.replace(match[0], `<script>${scriptContent}<\/script>`);
      // Reset regex index since we modified the string
      localScriptPattern.lastIndex = 0;
    }
  }

  // Inject color overrides and extra data
  if (colors && colors.length > 0) {
    const extraData =
      (modifiedManifest as { __extraData?: Record<string, string> })
        .__extraData || {};
    const colorString = colors.slice(0, 3).join("|");

    let injectionScript = `dynamicData["colors"] = "${colorString}";\n`;

    Object.entries(extraData).forEach(([key, value]) => {
      injectionScript += `dynamicData["${key}"] = "${value}";\n`;
    });

    html = html.replace(
      /grid8player\.dynamicData\s*=\s*dynamicData;/,
      `${injectionScript}      grid8player.dynamicData = dynamicData;`,
    );
  }

  // Inject <base> tag for Playwright to resolve relative URLs
  // This is critical for setContent() to load assets properly
  html = html.replace(
    /<head([^>]*)>/i,
    `<head$1>\n    <base href="${basePath}/">`,
  );

  // Inject custom font if available
  html = injectFonts(html, brandData.typography);

  return html;
}

/**
 * Take a screenshot of HTML content using Playwright
 * The HTML should have a <base> tag for proper asset resolution
 */
async function screenshotHtml(
  browser: Browser,
  html: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const page: Page = await browser.newPage();

  try {
    // Set viewport to exact ad size
    await page.setViewportSize({ width, height });

    // Capture page console output and errors for debugging
    const pageErrors: string[] = [];
    const pageLogs: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        pageErrors.push(msg.text());
      } else {
        pageLogs.push(msg.text());
      }
    });

    // Set the HTML content - the <base> tag handles asset resolution
    await page.setContent(html, { waitUntil: "networkidle" });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Wait for Grid8 player to signal ready (set via gsap.delayedCall after animationLoaded)
    try {
      await page.waitForFunction(() => (window as any).ready === true, {
        timeout: 3000,
        polling: 200,
      });
    } catch {
      console.warn("[DPA Export] window.ready not set, using 3s fallback");
      if (pageErrors.length > 0) {
        console.warn("[DPA Export] Page errors:", pageErrors);
      }
      await page.waitForTimeout(3000);
    }

    // Small buffer for final rendering
    await page.waitForTimeout(500);

    // Take screenshot
    const screenshot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width, height },
      omitBackground: true,
    });

    return Buffer.from(screenshot);
  } finally {
    await page.close();
  }
}

/**
 * Sanitize product title for filename
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 50);
}

/**
 * POST /api/export-dpa
 * Generate static images for DPA products and return as ZIP
 */
export async function POST(request: NextRequest) {
  let browser: Browser | null = null;

  try {
    const body: DpaExportRequest = await request.json();
    const { templatePath, size, products, brandData, localizations } = body;

    if (!templatePath || !size || !products?.length) {
      return NextResponse.json(
        { error: "Missing required fields: templatePath, size, products" },
        { status: 400 },
      );
    }

    // Parse size dimensions
    const [widthStr, heightStr] = size.split("x");
    const width = parseInt(widthStr, 10);
    const height = parseInt(heightStr, 10);

    if (isNaN(width) || isNaN(height)) {
      return NextResponse.json(
        { error: "Invalid size format. Expected WxH (e.g., 1080x1080)" },
        { status: 400 },
      );
    }

    // Determine language folders to generate
    const langCodes = localizations ? Object.keys(localizations) : [];
    const useSubfolders = langCodes.length > 1;

    console.log(
      `[DPA Export] Starting export for ${products.length} products at ${size}` +
        (langCodes.length > 0 ? ` in ${langCodes.length} languages` : ""),
    );

    // Get base URL for asset loading
    const baseUrl =
      process.env.NEXTAUTH_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    // Launch browser
    browser = await chromium.launch({
      headless: true,
    });

    // Create ZIP archive
    const archive = archiver("zip", { zlib: { level: 5 } });
    const chunks: Buffer[] = [];

    // Set up promise BEFORE finalize to avoid race condition
    const archiveFinished = new Promise<void>((resolve, reject) => {
      archive.on("end", resolve);
      archive.on("error", reject);
    });

    archive.on("data", (chunk) => chunks.push(chunk));

    // Helper to generate images for a set of products
    const generateForProducts = async (
      productsToExport: DpaExportProduct[],
      folder: string,
    ) => {
      for (let i = 0; i < productsToExport.length; i++) {
        const product = productsToExport[i];
        console.log(
          `[DPA Export] Processing ${folder ? folder + "/" : ""}${i + 1}/${productsToExport.length}: ${product.title}`,
        );

        try {
          const html = await generateProductHtml(
            templatePath,
            size,
            product,
            brandData,
            baseUrl,
          );

          const screenshot = await screenshotHtml(
            browser!,
            html,
            width,
            height,
          );

          const filename = `${sanitizeFilename(product.title)}_${size}.png`;
          const entryName = folder ? `${folder}/${filename}` : filename;
          archive.append(screenshot, { name: entryName });

          console.log(`[DPA Export] Added: ${entryName}`);
        } catch (error) {
          console.error(
            `[DPA Export] Failed to process product ${product.id}:`,
            error,
          );
        }
      }
    };

    if (langCodes.length > 0) {
      // Multi-language export
      for (const langCode of langCodes) {
        const langData = localizations![langCode];
        const folder = useSubfolders ? langCode : "";

        // Create localized product list by merging translations with original products
        const localizedProducts: DpaExportProduct[] = products.map((p) => {
          const translation = langData.products.find(
            (lp) => lp.productId === p.id,
          );
          if (translation) {
            return {
              ...p,
              title: translation.title,
              vendor: translation.vendor || p.vendor,
              ctaText: translation.ctaText,
            } as any;
          }
          return p;
        });

        await generateForProducts(localizedProducts, folder);
      }
    } else {
      // Default: no localization
      await generateForProducts(products, "");
    }

    // Finalize archive (must be after all appends)
    archive.finalize();

    // Wait for archive to complete
    await archiveFinished;

    // Combine chunks into final buffer
    const zipBuffer = Buffer.concat(chunks);

    console.log(`[DPA Export] Complete! ZIP size: ${zipBuffer.length} bytes`);

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="dpa-export-${Date.now()}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[DPA Export] Export failed:", error);
    return NextResponse.json(
      { error: "Export failed", details: String(error) },
      { status: 500 },
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * GET /api/export-dpa
 * Return available sizes for DPA templates
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const templatePath = searchParams.get("template") || "social/Shopify";

  const publicDir = path.join(process.cwd(), "public");
  const templateDir = path.join(publicDir, "templates", templatePath);

  if (!fs.existsSync(templateDir)) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Find size directories
  const entries = fs.readdirSync(templateDir, { withFileTypes: true });
  const sizes = entries
    .filter((entry) => {
      if (!entry.isDirectory()) return false;
      // Check if it looks like a size (e.g., "1080x1080", "300x600")
      return /^\d+x\d+$/.test(entry.name);
    })
    .map((entry) => {
      const [w, h] = entry.name.split("x");
      return {
        id: entry.name,
        name: getSizeName(entry.name),
        dimensions: `${w} × ${h}`,
        width: parseInt(w, 10),
        height: parseInt(h, 10),
      };
    });

  return NextResponse.json({ sizes });
}

function getSizeName(sizeId: string): string {
  const names: Record<string, string> = {
    "1080x1080": "Instagram Square",
    "1080x1920": "Instagram Story",
    "2048x2048": "High-Res Square",
    "300x250": "Medium Rectangle",
    "300x600": "Half Page",
    "728x90": "Leaderboard",
    "160x600": "Wide Skyscraper",
  };
  return names[sizeId] || sizeId;
}
