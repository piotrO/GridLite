"use client";

import { motion } from "framer-motion";
import { Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ExportSummaryCardProps {
  formatCount: number;
  sizeCount: number;
  platformName?: string;
  creditCost: number;
}

export function ExportSummaryCard({
  formatCount,
  sizeCount,
  platformName,
  creditCost,
}: ExportSummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Export Summary</h3>
              <p className="text-sm text-muted-foreground">
                {formatCount} format(s) • {sizeCount} size(s)
                {platformName && <> • {platformName}</>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Credit cost</p>
              <p className="font-semibold text-foreground flex items-center gap-1 justify-end">
                <Coins className="w-4 h-4 text-primary" />
                {creditCost} credit{creditCost !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
