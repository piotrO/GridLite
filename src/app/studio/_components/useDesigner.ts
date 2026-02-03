"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useBrand } from "@/contexts/BrandContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditContext";
import { useCampaign } from "@/contexts/CampaignContext";
import { PersonaType } from "@/components/ChatInterface";
import { useWorkflowStream } from "@/hooks/useWorkflowStream";
import { WorkflowStep } from "@/components/WorkflowProgress";
import { CreativeData, LayerModification } from "@/lib/shared/types";

export interface Message {
  id: string;
  persona: PersonaType;
  content: string;
  timestamp: Date;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseDesignerProps {
  onCopyChange?: (copy: {
    headline?: string;
    bodyCopy?: string;
    ctaText?: string;
  }) => void;
  onLayerChange?: (modifications: LayerModification[]) => void;
  onImageChange?: (imageUrl: string) => void;
  currentContent?: { headline: string; bodyCopy: string; ctaText: string };
}

interface UseDesignerReturn {
  messages: Message[];
  isTyping: boolean;
  isLoading: boolean;
  isGeneratingImage: boolean;
  steps: WorkflowStep[];
  creativeData: CreativeData | null;
  handleSend: (message: string) => Promise<void>;
}

export function useDesigner(props?: UseDesignerProps): UseDesignerReturn {
  const { onCopyChange, onLayerChange, onImageChange, currentContent } =
    props || {};
  const { activeBrandKit } = useBrand();
  const { token } = useAuth();
  const { credits, useCredit } = useCredits();
  const { strategySession, setCreative } = useCampaign();

  const hasInitialized = useRef(false);
  const brand = activeBrandKit || { name: "Your Brand" };
  const brandId = activeBrandKit?.grid8Id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
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
    [activeBrandKit],
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
    },
    [setCreative, onImageChange],
  );

  // Handle error
  const handleError = useCallback((fallbackMessage: string) => {
    setMessages([
      {
        id: "fallback",
        persona: "designer",
        content: fallbackMessage,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Use the workflow stream hook for initial generation
  const {
    start: startDesignerWorkflow,
    steps,
    isLoading: isWorkflowLoading,
  } = useWorkflowStream("/api/designer", {
    onComplete: (data) => {
      handleCreativeComplete(data);
    },
    onError: (msg) => {
      console.error("Designer workflow error:", msg);
      handleError(
        `Hello! 🎨 I'm Davinci, your Creative Director. I'm excited to bring ${brand.name}'s campaign to life visually!`,
      );
    },
  });

  // Fetch initial creative
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    startDesignerWorkflow({
      brandProfile: buildBrandProfile(),
      brandId,
      strategy: strategySession.strategy,
      campaignData: strategySession.campaignData,
    });
  }, [
    activeBrandKit,
    buildBrandProfile,
    strategySession,
    brand.name,
    brandId,
    startDesignerWorkflow,
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
    [setCreative, onCopyChange],
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
        // Check if this looks like an image request (for UX feedback)
        const looksLikeImageRequest =
          /\b(image|picture|photo|visual|generate|create|new image|different image)\b/i.test(
            message,
          );
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
      onLayerChange,
      onImageChange,
      currentContent,
      token,
      brandId,
    ],
  );

  return {
    messages,
    isTyping,
    isLoading: isWorkflowLoading,
    isGeneratingImage,
    steps,
    creativeData,
    handleSend,
  };
}
