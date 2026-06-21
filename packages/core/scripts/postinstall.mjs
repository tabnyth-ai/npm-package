const setupPath = "../dist/config/setup.js";

try {
  const { setupTabnythConfig } = await import(setupPath);
  await setupTabnythConfig();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Tabnyth setup skipped: ${message}`);
  console.warn("Run `npx tabnyth setup` after installation to configure your license key.");
}
