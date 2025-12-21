"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
    onCtaClick?: () => void;
}

export function CTASection({ onCtaClick }: CTASectionProps) {
    return (
        <section className="py-20 px-6">
            <div className="container mx-auto max-w-3xl text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    className="p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-designer/10 border-2 border-primary/20"
                >
                    <h2 className="text-3xl font-bold text-foreground mb-4">
                        Ready to Transform Your Advertising?
                    </h2>
                    <p className="text-muted-foreground mb-8">
                        Join thousands of businesses creating professional ads without the
                        agency markup.
                    </p>
                    <Button variant="hero" size="xl" onClick={onCtaClick}>
                        Get Started Free
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </motion.div>
            </div>
        </section>
    );
}
