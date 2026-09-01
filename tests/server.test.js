const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../server/app');
const { startLocalServer } = require('./helpers/localServer');

describe('server', () => {
  let server;
  let app;

  before(async () => {
    server = await startLocalServer();
    app = createApp();
  });

  after(async () => {
    await server.close();
  });

  test('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
  });

  describe('POST /api/audits — validation', () => {
    test('rejects a missing url', async () => {
      const res = await request(app).post('/api/audits').send({});
      assert.equal(res.status, 400);
      assert.match(res.body.error, /url.*required/i);
    });

    test('rejects a malformed url', async () => {
      const res = await request(app).post('/api/audits').send({ url: 'not a url' });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /not a valid URL/);
    });

    test('rejects a non-http(s) protocol', async () => {
      const res = await request(app)
        .post('/api/audits')
        .send({ url: 'file:///etc/passwd' });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /protocol/);
    });

    test('rejects an unsupported browser', async () => {
      const res = await request(app)
        .post('/api/audits')
        .send({ url: `${server.url}/ok`, browser: 'netscape' });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /browser/i);
    });
  });

  describe('POST /api/audits — audit execution', () => {
    test('runs a real audit and returns the standard result shape', async () => {
      const res = await request(app).post('/api/audits').send({ url: `${server.url}/ok` });

      assert.equal(res.status, 200);
      assert.equal(res.body.url, `${server.url}/ok`);
      assert.ok(res.body.auditedAt);
      assert.ok(res.body.summary);
      assert.ok(Array.isArray(res.body.findings));
    });

    test('returns 502 when the target cannot be reached', async () => {
      // Start and immediately close a server so its port is guaranteed
      // unreachable — deterministic connection failure, no external
      // network or timing dependency.
      const deadServer = await startLocalServer();
      const deadUrl = deadServer.url;
      await deadServer.close();

      const res = await request(app).post('/api/audits').send({ url: deadUrl });

      assert.equal(res.status, 502);
      assert.ok(res.body.error);
    });
  });
});
