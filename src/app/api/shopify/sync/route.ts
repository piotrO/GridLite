import { NextRequest, NextResponse } from "next/server";
import {
  Product,
  ProductImage,
  ProductVariant,
  CatalogStats,
  ShopifyGraphQLProduct,
} from "@/types/shopify";

/**
 * Shopify Product Sync Route
 *
 * POST /api/shopify/sync
 * Body: { connectionId: string, accessToken: string, shopDomain: string }
 *
 * Fetches all products from Shopify using GraphQL API.
 */

const PRODUCTS_QUERY = `
  query getProducts($cursor: String) {
    products(first: 50, after: $cursor) {
      edges {
        node {
          id
          title
          description
          descriptionHtml
          vendor
          productType
          handle
          status
          tags
          createdAt
          updatedAt
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                id
                src: url
                altText
                width
                height
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                sku
                price
                compareAtPrice
                inventoryQuantity
                selectedOptions {
                  name
                  value
                }
                image {
                  id
                  src: url
                  altText
                  width
                  height
                }
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function transformProduct(
  graphqlProduct: ShopifyGraphQLProduct,
  shopDomain: string,
): Product {
  const images: ProductImage[] =
    graphqlProduct.images?.edges?.map((edge, index) => ({
      id: edge.node.id,
      src: edge.node.src,
      altText: edge.node.altText,
      width: edge.node.width || 0,
      height: edge.node.height || 0,
      position: index,
    })) || [];

  const variants: ProductVariant[] =
    graphqlProduct.variants?.edges?.map((edge) => ({
      id: edge.node.id,
      title: edge.node.title,
      sku: edge.node.sku,
      price: parseFloat(edge.node.price) || 0,
      compareAtPrice: edge.node.compareAtPrice
        ? parseFloat(edge.node.compareAtPrice)
        : null,
      inventoryQuantity: edge.node.inventoryQuantity || 0,
      options: edge.node.selectedOptions || [],
      image: edge.node.image
        ? {
            id: edge.node.image.id,
            src: edge.node.image.src,
            altText: edge.node.image.altText,
            width: edge.node.image.width || 0,
            height: edge.node.image.height || 0,
            position: 0,
          }
        : null,
    })) || [];

  const price = parseFloat(
    graphqlProduct.priceRange?.minVariantPrice?.amount || "0",
  );
  const currency =
    graphqlProduct.priceRange?.minVariantPrice?.currencyCode || "USD";

  // Determine compare at price from variants
  const compareAtPrice = variants.reduce((max, v) => {
    if (v.compareAtPrice && v.compareAtPrice > max) {
      return v.compareAtPrice;
    }
    return max;
  }, 0);

  return {
    id: graphqlProduct.id.replace("gid://shopify/Product/", ""),
    shopifyId: graphqlProduct.id,
    title: graphqlProduct.title,
    description: graphqlProduct.description,
    vendor: graphqlProduct.vendor,
    productType: graphqlProduct.productType,
    category: graphqlProduct.productType, // Use productType as category
    price,
    compareAtPrice: compareAtPrice > 0 ? compareAtPrice : null,
    currency,
    images,
    variants,
    tags: graphqlProduct.tags || [],
    status:
      (graphqlProduct.status?.toLowerCase() as
        | "active"
        | "draft"
        | "archived") || "active",
    handle: graphqlProduct.handle,
    url: `https://${shopDomain}/products/${graphqlProduct.handle}`,
    createdAt: new Date(graphqlProduct.createdAt),
    updatedAt: new Date(graphqlProduct.updatedAt),
  };
}

function calculateStats(products: Product[]): CatalogStats {
  const activeProducts = products.filter((p) => p.status === "active");

  // Category stats
  const categoryMap = new Map<string, number>();
  products.forEach((p) => {
    const cat = p.category || "Uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });

  const categories = Array.from(categoryMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / products.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Vendor stats
  const vendorMap = new Map<string, number>();
  products.forEach((p) => {
    const vendor = p.vendor || "Unknown";
    vendorMap.set(vendor, (vendorMap.get(vendor) || 0) + 1);
  });

  const vendors = Array.from(vendorMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / products.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Price range
  const prices = products.map((p) => p.price).filter((p) => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice =
    prices.length > 0
      ? prices.reduce((sum, p) => sum + p, 0) / prices.length
      : 0;
  const currency = products[0]?.currency || "USD";

  // Inventory stats
  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;

  products.forEach((p) => {
    const totalInventory = p.variants.reduce(
      (sum, v) => sum + v.inventoryQuantity,
      0,
    );
    if (totalInventory === 0) {
      outOfStock++;
    } else if (totalInventory < 10) {
      lowStock++;
    } else {
      inStock++;
    }
  });

  // Image stats
  const withImages = products.filter((p) => p.images.length > 0).length;
  const totalImages = products.reduce((sum, p) => sum + p.images.length, 0);

  return {
    totalProducts: products.length,
    activeProducts: activeProducts.length,
    categories,
    vendors,
    priceRange: {
      min: minPrice,
      max: maxPrice,
      average: Math.round(avgPrice * 100) / 100,
      currency,
    },
    inventoryStatus: {
      inStock,
      lowStock,
      outOfStock,
    },
    imageStats: {
      withImages,
      withoutImages: products.length - withImages,
      averageImagesPerProduct:
        products.length > 0
          ? Math.round((totalImages / products.length) * 10) / 10
          : 0,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, shopDomain } = body;

    if (!accessToken || !shopDomain) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 },
      );
    }

    const allProducts: Product[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;
    let pageCount = 0;
    const MAX_PAGES = 20; // Safety limit (1000 products)

    console.log(`[Shopify Sync] Starting sync for ${shopDomain}`);

    while (hasNextPage && pageCount < MAX_PAGES) {
      const response = await fetch(
        `https://${shopDomain}/admin/api/2024-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query: PRODUCTS_QUERY,
            variables: { cursor },
          }),
        },
      );

      if (!response.ok) {
        console.error("[Shopify Sync] API error:", await response.text());
        return NextResponse.json(
          { success: false, error: "Failed to fetch products from Shopify" },
          { status: response.status },
        );
      }

      const data = await response.json();

      if (data.errors) {
        console.error("[Shopify Sync] GraphQL errors:", data.errors);
        return NextResponse.json(
          { success: false, error: data.errors[0]?.message || "GraphQL error" },
          { status: 400 },
        );
      }

      const products = data.data?.products;
      if (!products) {
        console.error("[Shopify Sync] No products in response");
        break;
      }

      // Transform and add products
      const transformedProducts = products.edges.map(
        (edge: { node: ShopifyGraphQLProduct }) =>
          transformProduct(edge.node, shopDomain),
      );
      allProducts.push(...transformedProducts);

      // Update pagination
      hasNextPage = products.pageInfo?.hasNextPage || false;
      cursor = products.pageInfo?.endCursor || null;
      pageCount++;

      console.log(
        `[Shopify Sync] Page ${pageCount}: ${transformedProducts.length} products (total: ${allProducts.length})`,
      );
    }

    console.log(`[Shopify Sync] Complete: ${allProducts.length} products`);

    // Calculate stats
    const stats = calculateStats(allProducts);

    return NextResponse.json({
      success: true,
      products: allProducts,
      stats,
      syncStatus: {
        status: "completed",
        progress: 100,
        totalProducts: allProducts.length,
        syncedProducts: allProducts.length,
        startedAt: new Date(),
        completedAt: new Date(),
        error: null,
      },
    });
  } catch (error) {
    console.error("[Shopify Sync] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Product sync failed",
      },
      { status: 500 },
    );
  }
}
