// Local preview: change only generated HTML, never the source birthday time window.
// Run: node scripts/preview-gift.mjs   →   http://127.0.0.1:1331/gift/letter/
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = join(root, 'build-preview', 'codex-gift');
const hugo = process.platform === 'win32' ? join(root, 'tools/hugo/hugo.exe') : 'hugo';
execFileSync(hugo, ['--minify', '--destination', output], { cwd: root, stdio: 'inherit' });
for (const name of ['gift/index.html', 'gift/letter/index.html']) {
    const path = join(output, name);
    const html = readFileSync(path, 'utf8').replace(/data-unlock=(?:"[^"]*"|'[^']*'|[^\s>]+)/g, 'data-unlock="2000-01-01T00:00:00Z"')
        .replace(/data-expire=(?:"[^"]*"|'[^']*'|[^\s>]+)/g, 'data-expire="2100-01-01T00:00:00Z"');
    writeFileSync(path, html);
}
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const port = Number(process.env.PORT || 1331);
createServer((req, res) => {
    try {
        let path = resolve(output, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
        if (path !== output && !path.startsWith(output + sep)) { res.writeHead(403).end(); return; }
        if (statSync(path).isDirectory()) path = join(path, 'index.html');
        res.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(readFileSync(path));
    } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Gift preview: http://127.0.0.1:${port}/gift/letter/`));
