import { useEffect, useState } from "preact/hooks";
import { Bot, Code2, Play } from "lucide-preact";

import type { ContainerInfo, QueryInput, QueryResult as QueryResultData, StudioMeta } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { QuickLoader } from "../../components/QuickLoader";
import { QueryEditor } from "../../components/QueryEditor";
import { useQueryRunner } from "../../hooks/useQueryRunner";
import { useSessionHistory } from "../../hooks/useSessionHistory";
import { QueryHistory } from "./QueryHistory";
import { createDefaultQuery, parseQuery } from "./queryParsing";

interface QueryPanelProps {
  insertedQuery?: string | null;
  meta: StudioMeta;
  selected: ContainerInfo | null;
  onInsertedQueryConsumed?(): void;
  onOpenNythAi?(): void;
  onRunResult?(result: QueryResultData): void;
}

export function QueryPanel({ insertedQuery, meta, selected, onInsertedQueryConsumed, onOpenNythAi, onRunResult }: QueryPanelProps) {
  const [query, setQuery] = useState(() => createDefaultQuery(meta.kind, selected, meta.defaultLimit));
  const [parseError, setParseError] = useState<string | null>(null);
  const runner = useQueryRunner();
  const history = useSessionHistory();

  useEffect(() => {
    setQuery(createDefaultQuery(meta.kind, selected, meta.defaultLimit));
  }, [meta.kind, selected?.name, meta.defaultLimit]);

  useEffect(() => {
    if (!insertedQuery) {
      return;
    }

    setQuery(insertedQuery);
    setParseError(null);
    onInsertedQueryConsumed?.();
  }, [insertedQuery, onInsertedQueryConsumed]);

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
        <div class="query-toolbar-actions">
          <button class="use-nyth-ai-button" type="button" onClick={onOpenNythAi}>
            <Bot aria-hidden="true" size={15} />
            Use NythAi
          </button>
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
      </div>

      <QueryEditor value={query} kind={meta.kind} onChange={setQuery} />
      <ErrorMessage message={parseError ?? runner.error} />
      <QueryHistory items={history.history} onSelect={setQuery} />
    </section>
  );
}
