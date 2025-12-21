"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlatformGuide {
  name: string;
  steps: string[];
}

interface PlatformGuidesCardProps {
  guides: Record<string, PlatformGuide>;
  defaultPlatform?: string;
}

export function PlatformGuidesCard({
  guides,
  defaultPlatform,
}: PlatformGuidesCardProps) {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyStep = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(index);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const firstKey = defaultPlatform || Object.keys(guides)[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-primary" />
          Upload Guides
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={firstKey}>
          <TabsList className="w-full justify-start mb-4">
            {Object.entries(guides).map(([key, guide]) => (
              <TabsTrigger key={key} value={key}>
                {guide.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(guides).map(([key, guide]) => (
            <TabsContent key={key} value={key} className="mt-0">
              <div className="space-y-3">
                {guide.steps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 group hover:bg-muted transition-colors"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                      {index + 1}
                    </span>
                    <p className="text-sm text-foreground flex-1 pt-0.5">
                      {step}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                      onClick={() => copyStep(index, step)}
                    >
                      {copiedStep === index ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
