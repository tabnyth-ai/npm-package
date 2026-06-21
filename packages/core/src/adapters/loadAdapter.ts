import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

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
  return importFromProjectRoot(packageName) as Promise<AdapterModule>;
}

async function importFromProjectRoot(packageName: string): Promise<AdapterModule> {
  try {
    const projectRequire = createRequire(resolve(process.cwd(), "package.json"));
    const modulePath = projectRequire.resolve(packageName);
    return (await import(pathToFileURL(modulePath).href)) as AdapterModule;
  } catch (error) {
    if (isMissingModuleError(error, packageName)) {
      return (await import(packageName)) as AdapterModule;
    }

    throw error;
  }
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
