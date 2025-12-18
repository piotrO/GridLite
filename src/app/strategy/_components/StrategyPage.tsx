"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Target, Users, Zap, Lightbulb, LucideIcon } from "lucide-react";
import { ChatInterface, PersonaType } from "@/components/ChatInterface";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand } from "@/contexts/BrandContext";
import { useCredits } from "@/contexts/CreditContext";
import { PageHeader } from "@/components/PageHeader";
import { GradientBackground } from "@/components/GradientBackground";
import { StrategyOptionsPanel } from "./StrategyOptionsPanel";

interface Message {
  id: string;
  persona: PersonaType;
  content: string;
  timestamp: Date;
}

interface StrategyOption {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
}

const defaultStrategyOptions: StrategyOption[] = [
  {
    id: "awareness",
    title: "Brand Awareness Campaign",
    description:
      "High-impact display ads across premium networks to maximize visibility",
    icon: Target,
    selected: true,
  },
  {
    id: "conversion",
    title: "Conversion-Focused",
    description:
      "Retargeting ads with strong CTAs to drive immediate purchases",
    icon: Zap,
    selected: false,
  },
  {
    id: "engagement",
    title: "Social Engagement",
    description: "Interactive ad formats designed for social media platforms",
    icon: Users,
    selected: false,
  },
];

export default function StrategyPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { activeBrandKit } = useBrand();
  const { credits, useCredit } = useCredits();

  const brand = activeBrandKit || { name: "Your Brand" };

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [strategyOptions, setStrategyOptions] = useState<StrategyOption[]>(
    defaultStrategyOptions
  );

  const initialMessages: Omit<Message, "id" | "timestamp">[] = [
    {
      persona: "strategist",
      content: `Hey! I've been diving deep into ${brand.name}'s brand identity. Really exciting stuff! 🎯`,
    },
    {
      persona: "strategist",
      content:
        "Based on my analysis, I've identified three strategic directions. Each has its strengths.",
    },
    {
      persona: "strategist",
      content:
        "I recommend starting with a Brand Awareness Campaign — it's the strongest fit. Feel free to ask about other options!",
    },
  ];

  // Typing effect for initial messages
  useEffect(() => {
    if (currentMessageIndex < initialMessages.length) {
      setIsTyping(true);
      const delay = currentMessageIndex === 0 ? 800 : 1500;

      const timer = setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${currentMessageIndex}`,
            ...initialMessages[currentMessageIndex],
            timestamp: new Date(),
          },
        ]);
        setCurrentMessageIndex((prev) => prev + 1);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [currentMessageIndex, brand.name]);

  const handleSend = (message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        persona: "user",
        content: message,
        timestamp: new Date(),
      },
    ]);
    if (credits > 0) useCredit();

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const responses =
        credits > 0
          ? [
              "Great question! Let me think about that adjustment...",
              "I love that direction! Here's how we can incorporate that...",
              "Absolutely, we can pivot the approach!",
            ]
          : ["I'd love to help, but you're out of credits."];
      setMessages((prev) => [
        ...prev,
        {
          id: `strategist-${Date.now()}`,
          persona: "strategist",
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date(),
        },
      ]);
    }, 1500);
  };

  const toggleOption = (id: string) => {
    setStrategyOptions((prev) =>
      prev.map((opt) => ({ ...opt, selected: opt.id === id }))
    );
  };

  const handleApprove = () => router.push("/studio");

  const showOptions = currentMessageIndex >= 2;

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
            showOptions={showOptions}
            onToggleOption={toggleOption}
            onApprove={handleApprove}
          />
        </div>
      </div>
    </div>
  );
}
