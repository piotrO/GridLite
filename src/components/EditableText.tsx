import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  as?: "p" | "span" | "h1" | "h2" | "h3";
}

export function EditableText({
  value,
  onChange,
  className,
  inputClassName,
  placeholder = "Click to edit...",
  as: Component = "span",
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
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
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
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
          className="flex items-center gap-2"
        >
          <Input
            ref={inputRef}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className={cn("h-8 border-2", inputClassName)}
            placeholder={placeholder}
          />
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
        </motion.div>
      ) : (
        <motion.button
          key="text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsEditing(true)}
          className={cn(
            "group flex items-center gap-2 text-left hover:bg-muted/50 px-2 py-1 -mx-2 -my-1 rounded-lg transition-colors cursor-text",
            className
          )}
        >
          <Component className="font-medium text-foreground">
            {value || <span className="text-muted-foreground italic">{placeholder}</span>}
          </Component>
          <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
