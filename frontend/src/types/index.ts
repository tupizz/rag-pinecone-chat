// API Types
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: Source[] | string[];  // Support both full objects and IDs for backwards compatibility
}

export interface Source {
  id: string;
  score: number;
  text: string;
  metadata?: {
    question?: string;
    answer?: string;
    category?: string;
    source?: string;  // URL source
  };
}

export interface ChatSession {
  session_id: string;
  user_id?: string;
  title?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatResponse {
  session_id: string;
  message: Message;
  sources: Source[];
}

export interface ChatRequest {
  message: string;
  session_id?: string;
}

export interface SessionMessagesResponse {
  session_id: string;
  messages: Message[];
  total_count: number;
  has_more: boolean;
  cursor?: string;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface User {
  user_id: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  anonymous_session_id?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// UI State Types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  anonymousMessageCount: number;
  loading: boolean;
}

export interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
