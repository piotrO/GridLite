/**
 * Utilities for extracting and modifying layers in Grid8 ad manifests
 */

/**
 * Layer position and size information
 */
export interface LayerInfo {
    name: string;
    guid: string;
    type: "image" | "text" | "shape" | "group";
    pos: { x: number; y: number };
    size: { w: number; h: number };
    isDynamic: boolean;
}

/**
 * A modification to apply to a layer
 */
export interface LayerModification {
    layerName: string; // e.g., "logo", "maincopy", "cta"
    positionDelta?: { x?: number; y?: number }; // Relative move (negative = up/left)
    scaleFactor?: number; // e.g., 1.2 for 20% bigger
    sizes?: string[]; // ["300x600", "300x250"] or ["all"]
}

/**
 * Manifest layer structure (from manifest.js)
 */
interface ManifestLayer {
    name: string;
    guid: string;
    fileType?: string;
    isDynamic?: boolean;
    isGroup?: boolean;
    shots?: Array<{
        index: number;
        pos: { x: number; y: number };
        size: { w: number; h: number; initW?: number; initH?: number };
    }>;
}

/**
 * Extract layer information from a manifest for AI context
 */
export function getLayerSummary(
    manifest: Record<string, unknown>
): LayerInfo[] {
    const layers = manifest.layers as ManifestLayer[] | undefined;
    if (!layers) return [];

    return layers
        .filter((layer) => !layer.name.includes("_cta")) // Skip child layers
        .map((layer) => {
            const firstShot = layer.shots?.[0];
            const type = getLayerType(layer);

            return {
                name: layer.name,
                guid: layer.guid,
                type,
                pos: firstShot?.pos || { x: 0, y: 0 },
                size: firstShot?.size || { w: 0, h: 0 },
                isDynamic: layer.isDynamic || false,
            };
        });
}

/**
 * Get a human-readable layer type
 */
function getLayerType(
    layer: ManifestLayer
): "image" | "text" | "shape" | "group" {
    if (layer.isGroup) return "group";
    if (layer.fileType === "text") return "text";
    if (layer.fileType === "svg") return "shape";
    return "image";
}

/**
 * Generate a summary string for the AI context
 */
export function getLayerSummaryForAI(manifest: Record<string, unknown>): string {
    const layers = getLayerSummary(manifest);
    if (layers.length === 0) return "No layers available.";

    const lines = layers.map((layer) => {
        const typeEmoji =
            layer.type === "text"
                ? "📝"
                : layer.type === "image"
                    ? "🖼️"
                    : layer.type === "group"
                        ? "📦"
                        : "◼️";
        return `- ${typeEmoji} ${layer.name}: pos(${Math.round(layer.pos.x)}, ${Math.round(layer.pos.y)}) size(${Math.round(layer.size.w)}x${Math.round(layer.size.h)})`;
    });

    return lines.join("\n");
}

/**
 * Apply layer modifications to a manifest
 * Returns a new manifest object with the modifications applied
 */
export function applyLayerModifications(
    manifest: Record<string, unknown>,
    modifications: LayerModification[]
): Record<string, unknown> {
    // Deep clone to avoid mutation
    const newManifest = JSON.parse(JSON.stringify(manifest));
    const layers = newManifest.layers as ManifestLayer[] | undefined;

    if (!layers) return newManifest;

    for (const mod of modifications) {
        const layer = layers.find(
            (l) => l.name.toLowerCase() === mod.layerName.toLowerCase()
        );
        if (!layer || !layer.shots) continue;

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

            // Apply scale factor
            if (mod.scaleFactor && mod.scaleFactor !== 1) {
                const centerX = shot.pos.x + shot.size.w / 2;
                const centerY = shot.pos.y + shot.size.h / 2;

                shot.size.w *= mod.scaleFactor;
                shot.size.h *= mod.scaleFactor;

                // Adjust position to keep center point
                shot.pos.x = centerX - shot.size.w / 2;
                shot.pos.y = centerY - shot.size.h / 2;
            }
        }
    }

    return newManifest;
}

/**
 * Get available sizes from a project manifest
 */
export function getAvailableSizes(
    projectManifest: Record<string, unknown>
): string[] {
    const sizes = projectManifest.sizes as Array<{
        width: number;
        height: number;
    }> | undefined;

    if (!sizes) {
        // Check settings for single size
        const settings = projectManifest.settings as { width?: number; height?: number } | undefined;
        if (settings?.width && settings?.height) {
            return [`${settings.width}x${settings.height}`];
        }
        return [];
    }

    return sizes.map((s) => `${s.width}x${s.height}`);
}
