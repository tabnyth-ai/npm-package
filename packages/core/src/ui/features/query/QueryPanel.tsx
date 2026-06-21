import { useEffect, useState } from "preact/hooks";
import { Code2, Play } from "lucide-preact";

import type { ContainerInfo, QueryInput, QueryResult as QueryResultData, StudioMeta } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { QuickLoader } from "../../components/QuickLoader";
import { QueryEditor } from "../../components/QueryEditor";
import { useQueryRunner } from "../../hooks/useQueryRunner";
import { useSessionHistory } from "../../hooks/useSessionHistory";
import { QueryHistory } from "./QueryHistory";

interface QueryPanelProps {
  meta: StudioMeta;
  selected: ContainerInfo | null;
  onRunResult?(result: QueryResultData): void;
}

export function QueryPanel({ meta, selected, onRunResult }: QueryPanelProps) {
  const [query, setQuery] = useState(() => createDefaultQuery(meta.kind, selected, meta.defaultLimit));
  const [parseError, setParseError] = useState<string | null>(null);
  const runner = useQueryRunner();
  const history = useSessionHistory();

  useEffect(() => {
    setQuery(createDefaultQuery(meta.kind, selected, meta.defaultLimit));
  }, [meta.kind, selected?.name, meta.defaultLimit]);

  async function run(): Promise<void> {
    setParseError(null);
    const input = parseQuery(meta.kind, query);

    if (input instanceof Error) {
      setParseError(input.message);
      return;
    }

    history.remember(query);
    const result = await runner.run(input);

    if (result) {
      onRunResult?.(result);
    }
  }

  return (
    <section class="content-panel query-panel">
      <div class="panel-toolbar">
        <div class="panel-title">
          <Code2 aria-hidden="true" size={20} />
          <h2>Query Editor</h2>
        </div>
        <button aria-label={runner.running ? "Running query" : "Run query"} type="button" onClick={() => void run()} disabled={runner.running}>
          {runner.running ? (
            <QuickLoader className="button-loader" color="#03100f" />
          ) : (
            <>
              <Play aria-hidden="true" size={15} />
              Run
            </>
          )}
        </button>
      </div>

      <QueryEditor value={query} kind={meta.kind} onChange={setQuery} />
      <ErrorMessage message={parseError ?? runner.error} />
      <QueryHistory items={history.history} onSelect={setQuery} />
    </section>
  );
}

function parseQuery(kind: StudioMeta["kind"], query: string): QueryInput | Error {
  if (kind === "sql") {
    return { text: query };
  }

  try {
    return JSON.parse(query) as QueryInput;
  } catch (error) {
    return new Error(error instanceof Error ? error.message : "MongoDB query must be valid JSON.");
  }
}

function createDefaultQuery(kind: StudioMeta["kind"], selected: ContainerInfo | null, limit: number): string {
  if (kind === "sql") {
    const tableName = selected ? quoteSqlTableName(selected.name) : "public.table_name";
    return `SELECT * FROM ${tableName} LIMIT ${limit};`;
  }

  return JSON.stringify(
    {
      collection: selected?.name ?? "collection_name",
      operation: "find",
      filter: {},
      limit
    },
    null,
    2
  );
}

function quoteSqlTableName(name: string): string {
  return name
    .split(".")
    .map((part) => `"${part.replace(/"/g, '""')}"`)
    .join(".");
}
