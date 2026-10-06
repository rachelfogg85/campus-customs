import { createContext, useContext, useMemo, useState } from "react";
import type { Product } from "./api";

/**
 * Holds the most recent product matches the chat agent surfaced, so any page
 * can render them as cards — this is the frontend half of the search-updates
 * -the-page feature: the agent returns structured products on `ChatResponse`,
 * `ChatWidget` hands them here, and `ChatMatches` renders them globally.
 */
interface ChatMatchesValue {
  query: string | null;
  products: Product[];
  setMatches: (query: string, products: Product[]) => void;
  clear: () => void;
}

const ChatMatchesContext = createContext<ChatMatchesValue | null>(null);

export function ChatMatchesProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const value = useMemo<ChatMatchesValue>(
    () => ({
      query,
      products,
      setMatches: (q, p) => {
        setQuery(q);
        setProducts(p);
      },
      clear: () => {
        setQuery(null);
        setProducts([]);
      },
    }),
    [query, products],
  );

  return (
    <ChatMatchesContext.Provider value={value}>
      {children}
    </ChatMatchesContext.Provider>
  );
}

export function useChatMatches(): ChatMatchesValue {
  const ctx = useContext(ChatMatchesContext);
  if (!ctx) throw new Error("useChatMatches must be used inside ChatMatchesProvider");
  return ctx;
}
