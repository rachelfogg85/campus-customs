import { createContext, useContext, useMemo, useState } from "react";

/**
 * Whether the floating chat panel is open — lifted out of ChatWidget so
 * other components (the Home page's "Ask Before You Buy" banner) can open
 * it directly instead of only being able to point shoppers at the launcher.
 */
interface ChatUIValue {
  open: boolean;
  openChat: () => void;
  close: () => void;
  toggle: () => void;
}

const ChatUIContext = createContext<ChatUIValue | null>(null);

export function ChatUIProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const value = useMemo<ChatUIValue>(
    () => ({
      open,
      openChat: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen((v) => !v),
    }),
    [open],
  );

  return <ChatUIContext.Provider value={value}>{children}</ChatUIContext.Provider>;
}

export function useChatUI(): ChatUIValue {
  const ctx = useContext(ChatUIContext);
  if (!ctx) throw new Error("useChatUI must be used inside ChatUIProvider");
  return ctx;
}
