'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ChatSession, Message } from '@/types';
import { useState } from 'react';

export function useChatSessions(isAuthenticated: boolean) {
  const queryClient = useQueryClient();
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();

  // Fetch sessions with React Query (works for both authenticated and anonymous users)
  const {
    data: sessions = [],
    isLoading: sessionsLoading
  } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => apiClient.getSessions(),
    enabled: true, // Always fetch - backend handles anonymous sessions via cookies
    staleTime: 30 * 1000, // 30 seconds
  });

  // Select a session
  const selectSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiClient.getSessionMessages(sessionId);
      return { sessionId, messages: response.messages };
    },
    onSuccess: ({ sessionId }) => {
      setCurrentSessionId(sessionId);
    },
  });

  // Delete a session
  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => apiClient.deleteSession(sessionId),
    onMutate: async (sessionId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['sessions'] });

      // Snapshot the previous value
      const previousSessions = queryClient.getQueryData<ChatSession[]>(['sessions']);

      // Optimistically update the cache
      queryClient.setQueryData<ChatSession[]>(['sessions'], (old) =>
        old?.filter((s) => s.session_id !== sessionId) || []
      );

      return { previousSessions };
    },
    onError: (_err, _sessionId, context) => {
      // Rollback on error
      if (context?.previousSessions) {
        queryClient.setQueryData(['sessions'], context.previousSessions);
      }
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  // Invalidate sessions after message sent (works for both authenticated and anonymous)
  const invalidateSessions = () => {
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }, 500);
  };

  const selectSession = (sessionId: string) => {
    return selectSessionMutation.mutateAsync(sessionId);
  };

  const deleteSession = async (sessionId: string) => {
    await deleteSessionMutation.mutateAsync(sessionId);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(undefined);
    }
  };

  const clearCurrentSession = () => {
    setCurrentSessionId(undefined);
  };

  return {
    sessions,
    sessionsLoading,
    currentSessionId,
    setCurrentSessionId,
    selectSession,
    deleteSession,
    clearCurrentSession,
    invalidateSessions,
    isSelectingSession: selectSessionMutation.isPending,
    isDeletingSession: deleteSessionMutation.isPending,
  };
}
