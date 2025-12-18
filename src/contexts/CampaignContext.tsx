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

interface CampaignContextType {
  campaigns: Campaign[];
  setCampaignStatus: (id: string, status: Campaign["status"]) => void;
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

const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined
);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);

  const setCampaignStatus = (id: string, status: Campaign["status"]) => {
    setCampaigns((prev) =>
      prev.map((campaign) =>
        campaign.id === id ? { ...campaign, status } : campaign
      )
    );
  };

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        setCampaignStatus,
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
