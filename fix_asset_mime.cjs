const fs = require('fs');
const path = require('path');

const root = __dirname;
const assets = path.join(root, 'assets');
const htmlFiles = [
  path.join(root, 'index.html'),
  path.join(root, 'dist', 'index.html'),
].filter(fs.existsSync);

const renames = [];

for (const entry of fs.readdirSync(assets)) {
  if (!entry.endsWith('.php')) continue;
  const file = path.join(assets, entry);
  const sample = fs.readFileSync(file, 'utf8').slice(0, 2000);
  const cssScore = [/^\s*(\/\*|@|[.#:a-z-]+[\s,{])/i, /#[a-z0-9_-]+\s*\{|\.[a-z0-9_-]+\s*\{/i, /font-family|background|display|margin|padding/i]
    .filter((re) => re.test(sample)).length;
  const jsScore = [/^\s*(function|var|let|const|\()/, /document\.|window\.|jQuery|\$\(/]
    .filter((re) => re.test(sample)).length;
  const ext = jsScore > cssScore ? '.js' : '.css';
  const next = entry.replace(/\.php$/i, ext);
  fs.renameSync(file, path.join(assets, next));
  renames.push([`assets/${entry}`, `assets/${next}`]);
}

for (const htmlFile of htmlFiles) {
  let html = fs.readFileSync(htmlFile, 'utf8');
  for (const [from, to] of renames) {
    html = html.split(from).join(to);
  }
  fs.writeFileSync(htmlFile, html);
}

const distAssets = path.join(root, 'dist', 'assets');
if (fs.existsSync(distAssets)) {
  fs.rmSync(distAssets, { recursive: true, force: true });
  fs.cpSync(assets, distAssets, { recursive: true });
}

console.log(`Renamed ${renames.length} PHP-backed assets`);
for (const [from, to] of renames) console.log(`${from} -> ${to}`);
