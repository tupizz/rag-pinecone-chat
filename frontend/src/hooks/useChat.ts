"use client";

import { apiClient } from "@/lib/api";
import type { Message, Source } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface UseChatOptions {
  onSessionCreated?: (sessionId: string) => void;
  onMessageSent?: () => void;
}

export function useChat({
  onSessionCreated,
  onMessageSent,
}: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sources, setSources] = useState<{ [key: number]: Source[] }>({});
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const queryClient = useQueryClient();

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      message,
      sessionId,
    }: {
      message: string;
      sessionId?: string;
    }) => {
      // Add user message immediately
      const userMessage: Message = {
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setStreamingContent("");

      let fullResponse = "";
      let metadata: {
        session_id: string;
        sources: Source[];
      } = {
        session_id: "",
        sources: [],
      };

      // Stream the response and capture metadata
      try {
        for await (const chunk of apiClient.streamMessage({
          message,
          session_id: sessionId,
        })) {
          if (chunk.type === "content") {
            fullResponse += chunk.data;
            setStreamingContent(fullResponse);
          } else if (chunk.type === "metadata") {
            // Capture session_id, sources, etc. from the stream
            metadata = { ...metadata, ...chunk.data };
          }
        }
      } catch (error) {
        console.error("Streaming error:", error);
        throw error;
      }

      return {
        content: fullResponse,
        sessionId: metadata.session_id || sessionId,
        sources: metadata.sources || [],
      };
    },
    onSuccess: (data, variables) => {
      // Add complete assistant message
      const assistantMessage: Message = {
        role: "assistant",
        content:
          data.content ||
          "I apologize, but I encountered an error generating a response.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => {
        const newMessages = [...prev, assistantMessage];

        // Store sources at the correct index (assistant message position)
        if (data.sources && data.sources.length > 0) {
          setSources((prevSources) => ({
            ...prevSources,
            [newMessages.length - 1]: data.sources,
          }));
        }

        return newMessages;
      });

      setStreamingContent("");
      setIsStreaming(false);

      // Invalidate sessions cache to refresh session list with updated timestamp/title
      queryClient.invalidateQueries({ queryKey: ["sessions"] });

      // Always notify with session ID if it exists
      if (data.sessionId) {
        onSessionCreated?.(data.sessionId);
      }

      // Always notify message sent
      onMessageSent?.();
    },
    onError: (error) => {
      console.error("Error sending message:", error);

      const errorMessage: Message = {
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      setStreamingContent("");
      setIsStreaming(false);
    },
  });

  const sendMessage = (message: string, sessionId?: string) => {
    return sendMessageMutation.mutateAsync({ message, sessionId });
  };

  const clearMessages = () => {
    setMessages([]);
    setSources({});
    setStreamingContent("");
    setIsStreaming(false);
  };

  const setMessagesFromHistory = (historyMessages: Message[]) => {
    setMessages(historyMessages);

    // Reconstruct sources mapping from message history
    const newSources: { [key: number]: Source[] } = {};

    for (let i = 0; i < historyMessages.length; i++) {
      const msg = historyMessages[i];
      if (msg.sources && msg.sources.length > 0) {
        // Check if sources are full objects or just IDs
        const firstSource = msg.sources[0];
        if (typeof firstSource === "string") {
          // Legacy format: just IDs (don't show sources for old messages)
          continue;
        } else {
          // New format: full source objects
          newSources[i] = msg.sources as Source[];
        }
      }
    }

    setSources(newSources);
  };

  return {
    messages,
    sources,
    streamingContent,
    isStreaming,
    isLoading: sendMessageMutation.isPending,
    sendMessage,
    clearMessages,
    setMessagesFromHistory,
  };
}
