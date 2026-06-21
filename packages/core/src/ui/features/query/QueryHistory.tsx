interface QueryHistoryProps {
  items: string[];
  onSelect(query: string): void;
}

export function QueryHistory({ items, onSelect }: QueryHistoryProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div class="query-history">
      <h3>Session History</h3>
      {items.map((item) => (
        <button key={item} type="button" onClick={() => onSelect(item)}>
          {item}
        </button>
      ))}
    </div>
  );
}
