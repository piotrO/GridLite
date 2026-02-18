import { Grid8Brand, BrandKit } from "@/contexts/BrandContext";
import { BrandPalette, Typography } from "@/lib/shared/types";

// Brand profile data stored in Grid8
export interface BrandProfile {
  url?: string;
  logo?: string;
  businessName?: string;
  shortName?: string;
  industry?: string;
  tagline?: string;
  font?: string;
  typography?: Typography | null;
  tone?: string;
  palette?: BrandPalette;
  personality?: string[];
  brandSummary?: string;
  targetAudiences?: { name: string; description: string }[];
  voiceLabel?: string;
  voiceInstructions?: string;
  dos?: string[];
  donts?: string[];
  archetype?: any;
  linguistic_mechanics?: any;
  personality_dimensions?: any;
  analyzedAt?: string;
}

const DEFAULT_BRAND_KIT_VALUES = {
  url: "",
  industry: "Technology",
  tagline: "Your brand tagline",
  logo: "🏢",
  palette: {
    primary: "#4F46E5",
    secondary: "#10B981",
    accent: "#F97316",
    extraColors: ["#EF4444"],
  },
  font: "Inter",
  tone: "Professional",
  personality: ["Innovative", "Trustworthy"],
  audiences: [{ name: "General", description: "General audience" }],
};

/**
 * Get the brand logo URL from Grid8 CDN
 * The logos are stored publicly on DigitalOcean Spaces
 */
export function getBrandLogoUrl(grid8Id: string): string {
  return `https://grid8.fra1.cdn.digitaloceanspaces.com/${grid8Id}.png`;
}

/**
 * Convert Grid8Brand to BrandKit with defaults for missing fields
 * Reads data from notes.book (JSON) if available, otherwise falls back to legacy fields
 * @param grid8Brand - The Grid8 brand to convert
 * @param avatarUrl - Optional avatar URL that was fetched from Grid8
 */
export function convertGrid8BrandToBrandKit(
  grid8Brand: Grid8Brand,
  avatarUrl?: string | null,
): BrandKit {
  // Try to parse brandProfile from notes.book (stored as JSON string)
  let profile: BrandProfile | undefined;
  try {
    if (grid8Brand.notes?.book) {
      profile = JSON.parse(grid8Brand.notes.book);
    }
  } catch {
    // notes.book is not valid JSON, ignore
  }

  // Also check for direct brandProfile field (fallback)
  if (!profile && grid8Brand.brandProfile) {
    profile = grid8Brand.brandProfile as BrandProfile;
  }

  return {
    id: `grid8-${grid8Brand._id}`,
    grid8Id: grid8Brand._id,
    name: profile?.businessName || grid8Brand.name,
    shortName: profile?.shortName,
    url: profile?.url || grid8Brand.url || DEFAULT_BRAND_KIT_VALUES.url,
    industry:
      profile?.industry ||
      grid8Brand.industry ||
      DEFAULT_BRAND_KIT_VALUES.industry,
    tagline:
      profile?.tagline ||
      grid8Brand.tagline ||
      DEFAULT_BRAND_KIT_VALUES.tagline,
    logo:
      profile?.logo ||
      avatarUrl ||
      grid8Brand.logo ||
      DEFAULT_BRAND_KIT_VALUES.logo,
    palette:
      profile?.palette ||
      grid8Brand.palette ||
      DEFAULT_BRAND_KIT_VALUES.palette,
    font: profile?.font || grid8Brand.font || DEFAULT_BRAND_KIT_VALUES.font,
    typography: profile?.typography || null,
    tone: profile?.tone || grid8Brand.tone || DEFAULT_BRAND_KIT_VALUES.tone,
    personality: profile?.personality?.length
      ? profile.personality
      : grid8Brand.personality?.length
        ? grid8Brand.personality
        : DEFAULT_BRAND_KIT_VALUES.personality,
    brandSummary: profile?.brandSummary || grid8Brand.brandSummary,
    audiences: profile?.targetAudiences?.length
      ? profile.targetAudiences
      : grid8Brand.audiences?.length
        ? grid8Brand.audiences
        : DEFAULT_BRAND_KIT_VALUES.audiences,
    voiceLabel:
      profile?.voiceLabel || grid8Brand.voiceLabel || "Modern Professional",
    voiceInstructions:
      profile?.voiceInstructions || grid8Brand.voiceInstructions || "",
    dos: profile?.dos || grid8Brand.dos || [],
    donts: profile?.donts || grid8Brand.donts || [],
    archetype: profile?.archetype || grid8Brand.archetype,
    linguisticMechanics:
      profile?.linguistic_mechanics || grid8Brand.linguistic_mechanics,
    personalityDimensions:
      profile?.personality_dimensions || grid8Brand.personality_dimensions,
    createdAt: new Date(grid8Brand.createdAt),
    needsReanalysis: !(profile?.url || grid8Brand.url),
  };
}

/**
 * Create a local-only brand kit (no Grid8 backend)
 */
export function createLocalBrandKit(
  brand: Omit<BrandKit, "id" | "createdAt" | "needsReanalysis" | "grid8Id">,
): BrandKit {
  return {
    ...brand,
    id: `brand-${Date.now()}`,
    createdAt: new Date(),
    needsReanalysis: false,
  };
}

/**
 * Fetch brands from Grid8 API
 */
export async function fetchBrands(token: string): Promise<Grid8Brand[]> {
  const response = await fetch(
    "/api/brands?q=&sortType=desc&sortField=createdAt&page=1&limit=20",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch brands");
  }

  return data.items || [];
}

/**
 * Create a brand on Grid8 API with optional brand profile data
 * Brand profile is stored as JSON in notes.book since Grid8 doesn't support custom fields
 */
export async function createBrandOnGrid8(
  token: string,
  name: string,
  brandData?: Omit<
    BrandKit,
    "id" | "createdAt" | "needsReanalysis" | "grid8Id"
  >,
): Promise<Grid8Brand> {
  // Build brandProfile from brand data if provided
  const brandProfile: BrandProfile | undefined = brandData
    ? {
        url: brandData.url,
        logo: brandData.logo,
        businessName: brandData.name,
        shortName: brandData.shortName || brandData.name,
        industry: brandData.industry,
        tagline: brandData.tagline,
        palette: brandData.palette,
        font: brandData.font,
        typography: brandData.typography,
        tone: brandData.tone,
        personality: brandData.personality,
        brandSummary: brandData.brandSummary,
        targetAudiences: brandData.audiences,
        voiceLabel: brandData.voiceLabel,
        voiceInstructions: brandData.voiceInstructions,
        dos: brandData.dos,
        donts: brandData.donts,
        personality_dimensions: brandData.personalityDimensions,
        linguistic_mechanics: brandData.linguisticMechanics,
        archetype: brandData.archetype,
        analyzedAt: new Date().toISOString(),
      }
    : undefined;

  // Sanitize brandProfile to remove large base64 strings from typography
  const sanitizedProfile = brandProfile
    ? {
        ...brandProfile,
        typography: brandProfile.typography
          ? {
              headerFont: {
                ...brandProfile.typography.headerFont,
                fontFileBase64: null,
              },
              bodyFont: {
                ...brandProfile.typography.bodyFont,
                fontFileBase64: null,
              },
            }
          : null,
      }
    : undefined;

  // Store brandProfile as JSON in notes.book
  const notes = sanitizedProfile
    ? {
        innovation: "",
        book: JSON.stringify(sanitizedProfile),
      }
    : undefined;

  const response = await fetch("/api/brands", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name,
      dcmProfileId: "",
      adAccounts: [],
      ...(notes && { notes }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Grid8 Create Error:", errorText);
    throw new Error(
      `Failed to create brand on Grid8: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Update a brand on Grid8 API
 * Brand profile is stored as JSON in notes.book
 */
export async function updateBrandOnGrid8(
  token: string,
  grid8Id: string,
  updates: { name?: string; notes?: { innovation?: string; book?: string } },
): Promise<void> {
  // If we are updating notes.book, we need to deserialize, strip base64, and reserialize
  // But wait, the caller passes `updates`. We should probably handle it there or here.
  // The caller (BrandContext) calls JSON.stringify.

  // It's better to intercept the call in BrandContext, but fixing it here is more robust if we assume `updates` contains the large string.
  // However, `updates.notes.book` is already a string. Parsing it again is wasteful.
  // Let's modify BrandContext instead for the UPDATE, but for CREATE we modified here.

  // Actually, consistency is better. Let's revert the change to `updateBrandOnGrid8` signature and just handle the POST request here.
  // For UPDATE, I'll modify BrandContext.tsx.

  const response = await fetch(`/api/brands/${grid8Id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Grid8 Update Error:", errorText);
    throw new Error(
      `Failed to update brand on Grid8: ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Delete a brand on Grid8 API
 */
export async function deleteBrandOnGrid8(
  token: string,
  grid8Id: string,
): Promise<void> {
  const response = await fetch(`/api/brands/${grid8Id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete brand on Grid8");
  }
}

/**
 * Upload a brand avatar/logo to Grid8
 * @param token - Auth token
 * @param grid8Id - The Grid8 brand ID
 * @param logoUrl - URL of the logo to upload (will be fetched and re-uploaded)
 */
/**
 * Upload a brand avatar/logo to Grid8
 * @param token - Auth token
 * @param grid8Id - The Grid8 brand ID
 * @param logoUrl - URL of the logo to upload (will be fetched and re-uploaded)
 */
export async function uploadBrandAvatar(
  token: string,
  grid8Id: string,
  logoUrl: string,
): Promise<void> {
  // Skip if it's not a valid URL (e.g., emoji)
  if (!logoUrl.startsWith("http")) {
    console.log("Skipping avatar upload - not a valid URL:", logoUrl);
    return;
  }

  const response = await fetch(`/api/brands/${grid8Id}/avatar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ logoUrl }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    console.error("Failed to upload brand avatar:", error);
    // Don't throw - avatar upload is optional, brand was already created
  }
}

/**
 * Upload a generic asset (like a font) to Grid8 for a brand
 * @param token - Auth token
 * @param brandId - The Grid8 brand ID
 * @param file - The file to upload
 * @param assetType - The type of asset (e.g., "font") - mostly for logging/metadata if needed
 */
export async function uploadBrandAsset(
  token: string,
  brandId: string,
  file: File | Blob,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("brandId", brandId); // Required by /api/asset/upload

  console.log("[brand-service] Uploading asset...", {
    brandId,
    fileSize: file.size,
  });
  try {
    const response = await fetch(`/api/asset/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    console.log("[brand-service] Fetch response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[brand-service] Fetch failed text:", errorText);
      throw new Error(
        `Failed to upload asset: ${response.status} ${errorText}`,
      );
    }

    const data = await response.json();
    console.log(
      "[brand-service] Upload success data (FULL):",
      JSON.stringify(data, null, 2),
    );

    // Grid8 asset upload response is an array of asset objects
    const item = Array.isArray(data) ? data[0] : data;

    // Construct URL from the versions array if available, otherwise fallback to url property
    let url = item?.url;

    if (!url && item?.versions?.[0]?.name) {
      // CDN URL pattern: https://grid8.fra1.cdn.digitaloceanspaces.com/{filename}
      url = `https://grid8.fra1.cdn.digitaloceanspaces.com/${item.versions[0].name}`;
    }

    console.log("[brand-service] Extracted/Constructed URL:", url);

    return url || "";
  } catch (e) {
    console.error("[brand-service] Fetch error:", e);
    throw e;
  }
}

/**
 * Fetch a CSS file from URL and parse out base64 font data
 * This allows "hydrating" a brand kit with the heavy base64 data only when needed
 */
export async function fetchAndParseFontCss(
  cssUrl: string,
): Promise<Record<string, string>> {
  try {
    // Use local proxy to avoid CORS issues with CDN
    const proxyUrl = `/api/proxy-asset?url=${encodeURIComponent(cssUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) return {};
    const cssContent = await response.text();

    const fontData: Record<string, string> = {};

    // Regex to match @font-face blocks and extract font-family + src data uri
    // Simple regex for standard generated CSS structure
    // Matches: font-family: 'Name'; ... src: url('data:font/woff2;base64,DATA')
    const fontFaceRegex =
      /@font-face\s*{[^}]*?font-family:\s*['"]([^'"]+)['"][^}]*?src:\s*url\(['"]data:[^;]+;base64,([^'"]+)['"]\)/g;

    let match;
    while ((match = fontFaceRegex.exec(cssContent)) !== null) {
      const fontFamily = match[1];
      const base64Data = match[2];
      if (fontFamily && base64Data) {
        fontData[fontFamily] = base64Data;
      }
    }

    return fontData;
  } catch (error) {
    console.error("Failed to fetch/parse font CSS:", error);
    return {};
  }
}

/**
 * Helper to convert Base64 string to Blob
 */
export function base64ToBlob(base64: string, contentType: string = ""): Blob {
  const byteCharacters = atob(base64.split(",")[1] || base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}
