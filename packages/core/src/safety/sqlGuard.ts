const allowedReadonlyStarts = ["select", "with", "show", "explain"];
const blockedKeywords = ["insert", "update", "delete", "drop", "alter", "truncate", "create", "grant", "revoke"];

export function assertSqlAllowed(sql: string, allowWrite: boolean): void {
  const normalized = normalizeSql(sql);

  if (!normalized) {
    throw new Error("SQL query is empty.");
  }

  if (allowWrite) {
    return;
  }

  const startsWithReadonly = allowedReadonlyStarts.some((keyword) => normalized.startsWith(keyword));

  if (!startsWithReadonly) {
    throw new Error("Only read-only SQL queries are allowed. Restart with --allow-write to enable writes.");
  }

  const blocked = blockedKeywords.find((keyword) => new RegExp(`\\b${keyword}\\b`, "i").test(normalized));

  if (blocked) {
    throw new Error(`SQL keyword "${blocked}" is blocked in read-only mode.`);
  }
}

function normalizeSql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .trim()
    .toLowerCase();
}
