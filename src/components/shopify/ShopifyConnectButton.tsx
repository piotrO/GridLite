"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Store, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ShopifyConnectButtonProps {
  onConnect: (shopDomain: string) => Promise<void>;
  isConnecting?: boolean;
  isConnected?: boolean;
  shopName?: string;
  error?: string | null;
  onDisconnect?: () => void;
  onClearError?: () => void;
  className?: string;
}

export function ShopifyConnectButton({
  onConnect,
  isConnecting = false,
  isConnected = false,
  shopName,
  error,
  onDisconnect,
  onClearError,
  className,
}: ShopifyConnectButtonProps) {
  const [showInput, setShowInput] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  const [hasRetried, setHasRetried] = useState(false);

  const handleConnect = async () => {
    if (!shopDomain.trim()) return;
    setHasRetried(false);
    await onConnect(shopDomain.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConnect();
    }
  };

  const handleTryAgain = () => {
    setHasRetried(true);
    setShowInput(true);
    setShopDomain("");
    onClearError?.();
  };

  // Connected state
  if (isConnected && shopName) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl bg-success/10 border border-success/20",
          className,
        )}
      >
        <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-success" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{shopName}</p>
          <p className="text-xs text-muted-foreground">Connected to Shopify</p>
        </div>
        {onDisconnect && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDisconnect}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </motion.div>
    );
  }

  // Error state - show error with retry option OR input field if already retried
  if (error && !hasRetried) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn("space-y-3", className)}
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
        <Button onClick={handleTryAgain} variant="outline" className="w-full">
          Try Again
        </Button>
      </motion.div>
    );
  }

  // Input mode
  if (showInput) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("space-y-3", className)}
      >
        <div className="relative">
          <Input
            type="text"
            placeholder="your-store.myshopify.com"
            value={shopDomain}
            onChange={(e) => setShopDomain(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isConnecting}
            className="pr-28"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={!shopDomain.trim() || isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInput(false)}
          className="w-full text-muted-foreground"
        >
          Cancel
        </Button>
      </motion.div>
    );
  }

  // Default state - connect button
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <Button
        onClick={() => setShowInput(true)}
        className="w-full h-14 gap-3 bg-[#96bf48] hover:bg-[#7aa93c] text-white"
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Connecting to Shopify...</span>
          </>
        ) : (
          <>
            <ShopifyLogo className="w-6 h-6" />
            <span className="font-medium">Connect Shopify Store</span>
          </>
        )}
      </Button>
    </motion.div>
  );
}

// Shopify logo SVG component
function ShopifyLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 109.5 124.5" className={className} fill="currentColor">
      <path d="M95.9 23.9c-.1-.6-.6-1-1.1-1-.5 0-9.3-.2-9.3-.2s-6.2-6.1-6.9-6.8c-.7-.7-2-.5-2.5-.3 0 0-1.3.4-3.4 1.1-2-5.8-5.6-11.1-11.9-11.1h-.5C58.4 2.5 55.5.5 53.1.5c-14.9-.1-22 18.6-24.2 28-5.8 1.8-10 3.1-10.5 3.3-3.3 1-3.4 1.1-3.8 4.2-.3 2.3-8.9 68.8-8.9 68.8l66 12.4 35.7-7.7S96 24.5 95.9 23.9zM67.3 18.1l-5.4 1.7V18c0-1.6-.2-3-.5-4.1 3.2.5 5.1 4.1 5.9 4.2zm-9.4-3.8c.4 1.3.6 3.1.6 5.5v.4l-11.1 3.4c2.1-8.2 6.2-12.1 10.5-9.3zm-4.3-8.3c.7 0 1.4.2 2.1.7-5 2.4-10.4 8.4-12.7 20.4l-8.8 2.7c2.5-8.4 8.3-23.8 19.4-23.8z" />
      <path
        d="M94.8 22.9c-.5 0-9.3-.2-9.3-.2s-6.2-6.1-6.9-6.8c-.2-.2-.5-.4-.8-.4l-4.9 100.7 35.7-7.7S96 24.5 95.9 23.9c0-.6-.6-1-1.1-1z"
        fill="#5e8e3e"
      />
      <path
        d="M53.1 42.2l-4.4 13.1s-3.9-2-8.5-2c-6.9 0-7.2 4.3-7.2 5.4 0 5.9 15.4 8.2 15.4 22.1 0 10.9-6.9 18-16.2 18-11.2 0-16.9-7-16.9-7l3-9.8s5.9 5 10.8 5c3.2 0 4.6-2.5 4.6-4.4 0-7.7-12.6-8-12.6-20.8 0-10.7 7.7-21.1 23.2-21.1 5.9 0 8.8 1.5 8.8 1.5z"
        fill="#fff"
      />
    </svg>
  );
}

export { ShopifyLogo };
