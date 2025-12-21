"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditContext";
import { Navbar } from "@/components/Navbar";
import { PricingPlans } from "@/components/PricingPlans";
import { WhiteLabelSection } from "@/components/WhiteLabelSection";
import { Footer } from "@/components/Footer";

export default function PricingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { addCredits } = useCredits();

  const getReturnPath = () => {
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

  const handleAuthClick = () => {
    router.push(isAuthenticated ? "/dashboard" : "/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        onAuthClick={handleAuthClick}
        isAuthenticated={isAuthenticated}
        showBackButton
        onBackClick={() => router.back()}
      />

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
          </motion.div>

          {/* Pricing Cards */}
          <PricingPlans onPlanAction={handlePlanAction} />

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

      {/* White Label Section */}
      <WhiteLabelSection />

      <Footer />
    </div>
  );
}
