import test from 'node:test';
import assert from 'node:assert/strict';
import { PERIODS, isLegacyPeriod, resolvePeriodKey } from './periods.js';

test('period labels use natural Chinese names', () => {
  assert.deepEqual(PERIODS.map((period) => period.label), ['今日', '本周', '本月', '旅程', '今年']);
});

test('legacy half period resolves to journey', () => {
  assert.equal(resolvePeriodKey('half'), 'journey');
  assert.equal(isLegacyPeriod('half'), true);
});

test('invalid period resolves to today', () => {
  assert.equal(resolvePeriodKey('future'), 'today');
});
