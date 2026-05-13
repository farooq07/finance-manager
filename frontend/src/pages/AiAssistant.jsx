import { useState } from 'react';
import { MessageSquare, Plus, Trash2, Loader2, Sparkles, ChevronRight } from 'lucide-react';
import { useSessions, useCreateSession, useDeleteSession } from '../hooks/useChat';
import ChatWindow from '../components/ChatWindow';

function SessionItem({ session, isActive, onClick, onDelete }) {
  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) onDelete(session.id);
  };

  const title = session.title || 'New conversation';
  const date = new Date(session.updated_at).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
        isActive
          ? 'bg-primary-50 dark:bg-emerald-900/20 border border-primary-200 dark:border-emerald-800/50'
          : 'hover:bg-gray-50 dark:hover:bg-neutral-800/60 border border-transparent'
      }`}
    >
      <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 transition-colors ${isActive ? 'text-primary-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate font-medium leading-snug ${isActive ? 'text-primary-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
          {title}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{date} · {session._count?.messages || 0} msgs</p>
      </div>
      <button
        onClick={handleDelete}
        className="shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </button>
  );
}

export default function AiAssistant() {
  const [activeSessionId, setActiveSessionId] = useState(null);

  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const { mutate: createSession, isPending: creating } = useCreateSession();
  const { mutate: deleteSession } = useDeleteSession();

  const handleNewChat = () => {
    createSession(undefined, {
      onSuccess: (session) => setActiveSessionId(session.id)
    });
  };

  const handleDelete = (id) => {
    deleteSession(id, {
      onSuccess: () => { if (activeSessionId === id) setActiveSessionId(null); }
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-neutral-950">

      {/* ── Left sidebar ── */}
      <div className="w-64 shrink-0 flex flex-col bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800">

        {/* Header */}
        <div className="p-4 pb-3 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 dark:from-emerald-600 dark:to-teal-700 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">AI Assistant</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Finance Q&A</p>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm font-medium transition-all disabled:opacity-50 shadow-sm active:scale-[0.98]"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            New Chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-2">
                <MessageSquare className="w-5 h-5 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">No conversations yet</p>
            </div>
          ) : (
            sessions.map(s => (
              <SessionItem
                key={s.id}
                session={s}
                isActive={s.id === activeSessionId}
                onClick={() => setActiveSessionId(s.id)}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Footer note */}
        <div className="p-3 border-t border-gray-100 dark:border-neutral-800">
          <p className="text-[11px] text-gray-400 dark:text-gray-600 text-center leading-relaxed">
            Answers are grounded in your real financial data
          </p>
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-neutral-950">
        {activeSessionId ? (
          <ChatWindow sessionId={activeSessionId} />
        ) : (
          <EmptyState onCreate={handleNewChat} creating={creating} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreate, creating }) {
  const capabilities = [
    { emoji: '💸', title: 'Spending analysis', desc: 'Where is my money going this month?' },
    { emoji: '📈', title: 'Investment snapshot', desc: 'How are my mutual funds performing?' },
    { emoji: '🏦', title: 'Account balances', desc: 'What\'s my total balance across all accounts?' },
    { emoji: '🤝', title: 'Beneficiary stats', desc: 'How much have I sent to Ahmed this year?' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 dark:from-emerald-600 dark:to-teal-700 flex items-center justify-center shadow-lg mb-5">
        <Sparkles className="w-8 h-8 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Your Financial AI</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center max-w-xs leading-relaxed">
        Ask questions about your finances in plain language. I'll look up real numbers from your data.
      </p>

      <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-lg">
        {capabilities.map(c => (
          <div key={c.title} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 hover:border-primary-300 dark:hover:border-emerald-700 transition-colors">
            <span className="text-xl">{c.emoji}</span>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-2">{c.title}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">"{c.desc}"</p>
          </div>
        ))}
      </div>

      <button
        onClick={onCreate}
        disabled={creating}
        className="mt-8 flex items-center gap-2 py-2.5 px-6 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.98] disabled:opacity-60"
      >
        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Start a conversation
      </button>
    </div>
  );
}
