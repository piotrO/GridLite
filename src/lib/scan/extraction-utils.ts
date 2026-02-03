import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Shared utilities for scan extraction modules
 */

/**
 * Find the project root by looking for package.json
 * Cached at module level to avoid repeated filesystem lookups
 */
let cachedProjectRoot: string | null = null;

export function findProjectRoot(startDir: string): string {
  if (cachedProjectRoot) return cachedProjectRoot;

  let current = startDir;
  while (current !== path.parse(current).root) {
    if (fs.existsSync(path.join(current, "package.json"))) {
      cachedProjectRoot = current;
      return current;
    }
    current = path.dirname(current);
  }

  cachedProjectRoot = process.cwd();
  return cachedProjectRoot;
}

/**
 * Get __dirname equivalent in ES modules
 */
export function getDirname(importMetaUrl: string): string {
  const __filename = fileURLToPath(importMetaUrl);
  return path.dirname(__filename);
}

/**
 * Check if debug mode is enabled via environment variable
 */
export function isDebugMode(
  module: "color" | "logo" | "font" | "all",
): boolean {
  if (process.env.DEBUG_SCAN === "true") return true;
  if (module === "all") return false;

  const envVar = `DEBUG_${module.toUpperCase()}_EXTRACTION`;
  return process.env[envVar] === "true";
}

/**
 * Sanitize value for logging (truncate if too long)
 */
export function sanitizeForLogging(
  value: any,
  maxLength: number = 100,
): string {
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Retry failed");
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
