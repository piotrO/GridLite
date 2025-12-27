"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { ChatInterface } from "@/components/ChatInterface";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { PageHeader } from "@/components/PageHeader";
import { GradientBackground } from "@/components/GradientBackground";
import { StrategyOptionsPanel } from "./StrategyOptionsPanel";
import { StrategyLoadingState } from "./StrategyLoadingState";
import { useStrategy } from "./useStrategy";

export default function StrategyPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { activeBrandKit } = useBrand();

  const {
    messages,
    isTyping,
    isLoading,
    loadingStatus,
    strategyData,
    strategyOptions,
    handleSend,
    toggleOption,
  } = useStrategy();

  const brand = activeBrandKit || { name: "Your Brand" };

  const handleApprove = () => router.push("/studio");

  // Loading state
  if (isLoading) {
    return (
      <StrategyLoadingState status={loadingStatus} brandName={brand.name} />
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <GradientBackground colorVar="strategist" />
      {isAuthenticated && <PageHeader />}

      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-10 h-10 rounded-full bg-strategist flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Strategy Session
            </h1>
            <p className="text-sm text-muted-foreground">with The Strategist</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Chat Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
            style={{ minHeight: "500px" }}
          >
            <ChatInterface
              messages={messages}
              onSend={handleSend}
              isTyping={isTyping}
              typingPersona="strategist"
              placeholder="Ask about the strategy or suggest changes..."
            />
          </motion.div>

          {/* Strategy Options Section */}
          <StrategyOptionsPanel
            brandName={brand.name}
            options={strategyOptions}
            showOptions={true}
            onToggleOption={toggleOption}
            onApprove={handleApprove}
            strategyData={strategyData}
          />
        </div>
      </div>
    </div>
  );
}
