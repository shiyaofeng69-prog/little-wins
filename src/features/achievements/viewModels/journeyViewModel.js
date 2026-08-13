import { addMonths, localMonthKey, startOfJourney } from '../domain/entryDate.js';
import { countByCategory, groupByMonth, representativeEntries } from '../domain/periodSelectors.js';

export function buildJourneyViewModel(entries, now = new Date()) {
  const grouped = groupByMonth(entries);
  const firstMonth = startOfJourney(now);
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = addMonths(firstMonth, index);
    const key = localMonthKey(date);
    const monthEntries = grouped.get(key) || [];
    const categoryCounts = countByCategory(monthEntries);
    const leadingCategory = Object.entries(categoryCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || null;
    return {
      key,
      date,
      label: date.toLocaleDateString('zh-CN', { month: 'long' }),
      yearLabel: String(date.getFullYear()),
      entries: monthEntries,
      totalEntries: monthEntries.length,
      activeDays: new Set(monthEntries.map((entry) => entry.localDateKey)).size,
      categoryCounts,
      leadingCategory,
      representative: representativeEntries(monthEntries, 1)[0] || null,
    };
  });
  return {
    months,
    totalEntries: entries.length,
    activeMonths: months.filter((month) => month.totalEntries > 0).length,
    categoryCounts: countByCategory(entries),
  };
}
