"use client";

import { motion } from "framer-motion";
import { Target, Palette, Users, LucideIcon } from "lucide-react";
import { FeatureCard } from "@/components/FeatureCard";

interface Feature {
    icon: LucideIcon;
    title: string;
    description: string;
}

const features: Feature[] = [
    {
        icon: Target,
        title: "AI Strategy",
        description:
            "Get campaign angles crafted by AI that understands your brand",
    },
    {
        icon: Palette,
        title: "Smart Creatives",
        description: "Animated HTML5 ads that convert, generated in seconds",
    },
    {
        icon: Users,
        title: "Your AI Team",
        description: "Work with AI personas that feel like a real agency",
    },
];

export function FeaturesSection() {
    return (
        <section className="py-20 px-6">
            <div className="container mx-auto max-w-5xl">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.1 }}
                    className="grid md:grid-cols-3 gap-6"
                >
                    {features.map((feature, index) => (
                        <FeatureCard
                            key={feature.title}
                            icon={feature.icon}
                            title={feature.title}
                            description={feature.description}
                            delay={index * 0.1}
                        />
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
