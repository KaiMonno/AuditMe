const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { accessibility, resetAll } = require('../checks');

describe('accessibility checks', () => {
  test('getFindings returns an empty array before checks are implemented', () => {
    resetAll();
    assert.deepEqual(accessibility.getFindings(), []);
  });

  test.todo('reports axe violations on pages with known a11y issues');
});
