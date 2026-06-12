const fs = require('fs');
const path = require('path');

const root = __dirname;
const files = [
  path.join(root, 'index.html'),
  path.join(root, 'dist', 'index.html'),
].filter(fs.existsSync);

const popupBlocker = `<style id="local-popup-blocker">
iframe[src*="trustedshops"],
iframe[src*="trustbadge"],
iframe[src*="etrusted"],
[id*="trustbadge" i],
[class*="trustbadge" i],
[id*="trustedshops" i],
[class*="trustedshops" i],
[id*="etrusted" i],
[class*="etrusted" i],
[aria-label*="Käuferschutz" i],
[aria-label*="Kaeuferschutz" i],
[aria-label*="buyer protection" i],
[data-testid*="popup" i],
[class*="kl-private-reset-css" i],
[id*="klaviyo" i],
[class*="klaviyo" i] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
</style>
<script id="local-popup-cleaner">
(function () {
  var blocked = [
    'iframe[src*="trustedshops"]',
    'iframe[src*="trustbadge"]',
    'iframe[src*="etrusted"]',
    '[id*="trustbadge" i]',
    '[class*="trustbadge" i]',
    '[id*="trustedshops" i]',
    '[class*="trustedshops" i]',
    '[id*="etrusted" i]',
    '[class*="etrusted" i]',
    '[aria-label*="Käuferschutz" i]',
    '[aria-label*="Kaeuferschutz" i]',
    '[aria-label*="buyer protection" i]',
    '[id*="klaviyo" i]',
    '[class*="klaviyo" i]',
    '[class*="kl-private-reset-css" i]'
  ];

  function removePopups() {
    blocked.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        node.remove();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', removePopups);
  window.addEventListener('load', removePopups);
  setInterval(removePopups, 1000);
  new MutationObserver(removePopups).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
</script>`;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/\s*<script\b[^>]*src=["'][^"']*(?:klaviyo|tracking-flow)[^"']*["'][^>]*>\s*<\/script>/gi, '');
  html = html.replace(/\s*<link\b[^>]*rel=["']dns-prefetch["'][^>]*href=["']\/\/app\.gesundheitsexperte-gt\.de["'][^>]*>/gi, '');
  html = html.replace(/\s*<link\b[^>]*rel=["']dns-prefetch["'][^>]*href=["']\/\/static\.klaviyo\.com["'][^>]*>/gi, '');
  html = html.replace(/\s*<style id="local-popup-blocker">[\s\S]*?<\/style>\s*<script id="local-popup-cleaner">[\s\S]*?<\/script>/g, '');
  html = html.replace('</head>', `${popupBlocker}</head>`);
  fs.writeFileSync(file, html);
  console.log(`Updated ${file}`);
}
