import { periodRange } from './entryDate.js';
import { normalizeEntries } from './normalizeEntry.js';

export function entriesForPeriod(entries, meta, period, now = new Date()) {
  const { start, end } = periodRange(period, now);
  return normalizeEntries(entries, meta)
    .filter((entry) => !entry.archived && entry.occurredAt >= start && entry.occurredAt <= end)
    .sort((left, right) => left.occurredAt - right.occurredAt);
}

export function groupByDate(entries = []) {
  return entries.reduce((groups, entry) => {
    const current = groups.get(entry.localDateKey) || [];
    current.push(entry);
    groups.set(entry.localDateKey, current);
    return groups;
  }, new Map());
}

export function groupByMonth(entries = []) {
  return entries.reduce((groups, entry) => {
    const current = groups.get(entry.localMonthKey) || [];
    current.push(entry);
    groups.set(entry.localMonthKey, current);
    return groups;
  }, new Map());
}

export function countByCategory(entries = []) {
  return entries.reduce((counts, entry) => {
    counts[entry.category] = (counts[entry.category] || 0) + 1;
    return counts;
  }, {});
}

export function representativeEntries(entries = [], limit = 3) {
  return [...entries]
    .sort((left, right) => Number(right.celebrated) - Number(left.celebrated) || right.occurredAt - left.occurredAt)
    .slice(0, limit);
}

export function activeDayCount(entries = []) {
  return new Set(entries.map((entry) => entry.localDateKey)).size;
}
