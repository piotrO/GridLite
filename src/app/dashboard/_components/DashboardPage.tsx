"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Palette, Globe, Image } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand, BrandKit } from "@/contexts/BrandContext";
import { useCampaign } from "@/contexts/CampaignContext";
import { useCredits } from "@/contexts/CreditContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetsGrid } from "./AssetsGrid";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { AddNewCard } from "@/components/AddNewCard";
import { EmptyState } from "@/components/EmptyState";
import { GradientBackground } from "@/components/GradientBackground";
import { CreditsBanner } from "./CreditsBanner";
import { BrandKitCard } from "./BrandKitCard";
import { CampaignCard } from "./CampaignCard";
import { DeleteBrandModal } from "./DeleteBrandModal";
import { ReanalyzeUrlModal } from "./ReanalyzeUrlModal";

/**
 * Check if a URL is valid for reanalysis
 * Returns false if URL is empty, default, or example.com
 */
function hasValidUrl(url: string | undefined): boolean {
  if (!url) return false;
  const normalized = url.toLowerCase().trim();
  if (!normalized) return false;
  if (
    normalized === "example.com" ||
    normalized === "https://example.com" ||
    normalized === "http://example.com"
  )
    return false;
  if (normalized === "yourbrand.com" || normalized === "https://yourbrand.com")
    return false;
  return true;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { campaigns } = useCampaign();
  const { brandKits, activeBrandKit, setActiveBrandKit, deleteBrandKit } =
    useBrand();
  const { credits } = useCredits();

  // Delete modal state
  const [brandToDelete, setBrandToDelete] = useState<BrandKit | null>(null);
  // Reanalyze modal state (for brands without valid URL)
  const [brandToReanalyze, setBrandToReanalyze] = useState<BrandKit | null>(
    null
  );

  const handleNewCampaign = () => {
    if (!activeBrandKit) {
      router.push("/");
      return;
    }
    router.push("/strategy");
  };

  const handleNewBrandKit = () => {
    router.push("/scan?url=");
  };

  const handleOpenCampaign = (campaignId: string, status: string) => {
    if (status === "exported") {
      router.push(`/launch?campaignId=${campaignId}`);
    } else {
      router.push(`/studio?campaignId=${campaignId}`);
    }
  };

  const handleSelectBrandKit = (kit: BrandKit) => {
    setActiveBrandKit(kit);
  };

  const handleEditBrandKit = (kit: BrandKit) => {
    setActiveBrandKit(kit);
    router.push(`/scan?edit=${kit.id}`);
  };

  const handleReanalyzeBrandKit = (kit: BrandKit) => {
    setActiveBrandKit(kit);
    // Check if the brand has a valid URL
    if (hasValidUrl(kit.url)) {
      // Has valid URL - go directly to scan
      router.push(`/scan?reanalyze=${kit.id}`);
    } else {
      // No valid URL - show modal to enter URL
      setBrandToReanalyze(kit);
    }
  };

  const handleReanalyzeWithUrl = (url: string) => {
    if (brandToReanalyze) {
      // Navigate to scan with both the brand ID and the new URL
      router.push(
        `/scan?reanalyze=${brandToReanalyze.id}&url=${encodeURIComponent(url)}`
      );
      setBrandToReanalyze(null);
    }
  };

  const handleDeleteBrandKit = async () => {
    if (brandToDelete) {
      await deleteBrandKit(brandToDelete.id);
      setBrandToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <GradientBackground colorVar="primary" />
      <PageHeader showBackButton={false} />

      <div className="container mx-auto px-6 py-10">
        <CreditsBanner credits={credits} />

        <Tabs defaultValue="brand-kits" className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <TabsList className="bg-muted/50">
              <TabsTrigger value="brand-kits" className="gap-2">
                <Palette className="w-4 h-4" />
                Brand Kits
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="gap-2">
                <Globe className="w-4 h-4" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-2">
                <Image className="w-4 h-4" />
                Assets
              </TabsTrigger>
            </TabsList>
          </motion.div>

          {/* Brand Kits Tab */}
          <TabsContent value="brand-kits" className="space-y-6">
            <SectionHeader
              title="Brand Kits"
              description="Manage your brand identities and assets"
              actionLabel="Add Brand Kit"
              onAction={handleNewBrandKit}
            />

            {brandKits.length === 0 ? (
              <EmptyState
                icon={Palette}
                title="No brand kits yet"
                description="Add your first brand kit by scanning your website. We'll extract colors, fonts, and brand identity automatically."
                actionLabel="Add Your First Brand"
                onAction={handleNewBrandKit}
              />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brandKits.map((kit, index) => (
                  <BrandKitCard
                    key={kit.id}
                    id={kit.id}
                    name={kit.name}
                    logo={kit.logo}
                    industry={kit.industry}
                    tagline={kit.tagline}
                    colors={kit.colors}
                    createdAt={kit.createdAt}
                    isActive={activeBrandKit?.id === kit.id}
                    needsReanalysis={kit.needsReanalysis}
                    onClick={() => handleSelectBrandKit(kit)}
                    onEdit={() => handleEditBrandKit(kit)}
                    onDelete={() => setBrandToDelete(kit)}
                    onReanalyze={() => handleReanalyzeBrandKit(kit)}
                    delay={index * 0.1}
                  />
                ))}
                <AddNewCard
                  label="Add Brand Kit"
                  onClick={handleNewBrandKit}
                  delay={brandKits.length * 0.1}
                />
              </div>
            )}
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <SectionHeader
              title="Your Campaigns"
              description="Manage and create new ad campaigns"
              actionLabel="Create Campaign"
              onAction={handleNewCampaign}
              actionDisabled={!activeBrandKit}
            />

            {!activeBrandKit && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-accent/10 border border-accent/20 text-sm text-accent-foreground"
              >
                Select a brand kit first to create campaigns
              </motion.div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign, index) => (
                <CampaignCard
                  key={campaign.id}
                  id={campaign.id}
                  name={campaign.name}
                  brand={campaign.brand}
                  status={campaign.status}
                  createdAt={campaign.createdAt}
                  onClick={() =>
                    handleOpenCampaign(campaign.id, campaign.status)
                  }
                  onLaunch={() =>
                    router.push(`/launch?campaignId=${campaign.id}`)
                  }
                  delay={index * 0.1}
                />
              ))}
              <AddNewCard
                label="Start New Campaign"
                onClick={handleNewCampaign}
                disabled={!activeBrandKit}
                delay={campaigns.length * 0.1}
                minHeight="280px"
              />
            </div>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AssetsGrid />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Brand Confirmation Modal */}
      <DeleteBrandModal
        isOpen={!!brandToDelete}
        onClose={() => setBrandToDelete(null)}
        onConfirm={handleDeleteBrandKit}
        brandName={brandToDelete?.name || ""}
      />

      {/* Reanalyze URL Modal (for brands without valid URL) */}
      <ReanalyzeUrlModal
        isOpen={!!brandToReanalyze}
        onClose={() => setBrandToReanalyze(null)}
        onSubmit={handleReanalyzeWithUrl}
        brandName={brandToReanalyze?.name || ""}
      />
    </div>
  );
}
