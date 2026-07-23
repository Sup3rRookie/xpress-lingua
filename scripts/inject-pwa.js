// Post-export step: expo export does not emit PWA tags, so inject the manifest
// link, meta tags, and service worker registration into dist/index.html.
// Run after `expo export --platform web`.
const fs = require('fs');
const path = require('path');

const index = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(index, 'utf8');

const head = `
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0E0B1E">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">`;

const sw = `
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js');
  });
}
</script>`;

if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', head + '\n</head>');
  html = html.replace('</body>', sw + '\n</body>');
  fs.writeFileSync(index, html);
  console.log('PWA tags injected into dist/index.html');
} else {
  console.log('PWA tags already present');
}
