/**
 * Container entrypoint: serves the static web app and exposes the tutor API
 * at POST /api/chat, reusing the exact same logic as the Lambda handler.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { askTutorStream, validateMessages } from "./backend/tutor.mjs";

const PORT = Number(process.env.PORT ?? 8080);
const MODEL_ID = process.env.MODEL_ID ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const root = path.dirname(fileURLToPath(import.meta.url));
// Point the frontend at the container's own API route
const indexHtml = readFileSync(path.join(root, "web/index.html"), "utf-8").replace(
  "%%API_URL%%",
  "/api/chat"
);

const json = (res, statusCode, body) => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

const STATIC_FILES = {
  "/sumdeting-icon-blue.png": "image/png",
  "/sumdeting-icon-cream.png": "image/png",
  "/sumdeting-favicon-app.png": "image/png",
  "/sumdeting-app-light.png": "image/png",
  "/apple-touch-icon.png": "image/png",
  "/og-image.png": "image/png",
  "/manifest.webmanifest": "application/manifest+json",
};

const server = createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(indexHtml);
    return;
  }

  if (req.method === "GET" && STATIC_FILES[req.url]) {
    try {
      const body = readFileSync(path.join(root, "web", req.url));
      res.writeHead(200, { "Content-Type": STATIC_FILES[req.url], "Cache-Control": "public, max-age=86400" });
      res.end(body);
    } catch {
      json(res, 404, { error: "Not found" });
    }
    return;
  }

  if (req.method === "GET" && req.url === "/healthz") {
    json(res, 200, { status: "ok" });
    return;
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 4_000_000) req.destroy(); // allow base64 photos
    });
    req.on("end", async () => {
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        json(res, 400, { error: "Invalid JSON body" });
        return;
      }

      const validationError = validateMessages(payload?.messages);
      if (validationError) {
        json(res, 400, { error: validationError });
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      try {
        await askTutorStream(payload.messages, MODEL_ID, (text) => res.write(text));
      } catch (err) {
        console.error("Bedrock invocation failed", err);
        res.write("\n\n[SumDeTing hit a snag; please send that again.]");
      }
      res.end();
    });
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`SumDeTing listening on http://localhost:${PORT} (model: ${MODEL_ID})`);
});
