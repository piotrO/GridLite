"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeroSectionProps {
    url: string;
    onUrlChange: (url: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export function HeroSection({ url, onUrlChange, onSubmit }: HeroSectionProps) {
    return (
        <section className="pt-32 pb-20 px-6 relative">
            <div className="container mx-auto max-w-4xl text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
                >
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">
                        Your Personal AI Ad Agency
                    </span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-tight mb-6"
                >
                    Create Stunning Ads{" "}
                    <span className="gradient-text">Without the Agency</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
                >
                    Enter your website. Our AI team analyzes your brand, crafts strategy,
                    and generates professional animated ads in minutes—not weeks.
                </motion.p>

                {/* URL Input */}
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onSubmit={onSubmit}
                    className="max-w-xl mx-auto"
                >
                    <div className="relative flex gap-3 p-2 rounded-2xl bg-card border-2 border-border shadow-lg hover:shadow-xl transition-shadow">
                        <Input
                            type="text"
                            placeholder="Enter your website URL..."
                            value={url}
                            onChange={(e) => onUrlChange(e.target.value)}
                            className="flex-1 border-0 shadow-none focus-visible:ring-0 h-12 text-base"
                        />
                        <Button type="submit" variant="hero" size="lg" className="shrink-0">
                            <span className="hidden sm:inline">Analyze My Brand</span>
                            <span className="sm:hidden">Analyze</span>
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                        Free to try • No credit card required • Results in 60 seconds
                    </p>
                </motion.form>
            </div>
        </section>
    );
}
