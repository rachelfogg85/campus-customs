import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchChatHistory, sendChat } from "../api";
import { useAuth } from "../auth";
import { useChatMatches } from "../chatMatches";
import { useChatUI } from "../chatUI";
import { Markdown } from "./Markdown";

interface Message {
  role: "user" | "assistant";
  text: string;
  matchCount?: number;
  error?: boolean;
}

/** The product_id of the current page, if the shopper is on a product's own page. */
function useCurrentProductId(): string | null {
  const location = useLocation();
  const match = /^\/products\/([^/]+)$/.exec(location.pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Floating chat panel, bottom-right. Talks to the pydantic-ai agent behind
 * /api/chat. The reply text stays in the chat; any products the agent's
 * tools returned are handed off to ChatMatchesProvider, which is what
 * actually puts product cards on the page (see ../chatMatches.tsx).
 *
 * For a logged-in shopper, past turns are reloaded from /api/chat/history on
 * login so returning doesn't start the conversation over — guests just get
 * a fresh, unsaved conversation each visit.
 */
export function ChatWidget() {
  const { user } = useAuth();
  const { setMatches } = useChatMatches();
  const { open, close, toggle } = useChatUI();
  const productId = useCurrentProductId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reload history whenever a shopper logs in; clear it when they log out
  // so the next guest (or a different account) doesn't see someone else's
  // conversation still sitting in the panel.
  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }
    const controller = new AbortController();
    fetchChatHistory(user.id, controller.signal)
      .then((history) => {
        setMessages(
          history.map((m) => ({
            role: m.role,
            text: m.content,
            matchCount: m.products.length || undefined,
          })),
        );
      })
      .catch(() => {
        /* History is a nicety; a failed reload still leaves a usable chat. */
      });
    return () => controller.abort();
  }, [user]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy, open]);

  async function submit(text: string) {
    const message = text.trim();
    if (!message || busy) return;

    setMessages((m) => [...m, { role: "user", text: message }]);
    setDraft("");
    setBusy(true);

    try {
      const res = await sendChat(message, user?.id, productId);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: res.reply, matchCount: res.products.length },
      ]);
      if (res.products.length > 0) {
        setMatches(message, res.products);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            err instanceof Error
              ? `Could not reach the store assistant: ${err.message}`
              : "Could not reach the store assistant.",
          error: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit(draft);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <section className="chat-widget__panel" aria-label="Campus Customs chat">
          <header className="chat-widget__head">
            <div>
              <h2>Campus Customs Chat</h2>
              <p>
                {user
                  ? `Signed in as ${user.first_name ?? user.name} — your chat history is saved.`
                  : "Ask about sizes, colors, or anything in the shop."}
              </p>
            </div>
            <button
              className="chat-widget__close"
              onClick={close}
              aria-label="Close chat"
            >
              ×
            </button>
          </header>

          <div className="chat-widget__scroll" ref={scrollRef}>
            {messages.length === 0 && !busy && (
              <div className="chat-widget__empty">
                <p>Say hi — we're happy to help you find something good.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`bubble-row bubble-row--${m.role}`}>
                <div className={`bubble ${m.error ? "bubble--error" : ""}`}>
                  {m.role === "assistant" ? <Markdown text={m.text} /> : m.text}
                </div>
                {!!m.matchCount && (
                  <p className="chat-widget__match-note">
                    Added {m.matchCount} matching {m.matchCount === 1 ? "item" : "items"} to
                    the page — scroll up to see them.
                  </p>
                )}
              </div>
            ))}

            {busy && (
              <div className="bubble-row bubble-row--assistant">
                <div className="bubble bubble--thinking">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            )}
          </div>

          <div className="chat-widget__composer">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                productId ? "Ask about this item…" : "Type a message…"
              }
              rows={1}
              disabled={busy}
            />
            <button
              className="chat-widget__send"
              onClick={() => void submit(draft)}
              disabled={busy || !draft.trim()}
            >
              Send
            </button>
          </div>
        </section>
      )}

      <button
        className={`chat-widget__toggle ${open ? "is-open" : ""}`}
        onClick={toggle}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          "×"
        ) : (
          <>
            <span className="chat-widget__toggle-icon">💬</span>
            <span className="chat-widget__toggle-label">Chat with us</span>
          </>
        )}
      </button>
    </div>
  );
}
