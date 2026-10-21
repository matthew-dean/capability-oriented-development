import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
export function serve(root) {
  const base = resolve(root);
  return createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(base + sep)) { res.writeHead(403).end(); return; }
      const data = await readFile(file);
      res.setHeader('Content-Type', ({ '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html' })[extname(file)] || 'application/octet-stream');
      res.end(data);
    } catch { res.writeHead(404).end(); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = serve(fileURLToPath(new URL('.', import.meta.url)));
  server.listen(Number(process.env.PORT || 4178), '127.0.0.1', () => console.log('Open http://127.0.0.1:' + server.address().port));
}
