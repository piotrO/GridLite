"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Code } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Platform {
  id: string;
  name: string;
  logo: string;
}

interface PlatformSelectionCardProps {
  platforms: Platform[];
  selectedPlatform: string | null;
  onSelect: (id: string) => void;
  visible?: boolean;
}

export function PlatformSelectionCard({
  platforms,
  selectedPlatform,
  onSelect,
  visible = true,
}: PlatformSelectionCardProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                Ad Platform
              </CardTitle>
              <CardDescription>
                Select the platform you'll upload your HTML5 ads to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {platforms.map((platform) => (
                  <div
                    key={platform.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPlatform === platform.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => onSelect(platform.id)}
                  >
                    <span className="text-xl">{platform.logo}</span>
                    <span className="font-medium text-sm text-foreground">
                      {platform.name}
                    </span>
                    {selectedPlatform === platform.id && (
                      <Check className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
