const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataDir = path.join(root, "data");
const dataFile = path.join(dataDir, "business-state.json");
const port = Number(process.env.PORT || 4174);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 15 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function readStore() {
  if (!fs.existsSync(dataFile)) return { updatedAt: 0, data: null };
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return { updatedAt: 0, data: null };
  }
}

function writeStore(payload) {
  fs.mkdirSync(dataDir, { recursive: true });
  const record = {
    updatedAt: Number(payload.updatedAt || Date.now()),
    data: payload.data || null,
  };
  fs.writeFileSync(dataFile, JSON.stringify(record, null, 2));
  return record;
}

async function handleApi(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, "");
  if (req.method === "GET") return send(res, 200, JSON.stringify(readStore()));
  if (req.method === "PUT") {
    try {
      const payload = JSON.parse(await readBody(req) || "{}");
      if (!payload.data || typeof payload.data !== "object") return send(res, 400, JSON.stringify({ error: "Invalid state data" }));
      return send(res, 200, JSON.stringify(writeStore(payload)));
    } catch {
      return send(res, 400, JSON.stringify({ error: "Invalid JSON" }));
    }
  }
  send(res, 405, JSON.stringify({ error: "Method not allowed" }));
}

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const clean = decoded === "/" ? "/login.html" : decoded;
  const filePath = path.normalize(path.join(root, clean));
  return filePath.startsWith(root) ? filePath : null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/state") {
    handleApi(req, res);
    return;
  }

  const filePath = safeFilePath(url.pathname);
  if (!filePath) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  fs.readFile(filePath, (error, content) => {
    if (error) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    const type = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": /\.(html|js|css|webmanifest)$/i.test(filePath) ? "no-store" : "public, max-age=3600",
    });
    res.end(content);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`JD TVS online app running: http://localhost:${port}/login.html`);
  console.log(`For mobile on same Wi-Fi, open this computer IP with port ${port}.`);
});
