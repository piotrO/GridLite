"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  parseManifestJs,
  serializeManifest,
  fixRelativePaths,
  applyDynamicValues,
  DynamicValueData,
} from "@/lib/manifest-utils";

interface UseAdPreviewBlobOptions {
  /** Template path relative to /public, e.g., "/templates/template000" */
  templatePath: string;
  /** Ad size, e.g., "300x250" */
  size: string;
  /** Dynamic data from the UI */
  data: DynamicValueData;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
}

interface UseAdPreviewBlobResult {
  /** The Blob URL to use as iframe src */
  blobUrl: string | null;
  /** Whether the blob is currently being generated */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Force regenerate the blob */
  refresh: () => void;
}

/**
 * Hook that generates a Blob URL for ad preview with modified manifest
 *
 * This hook:
 * 1. Fetches the template's index.html and manifest.js
 * 2. Parses and modifies the manifest with dynamic values
 * 3. Injects the modified manifest inline into the HTML
 * 4. Fixes relative asset paths
 * 5. Returns a Blob URL that can be used as iframe src
 */
export function useAdPreviewBlob({
  templatePath,
  size,
  data,
  debounceMs = 300,
}: UseAdPreviewBlobOptions): UseAdPreviewBlobResult {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Keep track of previous blob URL for cleanup
  const previousBlobUrl = useRef<string | null>(null);

  // Cache for fetched resources to avoid re-fetching
  const resourceCache = useRef<Map<string, string>>(new Map());

  // Debounce timer ref
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Generation counter to handle stale updates
  const generationRef = useRef(0);

  const generateBlob = useCallback(async () => {
    const currentGeneration = ++generationRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const basePath = `${templatePath}/${size}`;

      // Fetch HTML (with caching)
      let html: string;
      const htmlCacheKey = `${basePath}/index.html`;
      if (resourceCache.current.has(htmlCacheKey)) {
        html = resourceCache.current.get(htmlCacheKey)!;
      } else {
        const htmlRes = await fetch(`${basePath}/index.html`);
        if (!htmlRes.ok) {
          throw new Error(`Failed to fetch template HTML: ${htmlRes.status}`);
        }
        html = await htmlRes.text();
        resourceCache.current.set(htmlCacheKey, html);
      }

      // Fetch manifest.js (with caching)
      let manifestJs: string;
      const manifestCacheKey = `${basePath}/manifest.js`;
      if (resourceCache.current.has(manifestCacheKey)) {
        manifestJs = resourceCache.current.get(manifestCacheKey)!;
      } else {
        const manifestRes = await fetch(`${basePath}/manifest.js`);
        if (!manifestRes.ok) {
          throw new Error(`Failed to fetch manifest.js: ${manifestRes.status}`);
        }
        manifestJs = await manifestRes.text();
        resourceCache.current.set(manifestCacheKey, manifestJs);
      }

      // Parse the manifest
      const baseManifest = parseManifestJs(manifestJs);

      // Debug: Log data being applied
      console.log("[useAdPreviewBlob] Applying dynamic values:", {
        headline: data.headline,
        bodyCopy: data.bodyCopy?.substring(0, 30) + "...",
        layerModifications: data.layerModifications,
        hasColors: !!data.colors?.length,
      });

      // Apply dynamic values
      const modifiedManifest = applyDynamicValues(baseManifest, data);

      // Extract colors for injection (stored by applyDynamicValues)
      const colors = (modifiedManifest as { __colors?: string[] }).__colors;
      delete (modifiedManifest as { __colors?: string[] }).__colors;

      // Serialize the modified manifest
      const inlineManifest = serializeManifest(modifiedManifest);

      // Replace the external manifest.js script with inline script
      html = html.replace(
        /<script\s+src=["']manifest\.js["']\s*><\/script>/i,
        `<script>${inlineManifest}</script>`,
      );

      // Inject color override and extra data into dynamicData initialization
      if (
        (colors && colors.length > 0) ||
        (modifiedManifest as { __extraData?: Record<string, string> })
          .__extraData
      ) {
        let injectionScript = "";

        if (colors && colors.length > 0) {
          const colorString = colors.slice(0, 3).join("|");
          injectionScript += `dynamicData["colors"] = "${colorString}";\n`;
        }

        const extraData = (
          modifiedManifest as { __extraData?: Record<string, string> }
        ).__extraData;
        if (extraData) {
          Object.entries(extraData).forEach(([key, value]) => {
            injectionScript += `dynamicData["${key}"] = "${value}";\n`;
          });
        }

        // Find the dynamicData initialization and inject data
        html = html.replace(
          /grid8player\.dynamicData\s*=\s*dynamicData;/,
          `${injectionScript}      grid8player.dynamicData = dynamicData;`,
        );
      }

      // Fix relative paths to absolute
      html = fixRelativePaths(html, basePath);

      // Inject a <base> tag to help the browser resolve paths from blob context
      // This ensures absolute paths like /templates/... are resolved against the origin
      const baseTag = `<base href="${window.location.origin}${basePath}/">`;
      html = html.replace(/<head([^>]*)>/i, `<head$1>\n    ${baseTag}`);

      // Inject custom font if available
      if (data.typography?.fontFileBase64 && data.typography.fontFormat) {
        const { fontFileBase64, fontFormat, primaryFontFamily } =
          data.typography;
        const customFontName = `CustomBrandFont`;

        // Map format to correct CSS strings
        const formatMap: Record<string, string> = {
          ttf: "truetype",
          otf: "opentype",
          woff: "woff",
          woff2: "woff2",
        };
        const cssFormat = formatMap[fontFormat] || fontFormat;
        const mimeType = `font/${fontFormat === "ttf" ? "ttf" : fontFormat === "otf" ? "otf" : fontFormat}`;

        const fontCss = `
                    <style>
                        @font-face {
                            font-family: '${customFontName}';
                            src: url(data:${mimeType};base64,${fontFileBase64}) format('${cssFormat}');
                            font-weight: normal;
                            font-style: normal;
                            font-display: swap;
                        }
                        
                        .maincopy, .subcopy, .ctaCopy {
                            font-family: '${customFontName}', ${primaryFontFamily}, sans-serif !important;
                        }
                    </style>
                `;

        html = html.replace("</head>", `${fontCss}\n</head>`);
      }

      // Debug: Log a snippet to verify paths were fixed
      if (typeof window !== "undefined") {
        const scriptMatch = html.match(
          /<script[^>]+src=["'][^"']+["'][^>]*>/gi,
        );
        console.log(
          "[AdPreviewBlob] Script tags after path fix:",
          scriptMatch?.slice(0, 5),
        );
      }

      // Check if this generation is still current
      if (currentGeneration !== generationRef.current) {
        return; // Stale update, discard
      }

      // Create blob URL
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      // Cleanup previous blob URL
      if (previousBlobUrl.current) {
        URL.revokeObjectURL(previousBlobUrl.current);
      }
      previousBlobUrl.current = url;

      setBlobUrl(url);
      setIsLoading(false);
    } catch (err) {
      if (currentGeneration === generationRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    }
    // Stringify data for stable dependency comparison (detects deep changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatePath, size, JSON.stringify(data)]);

  // Debounced effect to regenerate blob when inputs change
  useEffect(() => {
    // Clear any pending debounce
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set up debounced regeneration
    debounceTimer.current = setTimeout(() => {
      generateBlob();
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [generateBlob, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previousBlobUrl.current) {
        URL.revokeObjectURL(previousBlobUrl.current);
      }
      resourceCache.current.clear();
    };
  }, []);

  const refresh = useCallback(() => {
    // Clear cache and regenerate
    resourceCache.current.clear();
    generateBlob();
  }, [generateBlob]);

  return { blobUrl, isLoading, error, refresh };
}
