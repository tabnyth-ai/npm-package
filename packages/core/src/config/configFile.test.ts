import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  TABNYTH_KEY_COMMENT,
  ensureTabnythEnvEntry,
  readTabnythKeyFromEnvFile,
  readTabnythLicenseKey,
  resolveEnvPath,
  writeTabnythConfig
} from "./configFile";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe("tabnyth env config", () => {
  it("appends a TABNYTH_KEY placeholder to .env once", async () => {
    const root = await createTempRoot();

    await ensureTabnythEnvEntry(root);
    await ensureTabnythEnvEntry(root);

    const envText = await readFile(resolveEnvPath(root), "utf8");

    expect(envText).toContain(TABNYTH_KEY_COMMENT);
    expect(envText.match(/^TABNYTH_KEY=/gm)).toHaveLength(1);
  });

  it("reads TABNYTH_KEY from process env before the .env file", async () => {
    const root = await createTempRoot();

    await ensureTabnythEnvEntry(root);

    expect(await readTabnythLicenseKey(root, { TABNYTH_KEY: "tnk_from_process" })).toBe("tnk_from_process");
  });

  it("reads TABNYTH_KEY from .env and falls back to legacy config", async () => {
    const envRoot = await createTempRoot();
    await ensureTabnythEnvEntry(envRoot);
    await setEnvKey(envRoot, "tnk_from_env");

    expect(await readTabnythKeyFromEnvFile(envRoot)).toBe("tnk_from_env");
    expect(await readTabnythLicenseKey(envRoot, {})).toBe("tnk_from_env");

    const legacyRoot = await createTempRoot();
    await writeTabnythConfig(legacyRoot, { licenseKey: "tnk_from_legacy" });

    expect(await readTabnythLicenseKey(legacyRoot, {})).toBe("tnk_from_legacy");
  });
});

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "tabnyth-config-"));
  tempRoots.push(root);
  return root;
}

async function setEnvKey(root: string, value: string): Promise<void> {
  const path = resolveEnvPath(root);
  const current = await readFile(path, "utf8");
  await writeFile(path, current.replace(/^TABNYTH_KEY=.*$/m, `TABNYTH_KEY=${value}`), "utf8");
}
