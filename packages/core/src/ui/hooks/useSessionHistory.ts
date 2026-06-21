import { useState } from "preact/hooks";

const maxHistoryItems = 12;

export function useSessionHistory() {
  const [history, setHistory] = useState<string[]>([]);

  function remember(query: string): void {
    const trimmed = query.trim();

    if (!trimmed) {
      return;
    }

    setHistory((items) => [trimmed, ...items.filter((item) => item !== trimmed)].slice(0, maxHistoryItems));
  }

  return { history, remember };
}
