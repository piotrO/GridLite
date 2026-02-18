"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useBrand } from "@/contexts/BrandContext";
import { useCredits } from "@/contexts/CreditContext";
import { useCampaign } from "@/contexts/CampaignContext";
import { useProducts } from "@/contexts/ProductContext";
import { useWorkflowStream } from "@/hooks/useWorkflowStream";
import { WorkflowStep } from "@/components/WorkflowProgress";
import {
  Message,
  StrategyOption,
  StrategyData,
  DPAStrategyData,
  ConversationMessage,
  BrandProfile,
  CampaignType,
} from "./types";
import { STRATEGY_OPTIONS } from "./constants";

interface UseStrategyReturn {
  // State
  messages: Message[];
  isTyping: boolean;
  isLoading: boolean;
  steps: WorkflowStep[];
  strategyData: StrategyData | null;
  dpaStrategyData: DPAStrategyData | null;
  strategyOptions: StrategyOption[];
  campaignType: CampaignType;

  // Actions
  handleSend: (message: string) => Promise<void>;
  toggleOption: (id: string) => void;
  setCampaignType: (type: CampaignType) => void;
}

export function useStrategy(): UseStrategyReturn {
  const { activeBrandKit } = useBrand();
  const { credits, useCredit } = useCredits();
  const {
    strategySession,
    setStrategy,
    setCampaignData,
    setSelectedProductIds,
  } = useCampaign();
  const { products, catalogStats } = useProducts();

  const hasInitialized = useRef(false);
  const brand = activeBrandKit || { name: "Your Brand" };

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null);
  const [dpaStrategyData, setDpaStrategyData] =
    useState<DPAStrategyData | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationMessage[]
  >([]);
  const [strategyOptions, setStrategyOptions] = useState<StrategyOption[]>([]);
  const [campaignType, setCampaignTypeState] = useState<CampaignType>(null);

  // Build brand profile from active brand kit
  const buildBrandProfile = useCallback(
    (): BrandProfile => ({
      name: activeBrandKit?.name || "Your Brand",
      shortName: activeBrandKit?.shortName,
      url: activeBrandKit?.url || "",
      industry: activeBrandKit?.industry,
      tagline: activeBrandKit?.tagline,
      brandSummary: activeBrandKit?.brandSummary,
      tone: activeBrandKit?.tone,
      personality: activeBrandKit?.personality,
      audiences: activeBrandKit?.audiences,
    }),
    [activeBrandKit],
  );

  // Build fallback options
  const buildFallbackOptions = useCallback((): StrategyOption[] => {
    return Object.entries(STRATEGY_OPTIONS).map(([key, opt], i) => ({
      id: key.toLowerCase(),
      title: opt.title,
      description: opt.description,
      icon: opt.icon,
      selected: i === 0,
    }));
  }, []);

  // Handle strategy complete (works for both display and DPA)
  const handleStrategyComplete = useCallback(
    (data: {
      greeting: string;
      strategy: StrategyData;
      campaignData?: unknown;
      dpaStrategy?: DPAStrategyData;
    }) => {
      const { greeting, strategy, campaignData: cData, dpaStrategy } = data;

      // Store in context
      setStrategy(strategy);
      if (cData) {
        setCampaignData(cData as Parameters<typeof setCampaignData>[0]);
      }

      // Store DPA strategy data if present
      if (dpaStrategy) {
        setDpaStrategyData(dpaStrategy);
        // Store selected product IDs in campaign context for Studio
        if (dpaStrategy.selectedProductIds) {
          setSelectedProductIds(dpaStrategy.selectedProductIds);
        }
      }

      // Set local state
      setStrategyData(strategy);

      // Build strategy options based on recommendation (DPA only has CONVERSION/AWARENESS)
      const options: StrategyOption[] = Object.entries(STRATEGY_OPTIONS)
        .filter(([key]) => {
          // DPA campaigns only show CONVERSION and AWARENESS
          if (campaignType === "dpa") {
            return key === "CONVERSION" || key === "AWARENESS";
          }
          return true;
        })
        .map(([key, opt]) => ({
          id: key.toLowerCase(),
          title: opt.title,
          description: opt.description,
          icon: opt.icon,
          selected: key === strategy.recommendation,
        }));
      setStrategyOptions(options);

      // Add greeting message
      setMessages([
        {
          id: "greeting",
          persona: "strategist",
          content: greeting,
          timestamp: new Date(),
        },
      ]);
      setConversationHistory([{ role: "assistant", content: greeting }]);

      // After a delay, add strategy rationale
      setTimeout(() => {
        const productInfo =
          dpaStrategy && dpaStrategy.selectedProductIds.length > 0
            ? ` I've selected **${dpaStrategy.selectedProductIds.length} products** for this campaign. 🛍️`
            : "";
        const rationaleMsg = `${strategy.rationale} I recommend a **${strategy.campaignAngle}** approach with the headline: *"${strategy.headline}"* 🎯${productInfo}`;
        setMessages((prev) => [
          ...prev,
          {
            id: "rationale",
            persona: "strategist",
            content: rationaleMsg,
            timestamp: new Date(),
          },
        ]);
        setConversationHistory((prev) => [
          ...prev,
          { role: "assistant", content: rationaleMsg },
        ]);
      }, 1500);
    },
    [setStrategy, setCampaignData, setSelectedProductIds, campaignType],
  );

  // Handle strategy error
  const handleStrategyError = useCallback(
    (fallbackMessage: string) => {
      // Safe access to brand properties (handling the case where brand is just { name: "Your Brand" })
      const brandTagline =
        "tagline" in brand ? (brand as any).tagline : "Quality you can trust";

      // Create a fallback strategy so the UI doesn't stay empty
      const fallbackStrategy: StrategyData = {
        recommendation: "AWARENESS",
        campaignAngle: "Brand Visibility",
        headline: `Discover ${brand.name}`,
        subheadline: brandTagline || "Quality you can trust",
        rationale:
          "We recommend starting with a broad awareness campaign to establish your brand presence.",
        callToAction: "Learn More",
        adFormats: ["300x250", "728x90"],
        targetingTips: [
          "Target users interested in your industry",
          "Lookalike audiences",
        ],
      };

      // Set the strategy data (this triggers the UI to show content)
      handleStrategyComplete({
        greeting: fallbackMessage,
        strategy: fallbackStrategy,
      });

      // Also update messages to show the error/fallback context
      setMessages((prev) => [
        ...prev,
        {
          id: "fallback-error",
          persona: "strategist",
          content:
            "I had a little trouble analyzing the website details, but I used your brand profile to create this strategy. Feel free to tweak it! 🛠️",
          timestamp: new Date(),
        },
      ]);
    },
    [brand, handleStrategyComplete],
  );

  // Use the workflow stream hook
  const {
    start: startStrategyWorkflow,
    steps,
    isLoading,
  } = useWorkflowStream("/api/strategy", {
    onComplete: (data) => {
      handleStrategyComplete(data);
    },
    onError: (msg) => {
      console.error("Strategy workflow error:", msg);
      handleStrategyError(
        `Hey! I've been analyzing ${brand.name}'s brand. Let me recommend a strategy for you! 🎯`,
      );
    },
  });

  // Set campaign type (wrapped to track state before workflow starts)
  // Also syncs with CampaignContext so other pages (Export) know the campaign type
  const { setCampaignType: setContextCampaignType } = useCampaign();

  const setCampaignType = useCallback(
    (type: CampaignType) => {
      setCampaignTypeState(type);
      // Sync with context for cross-page access (only for supported types)
      if (type === "display" || type === "dpa") {
        setContextCampaignType(type);
      }
    },
    [setContextCampaignType],
  );

  // Fetch initial strategy from API when campaign type is set
  useEffect(() => {
    if (hasInitialized.current) return;
    if (!campaignType) return; // Wait for campaign type to be set
    if (!activeBrandKit) return; // Wait for brand kit to be loaded
    hasInitialized.current = true;

    const isDpa = campaignType === "dpa";

    // Build request payload based on campaign type
    const payload = isDpa
      ? {
          brandProfile: buildBrandProfile(),
          campaignType: "dpa" as const,
          products: products,
          catalogStats: catalogStats,
        }
      : {
          brandProfile: buildBrandProfile(),
          campaignType: "display" as const,
          rawWebsiteText: strategySession.rawWebsiteText || undefined,
          websiteUrl: !strategySession.rawWebsiteText
            ? activeBrandKit?.url
            : undefined,
        };

    startStrategyWorkflow(payload);
  }, [
    campaignType,
    activeBrandKit,
    buildBrandProfile,
    strategySession.rawWebsiteText,
    products,
    catalogStats,
    startStrategyWorkflow,
  ]);

  // Apply updated strategy (helper for when chat returns a new strategy)
  const applyStrategyUpdate = useCallback(
    (newStrategy: StrategyData) => {
      // Update local state
      setStrategyData(newStrategy);

      // Update strategy options to reflect new recommendation
      setStrategyOptions((prev) =>
        prev.map((opt) => ({
          ...opt,
          selected: opt.id === newStrategy.recommendation.toLowerCase(),
        })),
      );

      // Update context
      setStrategy(newStrategy);
    },
    [setStrategy],
  );

  // Apply updated DPA strategy
  const applyDpaStrategyUpdate = useCallback(
    (newDpaStrategy: DPAStrategyData) => {
      setDpaStrategyData(newDpaStrategy);
      if (newDpaStrategy.selectedProductIds) {
        setSelectedProductIds(newDpaStrategy.selectedProductIds);
      }
    },
    [setSelectedProductIds],
  );

  // Handle chat message send
  const handleSend = useCallback(
    async (message: string) => {
      // Add user message
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          persona: "user",
          content: message,
          timestamp: new Date(),
        },
      ]);

      const updatedHistory: ConversationMessage[] = [
        ...conversationHistory,
        { role: "user", content: message },
      ];
      setConversationHistory(updatedHistory);

      if (credits > 0) useCredit();

      setIsTyping(true);

      try {
        const response = await fetch("/api/strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "chat",
            campaignType,
            brandProfile: buildBrandProfile(),
            currentStrategy: strategyData,
            currentDpaStrategy: dpaStrategyData,
            userMessage: message,
            conversationHistory: updatedHistory,
          }),
        });

        if (!response.ok) throw new Error("Chat failed");

        const data = await response.json();
        const reply = data.message || "Let me think about that...";

        // Check if AI returned an updated strategy
        if (data.updatedStrategy) {
          applyStrategyUpdate(data.updatedStrategy);
        }

        // Check if AI returned an updated DPA strategy
        if (data.updatedDpaStrategy) {
          applyDpaStrategyUpdate(data.updatedDpaStrategy);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `strategist-${Date.now()}`,
            persona: "strategist",
            content: reply,
            timestamp: new Date(),
          },
        ]);
        setConversationHistory((prev) => [
          ...prev,
          { role: "assistant", content: reply },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `strategist-${Date.now()}`,
            persona: "strategist",
            content:
              credits > 0
                ? "Great point! Let me adjust the strategy based on your feedback. 🎯"
                : "I'd love to help, but you're out of credits.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [
      conversationHistory,
      credits,
      useCredit,
      buildBrandProfile,
      campaignType,
      strategyData,
      dpaStrategyData,
      applyStrategyUpdate,
      applyDpaStrategyUpdate,
    ],
  );

  // Toggle strategy option
  const toggleOption = useCallback((id: string) => {
    setStrategyOptions((prev) =>
      prev.map((opt) => ({ ...opt, selected: opt.id === id })),
    );
  }, []);

  return {
    messages,
    isTyping,
    isLoading,
    steps,
    strategyData,
    dpaStrategyData,
    strategyOptions,
    campaignType,
    handleSend,
    toggleOption,
    setCampaignType,
  };
}
