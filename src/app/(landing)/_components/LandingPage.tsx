"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { SignInModal } from "@/components/SignInModal";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditContext";
import { Navbar } from "@/components/Navbar";
import { PricingPlans } from "@/components/PricingPlans";
import { WhiteLabelSection } from "@/components/WhiteLabelSection";
import { Footer } from "@/components/Footer";
import { HeroSection } from "./HeroSection";
import { DemoPreview } from "./DemoPreview";
import { FeaturesSection } from "./FeaturesSection";
import { CTASection } from "./CTASection";

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

  const handlePricingClick = () => {
    const pricingSection = document.getElementById("pricing-section");
    pricingSection?.scrollIntoView({ behavior: "smooth" });
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
        <Navbar
          onPricingClick={handlePricingClick}
          onAuthClick={handleSignInClick}
          isAuthenticated={isAuthenticated}
        />

        <SignInModal open={showSignIn} onOpenChange={setShowSignIn} />

        <HeroSection
          url={url}
          onUrlChange={setUrl}
          onSubmit={handleSubmit}
        />

        <DemoPreview />

        <FeaturesSection />

        <section id="pricing-section" className="py-20 px-6">
          <PricingPlans onPlanAction={handlePlanAction} />
        </section>

        <WhiteLabelSection />

        <CTASection />

        <Footer />
      </div>
    </div>
  );
}
