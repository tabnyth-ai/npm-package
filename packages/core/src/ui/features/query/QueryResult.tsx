import type { QueryResult as QueryResultData } from "../../api/types";
import { DataGrid } from "../../components/DataGrid";

interface QueryResultProps {
  result: QueryResultData | null;
}

export function QueryResult({ result }: QueryResultProps) {
  if (!result) {
    return <div class="empty-state">Run a query to see results.</div>;
  }

  return (
    <div class="query-result">
      <div class="result-meta">
        <span>{result.rowCount} rows</span>
        <span>{result.durationMs} ms</span>
      </div>
      <DataGrid columns={result.columns} rows={result.rows} />
    </div>
  );
}
