// Local dev server: same API handler as the Worker, plus static files from public/.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { handleApi } from "./src/worker.js";

for (const line of fs.existsSync(".env") ? fs.readFileSync(".env", "utf8").split("\n") : []) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".png": "image/png" };

http.createServer(async (req, res) => {
  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => r(d)); });
  const request = new Request(`http://localhost${req.url}`, { method: req.method, body, headers: req.headers });
  const api = await handleApi(request, process.env);
  if (api) {
    res.writeHead(api.status, Object.fromEntries(api.headers));
    return res.end(await api.text());
  }
  let p = new URL(request.url).pathname;
  if (p.endsWith("/")) p += "index.html";
  const file = path.join("public", path.normalize(p));
  if (!file.startsWith("public") || !fs.existsSync(file)) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(8787, "0.0.0.0", () => console.log("http://localhost:8787"));
