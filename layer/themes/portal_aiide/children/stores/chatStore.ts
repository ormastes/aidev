/**
 * Chat Store - Manages chat sessions and messages
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ChatSession, ChatMessage, LLMProvider, ContextItem } from '../types';
import { ChatService } from '../services/ChatService';
import { v4 as uuidv4 } from 'uuid';

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  providers: LLMProvider[];
  isLoading: boolean;
  error: string | null;

  // Actions
  createSession: (config?: Partial<ChatSession>) => string;
  deleteSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string) => void;
  sendMessage: (sessionId: string, message: ChatMessage) => Promise<void>;
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  addContext: (sessionId: string, context: ContextItem) => void;
  removeContext: (sessionId: string, contextId: string) => void;
  clearContext: (sessionId: string) => void;
  setProviders: (providers: LLMProvider[]) => void;
  exportSession: (sessionId: string) => string;
  importSession: (data: string) => string;
  clearAllSessions: () => void;
}

const chatService = new ChatService();

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        sessions: [],
        activeSessionId: null,
        providers: [],
        isLoading: false,
        error: null,

        createSession: (config) => {
          const sessionId = uuidv4();
          const providers = get().providers;
          const defaultProvider = providers.find(p => p.id === 'claude') || providers[0];
          
          const newSession: ChatSession = {
            id: sessionId,
            title: config?.title || `Chat ${get().sessions.length + 1}`,
            provider: config?.provider || defaultProvider,
            messages: [],
            context: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            settings: {
              temperature: 0.7,
              maxTokens: 4096,
              topP: 1,
              systemPrompt: config?.settings?.systemPrompt || undefined
            },
            ...config
          };

          set((state) => ({
            sessions: [...state.sessions, newSession],
            activeSessionId: sessionId
          }));

          return sessionId;
        },

        deleteSession: (sessionId) => {
          set((state) => {
            const sessions = state.sessions.filter(s => s.id !== sessionId);
            const activeSessionId = state.activeSessionId === sessionId 
              ? (sessions[0]?.id || null)
              : state.activeSessionId;
            
            return { sessions, activeSessionId };
          });
        },

        setActiveSession: (sessionId) => {
          const session = get().sessions.find(s => s.id === sessionId);
          if (session) {
            set({ activeSessionId: sessionId });
          }
        },

        sendMessage: async (sessionId, message) => {
          const session = get().sessions.find(s => s.id === sessionId);
          if (!session) {
            throw new Error('Session not found');
          }

          set({ isLoading: true, error: null });

          try {
            // Add user message to session
            set((state) => ({
              sessions: state.sessions.map(s =>
                s.id === sessionId
                  ? {
                      ...s,
                      messages: [...s.messages, message],
                      updatedAt: new Date()
                    }
                  : s
              )
            }));

            // Send to AI provider
            const response = await chatService.sendMessage(
              session.provider,
              message,
              session.messages,
              session.context,
              session.settings
            );

            // Add AI response
            const assistantMessage: ChatMessage = {
              id: uuidv4(),
              role: 'assistant',
              content: response.content,
              timestamp: new Date(),
              model: response.model,
              tokens: response.tokens
            };

            set((state) => ({
              sessions: state.sessions.map(s =>
                s.id === sessionId
                  ? {
                      ...s,
                      messages: [...s.messages, assistantMessage],
                      updatedAt: new Date()
                    }
                  : s
              ),
              isLoading: false
            }));
          } catch (error) {
            set({ 
              isLoading: false, 
              error: error instanceof Error ? error.message : 'Failed to send message'
            });
            throw error;
          }
        },

        updateSession: (sessionId, updates) => {
          set((state) => ({
            sessions: state.sessions.map(s =>
              s.id === sessionId
                ? { ...s, ...updates, updatedAt: new Date() }
                : s
            )
          }));
        },

        addContext: (sessionId, context) => {
          set((state) => ({
            sessions: state.sessions.map(s =>
              s.id === sessionId
                ? {
                    ...s,
                    context: [...s.context, context],
                    updatedAt: new Date()
                  }
                : s
            )
          }));
        },

        removeContext: (sessionId, contextId) => {
          set((state) => ({
            sessions: state.sessions.map(s =>
              s.id === sessionId
                ? {
                    ...s,
                    context: s.context.filter(c => c.id !== contextId),
                    updatedAt: new Date()
                  }
                : s
            )
          }));
        },

        clearContext: (sessionId) => {
          set((state) => ({
            sessions: state.sessions.map(s =>
              s.id === sessionId
                ? { ...s, context: [], updatedAt: new Date() }
                : s
            )
          }));
        },

        setProviders: (providers) => {
          set({ providers });
        },

        exportSession: (sessionId) => {
          const session = get().sessions.find(s => s.id === sessionId);
          if (!session) {
            throw new Error('Session not found');
          }

          return JSON.stringify({
            version: '1.0.0',
            exported: new Date().toISOString(),
            session: {
              ...session,
              id: uuidv4() // New ID for imported session
            }
          }, null, 2);
        },

        importSession: (data) => {
          try {
            const parsed = JSON.parse(data);
            if (!parsed.session) {
              throw new Error('Invalid session data');
            }

            const importedSession: ChatSession = {
              ...parsed.session,
              id: uuidv4(),
              title: `${parsed.session.title} (Imported)`,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            set((state) => ({
              sessions: [...state.sessions, importedSession],
              activeSessionId: importedSession.id
            }));

            return importedSession.id;
          } catch (error) {
            throw new Error('Failed to import session');
          }
        },

        clearAllSessions: () => {
          set({
            sessions: [],
            activeSessionId: null,
            error: null
          });
        }
      }),
      {
        name: 'aiide-chat-store',
        partialize: (state) => ({
          sessions: state.sessions,
          activeSessionId: state.activeSessionId
        })
      }
    )
  )
);