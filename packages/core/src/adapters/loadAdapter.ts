import type { AdapterModule, AdapterName, CreateAdapterOptions, DatabaseAdapter } from "./types";

const adapterPackages: Record<AdapterName, string> = {
  postgres: "@tabnyth/postgres",
  mongodb: "@tabnyth/mongodb"
};

type ModuleLoader = (packageName: string) => Promise<AdapterModule>;

export async function loadAdapter(
  name: AdapterName,
  options: CreateAdapterOptions,
  moduleLoader: ModuleLoader = defaultModuleLoader
): Promise<DatabaseAdapter> {
  const packageName = adapterPackages[name];

  try {
    const module = await moduleLoader(packageName);

    if (typeof module.createAdapter !== "function") {
      throw new Error(`${packageName} does not export createAdapter().`);
    }

    return await module.createAdapter(options);
  } catch (error) {
    if (isMissingModuleError(error, packageName)) {
      throw new Error(
        `${formatAdapterName(name)} adapter is not installed.\n\nInstall it with:\n  npm i -D ${packageName}`
      );
    }

    throw error;
  }
}

function defaultModuleLoader(packageName: string): Promise<AdapterModule> {
  return import(packageName) as Promise<AdapterModule>;
}

function formatAdapterName(name: AdapterName): string {
  return name === "mongodb" ? "MongoDB" : "Postgres";
}

function isMissingModuleError(error: unknown, packageName: string): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as NodeJS.ErrnoException).code;
  return code === "ERR_MODULE_NOT_FOUND" && error.message.includes(packageName);
}
