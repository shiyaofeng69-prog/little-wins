import test from 'node:test';
import assert from 'node:assert/strict';
import {
  daysInMonth, daysInYear, localDateIso, periodRange, startOfWeek,
} from './entryDate.js';

test('localDateIso pads month and day', () => {
  assert.equal(localDateIso(new Date(2024, 1, 3, 23, 30)), '2024-02-03');
});

test('week starts on Monday', () => {
  assert.equal(localDateIso(startOfWeek(new Date(2024, 4, 26))), '2024-05-20');
  assert.equal(localDateIso(startOfWeek(new Date(2024, 4, 20))), '2024-05-20');
});

test('journey includes current month and five previous months across year', () => {
  const range = periodRange('journey', new Date(2025, 1, 12));
  assert.equal(localDateIso(range.start), '2024-09-01');
  assert.equal(localDateIso(range.end), '2025-02-12');
});

test('month and year day counts include leap years', () => {
  assert.equal(daysInMonth(new Date(2024, 1, 10)), 29);
  assert.equal(daysInMonth(new Date(2025, 1, 10)), 28);
  assert.equal(daysInYear(2024), 366);
  assert.equal(daysInYear(2025), 365);
});
