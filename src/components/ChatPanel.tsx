"use client";

import { ChatInterface, PersonaType } from "@/components/ChatInterface";
import { ResizablePanel } from "@/components/ui/resizable";

interface Message {
  id: string;
  persona: PersonaType;
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  messages: Message[];
  onSend: (message: string) => void;
  isTyping: boolean;
  typingPersona: PersonaType;
  placeholder?: string;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
}

export function ChatPanel({
  messages,
  onSend,
  isTyping,
  typingPersona,
  placeholder = "Type a message...",
  defaultSize = 30,
  minSize = 20,
  maxSize = 45,
}: ChatPanelProps) {
  return (
    <ResizablePanel
      defaultSize={defaultSize}
      minSize={minSize}
      maxSize={maxSize}
    >
      <div className="h-full flex flex-col border-r border-border p-4">
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSend={onSend}
            isTyping={isTyping}
            typingPersona={typingPersona}
            placeholder={placeholder}
          />
        </div>
      </div>
    </ResizablePanel>
  );
}
