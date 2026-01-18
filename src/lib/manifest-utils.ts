/**
 * Utilities for parsing and manipulating Grid8 ad manifests
 */

/**
 * Deep merge two objects, with source values overriding target
 */
export function deepMerge<T extends Record<string, unknown>>(
    target: T,
    source: Partial<T>
): T {
    const output = { ...target };

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const sourceValue = source[key];
            const targetValue = target[key];

            if (
                sourceValue &&
                typeof sourceValue === "object" &&
                !Array.isArray(sourceValue) &&
                targetValue &&
                typeof targetValue === "object" &&
                !Array.isArray(targetValue)
            ) {
                // Recursively merge nested objects
                (output as Record<string, unknown>)[key] = deepMerge(
                    targetValue as Record<string, unknown>,
                    sourceValue as Record<string, unknown>
                );
            } else if (sourceValue !== undefined) {
                // Direct assignment for primitives, arrays, and when target doesn't have the key
                (output as Record<string, unknown>)[key] = sourceValue;
            }
        }
    }

    return output;
}

/**
 * Parse a manifest.js file content into a JavaScript object
 * The file format is: window.manifest = { ... };
 */
export function parseManifestJs(jsContent: string): Record<string, unknown> {
    // Remove the "window.manifest = " prefix and trailing semicolon
    const jsonMatch = jsContent.match(/window\.manifest\s*=\s*(\{[\s\S]*\});?\s*$/);

    if (!jsonMatch) {
        throw new Error("Invalid manifest.js format: could not find window.manifest assignment");
    }

    try {
        // The manifest is a JS object literal, not strict JSON
        // We need to evaluate it safely
        // Using Function constructor to parse JS object literal
        const manifestObj = new Function(`return ${jsonMatch[1]}`)();
        return manifestObj;
    } catch (error) {
        throw new Error(`Failed to parse manifest.js: ${error}`);
    }
}

/**
 * Serialize a manifest object back to a manifest.js string
 */
export function serializeManifest(manifest: Record<string, unknown>): string {
    return `window.manifest = ${JSON.stringify(manifest, null, 2)};`;
}

/**
 * Fix relative paths in HTML content by converting them to absolute paths
 * This is necessary when serving HTML from a Blob URL
 */
export function fixRelativePaths(html: string, basePath: string): string {
    // Ensure basePath doesn't have trailing slash
    const base = basePath.replace(/\/$/, "");

    // Helper to check if a path is already absolute
    const isAbsolute = (path: string): boolean => {
        return (
            path.startsWith("/") ||
            path.startsWith("http://") ||
            path.startsWith("https://") ||
            path.startsWith("//") ||
            path.startsWith("data:") ||
            path.startsWith("blob:") ||
            path.startsWith("#")
        );
    };

    // Helper to fix a single path
    const fixPath = (path: string): string => {
        if (isAbsolute(path)) return path;
        // Remove ./ prefix if present
        const cleanPath = path.replace(/^\.\//, "");
        return `${base}/${cleanPath}`;
    };

    // Fix src attributes
    html = html.replace(
        /(<(?:script|img|source|video|audio|embed|iframe)[^>]*\s+src\s*=\s*["'])([^"']+)(["'])/gi,
        (match, prefix, path, suffix) => {
            return `${prefix}${fixPath(path)}${suffix}`;
        }
    );

    // Fix href attributes (for link, a tags)
    html = html.replace(
        /(<(?:link|a)[^>]*\s+href\s*=\s*["'])([^"']+)(["'])/gi,
        (match, prefix, path, suffix) => {
            // Don't fix anchor links or javascript:
            if (path.startsWith("#") || path.startsWith("javascript:")) {
                return match;
            }
            return `${prefix}${fixPath(path)}${suffix}`;
        }
    );

    // Fix url() in CSS (inline styles and style tags)
    html = html.replace(
        /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
        (match, path) => {
            if (isAbsolute(path)) return match;
            const cleanPath = path.replace(/^\.\//, "");
            return `url('${base}/${cleanPath}')`;
        }
    );

    return html;
}

/**
 * Dynamic value data from the Studio UI
 */
export interface DynamicValueData {
    headline?: string;
    bodyCopy?: string;
    ctaText?: string;
    imageUrl?: string;
    logoUrl?: string;
    colors?: string[];
}

/**
 * Apply dynamic values from the UI to the manifest
 * This updates the defaultValue fields in the manifest's dynamicValues settings
 */
export function applyDynamicValues(
    manifest: Record<string, unknown>,
    data: DynamicValueData
): Record<string, unknown> {
    // Clone the manifest to avoid mutation
    const newManifest = JSON.parse(JSON.stringify(manifest));

    const settings = newManifest.settings as Record<string, unknown> | undefined;
    if (!settings) return newManifest;

    const dynamicValues = settings.dynamicValues as Array<{
        id: string;
        name: string;
        defaultValue?: string;
    }> | undefined;

    if (!dynamicValues) return newManifest;

    // Map UI field names to manifest dynamic value names
    const fieldMapping: Record<string, string> = {
        headline: "s0_header",
        bodyCopy: "s0_sub",
        ctaText: "s0_cta",
        imageUrl: "s0_bgr",
        logoUrl: "s0_logo",
    };

    // Update each dynamic value
    for (const [uiField, manifestName] of Object.entries(fieldMapping)) {
        const value = data[uiField as keyof DynamicValueData];
        if (value && typeof value === "string") {
            const dynamicValue = dynamicValues.find((dv) => dv.name === manifestName);
            if (dynamicValue) {
                dynamicValue.defaultValue = value;
            }
        }
    }

    // Handle colors separately (they need to be joined with |)
    if (data.colors && data.colors.length > 0) {
        // Colors are applied via the globalScripts in the template's HTML
        // We'll inject them as a dynamicData override in the HTML
        // Store them in a custom field for later use
        (newManifest as Record<string, unknown>).__colors = data.colors;
    }

    return newManifest;
}

/**
 * Generate the inline script that sets up dynamicData with colors
 */
export function generateDynamicDataScript(colors?: string[]): string {
    if (!colors || colors.length === 0) {
        return "";
    }

    const colorString = colors.slice(0, 3).join("|");
    return `
    <script>
      // Injected by Studio preview
      window.__studioColors = "${colorString}";
    </script>
  `;
}
