"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  Product,
  ShopifyConnection,
  CatalogStats,
  ProductFilters,
  SyncStatus,
  ProductSortOptions,
} from "@/types/shopify";

// ============================================================
// Context Type Definition
// ============================================================

interface ProductContextType {
  // Connection state
  shopifyConnection: ShopifyConnection | null;
  isConnected: boolean;

  // Product data
  products: Product[];
  catalogStats: CatalogStats | null;

  // Loading/Status states
  isConnecting: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  error: string | null;

  // Actions
  initiateConnection: (shopDomain: string) => Promise<void>;
  handleOAuthCallback: (code: string, state: string) => Promise<void>;
  setConnection: (connection: ShopifyConnection) => void;
  syncProducts: () => Promise<void>;
  disconnectStore: () => Promise<void>;
  clearError: () => void;

  // Product utilities
  filterProducts: (filters: ProductFilters) => Product[];
  sortProducts: (products: Product[], sort: ProductSortOptions) => Product[];
  getProductById: (id: string) => Product | undefined;
  getProductsByIds: (ids: string[]) => Product[];
  searchProducts: (query: string) => Product[];
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

// ============================================================
// Initial States
// ============================================================

const initialSyncStatus: SyncStatus = {
  status: "idle",
  progress: 0,
  totalProducts: 0,
  syncedProducts: 0,
  startedAt: null,
  completedAt: null,
  error: null,
};

// ============================================================
// Storage Keys (for persistence)
// ============================================================

const STORAGE_KEYS = {
  CONNECTION: "gridlite_shopify_connection",
  PRODUCTS: "gridlite_shopify_products",
  STATS: "gridlite_catalog_stats",
} as const;

// ============================================================
// Provider Component
// ============================================================

interface ProductProviderProps {
  children: ReactNode;
}

export function ProductProvider({ children }: ProductProviderProps) {
  // Connection state
  const [shopifyConnection, setShopifyConnection] =
    useState<ShopifyConnection | null>(() => {
      if (typeof window === "undefined") return null;
      const stored = localStorage.getItem(STORAGE_KEYS.CONNECTION);
      return stored ? JSON.parse(stored) : null;
    });

  // Product data
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return stored ? JSON.parse(stored) : [];
  });

  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(STORAGE_KEYS.STATS);
    return stored ? JSON.parse(stored) : null;
  });

  // Status states
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(initialSyncStatus);
  const [error, setError] = useState<string | null>(null);

  // Computed
  const isConnected = useMemo(
    () => shopifyConnection?.status === "active",
    [shopifyConnection],
  );

  // ============================================================
  // Connection Actions
  // ============================================================

  const initiateConnection = useCallback(async (shopDomain: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      // Clean up the shop domain
      const cleanDomain = shopDomain
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "");

      const response = await fetch(
        `/api/shopify/auth?shop=${encodeURIComponent(cleanDomain)}`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to initiate Shopify connection");
      }

      const { authUrl } = await response.json();

      // Open OAuth popup or redirect
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setIsConnecting(false);
    }
  }, []);

  const handleOAuthCallback = useCallback(
    async (code: string, state: string) => {
      setIsConnecting(true);
      setError(null);

      try {
        const response = await fetch("/api/shopify/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "OAuth callback failed");
        }

        const { connection } = await response.json();

        // Store connection
        setShopifyConnection(connection);
        localStorage.setItem(
          STORAGE_KEYS.CONNECTION,
          JSON.stringify(connection),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "OAuth failed");
      } finally {
        setIsConnecting(false);
      }
    },
    [],
  );

  const disconnectStore = useCallback(async () => {
    try {
      // Clear local state
      setShopifyConnection(null);
      setProducts([]);
      setCatalogStats(null);
      setSyncStatus(initialSyncStatus);

      // Clear storage
      localStorage.removeItem(STORAGE_KEYS.CONNECTION);
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.STATS);

      // TODO: Call API to revoke token if needed
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    }
  }, []);

  // Set connection directly (used by OAuth callback)
  const setConnection = useCallback((connection: ShopifyConnection) => {
    setShopifyConnection(connection);
    localStorage.setItem(STORAGE_KEYS.CONNECTION, JSON.stringify(connection));
  }, []);

  // ============================================================
  // Sync Actions
  // ============================================================

  const syncProducts = useCallback(async () => {
    if (!shopifyConnection) {
      setError("No Shopify connection found");
      return;
    }

    setIsSyncing(true);
    setSyncStatus({
      ...initialSyncStatus,
      status: "syncing",
      startedAt: new Date(),
    });
    setError(null);

    try {
      console.log(
        "[ProductContext] Syncing products for:",
        shopifyConnection.shopDomain,
      );

      const response = await fetch("/api/shopify/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: shopifyConnection.accessToken,
          shopDomain: shopifyConnection.shopDomain,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Sync failed");
      }

      const { products: syncedProducts, stats } = await response.json();

      // Update state
      setProducts(syncedProducts);
      setCatalogStats(stats);

      // Persist to storage
      localStorage.setItem(
        STORAGE_KEYS.PRODUCTS,
        JSON.stringify(syncedProducts),
      );
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));

      // Update connection last sync
      const updatedConnection = {
        ...shopifyConnection,
        lastSyncAt: new Date(),
      };
      setShopifyConnection(updatedConnection);
      localStorage.setItem(
        STORAGE_KEYS.CONNECTION,
        JSON.stringify(updatedConnection),
      );

      setSyncStatus({
        status: "completed",
        progress: 100,
        totalProducts: syncedProducts.length,
        syncedProducts: syncedProducts.length,
        startedAt: syncStatus.startedAt,
        completedAt: new Date(),
        error: null,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Sync failed";
      setError(errorMsg);
      setSyncStatus((prev) => ({
        ...prev,
        status: "error",
        error: errorMsg,
      }));
    } finally {
      setIsSyncing(false);
    }
  }, [shopifyConnection, syncStatus.startedAt]);

  // ============================================================
  // Product Utilities
  // ============================================================

  const filterProducts = useCallback(
    (filters: ProductFilters): Product[] => {
      return products.filter((product) => {
        // Category filter
        if (filters.category && product.category !== filters.category) {
          return false;
        }

        // Price range filter
        if (filters.priceRange) {
          const [min, max] = filters.priceRange;
          if (product.price < min || product.price > max) {
            return false;
          }
        }

        // Vendor filter
        if (filters.vendor && product.vendor !== filters.vendor) {
          return false;
        }

        // Tags filter
        if (filters.tags?.length) {
          const hasTag = filters.tags.some((tag) => product.tags.includes(tag));
          if (!hasTag) return false;
        }

        // Search filter
        if (filters.search) {
          const query = filters.search.toLowerCase();
          const matchesSearch =
            product.title.toLowerCase().includes(query) ||
            product.description?.toLowerCase().includes(query) ||
            product.vendor?.toLowerCase().includes(query);
          if (!matchesSearch) return false;
        }

        // Status filter
        if (filters.status && product.status !== filters.status) {
          return false;
        }

        // Has images filter
        if (filters.hasImages && product.images.length === 0) {
          return false;
        }

        // In stock filter
        if (filters.inStock) {
          const hasStock = product.variants.some(
            (v) => v.inventoryQuantity > 0,
          );
          if (!hasStock) return false;
        }

        return true;
      });
    },
    [products],
  );

  const sortProducts = useCallback(
    (productList: Product[], sort: ProductSortOptions): Product[] => {
      const sorted = [...productList];
      sorted.sort((a, b) => {
        let comparison = 0;

        switch (sort.field) {
          case "title":
            comparison = a.title.localeCompare(b.title);
            break;
          case "price":
            comparison = a.price - b.price;
            break;
          case "createdAt":
            comparison =
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case "updatedAt":
            comparison =
              new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            break;
        }

        return sort.direction === "desc" ? -comparison : comparison;
      });

      return sorted;
    },
    [],
  );

  const getProductById = useCallback(
    (id: string): Product | undefined => {
      return products.find((p) => p.id === id || p.shopifyId === id);
    },
    [products],
  );

  const getProductsByIds = useCallback(
    (ids: string[]): Product[] => {
      return products.filter(
        (p) => ids.includes(p.id) || ids.includes(p.shopifyId),
      );
    },
    [products],
  );

  const searchProducts = useCallback(
    (query: string): Product[] => {
      if (!query.trim()) return products;

      const lowerQuery = query.toLowerCase();
      return products.filter(
        (p) =>
          p.title.toLowerCase().includes(lowerQuery) ||
          p.description?.toLowerCase().includes(lowerQuery) ||
          p.vendor?.toLowerCase().includes(lowerQuery) ||
          p.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
      );
    },
    [products],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================
  // Context Value
  // ============================================================

  const value: ProductContextType = useMemo(
    () => ({
      // Connection
      shopifyConnection,
      isConnected,

      // Products
      products,
      catalogStats,

      // Status
      isConnecting,
      isSyncing,
      syncStatus,
      error,

      initiateConnection,
      handleOAuthCallback,
      setConnection,
      syncProducts,
      disconnectStore,
      clearError,

      // Utilities
      filterProducts,
      sortProducts,
      getProductById,
      getProductsByIds,
      searchProducts,
    }),
    [
      shopifyConnection,
      isConnected,
      products,
      catalogStats,
      isConnecting,
      isSyncing,
      syncStatus,
      error,
      initiateConnection,
      handleOAuthCallback,
      setConnection,
      syncProducts,
      disconnectStore,
      clearError,
      filterProducts,
      sortProducts,
      getProductById,
      getProductsByIds,
      searchProducts,
    ],
  );

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useProducts(): ProductContextType {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}
