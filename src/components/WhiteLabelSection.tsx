"use client";

import { motion } from "framer-motion";
import { Building2, Globe, Users, Coins, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function WhiteLabelSection() {
    return (
        <section className="py-16 px-6">
            <div className="container mx-auto max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-100 to-blue-100 dark:from-slate-900/70 dark:to-blue-950/50 p-8 md:p-10 overflow-hidden"
                >
                    {/* Subtle background pattern */}
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary to-accent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    </div>

                    <div className="relative flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">
                        {/* Left Content */}
                        <div className="flex-1 space-y-6">
                            <div>
                                <Badge
                                    variant="outline"
                                    className="mb-4 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                                >
                                    <Building2 className="w-3 h-3 mr-1.5" />
                                    Agency Partner Program
                                </Badge>
                                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                                    White Label Our AI Engine
                                </h2>
                                <p className="text-muted-foreground max-w-xl">
                                    Run this entire platform under your own brand, domain, and
                                    logo. Perfect for agencies wanting to offer an "AI Ad
                                    Generator" directly to their clients.
                                </p>
                            </div>

                            {/* Features Grid */}
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                        <Globe className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">
                                        Custom Branding & Domain
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">
                                        Client Sub-account Management
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                        <Coins className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">
                                        Wholesale Credit Pricing
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right CTA Section */}
                        <div className="lg:w-72 flex flex-col items-center lg:items-end text-center lg:text-right space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Pricing</p>
                                <p className="text-xl font-semibold text-foreground">
                                    Custom Monthly Licensing
                                </p>
                            </div>
                            <Button
                                size="lg"
                                variant="outline"
                                className="gap-2 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() =>
                                (window.location.href =
                                    "mailto:partners@gridlite.com?subject=Agency%20Partnership%20Inquiry")
                                }
                            >
                                <Mail className="w-4 h-4" />
                                Contact Partnership Team
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
