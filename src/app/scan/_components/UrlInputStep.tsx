"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { GradientBackground } from "@/components/GradientBackground";

interface UrlInputStepProps {
  urlInput: string;
  onUrlChange: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isAuthenticated: boolean;
}

export function UrlInputStep({
  urlInput,
  onUrlChange,
  onSubmit,
  isAuthenticated,
}: UrlInputStepProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <GradientBackground colorVar="researcher" />
      {isAuthenticated && <PageHeader />}

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-researcher/20 flex items-center justify-center mx-auto mb-6">
            <Search className="w-8 h-8 text-researcher" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Add Your Brand
          </h1>
          <p className="text-muted-foreground mb-8">
            Enter your website URL and we'll analyze your brand identity,
            colors, typography, and more.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://yourbrand.com"
              className="w-full h-14 rounded-xl border-2 border-border bg-card px-4 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-researcher focus:ring-4 focus:ring-researcher/10 transition-all"
              required
            />
            <Button type="submit" variant="hero" size="xl" className="w-full">
              <Search className="w-5 h-5 mr-2" />
              Scan Website
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
