const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { functional, resetAll } = require('../checks');

describe('functional checks', () => {
  test('getFindings returns an empty array before checks are implemented', () => {
    resetAll();
    assert.deepEqual(functional.getFindings(), []);
  });

  test.todo('flags HTTP responses with status >= 400');
  test.todo('flags uncaught JS errors via page.on("pageerror")');
});
