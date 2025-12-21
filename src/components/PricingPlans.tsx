"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRICING_PLANS, PricingPlan } from "@/data/pricing";

interface PricingPlansProps {
    onPlanAction: (planName: string) => void;
    showHeader?: boolean;
}

export function PricingPlans({
    onPlanAction,
    showHeader = true,
}: PricingPlansProps) {
    return (
        <div className="container mx-auto max-w-5xl">
            {showHeader && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight mb-4">
                        Hire a Full Agency.{" "}
                        <span className="gradient-text">Pay for Results.</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        No monthly fees required. Only pay when you love the creative.
                    </p>
                </motion.div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
                {PRICING_PLANS.map((plan, index) => (
                    <PricingCard
                        key={plan.name}
                        plan={plan}
                        index={index}
                        onAction={onPlanAction}
                    />
                ))}
            </div>
        </div>
    );
}

interface PricingCardProps {
    plan: PricingPlan;
    index: number;
    onAction: (planName: string) => void;
}

function PricingCard({ plan, index, onAction }: PricingCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: index * 0.1 }}
            className={`relative bg-card rounded-2xl border-2 p-8 shadow-xl hover:shadow-2xl transition-shadow ${plan.popular ? "border-primary scale-105 z-10" : "border-border"
                }`}
        >
            {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1">
                    {plan.badge}
                </Badge>
            )}

            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold text-foreground">
                        {plan.price}
                    </span>
                    <span className="text-muted-foreground">/ {plan.period}</span>
                </div>
            </div>

            <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm text-foreground">{feature}</span>
                    </li>
                ))}
            </ul>

            <Button
                variant={plan.buttonVariant}
                className="w-full"
                size="lg"
                onClick={() => onAction(plan.name)}
            >
                {plan.buttonText}
            </Button>
        </motion.div>
    );
}
