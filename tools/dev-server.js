/* Local preview server that behaves like the Vercel deployment:
   - clean URLs: /about serves about.html, / serves index.html
   - /about.html (and /index.html) 308-redirect to the clean address
   - the headers from vercel.json are applied, so the Content-Security-Policy
     is exercised locally before it reaches the live site.
   The api/ functions are not run here.

   Usage: node tools/dev-server.js [port]   (default 5173) */

var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var PORT = Number(process.argv[2]) || 5173;
var config = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));

var TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.pdf': 'application/pdf',
  '.woff2': 'font/woff2'
};

// vercel.json sources are path-to-regexp patterns; the ones used here are
// simple enough to translate directly into anchored regular expressions.
function matches(source, pathname) {
  return new RegExp('^' + source + '$').test(pathname);
}

function headersFor(pathname) {
  var out = {};
  (config.headers || []).forEach(function (rule) {
    if (matches(rule.source, pathname)) {
      rule.headers.forEach(function (h) { out[h.key] = h.value; });
    }
  });
  return out;
}

http.createServer(function (req, res) {
  var url = new URL(req.url, 'http://localhost');
  var pathname = decodeURIComponent(url.pathname);

  var html = pathname.match(/^\/(.*)\.html$/);
  if (html) {
    var clean = html[1] === 'index' ? '/' : '/' + html[1];
    res.writeHead(308, { Location: clean + url.search + (url.hash || '') });
    return res.end();
  }

  var file = pathname === '/' ? 'index.html' : pathname.slice(1);
  var full = path.join(ROOT, file);
  if (!path.extname(full) && fs.existsSync(full + '.html')) full += '.html';
  if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }

  var headers = headersFor(pathname);
  headers['Content-Type'] = headers['Content-Type'] || TYPES[path.extname(full)] || 'application/octet-stream';
  headers['Cache-Control'] = 'no-store';   // always serve the working copy locally
  res.writeHead(200, headers);
  fs.createReadStream(full).pipe(res);
}).listen(PORT, function () {
  console.log('Preview at http://localhost:' + PORT);
});
