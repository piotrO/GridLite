"use client";

import { useState, useEffect } from "react";
import {
  Download,
  FileArchive,
  Code,
  Image,
  Check,
  Loader2,
  Video,
} from "lucide-react";
import { UnlockModal } from "@/components/UnlockModal";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { useCredits } from "@/contexts/CreditContext";
import { useCampaign } from "@/contexts/CampaignContext";
import { PersonaType } from "@/components/ChatInterface";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { StudioHeader } from "@/components/StudioHeader";
import { ChatPanel } from "@/components/ChatPanel";
import { GradientBackground } from "@/components/GradientBackground";
import {
  ExportProgressCard,
  ExportCompleteCard,
} from "./ExportStatusCards";
import { PlatformSelectionCard } from "./PlatformSelectionCard";
import { ExportSummaryCard } from "./ExportSummaryCard";
import { ExportFormatsCard, AdSizesCard } from "./ExportCards";
import { AdSize } from "@/types/export-types";

const adPlatforms = [
  { id: "google-studio", name: "Google Web Designer", logo: "🎨" },
  { id: "google-ads", name: "Google Ads", logo: "📊" },
  { id: "dv360", name: "Display & Video 360", logo: "📺" },
  { id: "pexi", name: "Pexi", logo: "⚡" },
  { id: "weborama", name: "Weborama", logo: "🌐" },
  { id: "sizmek", name: "Sizmek", logo: "📐" },
  { id: "flashtalking", name: "Flashtalking", logo: "💫" },
  { id: "celtra", name: "Celtra", logo: "🔷" },
];

const exportFormats = [
  {
    id: "html5",
    name: "HTML5 Package",
    description: "Complete HTML5 ad bundle with assets",
    icon: Code,
    recommended: true,
    creditCost: 1,
  },
  {
    id: "video",
    name: "Video Export",
    description: "MP4 video render of your ad creative",
    icon: Video,
    creditCost: 3,
  },
  {
    id: "zip",
    name: "ZIP Archive",
    description: "All files compressed for easy sharing",
    icon: FileArchive,
    creditCost: 1,
  },
  {
    id: "images",
    name: "Static Images",
    description: "PNG/JPG exports of key frames",
    icon: Image,
    creditCost: 1,
  },
];

export default function ExportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { credits, useCredit } = useCredits();
  const { exportSession, setExportSession, designSession, strategySession } = useCampaign();
  
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["html5"]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<AdSize[]>([]);

  // Get template from URL params or default
  const templatePath = searchParams.get("template") || "test-template";

  // Fetch available sizes on mount
  useEffect(() => {
    const fetchSizes = async () => {
      try {
        const res = await fetch(`/api/export?template=${templatePath}`);
        if (res.ok) {
          const data = await res.json();
          setAvailableSizes(data.sizes);
        }
      } catch (error) {
        console.error("Failed to fetch available sizes:", error);
        // Fallback to hardcoded sizes
        setAvailableSizes([
          { id: "300x600", name: "Half Page", dimensions: "300 × 600", available: true },
        ]);
      }
    };
    fetchSizes();
  }, [templatePath]);

  const [chatMessages, setChatMessages] = useState<
    { id: string; persona: PersonaType; content: string; timestamp: Date }[]
  >([
    {
      id: "1",
      persona: "traffic_manager",
      content:
        "Hey! I'm here to help with export settings. What platform are you planning to run your ads on?",
      timestamp: new Date(),
    },
  ]);
  const [isChatTyping, setIsChatTyping] = useState(false);

  const handleChatSend = (message: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        persona: "user",
        content: message,
        timestamp: new Date(),
      },
    ]);
    setIsChatTyping(true);
    setTimeout(() => {
      const lowerMsg = message.toLowerCase();
      let response =
        "Tell me which platforms you're targeting and I can recommend the best format.";
      if (lowerMsg.includes("google"))
        response = "For Google Ads, I recommend HTML5 format with 150KB limit.";
      else if (lowerMsg.includes("meta") || lowerMsg.includes("facebook"))
        response = "Meta works best with video or static images.";
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          persona: "traffic_manager",
          content: response,
          timestamp: new Date(),
        },
      ]);
      setIsChatTyping(false);
    }, 1200);
  };

  const toggleFormat = (formatId: string) => {
    setSelectedFormats((prev) =>
      prev.includes(formatId)
        ? prev.filter((f) => f !== formatId)
        : [...prev, formatId]
    );
    if (formatId === "html5" && selectedFormats.includes("html5"))
      setSelectedPlatform(null);
  };

  const totalCreditCost = selectedFormats.reduce(
    (t, id) => t + (exportFormats.find((f) => f.id === id)?.creditCost || 0),
    0
  );

  const handleExport = async () => {
    if (selectedFormats.length === 0) {
      toast({ title: "Select a format", variant: "destructive" });
      return;
    }
    if (selectedFormats.includes("html5") && !selectedPlatform) {
      toast({ title: "Select a platform", variant: "destructive" });
      return;
    }
    if (credits < totalCreditCost) {
      setShowUnlockModal(true);
      return;
    }

    for (let i = 0; i < totalCreditCost; i++) useCredit();
    setIsExporting(true);
    setExportProgress(10);

    try {
      // Build dynamic values from context or URL params
      const dynamicValues = {
        headline: searchParams.get("headline") || strategySession.strategy?.headline || "SUMMER SALE",
        bodyCopy: searchParams.get("bodyCopy") || strategySession.strategy?.subheadline || "Don't miss out!",
        ctaText: searchParams.get("ctaText") || strategySession.strategy?.callToAction || "Shop Now",
        imageUrl: searchParams.get("imageUrl") || designSession.imageUrl || "",
        logoUrl: designSession.logoUrl || "",
        colors: designSession.creative?.colorScheme 
          ? [
              designSession.creative.colorScheme.primary,
              designSession.creative.colorScheme.secondary,
              designSession.creative.colorScheme.accent,
            ]
          : undefined,
      };

      // Parse layer modifications from URL if present
      let layerModifications;
      const layerModsParam = searchParams.get("layerModifications");
      if (layerModsParam) {
        try {
          layerModifications = JSON.parse(layerModsParam);
        } catch {
          console.warn("Failed to parse layer modifications");
        }
      }

      setExportProgress(50);

      // Save export session to context for Launch page (actual download happens there)
      setExportSession({
        templatePath,
        selectedSizes: availableSizes.filter(s => s.available).map(s => s.id),
        dynamicValues,
        layerModifications: layerModifications || [],
        exportedAt: new Date(),
      });

      setExportProgress(100);
      setIsExporting(false);
      setExportComplete(true);
      toast({ title: "Ready to launch! 🚀", description: "Head to the Launch page to download your creatives." });

      // Navigate to launch page after a short delay
      setTimeout(() => router.push("/launch"), 1000);

    } catch (error) {
      console.error("Export error:", error);
      setIsExporting(false);
      setExportProgress(0);
      toast({ 
        title: "Export failed", 
        description: "Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const exportButton = (
    <Button
      onClick={handleExport}
      disabled={isExporting || selectedFormats.length === 0}
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : exportComplete ? (
        <>
          <Check className="h-4 w-4" />
          Download Again
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Export & Launch
        </>
      )}
    </Button>
  );

  return (
    <div className="h-screen flex flex-col bg-background relative">
      <GradientBackground colorVar="primary" />
      <StudioHeader title="Export" actions={exportButton} />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ChatPanel
          messages={chatMessages}
          onSend={handleChatSend}
          isTyping={isChatTyping}
          typingPersona="traffic_manager"
          placeholder="Ask about export options..."
        />
        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={70}>
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto grid gap-6">
              {isExporting && <ExportProgressCard progress={exportProgress} />}
              {exportComplete && !isExporting && <ExportCompleteCard />}
              <ExportFormatsCard
                formats={exportFormats}
                selectedFormats={selectedFormats}
                onToggleFormat={toggleFormat}
              />
              <PlatformSelectionCard
                platforms={adPlatforms}
                selectedPlatform={selectedPlatform}
                onSelect={setSelectedPlatform}
                visible={selectedFormats.includes("html5")}
              />
              <AdSizesCard 
                sizes={availableSizes.length > 0 
                  ? availableSizes.map(s => ({ id: s.id, name: s.name, dimensions: s.dimensions }))
                  : [{ id: "300x600", name: "Half Page", dimensions: "300 × 600" }]
                } 
              />
              <ExportSummaryCard
                formatCount={selectedFormats.length}
                sizeCount={availableSizes.length || 1}
                platformName={
                  selectedFormats.includes("html5")
                    ? adPlatforms.find((p) => p.id === selectedPlatform)?.name
                    : undefined
                }
                creditCost={totalCreditCost}
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <UnlockModal open={showUnlockModal} onOpenChange={setShowUnlockModal} />
    </div>
  );
}
