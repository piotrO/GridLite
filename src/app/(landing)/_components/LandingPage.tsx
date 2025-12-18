"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Users,
  Palette,
  Target,
  Play,
  Check,
  Building2,
  Globe,
  Coins,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { SignInModal } from "@/components/SignInModal";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditContext";
import { FeatureCard } from "@/components/FeatureCard";
const features = [
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
    buttonText: "Start Free",
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

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { addCredits } = useCredits();

  const handlePlanAction = (planName: string) => {
    if (planName === "Free") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (planName === "Credit Pack") {
      addCredits(50);
      toast({
        title: "Credits added!",
        description: "50 credits have been added to your account.",
      });
    } else if (planName === "Pro") {
      addCredits(200);
      toast({
        title: "Pro subscription activated!",
        description: "200 credits have been added to your account.",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      router.push(`/scan?url=${encodeURIComponent(url)}`);
    } else {
      toast({
        title: "Please enter a URL",
        description: "Enter your website URL to analyze your brand",
        variant: "destructive",
      });
    }
  };

  const handleSignInClick = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      setShowSignIn(true);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Static Grid Background */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px]"
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 50% at 50% 0%, black 70%, transparent 100%)",
        }}
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-accent/10 pointer-events-none" />
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border"
        >
          <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">
                GridLite
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const pricingSection =
                    document.getElementById("pricing-section");
                  pricingSection?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Pricing
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignInClick}>
                {isAuthenticated ? "Dashboard" : "Sign In"}
              </Button>
            </div>
          </div>
        </motion.header>

        <SignInModal open={showSignIn} onOpenChange={setShowSignIn} />

        {/* Hero */}
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
              Enter your website. Our AI team analyzes your brand, crafts
              strategy, and generates professional animated ads in minutes—not
              weeks.
            </motion.p>

            {/* URL Input */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onSubmit={handleSubmit}
              className="max-w-xl mx-auto"
            >
              <div className="relative flex gap-3 p-2 rounded-2xl bg-card border-2 border-border shadow-lg hover:shadow-xl transition-shadow">
                <Input
                  type="url"
                  placeholder="Enter your website URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 border-0 shadow-none focus-visible:ring-0 h-12 text-base"
                />
                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="shrink-0"
                >
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

        {/* Demo Preview */}
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

        {/* Features */}
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

        {/* Pricing */}
        <section id="pricing-section" className="py-20 px-6">
          <div className="container mx-auto max-w-5xl">
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

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ delay: index * 0.1 }}
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
                        <span className="text-sm text-foreground">
                          {feature}
                        </span>
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
          </div>
        </section>

        {/* White Label / Agency Section */}
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
                    <p className="text-sm text-muted-foreground mb-1">
                      Pricing
                    </p>
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

        {/* CTA */}
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
                Join thousands of businesses creating professional ads without
                the agency markup.
              </p>
              <Button variant="hero" size="xl">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-border">
          <div className="container mx-auto text-center text-sm text-muted-foreground">
            © 2024 GridLite. Your Personal AI Ad Agency.
          </div>
        </footer>
      </div>
    </div>
  );
}
