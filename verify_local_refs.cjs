const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const refs = new Set();
for (const match of html.matchAll(/["'(](assets\/[^"'()<> ]+)/g)) {
  refs.add(match[1].replace(/&amp;/g, '&'));
}

const missing = [];
for (const ref of refs) {
  if (!fs.existsSync(path.join(root, ref))) missing.push(ref);
}

console.log(`Local asset refs: ${refs.size}`);
console.log(`Missing local asset refs: ${missing.length}`);
for (const ref of missing) console.log(ref);
