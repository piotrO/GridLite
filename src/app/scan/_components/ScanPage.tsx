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
import { useBrand } from "@/contexts/BrandContext";
import { useCredits } from "@/contexts/CreditContext";
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
  url: string;
  industry: string;
  tagline: string;
  logo: string;
  colors: string[];
  font: string;
  tone: string;
  personality: string[];
  audiences: { name: string; description: string }[];
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
  url,
  industry: "Technology & Software",
  tagline: "Building the future, one pixel at a time",
  logo: "🚀",
  colors: ["#4F46E5", "#F97316", "#10B981", "#8B5CF6"],
  font: "Inter / Plus Jakarta Sans",
  tone: "Professional yet approachable",
  personality: ["Innovative", "Trustworthy", "Modern"],
  audiences: [
    { name: "Tech Professionals", description: "Ages 25-45, decision makers" },
    { name: "Startup Founders", description: "Entrepreneurs seeking growth" },
    { name: "Creative Teams", description: "Designers and developers" },
  ],
});

export default function ScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, logout } = useAuth();
  const { brandKits, addBrandKit, updateBrandKit } = useBrand();
  const { credits, useCredit } = useCredits();

  const initialUrl = searchParams.get("url") || "";
  const editId = searchParams.get("edit");
  const editingBrandKit = editId
    ? brandKits.find((kit) => kit.id === editId)
    : null;

  const [showSignIn, setShowSignIn] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const pendingActionRef = useRef<"strategist" | "dashboard" | null>(null);
  const hasScannedRef = useRef(false);

  const [urlInput, setUrlInput] = useState(editingBrandKit?.url || initialUrl);
  const [isScanning, setIsScanning] = useState(
    !!initialUrl && !editingBrandKit
  );
  const [scanComplete, setScanComplete] = useState(!!editingBrandKit);
  const [currentScanStep, setCurrentScanStep] = useState<string>("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(
    editingBrandKit ? 3 : 0
  );
  const [showBrandData, setShowBrandData] = useState(!!editingBrandKit);

  const [brandData, setBrandData] = useState<BrandData>(
    editingBrandKit
      ? {
          name: editingBrandKit.name,
          url: editingBrandKit.url,
          industry: editingBrandKit.industry,
          tagline: editingBrandKit.tagline,
          logo: editingBrandKit.logo,
          colors: editingBrandKit.colors,
          font: editingBrandKit.font,
          tone: editingBrandKit.tone,
          personality: editingBrandKit.personality,
          audiences: editingBrandKit.audiences,
        }
      : getDefaultBrandData(urlInput || "example.com")
  );

  const initialMessages: Omit<Message, "id" | "timestamp">[] = editingBrandKit
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
          content: "When you're done, save changes or head to The Strategist.",
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

  // Initialize messages for editing mode
  useEffect(() => {
    if (editingBrandKit && messages.length === 0) {
      setMessages(
        initialMessages.map((msg, i) => ({
          id: `msg-${i}`,
          ...msg,
          timestamp: new Date(),
        }))
      );
    }
  }, [editingBrandKit]);

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
      setCurrentScanStep("extracting_text");

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

            if (message.type === "status") {
              setCurrentScanStep(message.step);
            } else if (message.type === "complete") {
              // Update brand data with real extracted data
              setBrandData((prev) => ({
                ...prev,
                logo: message.data.logo,
                colors: message.data.colors,
                tagline: message.data.tagline,
                tone: message.data.tone,
                personality: message.data.voice,
              }));
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
        error instanceof Error ? error.message : "Failed to scan website"
      );
      setIsScanning(false);
    }
  };

  // Start scanning when isScanning becomes true
  useEffect(() => {
    console.log("Auto-scan useEffect:", {
      isScanning,
      urlInput,
      editingBrandKit,
      hasScanned: hasScannedRef.current,
    });
    if (isScanning && urlInput && !editingBrandKit && !hasScannedRef.current) {
      console.log("Starting automatic scan for:", urlInput);
      hasScannedRef.current = true;
      scanBrandWithStreaming(urlInput);
    }
  }, [isScanning, urlInput, editingBrandKit]);

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

  const saveBrandKit = () => {
    if (editingBrandKit) updateBrandKit(editingBrandKit.id, brandData);
    else addBrandKit(brandData);
  };

  const handleApprove = () => {
    if (!isAuthenticated) {
      pendingActionRef.current = "strategist";
      setShowSignIn(true);
      return;
    }
    saveBrandKit();
    router.push("/strategy");
  };

  const handleSaveToDashboard = () => {
    if (!isAuthenticated) {
      pendingActionRef.current = "dashboard";
      setShowSignIn(true);
      return;
    }
    saveBrandKit();
    router.push("/dashboard");
  };

  const handleSignInSuccess = () => {
    saveBrandKit();
    router.push(
      pendingActionRef.current === "strategist" ? "/strategy" : "/dashboard"
    );
    pendingActionRef.current = null;
  };

  // Step 1: URL Input
  if (!isScanning && !editingBrandKit) {
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
        <GradientBackground colorVar="researcher" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-lg relative z-10"
        >
          {scanError ? (
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
          ) : (
            <ScanningAnimation
              url={urlInput || "example.com"}
              onComplete={handleScanComplete}
              currentStep={currentScanStep}
            />
          )}
        </motion.div>
      </div>
    );
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
