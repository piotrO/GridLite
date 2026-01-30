async function extractBrandFonts(page) {
  const fontFiles = /* @__PURE__ */ new Map();
  const handleResponse = async (response) => {
    const url = response.url().toLowerCase();
    const contentType = await response.headerValue("content-type").catch(() => "") || "";
    const isFont = /\.(woff2?|ttf|otf)(\?|$)/.test(url) || contentType.includes("font") || url.includes("use.typekit.net");
    if (isFont) {
      try {
        const bufferPromise = response.body();
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Timeout getting body")), 3e3)
        );
        const buffer = await Promise.race([bufferPromise, timeoutPromise]);
        if (buffer.length > 0) {
          fontFiles.set(response.url(), { buffer, contentType });
        }
      } catch (e) {
      }
    }
  };
  page.on("response", handleResponse);
  try {
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 15e3 });
    } catch (e) {
      console.warn("Reload timeout exceeded, proceeding with extraction...");
    }
    await page.waitForTimeout(2e3);
    const computedStyles = await page.evaluate(`(() => {
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
    })()`);
    const primaryFont = computedStyles.h1Font || computedStyles.bodyFont;
    if (!primaryFont) {
      return {
        primaryFontFamily: "system-ui",
        fontFileBase64: null,
        fontFormat: null,
        isSystemFont: true
      };
    }
    let match;
    for (const [url, data] of fontFiles.entries()) {
      if (url.toLowerCase().includes(primaryFont.toLowerCase().replace(/\s+/g, "-")) || url.toLowerCase().includes(primaryFont.toLowerCase().replace(/\s+/g, ""))) {
        match = { url, ...data };
        break;
      }
    }
    if (!match && fontFiles.size > 0) {
      const candidates = Array.from(fontFiles.entries()).filter(([_, data]) => data.buffer.length > 4e3).sort((a, b) => b[1].buffer.length - a[1].buffer.length);
      if (candidates.length > 0) {
        console.log(
          `[Font Extraction] No name match for '${primaryFont}'. Falling back to largest captured font: ${candidates[0][0]}`
        );
        match = { url: candidates[0][0], ...candidates[0][1] };
      }
    }
    const getFormat = (url, contentType) => {
      const lowerUrl = url.toLowerCase();
      const lowerCT = contentType.toLowerCase();
      if (lowerUrl.includes(".woff2") || lowerCT.includes("woff2"))
        return "woff2";
      if (lowerUrl.includes(".woff") || lowerCT.includes("woff"))
        return "woff";
      if (lowerUrl.includes(".ttf") || lowerCT.includes("ttf"))
        return "ttf";
      if (lowerUrl.includes(".otf") || lowerCT.includes("otf"))
        return "otf";
      if (/\.woff2($|\?)/.test(lowerUrl)) return "woff2";
      if (/\.woff($|\?)/.test(lowerUrl)) return "woff";
      if (/\.ttf($|\?)/.test(lowerUrl)) return "ttf";
      if (/\.otf($|\?)/.test(lowerUrl)) return "otf";
      return null;
    };
    const format = match ? getFormat(match.url, match.contentType) : null;
    return {
      primaryFontFamily: primaryFont,
      fontFileBase64: match ? match.buffer.toString("base64") : null,
      fontFormat: format,
      isSystemFont: !match || !format
    };
  } finally {
    page.removeListener("response", handleResponse);
  }
}

export { extractBrandFonts as e };
