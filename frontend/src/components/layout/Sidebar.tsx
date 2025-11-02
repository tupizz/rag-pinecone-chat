"use client";

import type { ChatSession } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { MessageSquarePlus, Trash2, X } from "lucide-react";
import React from "react";
import { Button } from "../catalyst/button";
import { Heading } from "../catalyst/heading";
import { Strong, Text } from "../catalyst/text";

interface SidebarProps {
  currentSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  loading: boolean;
  isAuthenticated: boolean;
  hasActiveSession: boolean;
}

export function Sidebar({
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  isOpen,
  onClose,
  sessions,
  loading,
  isAuthenticated,
  hasActiveSession,
}: SidebarProps) {
  const handleDeleteSession = async (
    sessionId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    onDeleteSession(sessionId);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-zinc-900/80 dark:bg-zinc-950/90 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-72 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-r border-zinc-200/60 dark:border-zinc-800/60
          flex flex-col z-50 transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <Heading level={2}>Conversations</Heading>
          <Button plain onClick={onClose} className="lg:hidden">
            <X className="w-5 h-5" data-slot="icon" />
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <Button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full"
            outline
          >
            <MessageSquarePlus className="w-5 h-5" data-slot="icon" />
            New Chat
          </Button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2">
          {loading ? (
            <div className="text-center py-8">
              <Text>Loading...</Text>
            </div>
          ) : !Array.isArray(sessions) || sessions.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Text>No conversations yet</Text>
              <Text className="!text-xs">Start chatting to create one!</Text>
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.session_id}
                onClick={() => {
                  onSelectSession(session.session_id);
                  onClose();
                }}
                className={`
                  w-full text-left p-3 rounded-lg transition-all duration-200
                  hover:bg-zinc-950/5 dark:hover:bg-white/5 group
                  ${
                    currentSessionId === session.session_id
                      ? "bg-zinc-950/5 dark:bg-white/5"
                      : "border-transparent"
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Strong className="truncate text-sm block">
                      {session.title || "New Conversation"}
                    </Strong>
                    <Text className="!text-xs mt-1">
                      {session.message_count} message
                      {session.message_count !== 1 ? "s" : ""} •{" "}
                      {formatDistanceToNow(new Date(session.updated_at), {
                        addSuffix: true,
                      })}
                    </Text>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(session.session_id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-all"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-500" />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
