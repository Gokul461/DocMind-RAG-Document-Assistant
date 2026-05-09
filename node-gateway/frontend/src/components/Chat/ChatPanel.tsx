import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  Send,
  Bot,
  User,
  Trash2,
  Loader2,
} from 'lucide-react';

import { streamQuery } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { uuid } from '../../utils/uuid';

import clsx from 'clsx';

export function ChatPanel() {
  const {
    messages,
    isStreaming,
    selectedDocIds,
    addMessage,
    appendToLastMessage,
    setStreaming,
    clearChat,
  } = useAppStore();

  const [input, setInput] = useState('');

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();

    if (!question || isStreaming) return;

    setInput('');

    addMessage({
      id: uuid(),
      role: 'user',
      content: question,
    });

    addMessage({
      id: uuid(),
      role: 'assistant',
      content: '',
    });

    setStreaming(true);

    const history = messages
      .slice(-8)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    await streamQuery(
      question,

      selectedDocIds.length > 0
        ? selectedDocIds
        : null,

      history,

      (token) => appendToLastMessage(token),

      () => setStreaming(false),

      (err) => {
        appendToLastMessage('\n\nError: ' + err);

        setStreaming(false);
      }
    );
  };

  const onKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      handleSend();
    }
  };

  const scopeLabel =
    selectedDocIds.length > 0
      ? `${selectedDocIds.length} selected document(s)`
      : 'Searching all documents';

  return (
    <div className="flex flex-col h-full">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Chat
          </h2>

          <p className="text-xs text-gray-500">
            {scopeLabel}
          </p>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />

            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        
        {/* Empty State */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
            <Bot className="w-12 h-12 text-indigo-900" />

            <p className="text-sm font-medium text-gray-500">
              Ask anything about your documents
            </p>

            <div className="space-y-2 text-center">
              {[
                'Summarise the key findings',
                'What are the main conclusions?',
                'List all mentions of...',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="block w-full text-xs text-indigo-500 hover:text-indigo-400 hover:underline"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              'flex gap-3',

              msg.role === 'user'
                ? 'justify-end'
                : 'justify-start'
            )}
          >
            {/* Assistant Avatar */}
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-indigo-900 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={clsx(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm',

                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm'
              )}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                  >
                    {msg.content || '▋'}
                  </ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>

            {/* User Avatar */}
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming Indicator */}
        {isStreaming &&
          messages[messages.length - 1]?.content === '' && (
            <div className="flex items-center gap-2 text-gray-500 text-sm pl-10">
              <Loader2 className="w-4 h-4 animate-spin" />

              Thinking...
            </div>
          )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-800">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) =>
              setInput(e.target.value)
            }
            onKeyDown={onKeyDown}
            placeholder="Ask a question... (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-700 bg-gray-800 text-gray-200 placeholder-gray-600 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            style={{
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className={clsx(
              'p-3 rounded-xl transition-colors',

              !input.trim() || isStreaming
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            )}
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}