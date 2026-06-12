const fs = require('fs');
const path = require('path');

const root = __dirname;
const from = 'assets/og.goldentree.de_wp-content_cache_autoptimize_autoptimize_single_721ed07ba74a64b4f5b3e7979ca99bae.php_ver_1780350452.css';
const to = from.replace(/\.css$/, '.js');

for (const base of [root, path.join(root, 'dist')]) {
  const fromPath = path.join(base, from);
  const toPath = path.join(base, to);
  if (fs.existsSync(fromPath)) fs.renameSync(fromPath, toPath);
  const htmlPath = path.join(base, 'index.html');
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf8').split(from).join(to);
    fs.writeFileSync(htmlPath, html);
  }
}

console.log(`${from} -> ${to}`);
