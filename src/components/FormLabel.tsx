import { LucideIcon } from "lucide-react";

interface FormLabelProps {
  icon?: LucideIcon;
  children: React.ReactNode;
}

export function FormLabel({ icon: Icon, children }: FormLabelProps) {
  return (
    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </label>
  );
}
