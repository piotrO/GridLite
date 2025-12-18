"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface CreditContextType {
  credits: number;
  addCredits: (amount: number) => void;
  useCredit: () => boolean;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export function CreditProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState<number>(5);

  const addCredits = (amount: number) => {
    setCredits((prev) => prev + amount);
  };

  const useCredit = () => {
    if (credits > 0) {
      setCredits((prev) => prev - 1);
      return true;
    }
    return false;
  };

  return (
    <CreditContext.Provider
      value={{
        credits,
        addCredits,
        useCredit,
      }}
    >
      {children}
    </CreditContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditContext);
  if (!context) {
    throw new Error("useCredits must be used within a CreditProvider");
  }
  return context;
}
