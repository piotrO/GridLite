"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Settings, LogOut, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditWallet } from "@/components/CreditWallet";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReactNode } from "react";

interface StudioHeaderProps {
  title?: string;
  backPath?: string;
  actions?: ReactNode;
}

export function StudioHeader({
  title,
  backPath = "/dashboard",
  actions,
}: StudioHeaderProps) {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <header className="border-b border-border backdrop-blur-lg bg-background/80 shrink-0 relative z-10">
      <div className="px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(backPath)}
            className="rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">GridLite</span>
          {title && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{title}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <CreditWallet />
          {actions}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
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
      </div>
    </header>
  );
}
