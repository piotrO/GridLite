"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useBrand } from "@/contexts/BrandContext";
import { useCredits } from "@/contexts/CreditContext";
import { useCampaign } from "@/contexts/CampaignContext";
import {
  Message,
  StrategyOption,
  StrategyData,
  ConversationMessage,
  BrandProfile,
} from "./types";
import { STRATEGY_OPTIONS, STATUS_MESSAGES } from "./constants";

interface UseStrategyReturn {
  // State
  messages: Message[];
  isTyping: boolean;
  isLoading: boolean;
  loadingStatus: string;
  strategyData: StrategyData | null;
  strategyOptions: StrategyOption[];

  // Actions
  handleSend: (message: string) => Promise<void>;
  toggleOption: (id: string) => void;
}

export function useStrategy(): UseStrategyReturn {
  const { activeBrandKit } = useBrand();
  const { credits, useCredit } = useCredits();
  const { strategySession, setStrategy, setCampaignData } = useCampaign();

  const hasInitialized = useRef(false);
  const brand = activeBrandKit || { name: "Your Brand" };

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(
    "Connecting with The Strategist..."
  );
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationMessage[]
  >([]);
  const [strategyOptions, setStrategyOptions] = useState<StrategyOption[]>([]);

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
      colors: activeBrandKit?.colors,
      audiences: activeBrandKit?.audiences,
    }),
    [activeBrandKit]
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

  // Handle strategy complete
  const handleStrategyComplete = useCallback(
    (data: {
      greeting: string;
      strategy: StrategyData;
      campaignData: unknown;
    }) => {
      const { greeting, strategy, campaignData: cData } = data;

      // Store in context
      setStrategy(strategy);
      setCampaignData(cData as Parameters<typeof setCampaignData>[0]);

      // Set local state
      setStrategyData(strategy);

      // Build strategy options based on recommendation
      const options: StrategyOption[] = Object.entries(STRATEGY_OPTIONS).map(
        ([key, opt]) => ({
          id: key.toLowerCase(),
          title: opt.title,
          description: opt.description,
          icon: opt.icon,
          selected: key === strategy.recommendation,
        })
      );
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
        const rationaleMsg = `${strategy.rationale} I recommend a **${strategy.campaignAngle}** approach with the headline: *"${strategy.headline}"* 🎯`;
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

      setIsLoading(false);
    },
    [setStrategy, setCampaignData]
  );

  // Handle strategy error
  const handleStrategyError = useCallback(
    (fallbackMessage: string) => {
      setIsLoading(false);
      setMessages([
        {
          id: "fallback",
          persona: "strategist",
          content: fallbackMessage,
          timestamp: new Date(),
        },
      ]);
      setStrategyOptions(buildFallbackOptions());
    },
    [buildFallbackOptions]
  );

  // Fetch initial strategy from API
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const fetchStrategy = async () => {
      try {
        setIsLoading(true);
        setLoadingStatus("Analyzing your brand...");

        const response = await fetch("/api/strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandProfile: buildBrandProfile(),
            rawWebsiteText: strategySession.rawWebsiteText,
            websiteUrl: !strategySession.rawWebsiteText
              ? activeBrandKit?.url
              : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate strategy");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response stream available");
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const message = JSON.parse(line);

              if (message.type === "status") {
                setLoadingStatus(
                  STATUS_MESSAGES[message.step] || "Working on it..."
                );
              } else if (message.type === "complete") {
                handleStrategyComplete(message.data);
              } else if (message.type === "error") {
                console.error("Strategy error:", message.message);
                handleStrategyError(
                  `Hey! I've been diving deep into ${brand.name}'s brand identity. Really exciting stuff! 🎯`
                );
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch strategy:", error);
        handleStrategyError(
          `Hey! I've been analyzing ${brand.name}'s brand. Let me recommend a strategy for you! 🎯`
        );
      }
    };

    fetchStrategy();
  }, [
    activeBrandKit,
    buildBrandProfile,
    strategySession.rawWebsiteText,
    brand.name,
    handleStrategyComplete,
    handleStrategyError,
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
        }))
      );

      // Update context
      setStrategy(newStrategy);
    },
    [setStrategy]
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
            brandProfile: buildBrandProfile(),
            currentStrategy: strategyData,
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
      strategyData,
      applyStrategyUpdate,
    ]
  );

  // Toggle strategy option
  const toggleOption = useCallback((id: string) => {
    setStrategyOptions((prev) =>
      prev.map((opt) => ({ ...opt, selected: opt.id === id }))
    );
  }, []);

  return {
    messages,
    isTyping,
    isLoading,
    loadingStatus,
    strategyData,
    strategyOptions,
    handleSend,
    toggleOption,
  };
}
