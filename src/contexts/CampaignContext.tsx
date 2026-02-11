"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { ExportSession, LayerModification } from "@/types/export-types";
import { DynamicValueData } from "@/lib/manifest-utils";

export interface Campaign {
  id: string;
  name: string;
  brand: string;
  status: "draft" | "in-progress" | "complete" | "exported";
  createdAt: Date;
  thumbnail?: string;
}

// Strategy session state for passing data between Scan → Strategy
export interface StrategySession {
  rawWebsiteText: string | null;
  campaignData: {
    currentPromos: string[];
    uniqueSellingPoints: string[];
    seasonalContext: string | null;
    callsToAction: string[];
    keyProducts: string[];
  } | null;
  strategy: {
    recommendation: "AWARENESS" | "CONVERSION" | "ENGAGEMENT";
    campaignAngle: string;
    headline: string;
    subheadline: string;
    rationale: string;
    callToAction: string;
    adFormats: string[];
    targetingTips: string[];
  } | null;
}

// Design session state for passing data between Strategy → Studio → Export
export interface DesignSession {
  creative: {
    conceptName: string;
    visualStyle: string;
    colorScheme: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
    typography: {
      headlineStyle: string;
      bodyStyle: string;
    };
    layoutSuggestion: string;
    animationIdeas: string[];
    moodKeywords: string[];
    imageDirection: string;
  } | null;
  // AI-generated hero image URL (base64 data URI or remote URL)
  imageUrl: string | null;
  // Brand logo URL (from brand kit)
  logoUrl: string | null;
}

interface CampaignContextType {
  campaigns: Campaign[];
  setCampaignStatus: (id: string, status: Campaign["status"]) => void;

  // Campaign type (display or dpa)
  campaignType: "display" | "dpa";
  setCampaignType: (type: "display" | "dpa") => void;

  // Strategy session management
  strategySession: StrategySession;
  setRawWebsiteText: (text: string) => void;
  setCampaignData: (data: StrategySession["campaignData"]) => void;
  setStrategy: (strategy: StrategySession["strategy"]) => void;
  clearStrategySession: () => void;

  // DPA: Selected products for Studio
  selectedProductIds: string[];
  setSelectedProductIds: (ids: string[]) => void;

  // Design session management
  designSession: DesignSession;
  setCreative: (creative: DesignSession["creative"]) => void;
  setImageUrl: (imageUrl: string | null) => void;
  setLogoUrl: (logoUrl: string | null) => void;
  clearDesignSession: () => void;

  // Export session management
  exportSession: ExportSession | null;
  setExportSession: (session: ExportSession) => void;
  updateExportSession: (updates: Partial<ExportSession>) => void;
  clearExportSession: () => void;
}

const initialCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Summer Sale Campaign",
    brand: "TechCorp",
    status: "exported",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Product Launch",
    brand: "StartupXYZ",
    status: "in-progress",
    createdAt: new Date("2024-01-20"),
  },
  {
    id: "3",
    name: "Brand Awareness",
    brand: "DesignStudio",
    status: "draft",
    createdAt: new Date("2024-01-22"),
  },
];

const emptyStrategySession: StrategySession = {
  rawWebsiteText: null,
  campaignData: null,
  strategy: null,
};

const emptyDesignSession: DesignSession = {
  creative: null,
  imageUrl: null,
  logoUrl: null,
};

const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined,
);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [campaignType, setCampaignType] = useState<"display" | "dpa">(
    "display",
  );
  const [strategySession, setStrategySession] =
    useState<StrategySession>(emptyStrategySession);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [designSession, setDesignSession] =
    useState<DesignSession>(emptyDesignSession);
  const [exportSession, setExportSessionState] = useState<ExportSession | null>(
    null,
  );

  const setCampaignStatus = (id: string, status: Campaign["status"]) => {
    setCampaigns((prev) =>
      prev.map((campaign) =>
        campaign.id === id ? { ...campaign, status } : campaign,
      ),
    );
  };

  const setRawWebsiteText = (text: string) => {
    setStrategySession((prev) => ({ ...prev, rawWebsiteText: text }));
  };

  const setCampaignData = (data: StrategySession["campaignData"]) => {
    setStrategySession((prev) => ({ ...prev, campaignData: data }));
  };

  const setStrategy = (strategy: StrategySession["strategy"]) => {
    setStrategySession((prev) => ({ ...prev, strategy }));
  };

  const clearStrategySession = () => {
    setStrategySession(emptyStrategySession);
  };

  const setCreative = (creative: DesignSession["creative"]) => {
    setDesignSession((prev) => ({ ...prev, creative }));
  };

  const setImageUrl = (imageUrl: string | null) => {
    setDesignSession((prev) => ({ ...prev, imageUrl }));
  };

  const setLogoUrl = (logoUrl: string | null) => {
    setDesignSession((prev) => ({ ...prev, logoUrl }));
  };

  const clearDesignSession = () => {
    setDesignSession(emptyDesignSession);
  };

  const setExportSession = (session: ExportSession) => {
    setExportSessionState(session);
  };

  const updateExportSession = (updates: Partial<ExportSession>) => {
    setExportSessionState((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const clearExportSession = () => {
    setExportSessionState(null);
  };

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        setCampaignStatus,
        campaignType,
        setCampaignType,
        strategySession,
        setRawWebsiteText,
        setCampaignData,
        setStrategy,
        clearStrategySession,
        selectedProductIds,
        setSelectedProductIds,
        designSession,
        setCreative,
        setImageUrl,
        setLogoUrl,
        clearDesignSession,
        exportSession,
        setExportSession,
        updateExportSession,
        clearExportSession,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error("useCampaign must be used within a CampaignProvider");
  }
  return context;
}

// Re-export types for convenience
export type { ExportSession, LayerModification, DynamicValueData };
