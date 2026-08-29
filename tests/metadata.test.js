const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { metadata, resetAll } = require('../checks');

describe('metadata checks', () => {
  test('getFindings returns an empty array before checks are implemented', () => {
    resetAll();
    assert.deepEqual(metadata.getFindings(), []);
  });

  test.todo('flags missing or empty <title>');
  test.todo('flags missing meta description');
  test.todo('flags missing canonical link');
});
