import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = fileURLToPath(new URL("../_site/", import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const mediaTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".xml", "application/xml; charset=utf-8"],
]);

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    let filePath = path.resolve(siteRoot, relativePath);
    if (!filePath.startsWith(siteRoot)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    let fileState = await stat(filePath);
    if (fileState.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      fileState = await stat(filePath);
    }
    if (!fileState.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-length": fileState.size,
      "content-type": mediaTypes.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  console.log(`Paseo Skins site ready at http://127.0.0.1:${address.port}`);
});
