import { api } from './client';

// The AI assistant: chat sessions whose answers are built from your own data
// (the server runs read-only tools over your accounts — never another user's).

export type ChatSessionSummary = { id: string; title: string | null; updated_at: string; _count: { messages: number } };
export type ChatMessage = {
    id: string; role: 'user' | 'assistant' | string; content: string; created_at: string;
    tools_used?: { name: string; at: string }[] | null;
    citations?: { ref: number; filename: string }[] | null;
};
export type ChatSession = { id: string; title: string | null; messages: ChatMessage[] };
export type ChatReply = { answer: string; toolsUsed: string[]; dataAsOf: string; citations: { ref: number; filename: string }[] };

export const chatKey = ['chat'] as const;

export const getChatSessions = async () => (await api.get<ChatSessionSummary[]>('/chat/sessions')).data;
export const getChatSession = async (id: string) => (await api.get<ChatSession>(`/chat/sessions/${id}`)).data;
export const createChatSession = async () => (await api.post<{ id: string }>('/chat/sessions')).data;
export const deleteChatSession = async (id: string) => (await api.delete(`/chat/sessions/${id}`)).data;
// Answers can take a while: the model may look up several things first.
export const sendChatMessage = async (id: string, message: string) =>
    (await api.post<ChatReply>(`/chat/sessions/${id}/message`, { message }, { timeout: 120000 })).data;
