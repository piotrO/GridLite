/**
 * Validates and normalizes a URL string.
 * Adds https:// if no protocol is present.
 * Returns the normalized URL or null if invalid.
 */
export function parseUrl(url: unknown): string | null {
    if (!url || typeof url !== "string") {
        return null;
    }

    const normalized = url.startsWith("http") ? url : `https://${url}`;

    try {
        new URL(normalized);
        return normalized;
    } catch {
        return null;
    }
}
