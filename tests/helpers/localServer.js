const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const FIXTURES = path.join(__dirname, '..', 'fixtures');

/**
 * Tiny fixture server so HTTP-status checks hit real status codes without
 * depending on an external site. Routes:
 *   GET /ok          200 + ok.html
 *   GET /500         500
 *   GET /js-error    200 + js-error.html
 *   GET /fixtures/*  200 + matching file in tests/fixtures
 *   anything else    404
 *
 * @returns {Promise<{ url: string, close: () => Promise<void> }>}
 */
function startLocalServer() {
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];

    if (url === '/ok') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(FIXTURES, 'ok.html')));
      return;
    }

    if (url === '/500') {
      res.writeHead(500, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<!DOCTYPE html><html><body>Internal Server Error</body></html>');
      return;
    }

    if (url === '/js-error') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(FIXTURES, 'js-error.html')));
      return;
    }

    // Serve any file from tests/fixtures by basename, e.g. /fixtures/ok.html
    if (url.startsWith('/fixtures/')) {
      const name = path.basename(url);
      const file = path.join(FIXTURES, name);
      if (name && fs.existsSync(file)) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(file));
        return;
      }
    }

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((err) => (err ? closeReject(err) : closeResolve()));
          }),
      });
    });
    server.on('error', reject);
  });
}

module.exports = { startLocalServer };
