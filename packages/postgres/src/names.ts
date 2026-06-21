export interface ParsedTableName {
  schema: string;
  table: string;
}

export function parseTableName(name: string, fallbackSchema = "public"): ParsedTableName {
  const [schema, ...tableParts] = name.split(".");

  if (tableParts.length === 0) {
    return {
      schema: fallbackSchema,
      table: name
    };
  }

  return {
    schema,
    table: tableParts.join(".")
  };
}

export function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function quoteTableName(schema: string, table: string): string {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
}
