import type { JSX } from "preact";
import { Code2, Send, Sparkles, X } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";

import { askNythAi } from "../../api/client";
import { QuickLoader } from "../../components/QuickLoader";

interface NythAiDrawerProps {
  onClose(): void;
  onInsertQuery?(query: string): void;
}

interface ChatMessage {
  id: number;
  role: "assistant" | "user";
  content: string;
  isQuery?: boolean;
  query?: string | null;
}

export function NythAiDrawer({ onClose, onInsertQuery }: NythAiDrawerProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingRef = useRef(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, loading]);

  async function sendMessage(): Promise<void> {
    const prompt = draft.trim();

    if (!prompt || loading || pendingRef.current) {
      return;
    }

    const userMessage = createMessage("user", prompt);
    pendingRef.current = true;
    setDraft("");
    setError(null);
    setLoading(true);
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await askNythAi({ prompt });
      setMessages((current) => [
        ...current,
        createMessage("assistant", response.result.text || "No response returned.", {
          isQuery: response.result.isQuery,
          query: response.result.query
        })
      ]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Nyth AI request failed.");
    } finally {
      pendingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div class="ai-drawer-shell" role="presentation" onMouseDown={handleShellMouseDown(onClose)}>
      <aside aria-label="Ask Nyth AI" aria-modal="true" class="ai-drawer" role="dialog">
        <div class="ai-drawer-header">
          <strong>Ask Nyth AI</strong>
          <button aria-label="Close Ask Nyth AI" class="icon-button" type="button" onClick={onClose}>
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div class="ai-thread" ref={threadRef}>
          {messages.length === 0 ? (
            <div class="ai-empty-state">
              <span class="ai-empty-icon">
                <Sparkles aria-hidden="true" size={28} />
              </span>
              <strong>Nyth AI</strong>
            </div>
          ) : null}

          {messages.map((message) => (
            <article class={`ai-message ${message.role}`} key={message.id}>
              <span>{message.role === "user" ? "You" : "Nyth AI"}</span>
              <p>{message.content}</p>
              {message.query ? <pre class="ai-query-preview">{message.query}</pre> : null}
              {message.isQuery && message.query ? (
                <button class="ai-insert-query" type="button" onClick={() => onInsertQuery?.(message.query ?? "")}>
                  <Code2 aria-hidden="true" size={15} />
                  Insert
                </button>
              ) : null}
            </article>
          ))}

          {loading ? (
            <div class="ai-message assistant pending" role="status">
              <span>Nyth AI</span>
              <p>
                <QuickLoader color="teal" />
              </p>
            </div>
          ) : null}
        </div>

        {error ? <div class="ai-error">{error}</div> : null}

        <div class="ai-drawer-composer">
          <textarea
            ref={inputRef}
            aria-label="Message Nyth AI"
            placeholder="Ask Nyth AI..."
            value={draft}
            onInput={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button aria-label="Send message" disabled={loading || draft.trim().length === 0} type="button" onClick={() => void sendMessage()}>
            {loading ? <QuickLoader color="white" /> : <Send aria-hidden="true" size={18} />}
          </button>
        </div>
      </aside>
    </div>
  );
}

function createMessage(role: ChatMessage["role"], content: string, options: Pick<ChatMessage, "isQuery" | "query"> = {}): ChatMessage {
  return {
    id: Date.now() + Math.random(),
    role,
    content,
    isQuery: options.isQuery,
    query: options.query
  };
}

function handleShellMouseDown(onClose: () => void) {
  return (event: JSX.TargetedMouseEvent<HTMLDivElement>): void => {
    if (event.currentTarget === event.target) {
      onClose();
    }
  };
}
