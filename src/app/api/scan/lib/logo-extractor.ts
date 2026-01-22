import { Page } from "playwright";

/**
 * Resolves a URL against a base URL, handling absolute URLs and data URIs.
 */
function resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return new URL(url, baseUrl).href;
}

/**
 * Serializes an SVG element to a data URL.
 */
function svgToDataUrl(svg: SVGElement): string {
    const svgString = new XMLSerializer().serializeToString(svg);
    return `data:image/svg+xml,${encodeURIComponent(svgString)}`;
}

/**
 * Attempts to extract a logo URL from the page using multiple strategies.
 * Priority: actual logo elements > og:image > fallbacks
 */
export async function extractLogo(
    page: Page,
    baseUrl: string
): Promise<string | null> {
    // Wait for network to settle - logos often lazy-load
    await page
        .waitForLoadState("networkidle", { timeout: 5000 })
        .catch(() => {});

    // 1. First priority: img with "logo" in class/id/alt (anywhere on page)
    const logoImg = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll("img"));
        const logo = imgs.find(
            (img) =>
                /logo/i.test(img.className || "") ||
                /logo/i.test(img.id || "") ||
                /logo/i.test(img.alt || "")
        );
        return logo?.src || null;
    });

    if (logoImg) {
        return resolveUrl(logoImg, baseUrl);
    }

    // 2. SVG inside element with "logo" in class (page-wide)
    const logoSvg = await page.evaluate(() => {
        // Try elements with "logo" in class that contain SVG
        const logoContainer = document.querySelector(
            '[class*="logo" i]'
        ) as HTMLElement;
        const svg = logoContainer?.querySelector("svg") as SVGElement;

        if (svg) {
            const svgString = new XMLSerializer().serializeToString(svg);
            return `data:image/svg+xml,${encodeURIComponent(svgString)}`;
        }

        // Also try SVG with logo in its own class
        const directSvg = document.querySelector(
            'svg[class*="logo" i]'
        ) as SVGElement;
        if (directSvg) {
            const svgString = new XMLSerializer().serializeToString(directSvg);
            return `data:image/svg+xml,${encodeURIComponent(svgString)}`;
        }

        return null;
    });

    if (logoSvg) {
        return logoSvg;
    }

    // 3. Header/nav logo (both img and SVG)
    const headerLogo = await page.evaluate(() => {
        const headerNav = document.querySelector(
            'header, nav, [role="banner"]'
        );
        if (!headerNav) return null;

        // Check for first img in home link
        const homeImg = headerNav.querySelector(
            'a[href="/"] img:first-of-type'
        ) as HTMLImageElement;
        if (homeImg?.src) return homeImg.src;

        // Check for SVG in home link
        const homeSvg = headerNav.querySelector('a[href="/"] svg') as SVGElement;
        if (homeSvg) {
            const svgString = new XMLSerializer().serializeToString(homeSvg);
            return `data:image/svg+xml,${encodeURIComponent(svgString)}`;
        }

        return null;
    });

    if (headerLogo) {
        return headerLogo.startsWith("data:")
            ? headerLogo
            : resolveUrl(headerLogo, baseUrl);
    }

    // 4. Try og:image (often social share images, so lower priority)
    const ogImage = await page
        .$eval(
            'meta[property="og:image"], meta[name="og:image"]',
            (el) => el.getAttribute("content")
        )
        .catch(() => null);

    if (ogImage) {
        return resolveUrl(ogImage, baseUrl);
    }

    // 5. Last resort: apple-touch-icon (higher res than favicon)
    const touchIcon = await page
        .$eval('link[rel="apple-touch-icon"]', (el) => el.getAttribute("href"))
        .catch(() => null);

    if (touchIcon) {
        return resolveUrl(touchIcon, baseUrl);
    }

    return null;
}
