import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BASE = 'https://kashiudouglas.github.io/Kashiu/';
const SKIP = new Set(['404.html']);

const pages = readdirSync('.')
  .filter((f) => f.endsWith('.html') && !SKIP.has(f))
  .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));

function lastmod(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (out) return out;
  } catch {}
  return statSync(file).mtime.toISOString().slice(0, 10);
}

const urls = pages
  .map((file) => {
    const loc = BASE + (file === 'index.html' ? '' : file);
    return `  <url><loc>${loc}</loc><lastmod>${lastmod(file)}</lastmod></url>`;
  })
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

writeFileSync('sitemap.xml', xml);
console.log(`sitemap.xml: ${pages.length} pages`);
