import { describe, expect, it } from "vitest";

import { formatDatabaseUrl, maskLicenseKey, resolveStartupMode, writeStartupSummary } from "./startup";

describe("startup mode", () => {
  it("uses the explicit startup mode without prompting", async () => {
    await expect(resolveStartupMode({ mode: "edit", prompt: true })).resolves.toBe("edit");
  });

  it("falls back to view mode when prompting is disabled", async () => {
    await expect(resolveStartupMode({ prompt: false })).resolves.toBe("view");
  });
});

describe("startup summary", () => {
  it("masks database passwords", () => {
    expect(formatDatabaseUrl("postgresql://user:secret@localhost:5432/app")).toBe("postgresql://user:***@localhost:5432/app");
  });

  it("masks license keys", () => {
    expect(maskLicenseKey("tnk_1234567890")).toBe("tnk_...7890");
  });

  it("prints mode, database URL, and license status", () => {
    let output = "";

    writeStartupSummary({
      databaseUrl: "mongodb://localhost:27017/app",
      licenseKey: "tnk_1234567890",
      mode: "edit",
      output: {
        write(chunk: string) {
          output += chunk;
          return true;
        }
      }
    });

    expect(output).toContain("Mode: Edit mode");
    expect(output).toContain("Database URL being used: mongodb://localhost:27017/app");
    expect(output).toContain("Using license key: tnk_...7890");
  });

  it("prints the license callout when no license is available", () => {
    let output = "";

    writeStartupSummary({
      databaseUrl: "mongodb://localhost:27017/app",
      mode: "view",
      output: {
        write(chunk: string) {
          output += chunk;
          return true;
        }
      }
    });

    expect(output).toContain("Mode: View mode only");
    expect(output).toContain("To access full potential of Tabnyth, enter your license key.");
  });
});
