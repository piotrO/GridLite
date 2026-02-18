"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, ArrowLeft } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { useProducts } from "@/contexts/ProductContext";
import { PageHeader } from "@/components/PageHeader";
import { GradientBackground } from "@/components/GradientBackground";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import { Button } from "@/components/ui/button";
import {
  CampaignTypeSelector,
  CampaignTypeId,
} from "@/components/CampaignTypeSelector";
import { ShopifyConnectionFlow } from "@/components/shopify/ShopifyConnectionFlow";
import { StrategyOptionsPanel } from "./StrategyOptionsPanel";
import { useStrategy } from "./useStrategy";

type PageState = "campaign-type" | "shopify-connect" | "strategy";

export default function StrategyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { activeBrandKit } = useBrand();
  const {
    isConnected,
    disconnectStore,
    setConnection,
    products,
    catalogStats,
  } = useProducts();

  // Check for OAuth callback params
  const shopifyConnected = searchParams.get("shopify_connected");
  const connectionData = searchParams.get("connection");
  const oauthError = searchParams.get("error");

  // Determine initial page state - only show Shopify flow for OAuth callbacks
  // (not for cached connections - user should always choose campaign type first)
  const getInitialState = (): PageState => {
    if (shopifyConnected === "true") {
      return "shopify-connect"; // Returning from OAuth
    }
    return "campaign-type";
  };

  // Page flow state
  const [pageState, setPageState] = useState<PageState>(getInitialState);
  const [selectedCampaignType, setSelectedCampaignType] =
    useState<CampaignTypeId | null>(shopifyConnected === "true" ? "dpa" : null);

  // Handle OAuth callback - restore connection from URL params
  useEffect(() => {
    if (shopifyConnected === "true" && connectionData) {
      try {
        // Decode and store connection data via context (updates state + localStorage)
        const connection = JSON.parse(atob(connectionData));
        setConnection(connection);

        // Clean up URL params
        const url = new URL(window.location.href);
        url.searchParams.delete("shopify_connected");
        url.searchParams.delete("connection");
        window.history.replaceState({}, "", url.pathname);

        // Set state to show Shopify sync flow
        setSelectedCampaignType("dpa");
        setPageState("shopify-connect");
      } catch (e) {
        console.error("Failed to parse Shopify connection data:", e);
      }
    }
  }, [shopifyConnected, connectionData, setConnection]);

  const {
    messages,
    isTyping,
    isLoading,
    steps,
    strategyData,
    dpaStrategyData,
    strategyOptions,
    handleSend,
    toggleOption,
    setCampaignType,
  } = useStrategy();

  const brand = activeBrandKit || { name: "Your Brand" };

  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = () => {
    setIsApproving(true);
    if (selectedCampaignType === "dpa") {
      router.push("/studio?mode=dpa");
    } else {
      router.push("/studio");
    }
  };

  // Handle campaign type selection
  const handleCampaignTypeSelect = useCallback(
    (type: CampaignTypeId) => {
      setSelectedCampaignType(type);

      // If DPA is selected, show Shopify connection step
      if (type === "dpa") {
        // Clear any existing connection so user can enter a new store
        disconnectStore();
        setPageState("shopify-connect");
      } else {
        // For Display ads, go directly to strategy
        setCampaignType?.(type);
        setPageState("strategy");
      }
    },
    [setCampaignType, disconnectStore],
  );

  // Handle Shopify connection complete
  const handleShopifyComplete = useCallback(() => {
    setCampaignType?.(selectedCampaignType);
    setPageState("strategy");
  }, [selectedCampaignType, setCampaignType]);

  // Handle skip Shopify (continue with Display instead)
  const handleSkipShopify = useCallback(() => {
    setSelectedCampaignType("display");
    setCampaignType?.("display");
    setPageState("strategy");
  }, [setCampaignType]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (pageState === "shopify-connect") {
      setPageState("campaign-type");
      setSelectedCampaignType(null);
    } else if (pageState === "strategy") {
      setPageState("campaign-type");
      setSelectedCampaignType(null);
    }
  }, [pageState]);

  // Campaign Type Selection Screen
  if (pageState === "campaign-type") {
    return (
      <div className="min-h-screen bg-background relative">
        <GradientBackground colorVar="strategist" />
        {isAuthenticated && <PageHeader />}

        <div className="max-w-4xl mx-auto p-6 lg:p-8 pt-16">
          <CampaignTypeSelector
            selectedType={selectedCampaignType}
            onSelect={handleCampaignTypeSelect}
          />
        </div>
      </div>
    );
  }

  // Shopify Connection Screen (for DPA)
  if (pageState === "shopify-connect") {
    return (
      <div className="min-h-screen bg-background relative">
        <GradientBackground colorVar="accent" />
        {isAuthenticated && <PageHeader />}

        <div className="max-w-4xl mx-auto p-6 lg:p-8 pt-16">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-6 gap-2 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Campaign Types
          </Button>

          <ShopifyConnectionFlow
            onComplete={handleShopifyComplete}
            onSkip={handleSkipShopify}
          />
        </div>
      </div>
    );
  }

  // Loading state (strategy generation)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background relative">
        <GradientBackground colorVar="strategist" />
        <WorkflowProgress
          steps={steps}
          title="Developing Strategy"
          subtitle={`Crafting a campaign for ${brand.name}`}
          colorVar="strategist"
        />
      </div>
    );
  }

  // Error/Empty state (if loading finished but no strategy data)
  if (!strategyData && !dpaStrategyData) {
    return (
      <div className="min-h-screen bg-background relative flex items-center justify-center">
        <GradientBackground colorVar="strategist" />
        <div className="text-center space-y-4 p-8 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-lg max-w-md">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <Lightbulb className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold">Strategy Generation Failed</h2>
          <p className="text-muted-foreground">
            We couldn't generate a strategy for this campaign at the moment.
          </p>
          <Button onClick={() => window.location.reload()} variant="default">
            Try Again
          </Button>
          <Button onClick={handleBack} variant="ghost" className="block w-full">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Main Strategy View
  return (
    <div className="min-h-screen bg-background relative">
      <GradientBackground colorVar="strategist" />
      {isAuthenticated && <PageHeader />}

      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        {/* Header with campaign type badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-strategist flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Strategy Session
              </h1>
              <p className="text-sm text-muted-foreground">
                with The Strategist
              </p>
            </div>
          </div>

          {/* Campaign Type Badge */}
          {selectedCampaignType && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  selectedCampaignType === "dpa"
                    ? "bg-accent/10 text-accent"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {selectedCampaignType === "dpa"
                  ? "Dynamic Product Ads"
                  : "Display Ads"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-muted-foreground text-xs"
              >
                Change
              </Button>
            </motion.div>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Chat Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
            style={{ minHeight: "500px" }}
          >
            <ChatInterface
              messages={messages}
              onSend={handleSend}
              isTyping={isTyping}
              typingPersona="strategist"
              placeholder="Ask about the strategy or suggest changes..."
            />
          </motion.div>

          {/* Strategy Options Section */}
          <StrategyOptionsPanel
            brandName={brand.name}
            options={strategyOptions}
            showOptions={true}
            onToggleOption={toggleOption}
            onApprove={handleApprove}
            strategyData={strategyData}
            dpaStrategyData={dpaStrategyData}
            isApproving={isApproving}
            campaignType={selectedCampaignType}
            products={products}
            catalogStats={catalogStats}
          />
        </div>
      </div>
    </div>
  );
}
