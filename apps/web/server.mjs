import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createMealAnalysis } from "./src/server-core.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 4173);
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

createServer(async (request, response) => {
  try {
    if (!request.url) {
      sendJson(response, 400, { error: "Missing URL" });
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);

    if (request.method === "POST" && url.pathname === "/api/estimate-meal") {
      const body = await readJsonBody(request);
      const result = await createMealAnalysis(body);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        aiEnabled: Boolean(process.env.OPENAI_API_KEY),
      });
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    const relativePath = normalizePath(url.pathname);
    const filePath = path.join(__dirname, relativePath);

    if (!filePath.startsWith(__dirname)) {
      sendJson(response, 403, { error: "Forbidden" });
      return;
    }

    const fileStat = await stat(filePath).catch(() => null);

    if (!fileStat || !fileStat.isFile()) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": filePath.includes("service-worker.js") ? "no-cache" : "public, max-age=300",
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(filePath).pipe(response);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unknown server error",
    });
  }
}).listen(PORT, () => {
  process.stdout.write(`Daily Health Tracker running at http://127.0.0.1:${PORT}\n`);
});

function normalizePath(pathname) {
  if (pathname === "/") {
    return "index.html";
  }

  const decoded = decodeURIComponent(pathname);
  return decoded.replace(/^\/+/, "");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;

    if (size > 5 * 1024 * 1024) {
      throw new Error("Request body too large");
    }

    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}
