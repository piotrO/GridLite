import { Coins, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { useCredits } from "@/contexts/CreditContext";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface CreditWalletProps {
  onClick?: () => void;
}

export function CreditWallet({ onClick }: CreditWalletProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { credits } = useCredits();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/pricing?from=${encodeURIComponent(pathname)}`);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 px-3"
      onClick={handleClick}
    >
      <Wallet className="w-4 h-4 text-primary" />
      <span className="font-medium">
        {credits} Credit{credits !== 1 ? "s" : ""}
      </span>
    </Button>
  );
}
