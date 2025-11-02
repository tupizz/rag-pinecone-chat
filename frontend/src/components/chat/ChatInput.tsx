"use client";

import { Loader2, Send } from "lucide-react";
import React, { useRef, useState } from "react";
import { Button } from "../catalyst/button";
import { Textarea } from "../catalyst/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  loading = false,
  placeholder = "Type your message...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled && !loading) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-4 transition-all duration-200"
    >
      <div className="max-w-4xl mx-auto flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loading}
            rows={1}
            resizable={false}
          />
          {message.length > 0 && (
            <div className="absolute right-3 bottom-3 text-xs text-zinc-400 dark:text-zinc-500">
              <span className="animate-in fade-in-0">{message.length}</span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={!message.trim() || disabled || loading}
          color="indigo"
        >
          {loading ? (
            <Loader2 className="w-2 h-2 animate-spin" data-slot="icon" />
          ) : (
            <Send className="w-2 h-2" data-slot="icon" />
          )}
        </Button>
      </div>

      <p className="max-w-4xl mx-auto mt-2 text-xs text-zinc-400 dark:text-zinc-500 text-center">
        Press{" "}
        <kbd className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-900 rounded text-zinc-600 dark:text-zinc-400 text-[10px] font-mono">
          Enter
        </kbd>{" "}
        to send,{" "}
        <kbd className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-900 rounded text-zinc-600 dark:text-zinc-400 text-[10px] font-mono">
          Shift + Enter
        </kbd>{" "}
        for new line
      </p>
    </form>
  );
}
