"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileArchive } from "lucide-react";
import { PersonaType } from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
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

const adSizes = [
  { id: "300x250", name: "Medium Rectangle", dimensions: "300 × 250" },
  { id: "728x90", name: "Leaderboard", dimensions: "728 × 90" },
  { id: "160x600", name: "Wide Skyscraper", dimensions: "160 × 600" },
  { id: "320x50", name: "Mobile Banner", dimensions: "320 × 50" },
  { id: "1080x1080", name: "Social Square", dimensions: "1080 × 1080" },
];

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
  const [downloadedFiles, setDownloadedFiles] = useState<string[]>([]);

  const [messages, setMessages] = useState<
    { id: string; persona: PersonaType; content: string; timestamp: Date }[]
  >([
    {
      id: "1",
      persona: "traffic_manager",
      content:
        "Great work! I've packaged all your industry-standard formats. Download them below, and follow my guides to get them live.",
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

  const handleDownload = (sizeId: string) => {
    setDownloadedFiles((prev) =>
      prev.includes(sizeId)
        ? prev.filter((id) => id !== sizeId)
        : [...prev, sizeId]
    );
  };

  const handleDownloadAll = () => setDownloadedFiles(adSizes.map((s) => s.id));

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
                    </CardTitle>
                    <div className="flex gap-2">
                      {downloadedFiles.length > 0 && (
                        <Button variant="outline" className="gap-2">
                          <Download className="w-4 h-4" />
                          Download Selected ({downloadedFiles.length})
                        </Button>
                      )}
                      <Button onClick={handleDownloadAll} className="gap-2">
                        <Download className="w-4 h-4" />
                        Download All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {adSizes.map((size) => (
                        <DownloadableAssetCard
                          key={size.id}
                          size={size}
                          isSelected={downloadedFiles.includes(size.id)}
                          onToggle={() => handleDownload(size.id)}
                        />
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
