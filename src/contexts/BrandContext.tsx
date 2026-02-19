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
  uploadBrandAsset,
  fetchAndParseFontCss,
  base64ToBlob,
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
  colors?: string[];
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
  const [activeBrandKit, setActiveBrandKitState] = useState<BrandKit | null>(
    null,
  );

  // Persist activeBrandKit to localStorage so it survives page navigation
  const setActiveBrandKit = useCallback((kit: BrandKit | null) => {
    setActiveBrandKitState(kit);
    if (kit) {
      try {
        localStorage.setItem("activeBrandKitId", kit.id);
      } catch {}
    } else {
      try {
        localStorage.removeItem("activeBrandKitId");
      } catch {}
    }
  }, []);

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

      // DEBUG: Check for fontCssUrl in the response
      fetchedBrands.forEach((b) => {
        try {
          if (b.notes?.book) {
            const parsed = JSON.parse(b.notes.book);
            console.log(
              `[BrandContext] Brand ${b._id} typography:`,
              JSON.stringify(parsed.typography),
            );
          }
        } catch (e) {
          // ignore
        }
      });

      // Convert Grid8 brands to BrandKits with CDN logo URLs
      const convertedBrandKits = fetchedBrands.map((brand) =>
        convertGrid8BrandToBrandKit(brand, getBrandLogoUrl(brand._id)),
      );

      // Merge with existing local-only brand kits (those without grid8Id)
      setBrandKits((prev) => {
        const localOnlyKits = prev.filter((kit) => !kit.grid8Id);
        return [...convertedBrandKits, ...localOnlyKits];
      });

      // Restore active brand kit from localStorage if not already set
      if (!activeBrandKit) {
        try {
          const storedId = localStorage.getItem("activeBrandKitId");
          if (storedId) {
            const restored = convertedBrandKits.find((k) => k.id === storedId);
            if (restored) setActiveBrandKitState(restored);
          }
        } catch {}
      }
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

        // Upload fonts as CSS if available
        let fontCssUrl: string | null = null;
        if (brand.typography) {
          const { headerFont, bodyFont } = brand.typography;
          let cssContent = "";

          if (headerFont?.fontFileBase64) {
            const format = headerFont.fontFormat || "woff2";
            cssContent += `@font-face {\n  font-family: '${headerFont.fontFamily}';\n  src: url('data:font/${format};base64,${headerFont.fontFileBase64}') format('${format}');\n  font-weight: normal;\n  font-style: normal;\n}\n`;
          }
          if (
            bodyFont?.fontFileBase64 &&
            bodyFont.fontFamily !== headerFont?.fontFamily
          ) {
            const format = bodyFont.fontFormat || "woff2";
            cssContent += `@font-face {\n  font-family: '${bodyFont.fontFamily}';\n  src: url('data:font/${format};base64,${bodyFont.fontFileBase64}') format('${format}');\n  font-weight: normal;\n  font-style: normal;\n}\n`;
          }

          if (cssContent) {
            try {
              const blob = new Blob([cssContent], { type: "text/css" });
              const file = new File([blob], "fonts.css", { type: "text/css" });
              fontCssUrl = await uploadBrandAsset(token, grid8Data._id, file);
            } catch (e) {
              console.error("Failed to upload fonts.css during creation:", e);
            }
          }

          // Update brand with cleaned typography (no base64) + cssUrl
          const finalTypography = {
            ...brand.typography,
            fontCssUrl: fontCssUrl || undefined,
            headerFont: { ...headerFont, fontFileBase64: null },
            bodyFont: { ...bodyFont, fontFileBase64: null },
          };

          // Upload updated profile to Grid8
          await updateBrandOnGrid8(token, grid8Data._id, {
            notes: {
              book: JSON.stringify({
                ...brand,
                typography: finalTypography,
              }),
            },
          });

          // Update local brand object
          brand = {
            ...brand,
            typography: finalTypography,
          };
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
          typography: updatedKit.typography,
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

        // Helper to upload fonts as a single CSS file
        const uploadFontsAsCss = async (typography: any) => {
          if (!typography) return null;

          const { headerFont, bodyFont } = typography;
          let cssContent = "";

          // Generate CSS for header font
          if (headerFont?.fontFileBase64) {
            const format = headerFont.fontFormat || "woff2";
            cssContent += `@font-face {\n  font-family: '${headerFont.fontFamily}';\n  src: url('data:font/${format};base64,${headerFont.fontFileBase64}') format('${format}');\n  font-weight: normal;\n  font-style: normal;\n}\n`;
          }

          // Generate CSS for body font (avoid duplicate if same family)
          if (
            bodyFont?.fontFileBase64 &&
            bodyFont.fontFamily !== headerFont?.fontFamily
          ) {
            const format = bodyFont.fontFormat || "woff2";
            cssContent += `@font-face {\n  font-family: '${bodyFont.fontFamily}';\n  src: url('data:font/${format};base64,${bodyFont.fontFileBase64}') format('${format}');\n  font-weight: normal;\n  font-style: normal;\n}\n`;
          }

          // TEST: Upload large dummy CSS (1MB) to check size limit
          // cssContent = "/* " + "A".repeat(1024 * 1024) + " */ body { color: blue; }";

          // Re-enable minimal test if user wants to confirm "asset" fix works again
          // cssContent = "body { color: green; } /* Asset field name test */";

          // DEBUG: Log CSS generation result
          if (!cssContent) {
            console.log(
              "[BrandContext] No CSS content generated (no base64 fonts found in update)",
            );
            return null;
          }

          // DEBUG: Log size
          console.log(
            `[BrandContext] Generated CSS size: ${cssContent.length} bytes`,
          );

          try {
            const blob = new Blob([cssContent], { type: "text/css" });
            const file = new File([blob], "fonts.css", { type: "text/css" });
            const cssUrl = await uploadBrandAsset(token, kit.grid8Id!, file);
            console.log("Uploaded fonts.css to:", cssUrl);
            return cssUrl;
          } catch (e) {
            console.warn("FAILED TO UPLOAD FONTS.CSS:", e);
            return null;
          }
        };

        // Upload CSS and get URL
        const fontCssUrl = await uploadFontsAsCss(
          brand.typography || kit.typography,
        );

        // Prepare typography object
        // We strip base64 data but keep the structure
        const finalTypography =
          brand.typography || kit.typography
            ? {
                ...(brand.typography || kit.typography),
                fontCssUrl:
                  fontCssUrl ||
                  (brand.typography as any)?.fontCssUrl ||
                  (kit.typography as any)?.fontCssUrl,
                headerFont: {
                  ...(brand.typography?.headerFont ||
                    kit.typography?.headerFont),
                  fontFileBase64: null, // clear payload
                },
                bodyFont: {
                  ...(brand.typography?.bodyFont || kit.typography?.bodyFont),
                  fontFileBase64: null, // clear payload
                },
              }
            : null;

        console.log(
          "[BrandContext] Final typography to save:",
          JSON.stringify(finalTypography),
        );

        const sanitizedProfile = {
          ...brandProfile,
          typography: finalTypography,
        };

        await updateBrandOnGrid8(token, kit.grid8Id, {
          name: brand.name ?? kit.name,
          notes: {
            book: JSON.stringify(sanitizedProfile),
          },
        });
        console.log("DEBUG: Updated brand on Grid8 with CSS font strategy");

        // Update local brand variable to include generated CSS URL
        if (finalTypography) {
          brand = {
            ...brand,
            typography: finalTypography,
          };
        }
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

  // HYDRATION: Fetch font CSS and populate base64 data in activeBrandKit
  useEffect(() => {
    const hydrateFonts = async () => {
      console.log("[BrandContext] Hydration effect triggered", {
        id: activeBrandKit?.id,
        hasCssUrl: !!activeBrandKit?.typography?.fontCssUrl,
      });

      if (!activeBrandKit?.typography?.fontCssUrl) return;
      const { typography } = activeBrandKit;
      const { headerFont, bodyFont, fontCssUrl } = typography;

      // Check if we need hydration (missing base64 but have URL)
      const needsHeaderHydration =
        headerFont && !headerFont.fontFileBase64 && !headerFont.isSystemFont;
      const needsBodyHydration =
        bodyFont && !bodyFont.fontFileBase64 && !bodyFont.isSystemFont;

      console.log("[BrandContext] Hydration checks:", {
        header: {
          exists: !!headerFont,
          hasBase64: !!headerFont?.fontFileBase64,
          isSystem: headerFont?.isSystemFont,
          needsHydration: needsHeaderHydration,
        },
        body: {
          exists: !!bodyFont,
          hasBase64: !!bodyFont?.fontFileBase64,
          isSystem: bodyFont?.isSystemFont,
          needsHydration: needsBodyHydration,
        },
      });

      if (!needsHeaderHydration && !needsBodyHydration) return;

      console.log("[BrandContext] Hydrating fonts from CSS...");
      const fontData = await fetchAndParseFontCss(fontCssUrl);

      // Create updated typography object
      const updatedTypography = { ...typography };
      let hasUpdates = false;

      if (needsHeaderHydration && fontData[headerFont.fontFamily]) {
        updatedTypography.headerFont = {
          ...headerFont,
          fontFileBase64: fontData[headerFont.fontFamily],
        };
        hasUpdates = true;
      }

      if (needsBodyHydration && fontData[bodyFont.fontFamily]) {
        updatedTypography.bodyFont = {
          ...bodyFont,
          fontFileBase64: fontData[bodyFont.fontFamily],
        };
        hasUpdates = true;
      }

      if (hasUpdates) {
        console.log("[BrandContext] Fonts hydrated successfully");
        // Update local state ONLY (do not save to DB)
        setActiveBrandKitState((prev) =>
          prev ? { ...prev, typography: updatedTypography } : prev,
        );
      }
    };

    hydrateFonts();
  }, [activeBrandKit?.id, activeBrandKit?.typography?.fontCssUrl]);

  // GLOBAL FONT INJECTION
  // When activeBrandKit changes, inject its custom font CSS into the document head
  useEffect(() => {
    const fontCssUrl = activeBrandKit?.typography?.fontCssUrl;
    const linkId = "active-brand-font-css";

    // Remove existing link if it exists
    const existingLink = document.getElementById(linkId);
    if (existingLink) {
      document.head.removeChild(existingLink);
    }

    if (fontCssUrl) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = fontCssUrl;
      document.head.appendChild(link);

      console.log(`[BrandContext] Injected global font CSS: ${fontCssUrl}`);
    }
  }, [activeBrandKit?.typography?.fontCssUrl]);

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
