"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, ChevronLeft, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditWallet } from "@/components/CreditWallet";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageHeaderProps {
  showBackButton?: boolean;
  backPath?: string;
  showCredits?: boolean;
  showSettings?: boolean;
}

export function PageHeader({
  showBackButton = true,
  backPath = "/dashboard",
  showCredits = true,
  showSettings = true,
}: PageHeaderProps) {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-14 border-b border-border backdrop-blur-lg bg-background/80 flex items-center justify-between px-4 shrink-0 relative z-10"
    >
      <div className="flex items-center gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => router.push(backPath)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">GridLite</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showCredits && <CreditWallet />}
        {showSettings && (
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
        )}
      </div>
    </motion.header>
  );
}
