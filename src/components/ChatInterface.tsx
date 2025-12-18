import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Lightbulb, Palette, Search, Link } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
export type PersonaType = "strategist" | "designer" | "researcher" | "traffic_manager" | "user";

interface Message {
  id: string;
  persona: PersonaType;
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

const personaConfig = {
  strategist: {
    name: "The Strategist",
    icon: Lightbulb,
    color: "bg-strategist",
    textColor: "text-strategist",
    borderColor: "border-strategist/30",
    bgColor: "bg-strategist/10",
  },
  designer: {
    name: "The Designer",
    icon: Palette,
    color: "bg-designer",
    textColor: "text-designer",
    borderColor: "border-designer/30",
    bgColor: "bg-designer/10",
  },
  researcher: {
    name: "The Researcher",
    icon: Search,
    color: "bg-researcher",
    textColor: "text-researcher",
    borderColor: "border-researcher/30",
    bgColor: "bg-researcher/10",
  },
  traffic_manager: {
    name: "Traffic Manager",
    icon: Link,
    color: "bg-accent",
    textColor: "text-accent",
    borderColor: "border-accent/30",
    bgColor: "bg-accent/10",
  },
  user: {
    name: "You",
    icon: User,
    color: "bg-muted",
    textColor: "text-foreground",
    borderColor: "border-border",
    bgColor: "bg-secondary",
  },
};

export function ChatMessage({ message }: ChatMessageProps) {
  const config = personaConfig[message.persona];
  const isUser = message.persona === "user";
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
        config.color
      )}>
        <Icon className="w-4 h-4 text-primary-foreground" />
      </div>

      {/* Message Bubble */}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 border",
        config.bgColor,
        config.borderColor,
        isUser && "rounded-tr-sm",
        !isUser && "rounded-tl-sm"
      )}>
        {!isUser && (
          <span className={cn("text-xs font-semibold mb-1 block", config.textColor)}>
            {config.name}
          </span>
        )}
        <p className="text-sm text-foreground leading-relaxed">{message.content}</p>
      </div>
    </motion.div>
  );
}

interface ChatInterfaceProps {
  messages: Message[];
  onSend: (message: string) => void;
  isTyping?: boolean;
  typingPersona?: PersonaType;
  placeholder?: string;
}

export function ChatInterface({
  messages,
  onSend,
  isTyping,
  typingPersona = "strategist",
  placeholder = "Ask your AI team...",
}: ChatInterfaceProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Keep the latest message in view across all pages.
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isTyping]);

  const typingConfig = personaConfig[typingPersona];
  const TypingIcon = typingConfig.icon;

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border-2 border-border shadow-lg overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                typingConfig.color
              )}
            >
              <TypingIcon className="w-4 h-4 text-primary-foreground" />
            </div>
            <div
              className={cn(
                "rounded-2xl px-4 py-3 border rounded-tl-sm",
                typingConfig.bgColor,
                typingConfig.borderColor
              )}
            >
              <div className="flex gap-1">
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  className={cn("w-2 h-2 rounded-full", typingConfig.color)}
                />
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  className={cn("w-2 h-2 rounded-full", typingConfig.color)}
                />
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  className={cn("w-2 h-2 rounded-full", typingConfig.color)}
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("message") as HTMLInputElement;
            if (input.value.trim()) {
              onSend(input.value);
              input.value = "";
            }
          }}
          className="flex gap-2"
        >
          <input
            name="message"
            type="text"
            placeholder={placeholder}
            className="flex-1 h-12 rounded-xl border-2 border-border bg-background px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
          />
          <Button type="submit" className="h-12 px-6">
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
