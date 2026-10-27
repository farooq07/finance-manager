import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Trash2, Loader2, Sparkles, FileText, Upload, ChevronDown, ChevronRight, X, FileIcon } from 'lucide-react';
import { useSessions, useCreateSession, useDeleteSession, useDocuments, useUploadDocument, useDeleteDocument } from '../hooks/useChat';
import ChatWindow from '../components/ChatWindow';
import { toast } from 'sonner';
import { useConfirm } from '../components/ui/confirm-dialog';

function SessionItem({ session, isActive, onClick, onDelete }) {
  const confirm = useConfirm();
  const handleDelete = async (e) => {
    e.stopPropagation();
    const ok = await confirm({ title: 'Delete conversation', description: 'Delete this conversation?', confirmText: 'Delete' });
    if (ok) onDelete(session.id);
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
  const [autoSendMessage, setAutoSendMessage] = useState('');
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const { mutate: createSession, isPending: creating } = useCreateSession();
  const { mutate: deleteSession } = useDeleteSession();

  // Auto-select the most recent session when page loads
  useEffect(() => {
    if (!hasAutoSelected && !sessionsLoading && sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
      setHasAutoSelected(true);
    }
  }, [sessions, sessionsLoading, hasAutoSelected, activeSessionId]);

  const handleNewChat = (autoMessage = '') => {
    createSession(undefined, {
      onSuccess: (session) => {
        setActiveSessionId(session.id);
        if (autoMessage) setAutoSendMessage(autoMessage);
      }
    });
  };

  const handleDelete = (id) => {
    deleteSession(id, {
      onSuccess: () => {
        if (activeSessionId === id) {
          const remaining = sessions.filter(s => s.id !== id);
          setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
        }
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-neutral-950">

      {/* ── Sidebar ── */}
      <div className="w-64 shrink-0 flex flex-col bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800">

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
            onClick={() => handleNewChat()}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm font-medium transition-all disabled:opacity-50 shadow-sm active:scale-[0.98]"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            New Chat
          </button>
        </div>

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

        <DocumentsPanel />

        <div className="p-3 border-t border-gray-100 dark:border-neutral-800">
          <p className="text-[11px] text-gray-400 dark:text-gray-600 text-center leading-relaxed">
            Answers grounded in your financial data
          </p>
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-neutral-950">
        {activeSessionId ? (
          <ChatWindow
            sessionId={activeSessionId}
            autoSendMessage={autoSendMessage}
            onAutoSendConsumed={() => setAutoSendMessage('')}
          />
        ) : (
          <EmptyState onCreate={handleNewChat} creating={creating} />
        )}
      </div>
    </div>
  );
}

function DocumentsPanel() {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef(null);

  const { data: docs = [], isLoading } = useDocuments();
  const { mutate: upload, isPending: uploading } = useUploadDocument();
  const { mutate: remove } = useDeleteDocument();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload(file, {
      onSuccess: (data) => (data.truncated ? toast.warning : toast.success)(`"${file.name}": ${data.message}`),
      onError: (err) => toast.error(err?.response?.data?.message || 'Failed to process document')
    });
    e.target.value = '';
  };

  const handleDelete = async (doc) => {
    const ok = await confirm({
      title: 'Remove document',
      description: `Remove "${doc.filename}" from AI context?`,
      confirmText: 'Remove',
    });
    if (!ok) return;
    remove(doc.id, {
      onSuccess: () => toast.success('Document removed'),
      onError: () => toast.error('Failed to remove document')
    });
  };

  const formatSize = (chars) => {
    if (chars > 10000) return `${(chars / 1000).toFixed(0)}k chars`;
    return `${chars} chars`;
  };

  return (
    <div className="border-t border-gray-100 dark:border-neutral-800">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          <span>Documents</span>
          {docs.length > 0 && (
            <span className="bg-primary-100 dark:bg-emerald-900/40 text-primary-600 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
              {docs.length}
            </span>
          )}
        </div>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {open && (
        <div className="px-2 pb-2 space-y-1">
          {/* Upload button */}
          <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.csv" onChange={handleFile} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs rounded-lg border border-dashed border-gray-300 dark:border-neutral-700 text-gray-500 dark:text-gray-400 hover:border-primary-400 dark:hover:border-emerald-600 hover:text-primary-600 dark:hover:text-emerald-400 hover:bg-primary-50/50 dark:hover:bg-emerald-900/10 transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {uploading ? 'Processing…' : 'Upload PDF / TXT / CSV'}
          </button>

          {/* Document list */}
          {isLoading ? (
            <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-gray-300" /></div>
          ) : docs.length === 0 ? (
            <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center py-2 leading-relaxed">
              Upload documents to answer questions about their content
            </p>
          ) : (
            docs.map(doc => (
              <div key={doc.id} className="group flex items-start gap-1.5 px-1.5 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                <FileIcon className="w-3 h-3 mt-0.5 shrink-0 text-primary-400 dark:text-emerald-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">{doc.filename}</p>
                  {doc.status === 'embedding' ? (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">Indexing…</p>
                  ) : doc.status === 'failed' ? (
                    <p className="text-[10px] text-red-600 dark:text-red-400" title={doc.error || ''}>Couldn't index — delete and upload again</p>
                  ) : (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      {doc._count?.chunks || 0} chunks · {formatSize(doc.char_count)}{doc.truncated ? ' · partly indexed' : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(doc)}
                  className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onCreate, creating }) {
  const capabilities = [
    { emoji: '🧭', title: 'Total net worth',      desc: 'Show me everything I own',                 question: 'What is my total net worth right now?' },
    { emoji: '🏦', title: 'Account balances',     desc: "What's my total balance?",                 question: 'What is my total balance across all accounts?' },
    { emoji: '📈', title: 'Investment snapshot',  desc: 'Stocks & mutual funds today',              question: 'What is my stock portfolio value and today\'s change?' },
    { emoji: '🕌', title: 'Zakat',                desc: 'Given and still to pay',                   question: 'How much zakat have I given this year and how much do I owe?' },
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
          <button
            key={c.title}
            onClick={() => onCreate(c.question)}
            disabled={creating}
            className="text-left bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 hover:border-primary-300 dark:hover:border-emerald-700 hover:shadow-md transition-all disabled:opacity-60 active:scale-[0.98] group cursor-pointer"
          >
            <span className="text-xl">{c.emoji}</span>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-2">{c.title}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">"{c.desc}"</p>
            <p className="text-[10px] text-primary-500 dark:text-emerald-400 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Click to ask →
            </p>
          </button>
        ))}
      </div>

      <button
        onClick={() => onCreate()}
        disabled={creating}
        className="mt-8 flex items-center gap-2 py-2.5 px-6 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.98] disabled:opacity-60"
      >
        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Start a conversation
      </button>
    </div>
  );
}
