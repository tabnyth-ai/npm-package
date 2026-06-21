interface JsonViewerProps {
  value: unknown;
  compact?: boolean;
}

export function JsonViewer({ value, compact = false }: JsonViewerProps) {
  if (value === null || value === undefined) {
    return <span class="null-value">{String(value)}</span>;
  }

  if (typeof value === "object") {
    return <pre class={compact ? "json-value compact" : "json-value"}>{JSON.stringify(value, null, compact ? 0 : 2)}</pre>;
  }

  return <span>{String(value)}</span>;
}
