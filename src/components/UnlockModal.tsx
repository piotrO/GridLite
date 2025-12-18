import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket, Sparkles } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useCredits } from "@/contexts/CreditContext";

interface UnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnlockModal({ open, onOpenChange }: UnlockModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { addCredits } = useCredits();

  const handleBuyCredit = () => {
    // Mock purchase - add 50 credits
    addCredits(50);
    onOpenChange(false);
  };

  const handleUpgradePro = () => {
    // Mock subscription - add 5 credits
    addCredits(5);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            Ready to launch?
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Exporting this campaign package requires 1 Credit.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button
            variant="hero"
            className="flex-1 gap-2"
            onClick={handleBuyCredit}
          >
            <Sparkles className="w-4 h-4" />
            Buy 50 Credits ($19)
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleUpgradePro}
          >
            Upgrade to Pro ($49/mo)
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Or{" "}
          <span
            className="text-primary cursor-pointer hover:underline"
            onClick={() => {
              onOpenChange(false);
              router.push(`/pricing?from=${encodeURIComponent(pathname)}`);
            }}
          >
            view all pricing options
          </span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
