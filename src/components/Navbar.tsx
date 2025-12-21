"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
    onPricingClick?: () => void;
    onAuthClick: () => void;
    isAuthenticated: boolean;
    showBackButton?: boolean;
    onBackClick?: () => void;
}

export function Navbar({
    onPricingClick,
    onAuthClick,
    isAuthenticated,
    showBackButton,
    onBackClick,
}: NavbarProps) {
    return (
        <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border"
        >
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {showBackButton && onBackClick && (
                        <Button variant="ghost" size="iconSm" onClick={onBackClick}>
                            <Zap className="w-4 h-4" />
                        </Button>
                    )}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <Zap className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-lg text-foreground">GridLite</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onPricingClick && (
                        <Button variant="ghost" size="sm" onClick={onPricingClick}>
                            Pricing
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={onAuthClick}>
                        {isAuthenticated ? "Dashboard" : "Sign In"}
                    </Button>
                </div>
            </div>
        </motion.header>
    );
}
