"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  Package,
  CheckCircle2,
  ArrowRight,
  Loader2,
  RefreshCw,
  BarChart3,
  Tag,
  Grid3X3,
  Sparkles,
  ImageIcon,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ShopifyConnectButton } from "./ShopifyConnectButton";
import { useProducts } from "@/contexts/ProductContext";
import { CatalogStats, Product } from "@/types/shopify";
import { cn } from "@/lib/utils";

type FlowStep = "connect" | "syncing" | "synced";

interface ShopifyConnectionFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
  className?: string;
}

export function ShopifyConnectionFlow({
  onComplete,
  onSkip,
  className,
}: ShopifyConnectionFlowProps) {
  const {
    shopifyConnection,
    isConnected,
    isConnecting,
    isSyncing,
    syncStatus,
    catalogStats,
    products,
    error,
    initiateConnection,
    syncProducts,
    disconnectStore,
    clearError,
  } = useProducts();

  const [currentStep, setCurrentStep] = useState<FlowStep>(
    isConnected ? "syncing" : "connect",
  );
  const [hasSyncStarted, setHasSyncStarted] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log("[ShopifyConnectionFlow] State update:", {
      currentStep,
      isConnected,
      isConnecting,
      hasSyncStarted,
      productsCount: products.length,
      catalogStats: catalogStats ? "yes" : "no",
      error,
    });
  }, [
    currentStep,
    isConnected,
    isConnecting,
    hasSyncStarted,
    products.length,
    catalogStats,
    error,
  ]);

  // Handle store connection
  const handleConnect = useCallback(
    async (shopDomain: string) => {
      console.log("[ShopifyConnectionFlow] handleConnect:", shopDomain);
      await initiateConnection(shopDomain);
    },
    [initiateConnection],
  );

  // Handle sync initiation (only syncs, doesn't analyze)
  const handleStartSync = useCallback(async () => {
    console.log(
      "[ShopifyConnectionFlow] handleStartSync: Starting product sync...",
    );
    setCurrentStep("syncing");
    setHasSyncStarted(true);

    try {
      await syncProducts();
      console.log(
        "[ShopifyConnectionFlow] handleStartSync: Sync complete, moving to synced step",
      );
      setCurrentStep("synced");
    } catch (err) {
      console.error(
        "[ShopifyConnectionFlow] handleStartSync: Sync failed",
        err,
      );
    }
  }, [syncProducts]);

  // Handle approval - directly call onComplete
  const handleApprove = useCallback(() => {
    console.log(
      "[ShopifyConnectionFlow] handleApprove: Proceeding to strategist...",
    );
    onComplete();
  }, [onComplete]);

  // Auto-start sync when connection is established
  useEffect(() => {
    console.log("[ShopifyConnectionFlow] useEffect check:", {
      isConnected,
      hasSyncStarted,
      currentStep,
      shouldStartSync:
        isConnected && !hasSyncStarted && currentStep === "connect",
    });

    if (isConnected && !hasSyncStarted && currentStep === "connect") {
      console.log("[ShopifyConnectionFlow] Auto-starting sync...");
      handleStartSync();
    }
  }, [isConnected, hasSyncStarted, currentStep, handleStartSync]);

  return (
    <div className={cn("w-full max-w-lg mx-auto", className)}>
      <AnimatePresence mode="wait">
        {currentStep === "connect" && (
          <ConnectStep
            key="connect"
            onConnect={handleConnect}
            isConnecting={isConnecting}
            error={error}
            onClearError={clearError}
            onSkip={onSkip}
          />
        )}

        {currentStep === "syncing" && (
          <SyncingStep
            key="syncing"
            syncStatus={syncStatus}
            isSyncing={isSyncing}
          />
        )}

        {currentStep === "synced" && catalogStats && (
          <SyncedStep
            key="synced"
            stats={catalogStats}
            products={products}
            shopName={shopifyConnection?.shopName || "Your Store"}
            onApprove={handleApprove}
            onResync={handleStartSync}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Step Components
// ============================================================

interface ConnectStepProps {
  onConnect: (domain: string) => Promise<void>;
  isConnecting: boolean;
  error: string | null;
  onClearError?: () => void;
  onSkip?: () => void;
}

function ConnectStep({
  onConnect,
  isConnecting,
  error,
  onClearError,
  onSkip,
}: ConnectStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center space-y-6"
    >
      {/* Icon */}
      <div className="w-20 h-20 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
        <Store className="w-10 h-10 text-accent" />
      </div>

      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Connect Your Shopify Store
        </h3>
        <p className="text-muted-foreground">
          Import your product catalog to create dynamic product ads
        </p>
      </div>

      {/* Connect Button */}
      <ShopifyConnectButton
        onConnect={onConnect}
        isConnecting={isConnecting}
        error={error}
        onClearError={onClearError}
      />

      {/* Skip Option */}
      {onSkip && (
        <Button
          variant="ghost"
          onClick={onSkip}
          className="text-muted-foreground"
        >
          Skip for now
        </Button>
      )}

      {/* Benefits */}
      <div className="pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Auto-sync products</p>
          </div>
          <div>
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">AI-powered ads</p>
          </div>
          <div>
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Smart targeting</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface SyncingStepProps {
  syncStatus: {
    progress: number;
    syncedProducts: number;
    totalProducts: number;
  };
  isSyncing: boolean;
}

function SyncingStep({ syncStatus, isSyncing }: SyncingStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center space-y-6"
    >
      {/* Animated Icon */}
      <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center relative">
        <Package className="w-10 h-10 text-primary" />
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-primary/30"
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Syncing Your Catalog
        </h3>
        <p className="text-muted-foreground">
          Importing products from your Shopify store...
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <Progress value={syncStatus.progress} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {syncStatus.syncedProducts} / {syncStatus.totalProducts || "..."}{" "}
            products
          </span>
          <span>{Math.round(syncStatus.progress)}%</span>
        </div>
      </div>

      {/* Loading indicator */}
      {isSyncing && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">This may take a moment...</span>
        </div>
      )}
    </motion.div>
  );
}

// New step: Shows synced products, user must approve to continue
interface SyncedStepProps {
  stats: CatalogStats;
  products: Product[];
  shopName: string;
  onApprove: () => void;
  onResync: () => void;
}

function SyncedStep({
  stats,
  products,
  shopName,
  onApprove,
  onResync,
}: SyncedStepProps) {
  const [showAllProducts, setShowAllProducts] = useState(false);
  const displayProducts = showAllProducts ? products : products.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      {/* Success Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-14 h-14 mx-auto mb-3 rounded-full bg-success/10 flex items-center justify-center"
        >
          <CheckCircle2 className="w-7 h-7 text-success" />
        </motion.div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Products Synced!
        </h3>
        <p className="text-sm text-muted-foreground">
          {products.length} products imported from {shopName}
        </p>
      </div>

      {/* Product Preview Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            Product Preview
          </p>
          {products.length > 6 && (
            <button
              onClick={() => setShowAllProducts(!showAllProducts)}
              className="text-xs text-primary hover:underline"
            >
              {showAllProducts ? "Show less" : `View all ${products.length}`}
            </button>
          )}
        </div>

        <div
          className={cn(
            "grid grid-cols-3 gap-2",
            showAllProducts && "max-h-64 overflow-y-auto pr-1",
          )}
        >
          {displayProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="group relative rounded-lg border border-border bg-background overflow-hidden hover:border-primary/50 transition-colors"
            >
              {/* Product Image */}
              <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                {product.images.length > 0 ? (
                  <img
                    src={product.images[0].src}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                )}
              </div>

              {/* Product Info */}
              <div className="p-2 space-y-0.5">
                <p
                  className="text-xs font-medium text-foreground truncate"
                  title={product.title}
                >
                  {product.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {product.currency}
                  {product.price.toFixed(2)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <p className="text-sm font-semibold text-foreground">
            {stats.totalProducts}
          </p>
          <p className="text-[10px] text-muted-foreground">Products</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <p className="text-sm font-semibold text-foreground">
            {stats.categories.length}
          </p>
          <p className="text-[10px] text-muted-foreground">Categories</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <p className="text-sm font-semibold text-foreground">
            {stats.vendors.length}
          </p>
          <p className="text-[10px] text-muted-foreground">Vendors</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <p className="text-sm font-semibold text-foreground">
            {stats.inventoryStatus.inStock}
          </p>
          <p className="text-[10px] text-muted-foreground">In Stock</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={onApprove} className="w-full gap-2">
          <Sparkles className="w-4 h-4" />
          Approve & Analyze Catalog
        </Button>
        <Button
          variant="ghost"
          onClick={onResync}
          className="w-full gap-2 text-muted-foreground"
          size="sm"
        >
          <RefreshCw className="w-3 h-3" />
          Resync Products
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================
// Helper Components
// ============================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: "primary" | "accent" | "designer" | "researcher";
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    designer: "bg-designer/10 text-designer",
    researcher: "bg-researcher/10 text-researcher",
  };

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
          colorClasses[color],
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
