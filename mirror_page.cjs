const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = __dirname;
const htmlPath = path.join(root, 'index.html');
const sourceUrl = 'https://og.gesundheitsexperte-gt.de/lyr-adv-4/';
const assetDir = path.join(root, 'assets');
const downloaded = new Map();
const failed = [];

fs.mkdirSync(assetDir, { recursive: true });

function cleanUrl(value) {
  if (!value || value.startsWith('data:') || value.startsWith('mailto:') || value.startsWith('tel:') || value.startsWith('#')) {
    return null;
  }
  return value.replace(/&amp;/g, '&').trim();
}

function absoluteUrl(value, base = sourceUrl) {
  const cleaned = cleanUrl(value);
  if (!cleaned) return null;
  try {
    if (cleaned.startsWith('//')) return new URL(`https:${cleaned}`).href;
    return new URL(cleaned, base).href;
  } catch {
    return null;
  }
}

function extFor(url, contentType) {
  const pathname = new URL(url).pathname;
  const ext = path.extname(pathname);
  if (ext) return ext;
  if (/css/i.test(contentType)) return '.css';
  if (/javascript|ecmascript/i.test(contentType)) return '.js';
  if (/webp/i.test(contentType)) return '.webp';
  if (/png/i.test(contentType)) return '.png';
  if (/jpe?g/i.test(contentType)) return '.jpg';
  if (/gif/i.test(contentType)) return '.gif';
  if (/svg/i.test(contentType)) return '.svg';
  if (/woff2/i.test(contentType)) return '.woff2';
  if (/woff/i.test(contentType)) return '.woff';
  return '.bin';
}

function safeName(url, contentType = '') {
  const u = new URL(url);
  const base = `${u.hostname}${u.pathname}${u.search}`
    .replace(/^www\./, '')
    .replace(/[^a-z0-9._-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 150);
  const ext = extFor(url, contentType);
  return base.toLowerCase().endsWith(ext.toLowerCase()) ? base : `${base}${ext}`;
}

function headContentType(url) {
  try {
    const out = execFileSync('curl.exe', ['-L', '-I', '-s', url], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const match = out.match(/content-type:\s*([^\r\n;]+)/i);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

function download(url) {
  const abs = absoluteUrl(url);
  if (!abs) return null;
  if (downloaded.has(abs)) return downloaded.get(abs);

  const type = headContentType(abs);
  const filename = safeName(abs, type);
  const localPath = path.join(assetDir, filename);
  const localRef = `assets/${filename}`;

  try {
    execFileSync('curl.exe', ['-L', '--fail', '--silent', '--show-error', abs, '-o', localPath], { stdio: 'pipe' });
    downloaded.set(abs, localRef);
    if (/\.(css|php)$/i.test(new URL(abs).pathname) || /css/i.test(type)) {
      rewriteCss(localPath, abs);
    }
    return localRef;
  } catch (error) {
    failed.push(abs);
    downloaded.set(abs, abs);
    return abs;
  }
}

function rewriteCss(filePath, baseUrl) {
  let css = fs.readFileSync(filePath, 'utf8');
  css = css.replace(/url\((['"]?)([^'")]+)\1\)/g, (full, quote, value) => {
    const abs = absoluteUrl(value, baseUrl);
    if (!abs) return full;
    const local = download(abs);
    return local ? `url(${quote}${path.posix.relative('assets', local).replace(/\\/g, '/')}${quote})` : full;
  });
  fs.writeFileSync(filePath, css);
}

function collectHtmlUrls(html) {
  const urls = new Set();
  const attrRe = /\b(?:href|src|data-src|poster|content)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(attrRe)) urls.add(match[1]);
  const srcsetRe = /\b(?:srcset|data-srcset)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(srcsetRe)) {
    for (const part of match[1].split(',')) {
      const candidate = part.trim().split(/\s+/)[0];
      if (candidate) urls.add(candidate);
    }
  }
  const cssUrlRe = /url\((['"]?)([^'")]+)\1\)/gi;
  for (const match of html.matchAll(cssUrlRe)) urls.add(match[2]);
  return [...urls];
}

let html = fs.readFileSync(htmlPath, 'utf8');
const urls = collectHtmlUrls(html);
const localMap = new Map();

for (const value of urls) {
  const abs = absoluteUrl(value);
  if (!abs) continue;
  const u = new URL(abs);
  const isAsset =
    /\.(css|js|mjs|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|eot|mp4|webm|pdf)(\?|$)/i.test(abs) ||
    /wp-content|wp-includes|fonts\.googleapis\.com|fonts\.gstatic\.com|static\.klaviyo\.com|tracking-flow/.test(abs);
  if (!isAsset) continue;
  const local = download(abs);
  if (local && local !== abs) localMap.set(value, local);
}

for (const [original, local] of localMap) {
  const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  html = html.replace(new RegExp(escaped, 'g'), local);
  const amp = original.replace(/&/g, '&amp;');
  if (amp !== original) {
    html = html.replace(new RegExp(amp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), local);
  }
}

fs.writeFileSync(htmlPath, html);

console.log(`Downloaded ${downloaded.size - failed.length} assets into ${assetDir}`);
if (failed.length) {
  console.log(`Failed ${failed.length} assets:`);
  for (const url of failed) console.log(url);
}
