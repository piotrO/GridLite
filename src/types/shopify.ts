/**
 * Shopify Integration Types
 * Data models for Shopify store connection and product catalog
 */

// ============================================================
// Store Connection
// ============================================================

export interface ShopifyConnection {
  id: string;
  shopDomain: string;
  shopName: string;
  accessToken: string; // Encrypted in storage
  scope: string;
  connectedAt: Date;
  lastSyncAt: Date | null;
  status: "active" | "disconnected" | "error";
}

// ============================================================
// Product Data
// ============================================================

export interface Product {
  id: string;
  shopifyId: string;
  title: string;
  description: string | null;
  vendor: string | null;
  productType: string | null;
  category: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  images: ProductImage[];
  variants: ProductVariant[];
  tags: string[];
  status: "active" | "draft" | "archived";
  handle: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  id: string;
  src: string;
  altText: string | null;
  width: number;
  height: number;
  position: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  inventoryQuantity: number;
  options: { name: string; value: string }[];
  image: ProductImage | null;
}

// ============================================================
// Filtering & Search
// ============================================================

export interface ProductFilters {
  category?: string;
  priceRange?: [number, number];
  vendor?: string;
  tags?: string[];
  search?: string;
  status?: "active" | "draft" | "archived";
  hasImages?: boolean;
  inStock?: boolean;
}

export interface ProductSortOptions {
  field: "title" | "price" | "createdAt" | "updatedAt";
  direction: "asc" | "desc";
}

// ============================================================
// Catalog Statistics
// ============================================================

export interface CatalogStats {
  totalProducts: number;
  activeProducts: number;
  categories: CategoryStat[];
  vendors: VendorStat[];
  priceRange: {
    min: number;
    max: number;
    average: number;
    currency: string;
  };
  inventoryStatus: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
  imageStats: {
    withImages: number;
    withoutImages: number;
    averageImagesPerProduct: number;
  };
}

export interface CategoryStat {
  name: string;
  count: number;
  percentage: number;
}

export interface VendorStat {
  name: string;
  count: number;
  percentage: number;
}

// ============================================================
// Sync Status
// ============================================================

export interface SyncStatus {
  status: "idle" | "syncing" | "completed" | "error";
  progress: number; // 0-100
  totalProducts: number;
  syncedProducts: number;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}

// ============================================================
// API Response Types
// ============================================================

export interface ShopifyAuthResponse {
  authUrl: string;
  state: string;
}

export interface ShopifyCallbackResponse {
  success: boolean;
  connection?: ShopifyConnection;
  error?: string;
}

export interface ShopifySyncResponse {
  success: boolean;
  products: Product[];
  stats: CatalogStats;
  syncStatus: SyncStatus;
}

// ============================================================
// GraphQL Response Types (from Shopify API)
// ============================================================

export interface ShopifyGraphQLProduct {
  id: string;
  title: string;
  description: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  handle: string;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: {
    edges: Array<{
      node: {
        id: string;
        src: string;
        altText: string | null;
        width: number;
        height: number;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku: string | null;
        price: string;
        compareAtPrice: string | null;
        inventoryQuantity: number;
        selectedOptions: Array<{
          name: string;
          value: string;
        }>;
        image: {
          id: string;
          src: string;
          altText: string | null;
          width: number;
          height: number;
        } | null;
      };
    }>;
  };
}

export interface ShopifyProductsResponse {
  products: {
    edges: Array<{
      node: ShopifyGraphQLProduct;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

// ============================================================
// Campaign Integration Types
// ============================================================

export interface ProductAdData {
  product: Product;
  primaryImage: ProductImage;
  formattedPrice: string;
  discountPercentage?: number;
  badge?: "new" | "sale" | "bestseller" | "low-stock";
}

export interface ProductSegment {
  id: string;
  name: string;
  description: string;
  productIds: string[];
  productCount: number;
  strategy: "awareness" | "conversion" | "retargeting";
  suggestedHeadline?: string;
  suggestedCta?: string;
}

export interface DPAStrategy {
  segments: ProductSegment[];
  totalProducts: number;
  recommendedBudgetSplit: Record<string, number>;
  targetingRecommendations: string[];
  templateSuggestions: string[];
}
