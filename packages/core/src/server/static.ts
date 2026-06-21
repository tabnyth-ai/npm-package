import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { Hono } from "hono";

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

export function serveStaticUi(app: Hono, staticDir?: string): void {
  app.get("*", async (c) => {
    if (!staticDir) {
      return c.json({ error: "UI assets are not available." }, 404);
    }

    const filePath = await resolveStaticPath(staticDir, new URL(c.req.url).pathname);

    if (!filePath) {
      return c.json({ error: "UI assets are not available." }, 404);
    }

    const data = await readFile(filePath);
    const contentType = contentTypes[path.extname(filePath)] ?? "application/octet-stream";

    return new Response(data, {
      headers: {
        "content-type": contentType
      }
    });
  });
}

async function resolveStaticPath(staticDir: string, requestPath: string): Promise<string | null> {
  const root = path.resolve(staticDir);
  const requested = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const candidate = path.resolve(root, requested);

  if (!isInsideRoot(root, candidate)) {
    return null;
  }

  if (await isFile(candidate)) {
    return candidate;
  }

  const indexPath = path.join(root, "index.html");
  return (await isFile(indexPath)) ? indexPath : null;
}

function isInsideRoot(root: string, filePath: string): boolean {
  return filePath === root || filePath.startsWith(`${root}${path.sep}`);
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}
