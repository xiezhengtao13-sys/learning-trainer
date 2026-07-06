import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const PORT = Number(process.argv[2] || process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = process.cwd();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${HOST}`).pathname);
  } catch {
    return send(res, 400, "bad request");
  }
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.resolve(ROOT, `.${pathname}`);
  if (!filePath.startsWith(ROOT)) return send(res, 403, "forbidden");

  fs.readFile(filePath, (error, data) => {
    if (error) return send(res, 404, "not found");
    send(res, 200, data, MIME[path.extname(filePath)] || "application/octet-stream");
  });
}).listen(PORT, HOST, () => {
  console.log(`学习训练器预览：http://${HOST}:${PORT}/`);
});
