import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const SITEMAP = join(DIST, 'sitemap.xml');
const BASE_URL = 'https://veredixo.app';

const staticRoutes = [
  { url: '/', priority: 1.0, changefreq: 'daily' },
  { url: '/cases/trending', priority: 0.8, changefreq: 'daily' },
  { url: '/cases/following', priority: 0.6, changefreq: 'daily' },
  { url: '/top-judges', priority: 0.7, changefreq: 'weekly' },
  { url: '/login', priority: 0.3, changefreq: 'monthly' },
  { url: '/register', priority: 0.3, changefreq: 'monthly' },
  { url: '/forgot-password', priority: 0.2, changefreq: 'monthly' },
  { url: '/search', priority: 0.5, changefreq: 'weekly' },
  { url: '/legal/terms', priority: 0.3, changefreq: 'monthly' },
  { url: '/legal/privacy', priority: 0.3, changefreq: 'monthly' },
  { url: '/legal/guidelines', priority: 0.3, changefreq: 'monthly' },
  { url: '/legal/about', priority: 0.4, changefreq: 'monthly' },
];

function getLastMod() {
  const indexPath = join(DIST, 'index.html');
  if (existsSync(indexPath)) {
    const stat = readFileSync(indexPath, 'utf-8');
    const now = new Date().toISOString().split('T')[0];
    return now;
  }
  return new Date().toISOString().split('T')[0];
}

function generate() {
  const lastmod = getLastMod();

  const urls = staticRoutes.map(
    (r) => `  <url>
    <loc>${BASE_URL}${r.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority.toFixed(1)}</priority>
  </url>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  writeFileSync(SITEMAP, xml, 'utf-8');
  console.log(`✓ Sitemap generated: ${SITEMAP} (${staticRoutes.length} URLs)`);
}

if (!existsSync(DIST)) {
  console.error('✗ dist/ directory not found. Run "npm run build" first.');
  process.exit(1);
}

generate();
