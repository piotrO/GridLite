"use client";

import { motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { Zap, Check, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditContext";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "month",
    description: "Get started for free",
    features: [
      "5 credits per month",
      "Brand scanning (1 credit)",
      "AI chat & strategy (1 credit)",
      "Watermarked exports",
    ],
    buttonText: "Current Plan",
    buttonVariant: "secondary" as const,
    popular: false,
  },
  {
    name: "Credit Pack",
    price: "$19",
    period: "50 credits",
    description: "Pay as you go",
    features: [
      "50 AI credits",
      "Never expires",
      "All AI features",
      "Unwatermarked exports",
      "Commercial license",
    ],
    buttonText: "Buy 50 Credits",
    buttonVariant: "hero" as const,
    popular: true,
    badge: "Best Value",
  },
  {
    name: "Pro",
    price: "$49",
    period: "month",
    description: "For power users",
    features: [
      "200 credits per month",
      "Priority AI generation",
      "Unlimited brand profiles",
      "Direct ad network sync",
    ],
    buttonText: "Subscribe",
    buttonVariant: "outline" as const,
    popular: false,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { addCredits } = useCredits();

  // Get the referrer from state, fallback to dashboard or home
  const referrer = (null as { from?: string })?.from;

  const getReturnPath = () => {
    if (referrer && (referrer === "/dashboard" || referrer === "/studio")) {
      return referrer;
    }
    return isAuthenticated ? "/dashboard" : "/";
  };

  const handlePlanAction = (planName: string) => {
    if (planName === "Free") {
      router.push(isAuthenticated ? "/dashboard" : "/");
    } else if (planName === "Credit Pack") {
      addCredits(50);
      router.push(getReturnPath());
    } else if (planName === "Pro") {
      addCredits(200);
      router.push(getReturnPath());
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border"
      >
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="iconSm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">
                GridLite
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(isAuthenticated ? "/dashboard" : "/")}
          >
            {isAuthenticated ? "Dashboard" : "Home"}
          </Button>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Simple Pricing
              </span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-4">
              Hire a Full Agency.{" "}
              <span className="gradient-text">Pay for Results.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No monthly fees required. Only pay when you love the creative.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className={`relative bg-card rounded-2xl border-2 p-8 shadow-xl hover:shadow-2xl transition-shadow ${
                  plan.popular
                    ? "border-primary scale-105 z-10"
                    : "border-border"
                }`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1">
                    {plan.badge}
                  </Badge>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">
                      / {plan.period}
                    </span>
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
                  onClick={() => handlePlanAction(plan.name)}
                >
                  {plan.buttonText}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* FAQ or Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-16"
          >
            <p className="text-sm text-muted-foreground">
              All plans include access to our AI team and brand scanning
              technology.
              <br />
              Questions?{" "}
              <span className="text-primary cursor-pointer hover:underline">
                Contact us
              </span>
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
