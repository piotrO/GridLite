import { Grid8Brand, BrandKit } from "@/contexts/BrandContext";

// Brand profile data stored in Grid8
export interface BrandProfile {
  url?: string;
  logo?: string;
  businessName?: string;
  shortName?: string;
  industry?: string;
  tagline?: string;
  font?: string;
  tone?: string;
  palette?: {
    primary: string;
    secondary: string;
    accent: string;
    extraColors?: string[];
  };
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
      console.log(profile);
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
        tone: brandData.tone,
        personality: brandData.personality,
        brandSummary: brandData.brandSummary,
        targetAudiences: brandData.audiences,
        analyzedAt: new Date().toISOString(),
      }
    : undefined;

  // Store brandProfile as JSON in notes.book
  const notes = brandProfile
    ? {
        innovation: "",
        book: JSON.stringify(brandProfile),
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
    throw new Error("Failed to create brand on Grid8");
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
  const response = await fetch(`/api/brands/${grid8Id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error("Failed to update brand on Grid8");
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
