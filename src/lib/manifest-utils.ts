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
    layerModifications?: Array<{
        layerName: string;
        positionDelta?: { x?: number; y?: number };
        scaleFactor?: number;
    }>;
}

/**
 * Apply dynamic values from the UI to the manifest
 * This updates the defaultValue fields in the manifest's dynamicValues settings
 * and applies any layer modifications (position/scale changes)
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

    if (dynamicValues) {
        // Map UI field names to manifest dynamic value names
        const fieldMapping: Record<string, string> = {
            headline: "s0_headline",
            bodyCopy: "s0_bodycopy",
            ctaText: "s0_ctaText",
            imageUrl: "s0_imageUrl",
            logoUrl: "s0_logoUrl",
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
    }

    // Handle colors separately (they need to be joined with |)
    if (data.colors && data.colors.length > 0) {
        // Colors are applied via the globalScripts in the template's HTML
        // We'll inject them as a dynamicData override in the HTML
        // Store them in a custom field for later use
        (newManifest as Record<string, unknown>).__colors = data.colors;
    }

    // Apply layer modifications if provided
    if (data.layerModifications && data.layerModifications.length > 0) {
        const layers = newManifest.layers as Array<{
            name: string;
            shots?: Array<{
                pos: { x: number; y: number };
                size: { w: number; h: number; initW?: number; initH?: number };
            }>;
        }> | undefined;

        if (layers) {
            for (const mod of data.layerModifications) {
                const layer = layers.find(
                    (l) => l.name.toLowerCase() === mod.layerName.toLowerCase()
                );
                if (!layer?.shots) continue;

                for (const shot of layer.shots) {
                    // Apply position delta
                    if (mod.positionDelta) {
                        if (mod.positionDelta.x !== undefined) {
                            shot.pos.x += mod.positionDelta.x;
                        }
                        if (mod.positionDelta.y !== undefined) {
                            shot.pos.y += mod.positionDelta.y;
                        }
                    }

                    // Apply scale factor by modifying size values
                    if (mod.scaleFactor && mod.scaleFactor !== 1) {
                        // Calculate center point before scaling
                        const centerX = shot.pos.x + shot.size.w / 2;
                        const centerY = shot.pos.y + shot.size.h / 2;

                        // Scale the size values
                        shot.size.w *= mod.scaleFactor;
                        shot.size.h *= mod.scaleFactor;

                        // Also scale initW and initH (used by Grid8 player)
                        if (shot.size.initW !== undefined) {
                            shot.size.initW *= mod.scaleFactor;
                        }
                        if (shot.size.initH !== undefined) {
                            shot.size.initH *= mod.scaleFactor;
                        }

                        // Adjust position to keep center point
                        shot.pos.x = centerX - shot.size.w / 2;
                        shot.pos.y = centerY - shot.size.h / 2;
                    }
                }
            }
        }
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
