import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { mastra } from "@/mastra";

/**
 * Shopify product schema (simplified for workflow)
 */
const ProductSchema = z.object({
  id: z.string(),
  shopifyId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  vendor: z.string().nullable(),
  productType: z.string().nullable(),
  category: z.string().nullable(),
  price: z.number(),
  compareAtPrice: z.number().nullable(),
  currency: z.string(),
  images: z.array(
    z.object({
      id: z.string(),
      src: z.string(),
      altText: z.string().nullable(),
      width: z.number(),
      height: z.number(),
      position: z.number(),
    }),
  ),
  variants: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      price: z.number(),
      inventoryQuantity: z.number(),
    }),
  ),
  tags: z.array(z.string()),
  status: z.enum(["active", "draft", "archived"]),
  handle: z.string(),
  url: z.string(),
});

const CatalogStatsSchema = z.object({
  totalProducts: z.number(),
  activeProducts: z.number(),
  categories: z.array(
    z.object({
      name: z.string(),
      count: z.number(),
      percentage: z.number(),
    }),
  ),
  vendors: z.array(
    z.object({
      name: z.string(),
      count: z.number(),
      percentage: z.number(),
    }),
  ),
  priceRange: z.object({
    min: z.number(),
    max: z.number(),
    average: z.number(),
    currency: z.string(),
  }),
});

/**
 * Input schema for DPA strategy workflow
 */
const DpaStrategyInputSchema = z.object({
  brandProfile: z.object({
    name: z.string(),
    shortName: z.string().optional(),
    url: z.string(),
    industry: z.string().optional(),
    tagline: z.string().optional(),
    brandSummary: z.string().optional(),
    tone: z.string().optional(),
  }),
  products: z.array(ProductSchema),
  catalogStats: CatalogStatsSchema.optional(),
});

/**
 * Product segment schema
 */
const ProductSegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  productIds: z.array(z.string()),
  productCount: z.number(),
  strategy: z.enum(["conversion", "awareness", "retargeting"]),
  suggestedHeadline: z.string().optional(),
  suggestedCta: z.string().optional(),
});

/**
 * DPA strategy schema
 */
const DpaStrategySchema = z.object({
  segments: z.array(ProductSegmentSchema),
  selectedProductIds: z.array(z.string()),
  productGroupStrategy: z.enum(["hero", "carousel", "grid"]),
  priceDisplayStyle: z.enum(["prominent", "subtle"]),
});

/**
 * Strategy document schema
 */
const StrategyDocumentSchema = z.object({
  recommendation: z.enum(["AWARENESS", "CONVERSION"]),
  campaignAngle: z.string(),
  headline: z.string(),
  subheadline: z.string(),
  rationale: z.string(),
  callToAction: z.string(),
  adFormats: z.array(z.string()),
  targetingTips: z.array(z.string()),
});

/**
 * Final output schema
 */
const DpaStrategyOutputSchema = z.object({
  greeting: z.string(),
  strategy: StrategyDocumentSchema,
  dpaStrategy: DpaStrategySchema,
});

/**
 * Step 1: Analyze catalog and prepare summary for AI
 */
const analyzeCatalogStep = createStep({
  id: "analyze-catalog",
  inputSchema: DpaStrategyInputSchema,
  outputSchema: z.object({
    brandProfile: DpaStrategyInputSchema.shape.brandProfile,
    products: z.array(ProductSchema),
    catalogSummary: z.string(),
    productSummaries: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        price: z.number(),
        currency: z.string(),
        hasImages: z.boolean(),
        imageCount: z.number(),
        inStock: z.boolean(),
        category: z.string().nullable(),
        isOnSale: z.boolean(),
        discountPercent: z.number().nullable(),
        tags: z.array(z.string()),
      }),
    ),
    success: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const { brandProfile, products, catalogStats } = inputData;

    // Build product summaries for AI consumption
    const productSummaries = products.map((p) => {
      const totalInventory = p.variants.reduce(
        (sum, v) => sum + (v.inventoryQuantity || 0),
        0,
      );
      const isOnSale = p.compareAtPrice !== null && p.compareAtPrice > p.price;
      const discountPercent =
        isOnSale && p.compareAtPrice
          ? Math.round((1 - p.price / p.compareAtPrice) * 100)
          : null;

      return {
        id: p.id,
        title: p.title,
        price: p.price,
        currency: p.currency,
        hasImages: p.images.length > 0,
        imageCount: p.images.length,
        inStock: totalInventory > 0,
        category: p.category || p.productType,
        isOnSale,
        discountPercent,
        tags: p.tags,
      };
    });

    // Build text summary for AI
    const categories = catalogStats?.categories || [];
    const priceRange = catalogStats?.priceRange || {
      min: Math.min(...products.map((p) => p.price)),
      max: Math.max(...products.map((p) => p.price)),
      average:
        products.reduce((sum, p) => sum + p.price, 0) / products.length || 0,
      currency: products[0]?.currency || "USD",
    };

    const saleProducts = productSummaries.filter((p) => p.isOnSale);
    const inStockProducts = productSummaries.filter((p) => p.inStock);
    const withImages = productSummaries.filter((p) => p.hasImages);

    const catalogSummary = `
CATALOG OVERVIEW:
- Total products: ${products.length}
- In stock: ${inStockProducts.length}
- With images: ${withImages.length}
- On sale: ${saleProducts.length}

PRICE RANGE:
- Min: ${priceRange.currency} ${priceRange.min.toFixed(2)}
- Max: ${priceRange.currency} ${priceRange.max.toFixed(2)}
- Average: ${priceRange.currency} ${priceRange.average.toFixed(2)}

CATEGORIES:
${categories.map((c) => `- ${c.name}: ${c.count} products (${c.percentage}%)`).join("\n") || "Not categorized"}

TOP PRODUCTS BY IMAGE QUALITY:
${withImages
  .sort((a, b) => b.imageCount - a.imageCount)
  .slice(0, 5)
  .map((p) => `- ${p.title} (${p.imageCount} images, ${p.currency} ${p.price})`)
  .join("\n")}

SALE ITEMS:
${
  saleProducts.length > 0
    ? saleProducts
        .slice(0, 5)
        .map((p) => `- ${p.title}: ${p.discountPercent}% off`)
        .join("\n")
    : "No sale items currently"
}
`.trim();

    return {
      brandProfile,
      products,
      catalogSummary,
      productSummaries,
      success: true,
    };
  },
});

/**
 * Step 2: Generate DPA strategy with product selection
 */
const generateDpaStrategyStep = createStep({
  id: "generate-dpa-strategy",
  inputSchema: z.object({
    brandProfile: DpaStrategyInputSchema.shape.brandProfile,
    products: z.array(ProductSchema),
    catalogSummary: z.string(),
    productSummaries: z.array(z.any()),
    success: z.boolean(),
  }),
  outputSchema: DpaStrategyOutputSchema,
  execute: async ({ inputData }) => {
    const { brandProfile, products, catalogSummary, productSummaries } =
      inputData;

    try {
      const agent = mastra.getAgent("strategistDpa");

      // Build product list for AI (compact format)
      const productList = productSummaries
        .slice(0, 30) // Limit to 30 for context window
        .map(
          (p: {
            id: string;
            title: string;
            price: number;
            currency: string;
            hasImages: boolean;
            inStock: boolean;
            isOnSale: boolean;
            discountPercent: number | null;
            category: string | null;
          }) =>
            `ID: ${p.id} | ${p.title} | ${p.currency} ${p.price}${p.isOnSale ? ` (-${p.discountPercent}%)` : ""} | ${p.hasImages ? "✓ images" : "✗ no images"} | ${p.inStock ? "in stock" : "out of stock"} | ${p.category || "uncategorized"}`,
        )
        .join("\n");

      const contextPrompt = `
BRAND PROFILE:
Name: ${brandProfile.name}
Industry: ${brandProfile.industry || "E-commerce"}
Summary: ${brandProfile.brandSummary || "N/A"}
Tagline: ${brandProfile.tagline || "N/A"}

${catalogSummary}

PRODUCT CATALOG:
${productList}

Based on this catalog, create a DPA campaign strategy. Select the best products to feature and group them into segments. Return your response as JSON.
`;

      const result = await agent.generate([
        { role: "user", content: contextPrompt },
      ]);

      let parsed;
      try {
        const jsonMatch = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonString = jsonMatch ? jsonMatch[1].trim() : result.text.trim();
        parsed = JSON.parse(jsonString);
      } catch {
        throw new Error("Failed to parse agent response as JSON");
      }

      // Validate selected product IDs exist
      const validProductIds = new Set(products.map((p) => p.id));
      const selectedIds = (parsed.dpaStrategy?.selectedProductIds || [])
        .filter((id: string) => validProductIds.has(id))
        .slice(0, 6);

      // Ensure we have at least some products selected
      if (selectedIds.length === 0) {
        // Auto-select top products with images
        const autoSelected = productSummaries
          .filter(
            (p: { hasImages: boolean; inStock: boolean }) =>
              p.hasImages && p.inStock,
          )
          .slice(0, 6)
          .map((p: { id: string }) => p.id);
        selectedIds.push(...autoSelected);
      }

      return {
        greeting:
          parsed.greeting ||
          `Hey! I've analyzed your catalog of ${products.length} products and have some great recommendations! 🛍️`,
        strategy: {
          recommendation: parsed.strategy?.recommendation || "CONVERSION",
          campaignAngle: parsed.strategy?.campaignAngle || "Shop & Save",
          headline: parsed.strategy?.headline || "Discover More",
          subheadline: parsed.strategy?.subheadline || "Shop our best sellers",
          rationale:
            parsed.strategy?.rationale ||
            "A conversion-focused DPA campaign drives direct sales.",
          callToAction: parsed.strategy?.callToAction || "Shop Now",
          adFormats: parsed.strategy?.adFormats || [
            "300x250",
            "728x90",
            "160x600",
          ],
          targetingTips: parsed.strategy?.targetingTips || [
            "Retarget website visitors",
            "Lookalike audiences from purchasers",
          ],
        },
        dpaStrategy: {
          segments: parsed.dpaStrategy?.segments || [
            {
              id: "featured",
              name: "Featured Products",
              description: "Top products selected for this campaign",
              productIds: selectedIds,
              productCount: selectedIds.length,
              strategy: "conversion" as const,
              suggestedHeadline: "Shop Now",
              suggestedCta: "Buy Now",
            },
          ],
          selectedProductIds: selectedIds,
          productGroupStrategy:
            parsed.dpaStrategy?.productGroupStrategy || "hero",
          priceDisplayStyle:
            parsed.dpaStrategy?.priceDisplayStyle || "prominent",
        },
      };
    } catch (error) {
      console.error("DPA Strategy Generation Failed:", error);
      // Return fallback strategy with auto-selected products
      const autoSelected = productSummaries
        .filter(
          (p: { hasImages: boolean; inStock: boolean }) =>
            p.hasImages && p.inStock,
        )
        .slice(0, 6)
        .map((p: { id: string }) => p.id);

      return {
        greeting: `Hey! I've analyzed your catalog of ${products.length} products. Here's my recommendation for your DPA campaign! 🛍️`,
        strategy: {
          recommendation: "CONVERSION" as const,
          campaignAngle: "Shop & Save",
          headline: "Discover More",
          subheadline: "Shop our best sellers",
          rationale:
            "A conversion-focused DPA campaign drives direct sales from your product catalog.",
          callToAction: "Shop Now",
          adFormats: ["300x250", "728x90", "160x600"],
          targetingTips: [
            "Retarget website visitors",
            "Lookalike audiences from purchasers",
          ],
        },
        dpaStrategy: {
          segments: [
            {
              id: "featured",
              name: "Featured Products",
              description: "Top products with great images and stock",
              productIds: autoSelected,
              productCount: autoSelected.length,
              strategy: "conversion" as const,
              suggestedHeadline: "Shop Now",
              suggestedCta: "Buy Now",
            },
          ],
          selectedProductIds: autoSelected,
          productGroupStrategy: "hero" as const,
          priceDisplayStyle: "prominent" as const,
        },
      };
    }
  },
});

/**
 * DPA Strategy Workflow
 *
 * Generates a product-focused DPA campaign strategy:
 * 1. Analyze product catalog
 * 2. Generate strategy with product selection
 */
export const strategyDpaWorkflow = createWorkflow({
  id: "strategy-dpa",
  inputSchema: DpaStrategyInputSchema,
  outputSchema: DpaStrategyOutputSchema,
})
  .then(analyzeCatalogStep)
  .then(generateDpaStrategyStep)
  .commit();
