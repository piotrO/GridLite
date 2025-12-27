"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useBrand } from "@/contexts/BrandContext";
import { useCredits } from "@/contexts/CreditContext";
import { useCampaign, DesignSession } from "@/contexts/CampaignContext";
import { PersonaType } from "@/components/ChatInterface";

export interface Message {
  id: string;
  persona: PersonaType;
  content: string;
  timestamp: Date;
}

export interface CreativeData {
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
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const STATUS_MESSAGES: Record<string, string> = {
  analyzing_brand: "Analyzing brand identity...",
  reviewing_strategy: "Reviewing campaign strategy...",
  creating_visuals: "Davinci is crafting your visuals...",
};

interface UseDesignerReturn {
  messages: Message[];
  isTyping: boolean;
  isLoading: boolean;
  loadingStatus: string;
  creativeData: CreativeData | null;
  handleSend: (message: string) => Promise<void>;
}

export function useDesigner(): UseDesignerReturn {
  const { activeBrandKit } = useBrand();
  const { credits, useCredit } = useCredits();
  const { strategySession, setCreative } = useCampaign();

  const hasInitialized = useRef(false);
  const brand = activeBrandKit || { name: "Your Brand" };

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(
    "Connecting with The Designer..."
  );
  const [creativeData, setCreativeData] = useState<CreativeData | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationMessage[]
  >([]);

  // Build brand profile
  const buildBrandProfile = useCallback(
    () => ({
      name: activeBrandKit?.name || "Your Brand",
      shortName: activeBrandKit?.shortName,
      url: activeBrandKit?.url || "",
      industry: activeBrandKit?.industry,
      tagline: activeBrandKit?.tagline,
      brandSummary: activeBrandKit?.brandSummary,
      tone: activeBrandKit?.tone,
      personality: activeBrandKit?.personality,
      colors: activeBrandKit?.colors,
      logo: activeBrandKit?.logo,
      audiences: activeBrandKit?.audiences,
    }),
    [activeBrandKit]
  );

  // Handle creative complete
  const handleCreativeComplete = useCallback(
    (data: { greeting: string; creative: CreativeData }) => {
      const { greeting, creative } = data;

      // Store in context
      setCreative(creative);

      // Set local state
      setCreativeData(creative);

      // Add greeting message from Designer
      setMessages([
        {
          id: "greeting",
          persona: "designer",
          content: greeting,
          timestamp: new Date(),
        },
      ]);
      setConversationHistory([{ role: "assistant", content: greeting }]);

      // Add creative details after delay
      setTimeout(() => {
        const detailsMsg = `I'm calling this concept **"${creative.conceptName}"** — a ${creative.visualStyle} approach. The colors will flow beautifully with your brand! 🎨`;
        setMessages((prev) => [
          ...prev,
          {
            id: "details",
            persona: "designer",
            content: detailsMsg,
            timestamp: new Date(),
          },
        ]);
        setConversationHistory((prev) => [
          ...prev,
          { role: "assistant", content: detailsMsg },
        ]);
      }, 1500);

      setIsLoading(false);
    },
    [setCreative]
  );

  // Handle error
  const handleError = useCallback((fallbackMessage: string) => {
    setIsLoading(false);
    setMessages([
      {
        id: "fallback",
        persona: "designer",
        content: fallbackMessage,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Fetch initial creative
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const fetchCreative = async () => {
      try {
        setIsLoading(true);
        setLoadingStatus("Analyzing brand identity...");

        const response = await fetch("/api/designer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandProfile: buildBrandProfile(),
            strategy: strategySession.strategy,
            campaignData: strategySession.campaignData,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate creative");
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
                handleCreativeComplete(message.data);
              } else if (message.type === "error") {
                console.error("Designer error:", message.message);
                handleError(
                  `Hey! 🎨 I've been studying your brand and I'm ready to create something amazing! Let me show you what I have in mind.`
                );
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch creative:", error);
        handleError(
          `Hello! 🎨 I'm Davinci, your Creative Director. I'm excited to bring ${brand.name}'s campaign to life visually!`
        );
      }
    };

    fetchCreative();
  }, [
    activeBrandKit,
    buildBrandProfile,
    strategySession,
    brand.name,
    handleCreativeComplete,
    handleError,
  ]);

  // Apply creative update
  const applyCreativeUpdate = useCallback(
    (newCreative: CreativeData) => {
      setCreativeData(newCreative);
      setCreative(newCreative);
    },
    [setCreative]
  );

  // Handle chat send
  const handleSend = useCallback(
    async (message: string) => {
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
        const response = await fetch("/api/designer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "chat",
            brandProfile: buildBrandProfile(),
            currentCreative: creativeData,
            userMessage: message,
            conversationHistory: updatedHistory,
          }),
        });

        if (!response.ok) throw new Error("Chat failed");

        const data = await response.json();
        const reply = data.message || "Let me think about that...";

        if (data.updatedCreative) {
          applyCreativeUpdate(data.updatedCreative);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `designer-${Date.now()}`,
            persona: "designer",
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
            id: `designer-${Date.now()}`,
            persona: "designer",
            content:
              credits > 0
                ? "Love that idea! Let me refine the visuals based on your feedback. 🎨"
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
      creativeData,
      applyCreativeUpdate,
    ]
  );

  return {
    messages,
    isTyping,
    isLoading,
    loadingStatus,
    creativeData,
    handleSend,
  };
}
