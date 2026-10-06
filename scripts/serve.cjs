// Tiny local web server so the tracker can be previewed at http://localhost:5176
// Run it from the project folder with:  node scripts/serve.cjs   (another port: PORT=5181 node scripts/serve.cjs)
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const port = Number(process.env.PORT) || 5176;
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
}).listen(port, () => console.log(`Serving on http://localhost:${port}`));
