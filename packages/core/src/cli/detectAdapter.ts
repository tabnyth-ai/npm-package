import type { AdapterName } from "../adapters/types";

export function detectAdapterName(databaseUrl: string, override?: string): AdapterName {
  if (override) {
    return normalizeAdapterName(override);
  }

  let protocol: string;

  try {
    protocol = new URL(databaseUrl).protocol.replace(":", "");
  } catch {
    throw new Error("Invalid database URL.");
  }

  if (protocol === "postgres" || protocol === "postgresql") {
    return "postgres";
  }

  if (protocol === "mongodb" || protocol === "mongodb+srv") {
    return "mongodb";
  }

  throw new Error(`Unsupported database URL protocol: ${protocol}`);
}

function normalizeAdapterName(value: string): AdapterName {
  const normalized = value.toLowerCase();

  if (normalized === "postgres" || normalized === "postgresql" || normalized === "pg") {
    return "postgres";
  }

  if (normalized === "mongodb" || normalized === "mongo") {
    return "mongodb";
  }

  throw new Error(`Unsupported adapter: ${value}`);
}
