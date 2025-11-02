import axios, { AxiosInstance } from 'axios';
import type {
  ChatRequest,
  ChatResponse,
  ChatSession,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Message,
  SessionMessagesResponse,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important for cookies
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', data);
    this.setToken(response.data.access_token);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', data);
    this.setToken(response.data.access_token);
    return response.data;
  }

  async promoteAnonymous(email: string, password: string, sessionId: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/promote-anonymous', {
      email,
      password,
      anonymous_session_id: sessionId,
    });
    this.setToken(response.data.access_token);
    return response.data;
  }

  logout(): void {
    this.removeToken();
  }

  // Chat endpoints
  async sendMessage(data: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.post<ChatResponse>('/chat', data);
    return response.data;
  }

  // SSE streaming chat
  async *streamMessage(data: ChatRequest): AsyncGenerator<{ type: 'content' | 'metadata', data: any }, void, unknown> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() && line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(dataStr);
              // Backend sends {"type": "content", "data": "text"}
              if (parsed.type === 'content' && parsed.data) {
                yield { type: 'content', data: parsed.data };
              }
              // Handle sources from backend
              else if (parsed.type === 'sources' && parsed.data) {
                yield { type: 'metadata', data: { sources: parsed.data } };
              }
              // Also yield metadata (session_id, etc.)
              else if (parsed.type === 'metadata' || parsed.session_id) {
                yield { type: 'metadata', data: parsed };
              }
            } catch (e) {
              console.debug('Skipping SSE line:', dataStr);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async getSessions(): Promise<ChatSession[]> {
    const response = await this.client.get<{ sessions: ChatSession[] }>('/chat/sessions');
    return response.data.sessions;
  }

  async getSessionMessages(
    sessionId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<SessionMessagesResponse> {
    const response = await this.client.get(`/chat/sessions/${sessionId}/messages`, {
      params
    });

    // Check if response has messages property (nested structure)
    if (response.data && typeof response.data === 'object' && 'messages' in response.data) {
      return response.data as SessionMessagesResponse;
    }

    // Fallback for backward compatibility
    return {
      session_id: sessionId,
      messages: response.data || [],
      total_count: response.data?.length || 0,
      has_more: false
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.delete(`/chat/sessions/${sessionId}`);
  }

  // Generic HTTP methods for custom endpoints
  get(url: string, config?: any) {
    return this.client.get(url, config);
  }

  post(url: string, data?: any, config?: any) {
    return this.client.post(url, data, config);
  }

  put(url: string, data?: any, config?: any) {
    return this.client.put(url, data, config);
  }

  delete(url: string, config?: any) {
    return this.client.delete(url, config);
  }
}

export const apiClient = new ApiClient();
