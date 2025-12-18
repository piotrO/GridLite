import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Check, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface EditableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

export function EditableTextarea({
  value,
  onChange,
  className,
  inputClassName,
  placeholder = "Click to edit...",
}: EditableTextareaProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onChange(localValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isEditing ? (
        <motion.div
          key="input"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-2"
        >
          <Textarea
            ref={textareaRef}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn("min-h-[80px] border-2 resize-none", inputClassName)}
            placeholder={placeholder}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.button
          key="text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsEditing(true)}
          className={cn(
            "group flex items-start gap-2 text-left hover:bg-muted/50 px-2 py-1 -mx-2 -my-1 rounded-lg transition-colors cursor-text w-full",
            className
          )}
        >
          <p className="font-medium text-foreground text-sm flex-1">
            {value || <span className="text-muted-foreground italic">{placeholder}</span>}
          </p>
          <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
