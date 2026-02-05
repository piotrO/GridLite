/**
 * Shopify OAuth State Store
 *
 * Temporary storage for OAuth state tokens.
 * In production, use Redis or a database.
 */

interface StateEntry {
  shop: string;
  createdAt: number;
}

// In-memory state storage (works for single-instance deployments)
// For production with multiple instances, use Redis or similar
const stateStore = new Map<string, StateEntry>();

// State expiration time (10 minutes)
const STATE_EXPIRATION_MS = 10 * 60 * 1000;

/**
 * Store a new state token
 */
export function storeState(state: string, shop: string): void {
  cleanExpiredStates();
  stateStore.set(state, { shop, createdAt: Date.now() });
}

/**
 * Retrieve and validate a state token
 * Returns the shop domain if valid, null otherwise
 */
export function retrieveState(state: string): string | null {
  const entry = stateStore.get(state);

  if (!entry) {
    return null;
  }

  // Check if expired
  if (Date.now() - entry.createdAt > STATE_EXPIRATION_MS) {
    stateStore.delete(state);
    return null;
  }

  return entry.shop;
}

/**
 * Delete a state token after use
 */
export function deleteState(state: string): void {
  stateStore.delete(state);
}

/**
 * Clean expired states from storage
 */
function cleanExpiredStates(): void {
  const now = Date.now();

  for (const [key, value] of stateStore.entries()) {
    if (now - value.createdAt > STATE_EXPIRATION_MS) {
      stateStore.delete(key);
    }
  }
}
