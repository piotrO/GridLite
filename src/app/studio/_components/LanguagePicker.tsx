import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES, SupportedLanguage } from "@/types/localization";

interface LanguagePickerProps {
  selected: string[];
  onApply: (codes: string[]) => void;
  onCancel: () => void;
}

export function LanguagePicker({
  selected,
  onApply,
  onCancel,
}: LanguagePickerProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(selected);

  const toggle = (code: string) => {
    if (code === "en") return;
    setLocalSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 max-h-[320px] overflow-y-auto pr-1">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = localSelected.includes(lang.code);
          const isDefault = lang.code === "en";
          return (
            <button
              key={lang.code}
              onClick={() => toggle(lang.code)}
              disabled={isDefault}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-all ${
                isSelected
                  ? "bg-primary/10 border border-primary/30 text-foreground"
                  : "bg-muted/50 border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              } ${isDefault ? "opacity-60 cursor-default" : "cursor-pointer"}`}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="flex-1 truncate text-xs">{lang.name}</span>
              {isSelected && (
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="flex-1 gap-1"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onApply(localSelected)}
          className="flex-1 gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          Apply ({localSelected.length})
        </Button>
      </div>
    </div>
  );
}
