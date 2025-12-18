"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface BrandKit {
  id: string;
  name: string;
  url: string;
  industry: string;
  tagline: string;
  logo: string;
  colors: string[];
  font: string;
  tone: string;
  personality: string[];
  audiences: { name: string; description: string }[];
  createdAt: Date;
}

interface BrandContextType {
  brandKits: BrandKit[];
  activeBrandKit: BrandKit | null;
  addBrandKit: (brand: Omit<BrandKit, "id" | "createdAt">) => BrandKit;
  updateBrandKit: (
    id: string,
    brand: Omit<BrandKit, "id" | "createdAt">
  ) => void;
  setActiveBrandKit: (kit: BrandKit | null) => void;
  deleteBrandKit: (id: string) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [activeBrandKit, setActiveBrandKit] = useState<BrandKit | null>(null);

  const addBrandKit = (brand: Omit<BrandKit, "id" | "createdAt">) => {
    const newKit: BrandKit = {
      ...brand,
      id: `brand-${Date.now()}`,
      createdAt: new Date(),
    };
    setBrandKits((prev) => [...prev, newKit]);
    setActiveBrandKit(newKit);
    return newKit;
  };

  const updateBrandKit = (
    id: string,
    brand: Omit<BrandKit, "id" | "createdAt">
  ) => {
    setBrandKits((prev) =>
      prev.map((kit) => (kit.id === id ? { ...kit, ...brand } : kit))
    );
    if (activeBrandKit?.id === id) {
      setActiveBrandKit({ ...activeBrandKit, ...brand });
    }
  };

  const deleteBrandKit = (id: string) => {
    setBrandKits((prev) => prev.filter((kit) => kit.id !== id));
    if (activeBrandKit?.id === id) {
      setActiveBrandKit(null);
    }
  };

  return (
    <BrandContext.Provider
      value={{
        brandKits,
        activeBrandKit,
        addBrandKit,
        updateBrandKit,
        setActiveBrandKit,
        deleteBrandKit,
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
