"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditsBannerProps {
  credits: number;
  returnPath?: string;
}

export function CreditsBanner({
  credits,
  returnPath = "/dashboard",
}: CreditsBannerProps) {
  const router = useRouter();

  if (credits > 5) return null;

  const isEmpty = credits === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
        isEmpty
          ? "bg-destructive/10 border border-destructive/20"
          : "bg-accent/10 border border-accent/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isEmpty ? "bg-destructive/20" : "bg-accent/20"
          }`}
        >
          <CreditCard
            className={`w-5 h-5 ${
              isEmpty ? "text-destructive" : "text-accent"
            }`}
          />
        </div>
        <div>
          <p className="font-medium text-foreground">
            {isEmpty
              ? "Out of credits"
              : `${credits} credit${credits !== 1 ? "s" : ""} remaining`}
          </p>
          <p className="text-sm text-muted-foreground">
            {isEmpty
              ? "Purchase credits to use AI features"
              : "AI actions like scanning, chat & image generation use credits"}
          </p>
        </div>
      </div>
      <Button
        variant="hero"
        size="sm"
        onClick={() => router.push(`/pricing?from=${returnPath}`)}
      >
        {isEmpty ? "Buy Credits" : "Get More"}
      </Button>
    </motion.div>
  );
}
