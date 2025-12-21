"use client";

import { useState } from "react";
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
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { useCredits } from "@/contexts/CreditContext";
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

const adSizes = [
  { id: "300x250", name: "Medium Rectangle", dimensions: "300 × 250" },
  { id: "728x90", name: "Leaderboard", dimensions: "728 × 90" },
  { id: "160x600", name: "Wide Skyscraper", dimensions: "160 × 600" },
  { id: "320x50", name: "Mobile Banner", dimensions: "320 × 50" },
];

export default function ExportPage() {
  const router = useRouter();
  const { credits, useCredit } = useCredits();
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["html5"]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

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
    setExportProgress(0);

    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setExportComplete(true);
          toast({ title: "Export complete!" });
          setTimeout(() => router.push("/launch"), 1000);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
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
          Launch
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
              <AdSizesCard sizes={adSizes} />
              <ExportSummaryCard
                formatCount={selectedFormats.length}
                sizeCount={adSizes.length}
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
