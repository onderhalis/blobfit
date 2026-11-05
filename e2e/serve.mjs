// Minimal static server for the exported web build (`npm run build:web`), with SPA fallback.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'dist');
const port = Number(process.env.PORT ?? 8099);
/** Sub-path the build was exported for (Expo `experiments.baseUrl`), e.g. "/blobfit" for GitHub Pages. */
const basePath = process.env.E2E_BASE_PATH ?? '';
/** E2E_HOST=github-pages mimics GitHub Pages: directory redirects and 404.html with a 404 status. */
const githubPages = process.env.E2E_HOST === 'github-pages';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
};

export function startServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (basePath && !url.pathname.startsWith(`${basePath}/`) && url.pathname !== basePath) {
      res.writeHead(404).end('Not found');
      return;
    }
    const pathname = url.pathname.slice(basePath.length) || '/';
    const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, safe);
    if (githubPages) {
      if (file.startsWith(root) && existsSync(file) && statSync(file).isDirectory()) {
        if (!url.pathname.endsWith('/')) {
          res.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end();
          return;
        }
        file = join(file, 'index.html');
      }
      if (!file.startsWith(root) || !existsSync(file)) {
        res.writeHead(404, { 'Content-Type': TYPES['.html'] });
        createReadStream(join(root, '404.html')).pipe(res);
        return;
      }
    } else if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
      file = extname(safe) ? '' : join(root, 'index.html');
    }
    if (!file || !existsSync(file)) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().then(() => console.log(`Serving dist/ on http://localhost:${port}${basePath}/`));
}
