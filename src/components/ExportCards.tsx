"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExportFormatCard } from "./ExportFormatCard";
import { AdSizeDisplay } from "./AdSizeCard";

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  recommended?: boolean;
  creditCost: number;
}

interface AdSize {
  id: string;
  name: string;
  dimensions: string;
}

interface ExportFormatsCardProps {
  formats: ExportFormat[];
  selectedFormats: string[];
  onToggleFormat: (id: string) => void;
}

export function ExportFormatsCard({
  formats,
  selectedFormats,
  onToggleFormat,
}: ExportFormatsCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Export Format</CardTitle>
          <CardDescription>
            Choose how you want to receive your ads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {formats.map((format) => (
              <ExportFormatCard
                key={format.id}
                format={format}
                selected={selectedFormats.includes(format.id)}
                onToggle={() => onToggleFormat(format.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface AdSizesCardProps {
  sizes: AdSize[];
}

export function AdSizesCard({ sizes }: AdSizesCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ad Sizes Included</CardTitle>
          <CardDescription>
            The following sizes will be exported
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {sizes.map((size) => (
              <AdSizeDisplay key={size.id} size={size} />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
