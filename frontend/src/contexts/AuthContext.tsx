'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import type { User, AuthState, LoginRequest, RegisterRequest } from '@/types';

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  incrementMessageCount: () => void;
  canSendMessage: () => boolean;
  getAnonymousSessionId: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ANONYMOUS_MESSAGE_LIMIT = 3;
const MESSAGE_COUNT_KEY = 'anonymous_message_count';
const SESSION_ID_KEY = 'eloquent_session_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isAnonymous: true,
    anonymousMessageCount: 0,
    loading: true,
  });

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('access_token');
    if (token) {
      // TODO: Validate token and fetch user data
      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        isAnonymous: false,
        loading: false,
      }));
    } else {
      // Load anonymous message count
      const count = parseInt(localStorage.getItem(MESSAGE_COUNT_KEY) || '0', 10);
      setState((prev) => ({
        ...prev,
        anonymousMessageCount: count,
        loading: false,
      }));
    }
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      const response = await apiClient.login(data);
      setState({
        user: response.user,
        isAuthenticated: true,
        isAnonymous: false,
        anonymousMessageCount: 0,
        loading: false,
      });
      // Clear anonymous data
      localStorage.removeItem(MESSAGE_COUNT_KEY);
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      // If user was anonymous, promote the session
      const sessionId = getAnonymousSessionId();
      let response;

      if (sessionId && state.anonymousMessageCount > 0) {
        response = await apiClient.promoteAnonymous(data.email, data.password, sessionId);
      } else {
        response = await apiClient.register(data);
      }

      setState({
        user: response.user,
        isAuthenticated: true,
        isAnonymous: false,
        anonymousMessageCount: 0,
        loading: false,
      });

      // Clear anonymous data
      localStorage.removeItem(MESSAGE_COUNT_KEY);
      localStorage.removeItem(SESSION_ID_KEY);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    apiClient.logout();
    setState({
      user: null,
      isAuthenticated: false,
      isAnonymous: true,
      anonymousMessageCount: parseInt(localStorage.getItem(MESSAGE_COUNT_KEY) || '0', 10),
      loading: false,
    });
  };

  const incrementMessageCount = () => {
    if (state.isAnonymous) {
      const newCount = state.anonymousMessageCount + 1;
      setState((prev) => ({ ...prev, anonymousMessageCount: newCount }));
      localStorage.setItem(MESSAGE_COUNT_KEY, newCount.toString());
    }
  };

  const canSendMessage = (): boolean => {
    if (state.isAuthenticated) {
      return true;
    }
    return state.anonymousMessageCount < ANONYMOUS_MESSAGE_LIMIT;
  };

  const getAnonymousSessionId = (): string | null => {
    return localStorage.getItem(SESSION_ID_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        incrementMessageCount,
        canSendMessage,
        getAnonymousSessionId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
