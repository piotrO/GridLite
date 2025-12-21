import { Grid8Brand, BrandKit } from "@/contexts/BrandContext";

const DEFAULT_BRAND_KIT_VALUES = {
    url: "",
    industry: "Technology",
    tagline: "Your brand tagline",
    logo: "🏢",
    colors: ["#4F46E5", "#10B981", "#F59E0B", "#EF4444"],
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
 * @param grid8Brand - The Grid8 brand to convert
 * @param avatarUrl - Optional avatar URL that was fetched from Grid8
 */
export function convertGrid8BrandToBrandKit(
    grid8Brand: Grid8Brand,
    avatarUrl?: string | null
): BrandKit {
    return {
        id: `grid8-${grid8Brand._id}`,
        grid8Id: grid8Brand._id,
        name: grid8Brand.name,
        url: grid8Brand.url || DEFAULT_BRAND_KIT_VALUES.url,
        industry: grid8Brand.industry || DEFAULT_BRAND_KIT_VALUES.industry,
        tagline: grid8Brand.tagline || DEFAULT_BRAND_KIT_VALUES.tagline,
        logo: avatarUrl || grid8Brand.logo || DEFAULT_BRAND_KIT_VALUES.logo,
        colors: grid8Brand.colors?.length
            ? grid8Brand.colors
            : DEFAULT_BRAND_KIT_VALUES.colors,
        font: grid8Brand.font || DEFAULT_BRAND_KIT_VALUES.font,
        tone: grid8Brand.tone || DEFAULT_BRAND_KIT_VALUES.tone,
        personality: grid8Brand.personality?.length
            ? grid8Brand.personality
            : DEFAULT_BRAND_KIT_VALUES.personality,
        audiences: grid8Brand.audiences?.length
            ? grid8Brand.audiences
            : DEFAULT_BRAND_KIT_VALUES.audiences,
        createdAt: new Date(grid8Brand.createdAt),
        needsReanalysis: !grid8Brand.url,
    };
}

/**
 * Create a local-only brand kit (no Grid8 backend)
 */
export function createLocalBrandKit(
    brand: Omit<BrandKit, "id" | "createdAt" | "needsReanalysis" | "grid8Id">
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
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Failed to fetch brands");
    }

    return data.items || [];
}

/**
 * Create a brand on Grid8 API
 */
export async function createBrandOnGrid8(
    token: string,
    name: string
): Promise<Grid8Brand> {
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
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to create brand on Grid8");
    }

    return response.json();
}

/**
 * Update a brand on Grid8 API
 */
export async function updateBrandOnGrid8(
    token: string,
    grid8Id: string,
    updates: { name?: string }
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
    grid8Id: string
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
