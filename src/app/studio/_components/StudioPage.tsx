"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Zap,
  ChevronLeft,
  Settings,
  ChevronDown,
  Check,
  GripVertical,
  LogOut,
  Share2,
  Copy,
  Link,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInterface, PersonaType } from "@/components/ChatInterface";
import { AdPreviewCanvas } from "./AdPreviewCanvas";
import { BrandAssetCard } from "./BrandAssetCard";
import { TemplateSelector } from "./TemplateSelector";
import { ContentPanel } from "./ContentPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useBrand, BrandKit } from "@/contexts/BrandContext";
import { useCredits } from "@/contexts/CreditContext";
import { CreditWallet } from "@/components/CreditWallet";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

interface Message {
  id: string;
  persona: PersonaType;
  content: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: "1",
    persona: "strategist",
    content:
      "Welcome to the Creative Studio! I've prepared your campaign based on the strategy we discussed. The Designer is ready to show you some concepts.",
    timestamp: new Date(),
  },
  {
    id: "2",
    persona: "designer",
    content:
      "I've created a bold Summer Sale design using your brand colors. The animation emphasizes the 50% discount to grab attention. What do you think?",
    timestamp: new Date(),
  },
];

export default function StudioPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { brandKits, activeBrandKit, setActiveBrandKit } = useBrand();
  const { credits, useCredit } = useCredits();

  const initialBrand = activeBrandKit || {
    name: "Your Brand",
    colors: ["#4F46E5", "#F97316", "#FBBF24", "#10B981"],
    tagline: "Building the future",
    font: "Inter",
    logo: "🚀",
  };

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedTemplate, setSelectedTemplate] = useState("1");
  const [isTyping, setIsTyping] = useState(false);
  const [brand, setBrand] = useState(initialBrand);
  const [content, setContent] = useState({
    headline: "SUMMER SALE",
    bodyCopy: "Don't miss out on our biggest sale of the year!",
    ctaText: "Shop Now",
    imageUrl: "",
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `https://studio8.ai/p/preview-${brand.name
    .toLowerCase()
    .replace(/\s+/g, "-")}-${Date.now().toString(36)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied to clipboard",
        description: "Share this link with anyone to preview your ad.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = (messageContent: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      persona: "user",
      content: messageContent,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    // Consume 1 credit for AI chat
    if (credits > 0) {
      useCredit();
    }

    // Simulate AI response
    setTimeout(() => {
      const responses: Message[] = [];

      if (credits === 0) {
        responses.push({
          id: (Date.now() + 1).toString(),
          persona: "strategist",
          content:
            "I'd love to help, but you're out of credits. Purchase more to continue working with the team!",
          timestamp: new Date(),
        });
      } else if (
        messageContent.toLowerCase().includes("logo") ||
        messageContent.toLowerCase().includes("bigger")
      ) {
        responses.push({
          id: (Date.now() + 1).toString(),
          persona: "designer",
          content:
            "Done! I've increased the logo size and repositioned it for better visibility. The canvas is updating now.",
          timestamp: new Date(),
        });
      } else if (messageContent.toLowerCase().includes("color")) {
        responses.push({
          id: (Date.now() + 1).toString(),
          persona: "designer",
          content:
            "Great idea! I can adjust the color scheme. Would you like me to make it more vibrant, or try a different palette from your brand colors?",
          timestamp: new Date(),
        });
      } else {
        responses.push({
          id: (Date.now() + 1).toString(),
          persona: "strategist",
          content:
            "That's a great suggestion! Let me think about how that aligns with our campaign goals...",
          timestamp: new Date(),
        });
      }

      setMessages((prev) => [...prev, ...responses]);
      setIsTyping(false);
    }, 1500);
  };

  const handleBackClick = () => {
    router.push("/dashboard");
  };

  const handleBrandKitChange = (kit: BrandKit) => {
    setActiveBrandKit(kit);
    setBrand(kit);
  };

  return (
    <div className="h-screen bg-background flex flex-col relative">
      {/* Designer Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--designer)/0.08)] via-transparent to-[hsl(var(--designer)/0.03)] pointer-events-none" />
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-14 border-b border-border backdrop-blur-lg bg-background/80 flex items-center justify-between px-4 shrink-0 relative z-10"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="iconSm" onClick={handleBackClick}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">
              GridLite Studio
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CreditWallet />
          {/* Brand Kit Switcher */}
          {brandKits.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-background"
                    style={{ backgroundColor: brand.colors?.[0] || "#4F46E5" }}
                  />
                  <span className="max-w-[120px] truncate">{brand.name}</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card">
                {brandKits.map((kit) => (
                  <DropdownMenuItem
                    key={kit.id}
                    onClick={() => handleBrandKitChange(kit)}
                    className="gap-3"
                  >
                    <div className="flex gap-1">
                      {kit.colors.slice(0, 3).map((color, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="flex-1 truncate">{kit.name}</span>
                    {activeBrandKit?.id === kit.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Share Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareModal(true)}
            className="gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="iconSm">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card">
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.header>

      {/* Share Preview Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-primary" />
              Share Public Preview
            </DialogTitle>
            <DialogDescription>
              Anyone with this link can view the ad preview and animation. They
              cannot make edits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted border border-border">
                <Link className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent text-sm text-foreground outline-none truncate"
                />
              </div>
              <Button
                onClick={handleCopyLink}
                className="shrink-0 gap-2"
                variant={copied ? "default" : "default"}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content - Resizable Split View */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - The Office (Chat) */}
        <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="h-full border-r border-border flex flex-col p-4"
          >
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                messages={messages}
                onSend={handleSendMessage}
                isTyping={isTyping}
                typingPersona="designer"
              />
            </div>
          </motion.div>
        </ResizablePanel>

        {/* Left Handle */}
        <ResizableHandle
          withHandle
          className="w-1.5 bg-border hover:bg-primary/20 transition-colors"
        >
          <div className="flex items-center justify-center h-full">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        </ResizableHandle>

        {/* Center - Canvas Area */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="h-full bg-muted/30"
          >
            <AdPreviewCanvas
              selectedTemplate={selectedTemplate}
              adName={`${brand.name} Summer Sale`}
              data={{
                headline: content.headline,
                bodyCopy: content.bodyCopy,
                ctaText: content.ctaText,
                imageUrl: content.imageUrl,
                colors: brand.colors,
                logoUrl: brand.logo,
              }}
            />
          </motion.div>
        </ResizablePanel>

        {/* Right Handle */}
        <ResizableHandle
          withHandle
          className="w-1.5 bg-border hover:bg-primary/20 transition-colors"
        >
          <div className="flex items-center justify-center h-full">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        </ResizableHandle>

        {/* Right Panel - Assets & Templates */}
        <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="h-full border-l border-border p-4 space-y-4 overflow-y-auto"
          >
            <BrandAssetCard
              brand={brand as any}
              editable={true}
              onBrandChange={setBrand as any}
            />
            <ContentPanel content={content} onChange={setContent} />
            <TemplateSelector
              selectedId={selectedTemplate}
              onSelect={setSelectedTemplate}
            />
          </motion.div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
