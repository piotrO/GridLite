"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { ScanningAnimation } from "./ScanningAnimation";
import { UrlInputStep } from "./UrlInputStep";
import { BrandDataPanel } from "./BrandDataPanel";
import { ChatInterface, PersonaType } from "@/components/ChatInterface";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand, BrandKit } from "@/contexts/BrandContext";
import { useCredits } from "@/contexts/CreditContext";
import { useCampaign } from "@/contexts/CampaignContext";
import {
  ScanResult,
  BrandProfile,
  BrandPalette,
  Typography,
} from "@/lib/shared/types";
import { SignInModal } from "@/components/SignInModal";
import { FontPickerModal } from "@/components/FontPickerModal";
import { PageHeader } from "@/components/PageHeader";
import { GradientBackground } from "@/components/GradientBackground";

interface Message {
  id: string;
  persona: PersonaType;
  content: string;
  timestamp: Date;
}

interface BrandData {
  name: string;
  shortName?: string;
  url: string;
  industry: string;
  tagline: string;
  logo: string;
  font: string;
  typography?: Typography | null;
  personality?: string[];
  voiceLabel: string;
  voiceInstructions: string;
  dos: string[];
  donts: string[];
  tone?: string;
  brandSummary?: string;
  palette: BrandPalette;
  audiences: { name: string; description: string }[];
  personalityDimensions?: {
    sincerity: number;
    excitement: number;
    competence: number;
    sophistication: number;
    ruggedness: number;
  };
  linguisticMechanics?: {
    formality_index: "High" | "Low";
    urgency_level: "High" | "Low";
    etymology_bias: "Latinate" | "Germanic";
  };
  archetype?: {
    primary: string;
    secondary: string;
    brand_motivation: string;
  };
}

function extractBrandName(url: string): string {
  try {
    const hostname = new URL(url.startsWith("http") ? url : `https://${url}`)
      .hostname;
    const parts = hostname.replace("www.", "").split(".");
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch {
    return "Your Brand";
  }
}

const getDefaultBrandData = (url: string): BrandData => ({
  name: extractBrandName(url),
  shortName: extractBrandName(url),
  url,
  industry: "Technology & Software",
  tagline: "null",
  logo: "🚀",
  palette: {
    primary: "#4F46E5",
    secondary: "#10B981",
    accent: "#F97316",
    extraColors: ["#8B5CF6"],
  },
  font: "Inter / Plus Jakarta Sans",
  voiceLabel: "Modern Professional",
  voiceInstructions: "Professional yet approachable",
  dos: ["Use active voice", "Be direct"],
  donts: ["Avoid jargon", "No passive voice"],
  brandSummary: "A premium technology company focused on innovation.",
  audiences: [
    { name: "Tech Professionals", description: "Ages 25-45, decision makers" },
    { name: "Early Adopters", description: "Innovation enthusiasts" },
    { name: "Digital Businesses", description: "Companies seeking growth" },
  ],
  personalityDimensions: {
    sincerity: 3,
    excitement: 4,
    competence: 4,
    sophistication: 3,
    ruggedness: 2,
  },
  linguisticMechanics: {
    formality_index: "High",
    urgency_level: "Low",
    etymology_bias: "Germanic",
  },
  archetype: {
    primary: "The Creator",
    secondary: "The Sage",
    brand_motivation: "High-end technology focused on empowerment.",
  },
});

export default function ScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, logout } = useAuth();
  const { brandKits, addBrandKit, updateBrandKit } = useBrand();
  const { credits, useCredit } = useCredits();
  const { setRawWebsiteText } = useCampaign();

  const initialUrl = searchParams.get("url") || "";
  const editId = searchParams.get("edit");
  const reanalyzeId = searchParams.get("reanalyze");

  // Find the brand kit for edit or reanalyze
  const editingBrandKit = editId
    ? brandKits.find((kit) => kit.id === editId)
    : null;
  const reanalyzingBrandKit = reanalyzeId
    ? brandKits.find((kit) => kit.id === reanalyzeId)
    : null;

  // Current working brand kit (either editing or reanalyzing)
  const workingBrandKit = editingBrandKit || reanalyzingBrandKit;
  const isReanalyzeMode = !!reanalyzingBrandKit;

  const [showSignIn, setShowSignIn] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const pendingActionRef = useRef<"strategist" | "dashboard" | null>(null);
  const hasScannedRef = useRef(false);

  const [urlInput, setUrlInput] = useState(workingBrandKit?.url || initialUrl);
  const [isScanning, setIsScanning] = useState(
    (!!initialUrl && !editingBrandKit) || isReanalyzeMode,
  );
  const [scanComplete, setScanComplete] = useState(
    !!editingBrandKit && !isReanalyzeMode,
  );
  const [scanSteps, setScanSteps] = useState<
    import("./ScanProgress").ScanStep[]
  >([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(
    editingBrandKit && !isReanalyzeMode ? 3 : 0,
  );
  const [showBrandData, setShowBrandData] = useState(
    !!editingBrandKit && !isReanalyzeMode,
  );

  const [brandData, setBrandData] = useState<BrandData>(
    workingBrandKit
      ? {
          name: workingBrandKit.name,
          url: workingBrandKit.url,
          industry: workingBrandKit.industry,
          tagline: workingBrandKit.tagline,
          logo: workingBrandKit.logo,
          font: workingBrandKit.font,
          personality: workingBrandKit.personality,
          voiceLabel: workingBrandKit.voiceLabel || "Modern Professional",
          voiceInstructions:
            workingBrandKit.voiceInstructions || workingBrandKit.tone || "",
          dos: workingBrandKit.dos || [],
          donts: workingBrandKit.donts || [],
          palette: workingBrandKit.palette || {
            primary: "#4F46E5",
            secondary: "#10B981",
            accent: "#F97316",
          },
          tone: workingBrandKit.tone,
          audiences: workingBrandKit.audiences,
          brandSummary: workingBrandKit.brandSummary,
          personalityDimensions: workingBrandKit.personalityDimensions,
          linguisticMechanics: workingBrandKit.linguisticMechanics,
          archetype: workingBrandKit.archetype,
        }
      : getDefaultBrandData(urlInput || "example.com"),
  );

  const initialMessages: Omit<Message, "id" | "timestamp">[] =
    editingBrandKit && !isReanalyzeMode
      ? [
          {
            persona: "researcher",
            content: `Welcome back! 👋 I see you're editing ${brandData.name}'s brand kit.`,
          },
          {
            persona: "researcher",
            content:
              "Feel free to update any of the brand details. I'm here to help!",
          },
          {
            persona: "researcher",
            content:
              "When you're done, save changes or head to The Strategist.",
          },
        ]
      : isReanalyzeMode
        ? [
            {
              persona: "researcher",
              content: `Hey there! 👋 I've reanalyzed ${brandData.name}'s website with fresh data!`,
            },
            {
              persona: "researcher",
              content:
                "I've updated the brand details while preserving your existing Grid8 data.",
            },
            {
              persona: "researcher",
              content: "Review the changes and approve when you're ready.",
            },
          ]
        : [
            {
              persona: "researcher",
              content: `Hey there! 👋 I've just finished scanning ${brandData.name}'s website!`,
            },
            {
              persona: "researcher",
              content:
                "I've extracted the brand identity, colors, typography, voice, and audiences.",
            },
            {
              persona: "researcher",
              content:
                "Feel free to ask me to adjust anything, or approve to continue.",
            },
          ];

  // Update brand data when URL changes
  useEffect(() => {
    if (urlInput) {
      setBrandData((prev) => ({
        ...prev,
        name: extractBrandName(urlInput),
        url: urlInput,
      }));
    }
  }, [urlInput]);

  // Reset scan ref when URL from landing page changes
  useEffect(() => {
    if (initialUrl) {
      hasScannedRef.current = false;
    }
  }, [initialUrl]);

  // Initialize messages for editing mode (not reanalyze mode)
  useEffect(() => {
    if (editingBrandKit && !isReanalyzeMode && messages.length === 0) {
      setMessages(
        initialMessages.map((msg, i) => ({
          id: `msg-${i}`,
          ...msg,
          timestamp: new Date(),
        })),
      );
    }
  }, [editingBrandKit, isReanalyzeMode]);

  // Typing effect for messages
  useEffect(() => {
    if (scanComplete && currentMessageIndex < initialMessages.length) {
      setIsTyping(true);
      const delay = currentMessageIndex === 0 ? 500 : 1200;

      const timer = setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${currentMessageIndex}`,
            ...initialMessages[currentMessageIndex],
            timestamp: new Date(),
          },
        ]);
        setCurrentMessageIndex((prev) => prev + 1);
        if (currentMessageIndex === 1)
          setTimeout(() => setShowBrandData(true), 300);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [scanComplete, currentMessageIndex]);

  // Scan brand with streaming API
  const scanBrandWithStreaming = async (url: string) => {
    try {
      setScanError(null);

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error("Failed to scan website");
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

            if (message.type === "init") {
              setScanSteps(
                message.steps.map((s: any) => ({
                  id: s.id,
                  label: s.label,
                  status: "pending",
                })),
              );
            } else if (message.type === "step_start") {
              setScanSteps((prev) =>
                prev.map((s) => {
                  // If matches new step, set to running (ONLY if not already completed/failed)
                  if (s.id === message.stepId) {
                    // Prevent regression: if step is already done, don't restart it
                    if (s.status === "completed" || s.status === "failed") {
                      return s;
                    }
                    return { ...s, status: "running", startTime: Date.now() };
                  }
                  // If it was running but is not the new step, assume it finished
                  if (s.status === "running") {
                    return { ...s, status: "completed", endTime: Date.now() };
                  }
                  return s;
                }),
              );
            } else if (message.type === "step_complete") {
              const success = message.success !== false;
              setScanSteps((prev) =>
                prev.map((s) =>
                  s.id === message.stepId
                    ? {
                        ...s,
                        status: success ? "completed" : "failed",
                        endTime: Date.now(),
                      }
                    : s,
                ),
              );
            } else if (message.type === "complete") {
              const { logo, rawWebsiteText, typography } = message.data;
              // Handle potential casing differences in API response
              const brandProfile =
                message.data.brand_profile || message.data.brandProfile || {};

              // Update brand data with mapped values from brand_profile
              setBrandData((prev) => {
                // Guidelines normalization
                const guidelines =
                  brandProfile.guidelines || brandProfile.guideline || {};
                const voiceLabel =
                  guidelines.voice_label ||
                  guidelines.voiceLabel ||
                  prev.voiceLabel;
                const voiceInstructions =
                  guidelines.voice_instructions ||
                  guidelines.voiceInstructions ||
                  prev.voiceInstructions;
                const dos = guidelines.dos || prev.dos || [];
                const donts = guidelines.donts || prev.donts || [];

                // Visual identity fallback
                const visualIdentity =
                  guidelines.visual_identity || guidelines.visualIdentity || {};

                // Personality normalization
                const rawPersonalityDims =
                  brandProfile.personality_dimensions ||
                  brandProfile.personalityDimensions ||
                  {};
                const personalityDims = {
                  sincerity:
                    rawPersonalityDims.sincerity ??
                    prev.personalityDimensions.sincerity,
                  excitement:
                    rawPersonalityDims.excitement ??
                    prev.personalityDimensions.excitement,
                  competence:
                    rawPersonalityDims.competence ??
                    prev.personalityDimensions.competence,
                  sophistication:
                    rawPersonalityDims.sophistication ??
                    prev.personalityDimensions.sophistication,
                  ruggedness:
                    rawPersonalityDims.ruggedness ??
                    prev.personalityDimensions.ruggedness,
                };

                const rawLinguisticMech =
                  brandProfile.linguistic_mechanics ||
                  brandProfile.linguisticMechanics ||
                  {};
                const linguisticMech = {
                  formality_index:
                    rawLinguisticMech.formality_index ||
                    rawLinguisticMech.formalityIndex ||
                    prev.linguisticMechanics.formality_index,
                  urgency_level:
                    rawLinguisticMech.urgency_level ||
                    rawLinguisticMech.urgencyLevel ||
                    prev.linguisticMechanics.urgency_level,
                  etymology_bias:
                    rawLinguisticMech.etymology_bias ||
                    rawLinguisticMech.etymologyBias ||
                    prev.linguisticMechanics.etymology_bias,
                };
                const archetype = brandProfile.archetype || prev.archetype;

                return {
                  ...prev,
                  name: brandProfile.name || prev.name,
                  shortName:
                    brandProfile.name ||
                    brandProfile.shortName ||
                    prev.shortName,
                  logo: logo || prev.logo,
                  typography: typography || prev.typography || null,
                  font:
                    typography?.primaryFontFamily ||
                    visualIdentity.font_style ||
                    visualIdentity.fontStyle ||
                    prev.font,
                  palette: brandProfile.palette || prev.palette,
                  tagline:
                    guidelines.power_words?.join(" • ") ||
                    brandProfile.tagline ||
                    prev.tagline,
                  personality: brandProfile.personality || prev.personality,
                  industry: brandProfile.industry || prev.industry,
                  brandSummary:
                    brandProfile.brandSummary ||
                    brandProfile.brand_summary ||
                    prev.brandSummary,
                  voiceLabel,
                  voiceInstructions,
                  dos,
                  donts,
                  audiences:
                    brandProfile.targetAudiences ||
                    brandProfile.target_audiences ||
                    prev.audiences,
                  personalityDimensions: personalityDims,
                  linguisticMechanics: linguisticMech,
                  archetype: archetype,
                };
              });
              // Store rawWebsiteText for Strategy phase
              if (rawWebsiteText) {
                setRawWebsiteText(rawWebsiteText);
              }
              handleScanComplete();
            } else if (message.type === "error") {
              setScanError(message.message);
              setIsScanning(false);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      setScanError(
        error instanceof Error ? error.message : "Failed to scan website",
      );
      setIsScanning(false);
    }
  };

  // Start scanning when isScanning becomes true (including reanalyze mode)
  useEffect(() => {
    console.log("Auto-scan useEffect:", {
      isScanning,
      urlInput,
      editingBrandKit,
      isReanalyzeMode,
      hasScanned: hasScannedRef.current,
    });
    // Scan if: (new scan or reanalyze mode) AND haven't scanned yet
    const shouldScan =
      isScanning &&
      urlInput &&
      !hasScannedRef.current &&
      (!editingBrandKit || isReanalyzeMode);
    if (shouldScan) {
      console.log("Starting automatic scan for:", urlInput);
      hasScannedRef.current = true;
      scanBrandWithStreaming(urlInput);
    }
  }, [isScanning, urlInput, editingBrandKit, isReanalyzeMode]);

  const handleStartScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) setIsScanning(true);
  };

  const handleScanComplete = () => {
    setScanComplete(true);
    if (!editingBrandKit) useCredit();
  };

  const handleSend = (message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        persona: "user",
        content: message,
        timestamp: new Date(),
      },
    ]);
    if (credits > 0) useCredit();

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const responses =
        credits > 0
          ? [
              "Great observation! I've noted that.",
              "Interesting point! I'll refine that detail.",
              "Perfect catch! I've made that adjustment.",
            ]
          : ["I'd love to help, but you're out of credits."];
      setMessages((prev) => [
        ...prev,
        {
          id: `researcher-${Date.now()}`,
          persona: "researcher",
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date(),
        },
      ]);
    }, 1500);
  };

  const saveBrandKit = async () => {
    if (workingBrandKit) {
      // Update existing brand kit (edit or reanalyze mode)
      // Mark as no longer needing reanalysis since we just reanalyzed it
      await updateBrandKit(workingBrandKit.id, {
        ...brandData,
        needsReanalysis: false,
      });
    } else {
      await addBrandKit(brandData);
    }
  };

  const handleApprove = async () => {
    if (!isAuthenticated) {
      pendingActionRef.current = "strategist";
      setShowSignIn(true);
      return;
    }
    await saveBrandKit();
    router.push("/strategy");
  };

  const handleSaveToDashboard = async () => {
    if (!isAuthenticated) {
      pendingActionRef.current = "dashboard";
      setShowSignIn(true);
      return;
    }
    await saveBrandKit();
    router.push("/dashboard");
  };

  const handleSignInSuccess = async () => {
    await saveBrandKit();
    router.push(
      pendingActionRef.current === "strategist" ? "/strategy" : "/dashboard",
    );
    pendingActionRef.current = null;
  };

  // Step 1: URL Input (but not for reanalyze mode - go straight to scanning)
  if (!isScanning && !workingBrandKit) {
    return (
      <UrlInputStep
        urlInput={urlInput}
        onUrlChange={setUrlInput}
        onSubmit={handleStartScan}
        isAuthenticated={isAuthenticated}
      />
    );
  }

  // Step 2: Scanning Animation
  if (!scanComplete) {
    // Show error state
    if (scanError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
          <GradientBackground colorVar="researcher" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-lg relative z-10"
          >
            <div className="text-center space-y-4">
              <div className="text-red-500 font-semibold">
                Error: {scanError}
              </div>
              <button
                onClick={() => {
                  setScanError(null);
                  setIsScanning(false);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // Show scanning animation (includes its own full-page layout)
    return <ScanningAnimation steps={scanSteps} url={urlInput} />;
  }

  // Step 3: Results
  return (
    <div className="min-h-screen bg-background relative">
      <GradientBackground colorVar="researcher" />
      <SignInModal
        open={showSignIn}
        onOpenChange={setShowSignIn}
        onSuccess={handleSignInSuccess}
        title="Sign in to continue"
        description="Create an account or sign in to save your brand kit"
      />
      {isAuthenticated && <PageHeader />}

      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-10 h-10 rounded-full bg-researcher flex items-center justify-center">
            <Search className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Brand Research Complete
            </h1>
            <p className="text-sm text-muted-foreground">with The Researcher</p>
          </div>
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
              typingPersona="researcher"
              placeholder="Ask about the research or suggest changes..."
            />
          </motion.div>

          {/* Brand Data Section */}
          <BrandDataPanel
            brandData={brandData}
            showBrandData={showBrandData}
            onBrandDataChange={setBrandData}
            onFontClick={() => setShowFontPicker(true)}
            onApprove={handleApprove}
            onSaveToDashboard={handleSaveToDashboard}
            onReanalyze={() => scanBrandWithStreaming(brandData.url)}
          />
        </div>
      </div>

      <FontPickerModal
        open={showFontPicker}
        onOpenChange={setShowFontPicker}
        currentFont={brandData.font.split(" / ")[0]}
        onFontChange={(font) => setBrandData({ ...brandData, font })}
        brandFonts={["Inter", "Playfair Display", "Roboto"]}
      />
    </div>
  );
}
