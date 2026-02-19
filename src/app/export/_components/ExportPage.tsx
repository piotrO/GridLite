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
import { DynamicValueData } from "@/lib/manifest-utils";
import { toast } from "@/hooks/use-toast";
import { useCredits } from "@/contexts/CreditContext";
import { useCampaign } from "@/contexts/CampaignContext";
import { useProducts } from "@/contexts/ProductContext";
import { useBrand } from "@/contexts/BrandContext";
import { PersonaType } from "@/components/ChatInterface";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { StudioHeader } from "@/components/StudioHeader";
import { ChatPanel } from "@/components/ChatPanel";
import { GradientBackground } from "@/components/GradientBackground";
import { ExportProgressCard, ExportCompleteCard } from "./ExportStatusCards";
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
  const {
    exportSession,
    setExportSession,
    designSession,
    strategySession,
    selectedProductIds,
    campaignType,
    localization,
  } = useCampaign();
  const { products } = useProducts();
  const { activeBrandKit } = useBrand();

  // DPA mode is determined by campaignType from context (not URL param)
  const isDPA = campaignType === "dpa";

  // State for selected products (computed on client-side only to avoid hydration mismatch)
  const [selectedProducts, setSelectedProducts] = useState<typeof products>([]);

  // For DPA, default to "images" format only
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["zip"]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<AdSize[]>([]);
  const [exportProgressText, setExportProgressText] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  // Get template from URL params or default (Shopify for DPA)
  const templatePath =
    searchParams.get("template") ||
    (isDPA ? "social/Shopify" : "test-template");

  // Initialize client-side only state after hydration
  useEffect(() => {
    setIsHydrated(true);

    // Set format based on campaign type
    if (isDPA) {
      setSelectedFormats(["images"]);
    }

    // Filter products based on selectedProductIds for DPA
    if (isDPA && selectedProductIds.length > 0) {
      const filtered = products.filter((p) =>
        selectedProductIds.includes(p.id),
      );
      setSelectedProducts(filtered);
    } else {
      setSelectedProducts(products);
    }
  }, [isDPA, selectedProductIds, products]);

  // Filter formats: DPA shows only Static Images, display shows only ZIP
  const displayFormats = isDPA
    ? exportFormats.filter((f) => f.id === "images")
    : exportFormats.filter((f) => f.id === "zip");

  // Total image count across all languages (for download button)
  const exportLangCount =
    localization.selectedLanguages.length > 1
      ? localization.selectedLanguages.filter(
          (l) => l === "en" || localization.translations[l]?.status === "done",
        ).length
      : 1;
  const totalImageCount = selectedProducts.length * exportLangCount;

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
          {
            id: "300x600",
            name: "Half Page",
            dimensions: "300 × 600",
            available: true,
          },
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
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

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
        : [...prev, formatId],
    );
    if (formatId === "html5" && selectedFormats.includes("html5"))
      setSelectedPlatform(null);
  };

  const totalCreditCost = selectedFormats.reduce(
    (t, id) => t + (exportFormats.find((f) => f.id === id)?.creditCost || 0),
    0,
  );

  const handleExport = async () => {
    if (selectedFormats.length === 0) {
      toast({ title: "Select a format", variant: "destructive" });
      return;
    }
    if (!isDPA && selectedFormats.includes("html5") && !selectedPlatform) {
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
      // DPA Export - Call dedicated API endpoint
      if (isDPA && selectedFormats.includes("images")) {
        // Determine number of languages for progress display
        const exportLangCount =
          localization.selectedLanguages.length > 1
            ? localization.selectedLanguages.filter(
                (l) =>
                  l === "en" || localization.translations[l]?.status === "done",
              ).length
            : 1;

        setExportProgressText(
          exportLangCount > 1
            ? `Generating ${selectedProducts.length} product images × ${exportLangCount} languages...`
            : `Generating images for ${selectedProducts.length} products...`,
        );

        // Get first available size
        const exportSize = availableSizes[0]?.id || "1080x1080";

        // Prepare product data for API
        const productsForExport = selectedProducts.map((p) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          currency: p.currency,
          imageUrl: p.images?.[0]?.src,
          vendor: p.vendor,
        }));

        // Prepare brand data
        const brandData = {
          logoUrl: activeBrandKit?.logo,
          colors: activeBrandKit?.palette
            ? [
                activeBrandKit.palette.primary,
                activeBrandKit.palette.secondary,
                activeBrandKit.palette.accent,
              ]
            : undefined,
          labelColor: activeBrandKit?.palette?.secondary,
          ctaColor: activeBrandKit?.palette?.primary,
          bgColor: "#FFFFFF",
          typography: activeBrandKit?.typography,
          bgImageUrl: designSession.imageUrl || undefined,
        };

        // Simulate progress — account for language count
        const estimatedTimePerProduct = 4000;
        const totalEstimatedTime =
          selectedProducts.length * estimatedTimePerProduct * exportLangCount;
        const updateInterval = 500;
        const steps = totalEstimatedTime / updateInterval;
        const progressPerStep = 80 / steps;

        let currentProgress = 10;
        const progressTimer = setInterval(() => {
          currentProgress = Math.min(currentProgress + progressPerStep, 95);
          setExportProgress(Math.floor(currentProgress));
        }, updateInterval);

        // Build localizations data — include ALL selected languages (including English with original data)
        // so the export API creates subfolders per language
        const doneLangs = localization.selectedLanguages.filter(
          (l) => l === "en" || localization.translations[l]?.status === "done",
        );
        const localizationsPayload:
          | Record<string, { products: any[] }>
          | undefined =
          doneLangs.length > 1
            ? Object.fromEntries(
                doneLangs.map((code) => [
                  code,
                  {
                    products:
                      code === "en"
                        ? productsForExport.map((p) => ({
                            productId: p.id,
                            title: p.title,
                            vendor: p.vendor || "",
                            ctaText: "SHOP NOW",
                          }))
                        : localization.translations[code]?.productCopies || [],
                  },
                ]),
              )
            : undefined;

        // Call DPA export API
        const response = await fetch("/api/export-dpa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templatePath,
            size: exportSize,
            products: productsForExport,
            brandData,
            localizations: localizationsPayload,
          }),
        });

        if (!response.ok) {
          clearInterval(progressTimer);
          const error = await response.json();
          throw new Error(error.error || "Export failed");
        }

        clearInterval(progressTimer);
        setExportProgress(100);
        setExportProgressText("Download starting...");

        // Create URL but don't auto-download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);

        setExportProgress(100);
        setIsExporting(false);
        setExportComplete(true);
        setExportProgressText("");
        toast({
          title: "Export complete! 🎉",
          description:
            exportLangCount > 1
              ? `Generated images for ${selectedProducts.length} products in ${exportLangCount} languages. Click Download to save.`
              : `Generated images for ${selectedProducts.length} products. Click Download to save.`,
        });
        return;
      }

      // Standard export flow (non-DPA)
      // Build dynamic values from context or URL params
      const dynamicValues = {
        headline:
          searchParams.get("headline") ||
          strategySession.strategy?.headline ||
          "SUMMER SALE",
        bodyCopy:
          searchParams.get("bodyCopy") ||
          strategySession.strategy?.subheadline ||
          "Don't miss out!",
        ctaText:
          searchParams.get("ctaText") ||
          strategySession.strategy?.callToAction ||
          "Shop Now",
        imageUrl: searchParams.get("imageUrl") || designSession.imageUrl || "",
        logoUrl: activeBrandKit?.logo || designSession.logoUrl || "",
        colors: [
          activeBrandKit?.palette?.primary || "#4F46E5",
          activeBrandKit?.palette?.secondary || "#F97316",
          activeBrandKit?.palette?.accent || "#10B981",
        ],
        typography: activeBrandKit?.typography || null,
      };

      console.log("[ExportPage] Preparing export with values:", {
        headline: dynamicValues.headline,
        imageUrl: dynamicValues.imageUrl,
        logoUrl: dynamicValues.logoUrl,
        colors: dynamicValues.colors,
        hasTypography: !!dynamicValues.typography,
        activeBrandKitId: activeBrandKit?.id,
        designSessionImageUrl: designSession.imageUrl,
        searchParamsImageUrl: searchParams.get("imageUrl"),
      });

      // Create localizations map for standard export
      let localizations: Record<string, DynamicValueData> | undefined;
      const doneLangs = localization.selectedLanguages.filter(
        (l) => l === "en" || localization.translations[l]?.status === "done",
      );

      if (doneLangs.length > 1) {
        localizations = {};
        doneLangs.forEach((code) => {
          if (code === "en") {
            localizations![code] = dynamicValues;
          } else {
            const translation = localization.translations[code]?.copy;
            if (translation) {
              localizations![code] = {
                ...dynamicValues,
                headline: translation.headline,
                bodyCopy: translation.bodyCopy,
                ctaText: translation.ctaText,
              };
            }
          }
        });
      }

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
        selectedSizes: availableSizes
          .filter((s) => s.available)
          .map((s) => s.id),
        dynamicValues,
        layerModifications: layerModifications || [],
        localizations,
        exportedAt: new Date(),
      });

      setExportProgress(100);
      setIsExporting(false);
      setExportComplete(true);
      toast({
        title: "Ready to launch! 🚀",
        description: "Head to the Launch page to download your creatives.",
      });

      // Navigate to launch page after a short delay
      setTimeout(() => router.push("/launch"), 1000);
    } catch (error) {
      console.error("Export error:", error);
      setIsExporting(false);
      setExportProgress(0);
      toast({
        title: "Export failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `dpa-export-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
          {exportProgressText || "Exporting..."}
        </>
      ) : exportComplete ? (
        <>
          <Check className="h-4 w-4" />
          {isDPA ? "Generate Again" : "Download Again"}
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          {isDPA && isHydrated
            ? `Export ${selectedProducts.length} Products`
            : isDPA
              ? "Export Products"
              : "Export & Launch"}
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
                formats={displayFormats}
                selectedFormats={selectedFormats}
                onToggleFormat={toggleFormat}
              />
              {!isDPA && (
                <PlatformSelectionCard
                  platforms={adPlatforms}
                  selectedPlatform={selectedPlatform}
                  onSelect={setSelectedPlatform}
                  visible={selectedFormats.includes("html5")}
                />
              )}
              <AdSizesCard
                sizes={
                  availableSizes.length > 0
                    ? availableSizes.map((s) => ({
                        id: s.id,
                        name: s.name,
                        dimensions: s.dimensions,
                      }))
                    : [
                        {
                          id: "300x600",
                          name: "Half Page",
                          dimensions: "300 × 600",
                        },
                      ]
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

              {downloadUrl && (
                <div className="motion-safe:animate-fadeIn">
                  <Button
                    onClick={handleDownload}
                    size="lg"
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white shadow-md text-lg h-14"
                  >
                    <Download className="h-5 w-5" />
                    Download ZIP ({totalImageCount} images)
                  </Button>
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    Click to save your generated ads
                  </p>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <UnlockModal open={showUnlockModal} onOpenChange={setShowUnlockModal} />
    </div>
  );
}
