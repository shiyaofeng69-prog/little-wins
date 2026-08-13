import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEntries } from '../domain/normalizeEntry.js';
import { buildWeekViewModel } from './weekViewModel.js';
import { buildMonthViewModel } from './monthViewModel.js';
import { buildJourneyViewModel } from './journeyViewModel.js';
import { buildYearViewModel } from './yearViewModel.js';

const rawEntries = [
  { id: 1, content: '开始整理桌面', created_at: '2024-05-20T08:00:00', category: 'daily-life' },
  { id: 2, content: '回复了邮件', created_at: '2024-05-20T10:00:00', category: 'work-study' },
  { id: 3, content: '出去散步', created_at: '2024-05-22T18:00:00', category: 'health', celebrated: true },
];
const entries = normalizeEntries(rawEntries);

test('week keeps seven days and preserves multiple entries on one day', () => {
  const model = buildWeekViewModel(entries, new Date(2024, 4, 23, 12));
  assert.equal(model.days.length, 7);
  assert.equal(model.days[0].entries.length, 2);
  assert.equal(model.activeDays, 2);
});

test('month calendar retains all entries for a shared date', () => {
  const model = buildMonthViewModel(entries, new Date(2024, 4, 23, 12));
  const may20 = model.cells.find((cell) => cell.dayNumber === 20);
  assert.equal(may20.entries.length, 2);
  assert.equal(model.totalEntries, 3);
});

test('journey always produces six chronological chapters', () => {
  const model = buildJourneyViewModel(entries, new Date(2024, 4, 23, 12));
  assert.equal(model.months.length, 6);
  assert.equal(model.months.at(-1).key, '2024-05');
  assert.equal(model.months.at(-1).totalEntries, 3);
});

test('year aggregates all entries on the same day rather than replacing one', () => {
  const model = buildYearViewModel(entries, new Date(2024, 4, 23, 12));
  const may20 = model.days.find((day) => day.key === '2024-05-20');
  assert.equal(may20.count, 2);
  assert.equal(model.totalEntries, 3);
  assert.equal(model.activeDays, 2);
});
