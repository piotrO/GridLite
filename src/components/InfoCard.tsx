"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface InfoCardProps {
  icon?: LucideIcon;
  iconEmoji?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
}

export function InfoCard({
  icon: Icon,
  iconEmoji,
  iconColor = "text-primary",
  title,
  subtitle,
  children,
  delay = 0,
}: InfoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-2xl bg-card border-2 border-border"
    >
      <div className="flex items-center gap-2 mb-4">
        {Icon && (
          <div
            className={`w-8 h-8 rounded-lg bg-${iconColor.replace(
              "text-",
              ""
            )}/20 flex items-center justify-center`}
          >
            {iconEmoji ? (
              <span className="text-lg">{iconEmoji}</span>
            ) : (
              <Icon className={`w-5 h-5 ${iconColor}`} />
            )}
          </div>
        )}
        {iconEmoji && !Icon && (
          <div
            className={`w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center`}
          >
            <span className="text-lg">{iconEmoji}</span>
          </div>
        )}
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </motion.div>
  );
}
