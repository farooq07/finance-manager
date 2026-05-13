import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import AssistantBubble from './AssistantBubble';
import { useSession, useSendMessage } from '../hooks/useChat';

const SUGGESTIONS = [
  { emoji: '💸', text: 'What did I spend last month?' },
  { emoji: '📊', text: 'Show income vs expenses for 6 months' },
  { emoji: '🏦', text: 'What is my total wallet balance?' },
  { emoji: '📈', text: 'How are my mutual funds performing?' },
  { emoji: '🤝', text: 'Show my top spending categories' },
];

export default function ChatWindow({ sessionId }) {
  const [input, setInput] = useState('');
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  const { data: session, isLoading } = useSession(sessionId);
  const { mutate: send, isPending } = useSendMessage(sessionId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, isPending]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px';
    }
  }, [input]);

  const handleSend = (text) => {
    const msg = (text ?? input).trim();
    if (!msg || isPending) return;
    setInput('');
    setSendError('');
    send(msg, {
      onError: (err) => {
        setSendError(err?.response?.data?.message || 'Failed to send. Please try again.');
      }
    });
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
      </div>
    );
  }

  const messages = session?.messages || [];
  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="px-6 py-3.5 border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 dark:from-emerald-600 dark:to-teal-700 flex items-center justify-center shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
            {session?.title || 'New conversation'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">AI-powered finance assistant</p>
        </div>
      </div>

      {/* ── Message thread ── */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <SuggestionsScreen onSuggest={handleSend} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-2">
            {messages.map((msg, i) => (
              <MessageRow key={msg.id} msg={msg} prev={messages[i - 1]} />
            ))}

            {isPending && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800 px-4 py-3">
        {sendError && (
          <div className="max-w-3xl mx-auto mb-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400">
            {sendError}
          </div>
        )}
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-4 py-2.5 focus-within:border-primary-400 dark:focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-primary-100 dark:focus-within:ring-emerald-900/30 transition-all shadow-sm">
            <textarea
              ref={(el) => { inputRef.current = el; textareaRef.current = el; }}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your finances…"
              disabled={isPending}
              className="flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none py-0.5 leading-relaxed"
              style={{ minHeight: 24, maxHeight: 128 }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isPending}
              className="shrink-0 w-8 h-8 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95 shadow-sm mb-0.5"
            >
              {isPending
                ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                : <Send className="w-3.5 h-3.5 text-white" />
              }
            </button>
          </div>
          <p className="text-center text-[11px] text-gray-300 dark:text-gray-600 mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ msg, prev }) {
  const isUser = msg.role === 'user';
  const showGap = !prev || prev.role !== msg.role;

  return (
    <div className={showGap ? 'mt-5 first:mt-0' : 'mt-1'}>
      {isUser ? (
        <div className="flex justify-end">
          <div className="max-w-[75%] bg-primary-600 dark:bg-emerald-700 text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-sm leading-relaxed shadow-sm">
            {msg.content}
          </div>
        </div>
      ) : (
        <AssistantBubble content={msg.content} toolName={msg.tool_name} toolData={msg.tool_data} showAvatar={showGap} />
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 mt-5">
      <Avatar />
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl rounded-tl-md px-4 py-3.5 shadow-sm">
        <div className="flex gap-1.5 items-center">
          <span className="w-2 h-2 rounded-full bg-primary-400 dark:bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-primary-400 dark:bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-primary-400 dark:bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 dark:from-emerald-600 dark:to-teal-700 flex items-center justify-center shadow-sm mt-0.5">
      <Sparkles className="w-3.5 h-3.5 text-white" />
    </div>
  );
}

function SuggestionsScreen({ onSuggest }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 h-full">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 dark:from-emerald-600 dark:to-teal-700 flex items-center justify-center shadow-md mb-4">
        <Sparkles className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">What would you like to know?</h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 text-center max-w-xs">
        Try one of these or type your own question
      </p>
      <div className="flex flex-col gap-2 w-full max-w-md">
        {SUGGESTIONS.map(s => (
          <button
            key={s.text}
            onClick={() => onSuggest(s.text)}
            className="flex items-center gap-3 text-left text-sm px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-primary-300 dark:hover:border-emerald-700 hover:bg-primary-50/50 dark:hover:bg-emerald-900/10 text-gray-700 dark:text-gray-300 transition-all group"
          >
            <span className="text-base">{s.emoji}</span>
            <span className="flex-1">{s.text}</span>
            <span className="text-gray-300 dark:text-gray-600 group-hover:text-primary-400 dark:group-hover:text-emerald-500 transition-colors">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
