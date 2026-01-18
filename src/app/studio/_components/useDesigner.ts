"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useBrand } from "@/contexts/BrandContext";
import { useAuth } from "@/contexts/AuthContext";
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
  // Optional copy fields - included when designer changes copy/text
  headline?: string;
  bodyCopy?: string;
  ctaText?: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const STATUS_MESSAGES: Record<string, string> = {
  analyzing_brand: "Analyzing brand identity...",
  reviewing_strategy: "Reviewing campaign strategy...",
  creating_visuals: "Davinci is crafting your visuals...",
  generating_image: "Generating hero image...",
};

export interface LayerModification {
  layerName: string;
  positionDelta?: { x?: number; y?: number };
  scaleFactor?: number;
  sizes?: string[];
}

interface UseDesignerProps {
  onCopyChange?: (copy: { headline?: string; bodyCopy?: string; ctaText?: string }) => void;
  onLayerChange?: (modifications: LayerModification[]) => void;
  onImageChange?: (imageUrl: string) => void;
  currentContent?: { headline: string; bodyCopy: string; ctaText: string };
}

interface UseDesignerReturn {
  messages: Message[];
  isTyping: boolean;
  isLoading: boolean;
  isGeneratingImage: boolean;
  loadingStatus: string;
  creativeData: CreativeData | null;
  handleSend: (message: string) => Promise<void>;
}

export function useDesigner(props?: UseDesignerProps): UseDesignerReturn {
  const { onCopyChange, onLayerChange, onImageChange, currentContent } = props || {};
  const { activeBrandKit } = useBrand();
  const { token } = useAuth();
  const { credits, useCredit } = useCredits();
  const { strategySession, setCreative } = useCampaign();

  const hasInitialized = useRef(false);
  const brand = activeBrandKit || { name: "Your Brand" };
  const brandId = activeBrandKit?.grid8Id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
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
    (data: { greeting: string; creative: CreativeData; imageUrl?: string }) => {
      const { greeting, creative, imageUrl } = data;

      // Store in context
      setCreative(creative);

      // Set local state
      setCreativeData(creative);

      // If an image was generated, notify parent
      if (imageUrl) {
        onImageChange?.(imageUrl);
      }

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
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            brandProfile: buildBrandProfile(),
            brandId,
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

        // Buffer for accumulating incomplete messages
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("[useDesigner] Stream ended, remaining buffer:", buffer.length);
            break;
          }

          // Append new data to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines from buffer
          const lines = buffer.split("\n");
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            try {
              const message = JSON.parse(trimmedLine);
              console.log("[useDesigner] Received message type:", message.type);

              if (message.type === "status") {
                setLoadingStatus(
                  STATUS_MESSAGES[message.step] || "Working on it..."
                );
              } else if (message.type === "complete") {
                console.log("[useDesigner] Complete message received, imageUrl:", message.data?.imageUrl ? "yes" : "no");
                handleCreativeComplete(message.data);
              } else if (message.type === "error") {
                console.error("Designer error:", message.message);
                handleError(
                  `Hey! 🎨 I've been studying your brand and I'm ready to create something amazing! Let me show you what I have in mind.`
                );
              }
            } catch (parseError) {
              console.warn("[useDesigner] Failed to parse line (length:", trimmedLine.length, "):", parseError);
              // If parse failed, the message might be incomplete - put it back in buffer
              // But only if it looks like it could be JSON
              if (trimmedLine.startsWith("{")) {
                buffer = trimmedLine + "\n" + buffer;
              }
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

      // If copy fields are present, notify parent to update content
      if (newCreative.headline || newCreative.bodyCopy || newCreative.ctaText) {
        onCopyChange?.({
          headline: newCreative.headline,
          bodyCopy: newCreative.bodyCopy,
          ctaText: newCreative.ctaText,
        });
      }
    },
    [setCreative, onCopyChange]
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
        setIsTyping(true);

        // Check if this looks like an image request (for UX feedback)
        const looksLikeImageRequest = /\b(image|picture|photo|visual|generate|create|new image|different image)\b/i.test(message);
        if (looksLikeImageRequest) {
          setIsGeneratingImage(true);
        }

        const response = await fetch("/api/designer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            mode: "chat",
            brandProfile: buildBrandProfile(),
            brandId,
            currentCreative: creativeData,
            currentContent: currentContent,
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

        // Handle layer modifications from the designer
        if (data.layerModifications && data.layerModifications.length > 0) {
          onLayerChange?.(data.layerModifications);
        }

        // Handle image URL from the designer (generated image)
        if (data.imageUrl) {
          onImageChange?.(data.imageUrl);
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
        setIsGeneratingImage(false);
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
    isGeneratingImage,
    loadingStatus,
    creativeData,
    handleSend,
  };
}
