"use client";

import { LoginModal } from "@/components/auth/LoginModal";
import { MessageLimitModal } from "@/components/auth/MessageLimitModal";
import { RegisterModal } from "@/components/auth/RegisterModal";
import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/hooks/useChat";
import { useChatSessions } from "@/hooks/useChatSessions";
import {
  ArrowRightLeft,
  Brain,
  Clock,
  CreditCard,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ChatPage() {
  const {
    canSendMessage,
    incrementMessageCount,
    isAnonymous,
    anonymousMessageCount,
    isAuthenticated,
  } = useAuth();

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session management hook
  const {
    sessions,
    sessionsLoading,
    currentSessionId,
    setCurrentSessionId,
    selectSession,
    deleteSession,
    clearCurrentSession,
    invalidateSessions,
  } = useChatSessions(isAuthenticated);

  // Chat management hook
  const {
    messages,
    sources,
    streamingContent,
    isStreaming,
    isLoading,
    sendMessage,
    clearMessages,
    setMessagesFromHistory,
  } = useChat({
    onSessionCreated: (sessionId) => {
      setCurrentSessionId(sessionId);
      invalidateSessions();
    },
    onMessageSent: () => {
      incrementMessageCount();
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSendMessage = async (content: string) => {
    // Check if user can send message
    if (!canSendMessage()) {
      setLimitModalOpen(true);
      return;
    }

    try {
      await sendMessage(content, currentSessionId);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleNewChat = () => {
    clearMessages();
    clearCurrentSession();
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      const result = await selectSession(sessionId);
      setMessagesFromHistory(result.messages);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const handleLimitModalRegister = () => {
    setLimitModalOpen(false);
    setRegisterModalOpen(true);
  };

  const handleLimitModalLogin = () => {
    setLimitModalOpen(false);
    setLoginModalOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-950">
      {/* Sidebar */}
      <Sidebar
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        loading={sessionsLoading}
        isAuthenticated={isAuthenticated}
        hasActiveSession={messages.length > 0}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header
          onLoginClick={() => setLoginModalOpen(true)}
          onRegisterClick={() => setRegisterModalOpen(true)}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center p-6">
              <div className="text-center max-w-2xl space-y-6">
                {/* Hero Icon */}
                <div className="mx-auto w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>

                {/* Title & Description */}
                <div className="space-y-2">
                  <Heading
                    level={1}
                    className="text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-zinc-50"
                  >
                    Eloquent AI
                  </Heading>
                  <Text className="!text-sm text-zinc-400 dark:text-zinc-500">
                    Your fintech assistant
                  </Text>
                </div>

                {/* Anonymous Message Counter */}
                {isAnonymous && (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        {3 - anonymousMessageCount}
                      </span>
                    </div>
                    <Text className="!text-xs text-zinc-500 dark:text-zinc-400">
                      {3 - anonymousMessageCount} free message
                      {3 - anonymousMessageCount !== 1 ? "s" : ""} left
                    </Text>
                  </div>
                )}

                {/* Suggested Questions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
                  {[
                    { question: "How do I send money?", icon: ArrowRightLeft },
                    {
                      question: "How long will my transfer take?",
                      icon: Clock,
                    },
                    { question: "What are the card fees?", icon: CreditCard },
                    {
                      question: "How do I cancel a transfer?",
                      icon: RotateCcw,
                    },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(item.question)}
                        disabled={isLoading}
                        className="px-4 py-3 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                          <Text className="!text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-medium">
                            {item.question}
                          </Text>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto py-4">
              {messages.map((message, idx) => (
                <ChatMessage
                  key={idx}
                  message={message}
                  sources={sources[idx]}
                />
              ))}

              {/* Thinking indicator - shown when message sent but response hasn't started */}
              {isLoading && !streamingContent && (
                <div className="flex gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div
                          className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <ChatMessage
                  message={{
                    role: "assistant",
                    content: streamingContent,
                    timestamp: new Date().toISOString(),
                  }}
                  isStreaming
                />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={!canSendMessage()}
          loading={isLoading}
          placeholder={
            !canSendMessage()
              ? "Sign in to continue chatting..."
              : "Ask me anything about fintech..."
          }
        />
      </div>

      {/* Modals */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSwitchToRegister={() => {
          setLoginModalOpen(false);
          setRegisterModalOpen(true);
        }}
      />

      <RegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSwitchToLogin={() => {
          setRegisterModalOpen(false);
          setLoginModalOpen(true);
        }}
      />

      <MessageLimitModal
        isOpen={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        onRegister={handleLimitModalRegister}
        onLogin={handleLimitModalLogin}
      />
    </div>
  );
}
