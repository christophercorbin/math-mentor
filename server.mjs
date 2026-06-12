/**
 * Container entrypoint: serves the static web app and exposes the tutor API
 * at POST /api/chat, reusing the exact same logic as the Lambda handler.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { askTutor, validateMessages } from "./backend/tutor.mjs";

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

const server = createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(indexHtml);
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
      if (raw.length > 1_000_000) req.destroy();
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

      try {
        const reply = await askTutor(payload.messages, MODEL_ID);
        json(res, 200, { reply });
      } catch (err) {
        console.error("Bedrock invocation failed", err);
        json(res, 502, { error: "Model invocation failed" });
      }
    });
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`MathMentor listening on http://localhost:${PORT} (model: ${MODEL_ID})`);
});
