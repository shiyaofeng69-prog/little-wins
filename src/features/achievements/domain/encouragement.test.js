import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEncouragement } from './encouragement.js';

test('encouragement returns evidence for a detected action', () => {
  const result = buildEncouragement({ actionKey: 'started' });
  assert.match(result.headline, /开始/);
  assert.match(result.evidence, /记录里/);
});

test('aggregate support uses only provided real counts', () => {
  const result = buildEncouragement(
    { actionKey: 'rested' },
    { categoryCount: 3, categoryLabel: '自我照顾', rangeLabel: '本周' },
  );
  assert.equal(result.supporting, '这是本周第 3 个“自我照顾”瞬间。');
});

test('unknown actions use a neutral response without overclaiming', () => {
  const result = buildEncouragement({ actionKey: 'unknown' });
  assert.equal(result.kind, 'noticed');
  assert.match(result.headline, /被看见/);
});
