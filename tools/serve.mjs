import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const portText = process.env.PORT ?? '8080';
if (!/^\d+$/.test(portText) || Number(portText) > 65535) {
  console.error('PORT must be an integer between 0 and 65535 (0 chooses an available port).');
  process.exit(1);
}
const port = Number(portText);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const publicFiles = new Set(['index.html','products.html','categories.html','suppliers.html','reports.html','orders.html','adjustments.html','log.html','manifest.webmanifest','service-worker.js','assets/inventory.svg', ...['start.js','main.js','data.js','i18n.js','ui.js','preferences.js','styles.css'].map(name => `app/${name}`)]);
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const path = resolve(root, relative);
    if (!path.startsWith(root + sep) || !publicFiles.has(relative)) throw Error();
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': `${types[extname(path)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Set PORT to a different port.` : `Server could not start: ${error.code}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}`));
