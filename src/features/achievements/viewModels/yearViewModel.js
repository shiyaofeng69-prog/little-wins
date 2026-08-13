import { dayOfYear, daysInYear, localDateIso } from '../domain/entryDate.js';
import { countByCategory, groupByDate } from '../domain/periodSelectors.js';

export function buildYearViewModel(entries, now = new Date()) {
  const year = now.getFullYear();
  const grouped = groupByDate(entries);
  const days = Array.from({ length: daysInYear(year) }, (_, index) => {
    const date = new Date(year, 0, index + 1);
    const key = localDateIso(date);
    const dayEntries = grouped.get(key) || [];
    const categoryCounts = countByCategory(dayEntries);
    const leadingCategory = Object.entries(categoryCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || null;
    return { key, index: dayOfYear(date), date, entries: dayEntries, count: dayEntries.length, leadingCategory };
  });
  return {
    year,
    days,
    totalEntries: entries.length,
    activeDays: grouped.size,
    celebratedCount: entries.filter((entry) => entry.celebrated).length,
    categoryCounts: countByCategory(entries),
  };
}
