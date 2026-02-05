"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandProvider } from "@/contexts/BrandContext";
import { CreditProvider } from "@/contexts/CreditContext";
import { CampaignProvider } from "@/contexts/CampaignContext";
import { ProductProvider } from "@/contexts/ProductContext";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrandProvider>
          <CreditProvider>
            <CampaignProvider>
              <ProductProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  {children}
                </TooltipProvider>
              </ProductProvider>
            </CampaignProvider>
          </CreditProvider>
        </BrandProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
