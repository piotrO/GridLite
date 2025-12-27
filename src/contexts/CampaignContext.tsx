"use client";

import { createContext, useContext, useState, ReactNode } from "react";

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

// Design session state for passing data between Strategy → Studio
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
}

interface CampaignContextType {
  campaigns: Campaign[];
  setCampaignStatus: (id: string, status: Campaign["status"]) => void;

  // Strategy session management
  strategySession: StrategySession;
  setRawWebsiteText: (text: string) => void;
  setCampaignData: (data: StrategySession["campaignData"]) => void;
  setStrategy: (strategy: StrategySession["strategy"]) => void;
  clearStrategySession: () => void;

  // Design session management
  designSession: DesignSession;
  setCreative: (creative: DesignSession["creative"]) => void;
  clearDesignSession: () => void;
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
};

const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined
);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [strategySession, setStrategySession] =
    useState<StrategySession>(emptyStrategySession);
  const [designSession, setDesignSession] =
    useState<DesignSession>(emptyDesignSession);

  const setCampaignStatus = (id: string, status: Campaign["status"]) => {
    setCampaigns((prev) =>
      prev.map((campaign) =>
        campaign.id === id ? { ...campaign, status } : campaign
      )
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

  const clearDesignSession = () => {
    setDesignSession(emptyDesignSession);
  };

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        setCampaignStatus,
        strategySession,
        setRawWebsiteText,
        setCampaignData,
        setStrategy,
        clearStrategySession,
        designSession,
        setCreative,
        clearDesignSession,
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
