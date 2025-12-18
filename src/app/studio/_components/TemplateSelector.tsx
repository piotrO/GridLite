import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  preview: string;
  category: string;
}

interface TemplateSelectorProps {
  templates?: Template[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

const defaultTemplates: Template[] = [
  { id: "1", name: "Bold Sale", preview: "🔥", category: "Promotional" },
  { id: "2", name: "Elegant Minimal", preview: "✨", category: "Luxury" },
  { id: "3", name: "Playful Pop", preview: "🎨", category: "Fun" },
  { id: "4", name: "Corporate Pro", preview: "📊", category: "Business" },
];

export function TemplateSelector({
  templates = defaultTemplates,
  selectedId,
  onSelect,
}: TemplateSelectorProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground px-1">
        Choose Template
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {templates.map((template, index) => (
          <motion.button
            key={template.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(template.id)}
            className={cn(
              "relative p-4 rounded-xl border-2 transition-colors duration-200 text-left",
              selectedId === template.id
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
            )}
          >
            {selectedId === template.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-primary-foreground" />
              </motion.div>
            )}
            <div className="text-3xl mb-2">{template.preview}</div>
            <div className="font-medium text-sm text-foreground">
              {template.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {template.category}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
