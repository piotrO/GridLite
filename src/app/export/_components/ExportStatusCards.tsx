"use client";

import { motion } from "framer-motion";
import { Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ExportProgressCardProps {
  progress: number;
  message?: string;
}

export function ExportProgressCard({
  progress,
  message = "Preparing your files...",
}: ExportProgressCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="py-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{message}</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface ExportCompleteCardProps {
  title?: string;
  description?: string;
  onDownload?: () => void;
}

export function ExportCompleteCard({
  title = "Export Ready!",
  description = "Your ad package has been generated successfully",
  onDownload,
}: ExportCompleteCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className="border-primary/20">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {onDownload && (
              <Button className="gap-2" onClick={onDownload}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
