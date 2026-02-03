"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import {
  fetchBrands,
  createBrandOnGrid8,
  updateBrandOnGrid8,
  deleteBrandOnGrid8,
  convertGrid8BrandToBrandKit,
  createLocalBrandKit,
  getBrandLogoUrl,
  uploadBrandAvatar,
} from "@/services/brand-service";
import { BrandPalette, Typography } from "@/lib/shared/types";

// Grid8 API brand type
export interface Grid8Brand {
  _id: string;
  name: string;
  dcmProfileId: string | null;
  adAccounts: string[];
  limits: {
    totalUserCount: number;
  };
  notes?: {
    innovation?: string;
    book?: string;
    _id?: string;
  };
  createdAt: string;
  updatedAt: string | null;
  // Brand profile data from AI analysis
  brandProfile?: {
    url?: string;
    industry?: string;
    tagline?: string;
    font?: string;
    tone?: string;
    personality?: string[];
    brandSummary?: string;
    targetAudiences?: { name: string; description: string }[];
    analyzedAt?: string;
  };
  // Legacy fields (for backwards compatibility)
  url?: string;
  industry?: string;
  tagline?: string;
  logo?: string;
  font?: string;
  tone?: string;
  personality?: string[];
  brandSummary?: string;
  audiences?: { name: string; description: string }[];
  targetAudiences?: { name: string; description: string }[];
  personality_dimensions?: any;
  linguistic_mechanics?: any;
  archetype?: any;
  voiceInstructions?: string;
  voiceLabel?: string;
  dos?: string[];
  donts?: string[];
  palette?: BrandPalette;
  analyzedAt?: string;
}

// Local brand kit type (for UI purposes)
export interface BrandKit {
  id: string;
  grid8Id?: string; // Reference to Grid8 brand ID
  name: string;
  shortName?: string;
  url: string;
  industry: string;
  tagline: string;
  logo: string;
  font: string;
  typography?: Typography | null;
  personality?: string[];
  voiceLabel: string;
  voiceInstructions: string;
  dos: string[];
  donts: string[];
  palette?: BrandPalette;
  tone?: string; // Legacy
  brandSummary?: string;
  audiences: { name: string; description: string }[];
  personalityDimensions?: {
    sincerity: number;
    excitement: number;
    competence: number;
    sophistication: number;
    ruggedness: number;
  };
  linguisticMechanics?: {
    formality_index: "High" | "Low";
    urgency_level: "High" | "Low";
    etymology_bias: "Latinate" | "Germanic";
  };
  archetype?: {
    primary: string;
    secondary: string;
    brand_motivation: string;
  };
  createdAt: Date;
  needsReanalysis: boolean;
}

interface BrandContextType {
  // Grid8 API brands (raw)
  grid8Brands: Grid8Brand[];
  activeGrid8Brand: Grid8Brand | null;
  setActiveGrid8Brand: (brand: Grid8Brand | null) => void;
  fetchGrid8Brands: () => Promise<void>;
  isLoadingGrid8Brands: boolean;
  grid8BrandsError: string | null;

  // Brand kits (converted from Grid8 + local)
  brandKits: BrandKit[];
  activeBrandKit: BrandKit | null;
  addBrandKit: (
    brand: Omit<BrandKit, "id" | "createdAt" | "needsReanalysis" | "grid8Id">,
  ) => Promise<BrandKit>;
  updateBrandKit: (
    id: string,
    brand: Partial<Omit<BrandKit, "id" | "createdAt">>,
  ) => Promise<void>;
  setActiveBrandKit: (kit: BrandKit | null) => void;
  deleteBrandKit: (id: string) => Promise<void>;

  // Re-analysis helper
  markBrandAsAnalyzed: (id: string, url: string) => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();

  // Grid8 API brands state
  const [grid8Brands, setGrid8Brands] = useState<Grid8Brand[]>([]);
  const [activeGrid8Brand, setActiveGrid8Brand] = useState<Grid8Brand | null>(
    null,
  );
  const [isLoadingGrid8Brands, setIsLoadingGrid8Brands] = useState(false);
  const [grid8BrandsError, setGrid8BrandsError] = useState<string | null>(null);

  // Local brand kits state (converted from Grid8 + any locally added)
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [activeBrandKit, setActiveBrandKit] = useState<BrandKit | null>(null);

  const fetchGrid8Brands = useCallback(async () => {
    if (!token) {
      setGrid8BrandsError("Not authenticated");
      return;
    }

    setIsLoadingGrid8Brands(true);
    setGrid8BrandsError(null);

    try {
      const fetchedBrands = await fetchBrands(token);
      setGrid8Brands(fetchedBrands);

      // Convert Grid8 brands to BrandKits with CDN logo URLs
      const convertedBrandKits = fetchedBrands.map((brand) =>
        convertGrid8BrandToBrandKit(brand, getBrandLogoUrl(brand._id)),
      );

      // Merge with existing local-only brand kits (those without grid8Id)
      setBrandKits((prev) => {
        const localOnlyKits = prev.filter((kit) => !kit.grid8Id);
        return [...convertedBrandKits, ...localOnlyKits];
      });
    } catch (error) {
      setGrid8BrandsError(
        error instanceof Error ? error.message : "Failed to fetch brands",
      );
    } finally {
      setIsLoadingGrid8Brands(false);
    }
  }, [token]);

  // Fetch brands when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchGrid8Brands();
    }
  }, [isAuthenticated, token, fetchGrid8Brands]);

  // Create brand kit - also creates on Grid8 with full brand profile
  const addBrandKit = async (
    brand: Omit<BrandKit, "id" | "createdAt" | "needsReanalysis" | "grid8Id">,
  ): Promise<BrandKit> => {
    if (token) {
      try {
        // Pass full brand data to Grid8 so it can store the brandProfile
        const grid8Data = await createBrandOnGrid8(token, brand.name, brand);

        // Upload logo if it's a valid URL
        if (brand.logo && brand.logo.startsWith("http")) {
          // Fire and forget - don't block on avatar upload
          uploadBrandAvatar(token, grid8Data._id, brand.logo).catch((err) =>
            console.error("Avatar upload failed:", err),
          );
        }

        const newKit: BrandKit = {
          ...brand,
          id: `grid8-${grid8Data._id}`,
          grid8Id: grid8Data._id,
          createdAt: new Date(grid8Data.createdAt),
          needsReanalysis: !brand.url,
        };
        setBrandKits((prev) => [...prev, newKit]);
        setActiveBrandKit(newKit);
        return newKit;
      } catch (error) {
        console.error("Failed to create brand on Grid8:", error);
      }
    }

    // Fallback: create locally only
    const newKit = createLocalBrandKit(brand);
    setBrandKits((prev) => [...prev, newKit]);
    setActiveBrandKit(newKit);
    return newKit;
  };

  const updateBrandKit = async (
    id: string,
    brand: Partial<Omit<BrandKit, "id" | "createdAt">>,
  ) => {
    const kit = brandKits.find((k) => k.id === id);

    // Update on Grid8 if it has a grid8Id
    if (kit?.grid8Id && token) {
      try {
        // Build updated brandProfile from the combined data
        const updatedKit = { ...kit, ...brand };
        const brandProfile = {
          url: updatedKit.url,
          logo: updatedKit.logo,
          businessName: updatedKit.name,
          shortName: updatedKit.shortName || updatedKit.name,
          industry: updatedKit.industry,
          tagline: updatedKit.tagline,
          font: updatedKit.font,
          tone: updatedKit.tone,
          personality: updatedKit.personality,
          brandSummary: updatedKit.brandSummary,
          targetAudiences: updatedKit.audiences,
          personality_dimensions: updatedKit.personalityDimensions,
          linguistic_mechanics: updatedKit.linguisticMechanics,
          archetype: updatedKit.archetype,
          voiceInstructions: updatedKit.voiceInstructions,
          voiceLabel: updatedKit.voiceLabel,
          dos: updatedKit.dos,
          donts: updatedKit.donts,
          palette: updatedKit.palette,
          analyzedAt: new Date().toISOString(),
        };
        await updateBrandOnGrid8(token, kit.grid8Id, {
          name: brand.name ?? kit.name,
          notes: {
            book: JSON.stringify(brandProfile),
          },
        });
      } catch (error) {
        console.error("Failed to update brand on Grid8:", error);
      }
    }

    // Update locally
    setBrandKits((prev) =>
      prev.map((k) => (k.id === id ? { ...k, ...brand } : k)),
    );
    if (activeBrandKit?.id === id) {
      setActiveBrandKit({ ...activeBrandKit, ...brand });
    }
  };

  const deleteBrandKit = async (id: string) => {
    const kit = brandKits.find((k) => k.id === id);

    // Delete from Grid8 if it has a grid8Id
    if (kit?.grid8Id && token) {
      try {
        await deleteBrandOnGrid8(token, kit.grid8Id);
      } catch (error) {
        console.error("Failed to delete brand on Grid8:", error);
        // Continue with local deletion even if Grid8 fails
      }
    }

    // Delete locally
    setBrandKits((prev) => prev.filter((kit) => kit.id !== id));
    if (activeBrandKit?.id === id) {
      setActiveBrandKit(null);
    }
  };

  // Mark a brand as analyzed (user has provided URL and re-scanned)
  const markBrandAsAnalyzed = async (id: string, url: string) => {
    await updateBrandKit(id, { url, needsReanalysis: false });
  };

  return (
    <BrandContext.Provider
      value={{
        // Grid8 API brands
        grid8Brands,
        activeGrid8Brand,
        setActiveGrid8Brand,
        fetchGrid8Brands,
        isLoadingGrid8Brands,
        grid8BrandsError,

        // Brand kits
        brandKits,
        activeBrandKit,
        addBrandKit,
        updateBrandKit,
        setActiveBrandKit,
        deleteBrandKit,
        markBrandAsAnalyzed,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
}
