import { useEffect, useState } from "preact/hooks";
import { Code2, Play } from "lucide-preact";

import type { ContainerInfo, QueryInput, QueryResult as QueryResultData, StudioMeta } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { QuickLoader } from "../../components/QuickLoader";
import { QueryEditor } from "../../components/QueryEditor";
import { useQueryRunner } from "../../hooks/useQueryRunner";
import { useSessionHistory } from "../../hooks/useSessionHistory";
import { QueryHistory } from "./QueryHistory";
import { createDefaultQuery, parseQuery } from "./queryParsing";

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
    const input = parseQuery(meta.kind, query, selected, meta.defaultLimit);

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
