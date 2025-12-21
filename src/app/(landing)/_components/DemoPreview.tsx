"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";

export function DemoPreview() {
    return (
        <section className="py-12 px-6">
            <div className="container mx-auto max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="relative rounded-3xl overflow-hidden border-2 border-border shadow-2xl bg-card"
                >
                    {/* Mock Studio Interface */}
                    <div className="aspect-[16/9] bg-gradient-to-br from-muted to-secondary flex">
                        {/* Left Panel - Chat */}
                        <div className="w-2/5 border-r border-border p-6 flex flex-col">
                            <div className="text-sm font-semibold text-muted-foreground mb-4">
                                THE OFFICE
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded-full bg-strategist shrink-0" />
                                    <div className="bg-strategist/10 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%]">
                                        <span className="text-xs font-semibold text-strategist">
                                            The Strategist
                                        </span>
                                        <p className="text-sm text-foreground">
                                            I've analyzed your brand. Let's create something that
                                            converts!
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded-full bg-designer shrink-0" />
                                    <div className="bg-designer/10 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%]">
                                        <span className="text-xs font-semibold text-designer">
                                            The Designer
                                        </span>
                                        <p className="text-sm text-foreground">
                                            Here are 3 animated concepts using your brand colors!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Right Panel - Canvas */}
                        <div className="flex-1 p-6 flex items-center justify-center">
                            <div className="w-[200px] h-[167px] rounded-xl bg-gradient-to-br from-accent via-gold to-accent shadow-lg flex flex-col items-center justify-center">
                                <div className="text-xl font-bold text-accent-foreground">
                                    SUMMER SALE
                                </div>
                                <div className="text-4xl font-extrabold text-accent-foreground">
                                    50% OFF
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-foreground/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                        <div className="w-16 h-16 rounded-full bg-primary shadow-glow flex items-center justify-center">
                            <Play className="w-6 h-6 text-primary-foreground ml-1" />
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
