"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, FileArchive, Loader2, Check } from "lucide-react";
import { PersonaType } from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { useCampaign } from "@/contexts/CampaignContext";
import { toast } from "@/hooks/use-toast";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { StudioHeader } from "@/components/StudioHeader";
import { ChatPanel } from "@/components/ChatPanel";
import { DownloadableAssetCard } from "@/components/AdSizeCard";
import { PlatformGuidesCard } from "./PlatformGuidesCard";
import { GradientBackground } from "@/components/GradientBackground";

// Size name mapping
const sizeNames: Record<string, string> = {
  "300x250": "Medium Rectangle",
  "728x90": "Leaderboard",
  "160x600": "Wide Skyscraper",
  "300x600": "Half Page",
  "320x50": "Mobile Banner",
  "320x100": "Large Mobile Banner",
  "970x250": "Billboard",
  "970x90": "Large Leaderboard",
  "1080x1080": "Social Square",
};

const platformGuides = {
  "google-ads": {
    name: "Google Ads",
    steps: [
      "Sign in to your Google Ads account",
      "Navigate to 'Campaigns' → 'Display campaigns'",
      "Click the '+' button and select 'New campaign'",
      "Choose your campaign goal and select 'Display'",
      "Under 'Ads & assets', click 'Upload display ads'",
      "Drag your ZIP files or click to browse",
      "Preview each size and confirm placement",
      "Set your targeting and budget",
      "Review and launch your campaign",
    ],
  },
  meta: {
    name: "Meta/Facebook",
    steps: [
      "Open Meta Ads Manager",
      "Click 'Create' to start a new campaign",
      "Select your campaign objective",
      "Set up your ad set with targeting options",
      "At the ad level, select 'Create ad'",
      "Choose 'Single image or video' format",
      "Upload your creatives from the ZIP files",
      "Add your primary text, headline, and CTA",
      "Preview across placements (Feed, Stories, etc.)",
      "Confirm and publish your campaign",
    ],
  },
  dsp: {
    name: "Generic DSP",
    steps: [
      "Log in to your DSP platform",
      "Create a new campaign or line item",
      "Navigate to 'Creative Library' or 'Assets'",
      "Click 'Upload' or 'Add Creative'",
      "Select your HTML5 ZIP files",
      "Configure click-through URLs for each size",
      "Set impression tracking if required",
      "Associate creatives with your campaign",
      "Verify creative specs meet platform requirements",
      "Submit for review and trafficking",
    ],
  },
};

const mockResponses: Record<string, string> = {
  "file size":
    "For file size errors, ensure your HTML5 package is under 150KB. Try compressing images or removing unused assets.",
  rejected:
    "If your ad was rejected, check the platform's ad policies. Common issues include: animation length (max 30 seconds), looping limits.",
  tracking:
    "To add tracking pixels, most platforms let you add impression and click trackers in the ad setup.",
  default:
    "I'm here to help with ad deployment! Ask about file size optimization, platform requirements, or troubleshooting rejected ads.",
};

export default function MediaBuyerPage() {
  const router = useRouter();
  const { exportSession } = useCampaign();
  const [downloadedFiles, setDownloadedFiles] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingSize, setDownloadingSize] = useState<string | null>(null);

  // Build ad sizes from export session or use defaults
  const adSizes = exportSession?.selectedSizes?.map((id) => ({
    id,
    name: sizeNames[id] || id,
    dimensions: id.replace("x", " × "),
  })) || [
    { id: "300x600", name: "Half Page", dimensions: "300 × 600" },
  ];

  const [messages, setMessages] = useState<
    { id: string; persona: PersonaType; content: string; timestamp: Date }[]
  >([
    {
      id: "1",
      persona: "traffic_manager",
      content: exportSession
        ? `Great work! Your ${adSizes.length} creative${adSizes.length > 1 ? "s have" : " has"} been exported. Download them below, and follow my guides to get them live.`
        : "Great work! I've packaged all your industry-standard formats. Download them below, and follow my guides to get them live.",
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (messageContent: string) => {
    if (!messageContent.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        persona: "user",
        content: messageContent,
        timestamp: new Date(),
      },
    ]);
    setIsTyping(true);

    setTimeout(() => {
      const lowerInput = messageContent.toLowerCase();
      let response = mockResponses.default;
      if (lowerInput.includes("file size") || lowerInput.includes("too large"))
        response = mockResponses["file size"];
      else if (
        lowerInput.includes("reject") ||
        lowerInput.includes("disapproved")
      )
        response = mockResponses.rejected;
      else if (lowerInput.includes("track") || lowerInput.includes("pixel"))
        response = mockResponses.tracking;

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          persona: "traffic_manager",
          content: response,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  // Download a single size or all sizes
  const downloadZip = async (sizes: string[]) => {
    if (!exportSession) {
      toast({
        title: "No export data",
        description: "Please export from the Studio first.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    if (sizes.length === 1) {
      setDownloadingSize(sizes[0]);
    }

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templatePath: exportSession.templatePath,
          sizes,
          dynamicValues: exportSession.dynamicValues,
          layerModifications: exportSession.layerModifications,
        }),
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = sizes.length === 1 
        ? `${sizes[0]}-export.zip`
        : `campaign-export-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Mark as downloaded
      setDownloadedFiles((prev) => [...new Set([...prev, ...sizes])]);
      
      toast({
        title: "Download complete! 📦",
        description: sizes.length === 1 
          ? `${sizes[0]} has been downloaded.`
          : `${sizes.length} sizes have been downloaded.`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
      setDownloadingSize(null);
    }
  };

  const handleDownload = (sizeId: string) => {
    downloadZip([sizeId]);
  };

  const handleDownloadAll = () => {
    downloadZip(adSizes.map((s) => s.id));
  };

  const handleDownloadSelected = () => {
    if (downloadedFiles.length === 0) return;
    // Re-download selected files
    downloadZip(downloadedFiles);
  };

  const toggleSelection = (sizeId: string) => {
    setDownloadedFiles((prev) =>
      prev.includes(sizeId)
        ? prev.filter((id) => id !== sizeId)
        : [...prev, sizeId]
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background relative">
      <GradientBackground colorVar="primary" />
      <StudioHeader title="Traffic Manager" />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ChatPanel
          messages={messages}
          onSend={handleSendMessage}
          isTyping={isTyping}
          typingPersona="traffic_manager"
          placeholder="Ask about deployment..."
          defaultSize={35}
          minSize={25}
          maxSize={50}
        />
        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={65}>
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-card">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Need to make changes?
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Go back to the Designer to edit your creatives
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => router.push("/studio")}
                      >
                        Back to Designer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Campaign Assets */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileArchive className="w-5 h-5 text-primary" />
                      Campaign Assets
                      {exportSession?.exportedAt && (
                        <span className="text-xs text-muted-foreground font-normal">
                          (exported {new Date(exportSession.exportedAt).toLocaleTimeString()})
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleDownloadAll} 
                        className="gap-2"
                        disabled={isDownloading}
                      >
                        {isDownloading && !downloadingSize ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Download All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {adSizes.map((size) => (
                        <div
                          key={size.id}
                          className="relative group border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
                          onClick={() => handleDownload(size.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">{size.name}</p>
                              <p className="text-sm text-muted-foreground">{size.dimensions}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {downloadedFiles.includes(size.id) && (
                                <Check className="w-4 h-4 text-green-500" />
                              )}
                              {downloadingSize === size.id ? (
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              ) : (
                                <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Upload Guides */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <PlatformGuidesCard
                  guides={platformGuides}
                  defaultPlatform="google-ads"
                />
              </motion.div>
            </div>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
