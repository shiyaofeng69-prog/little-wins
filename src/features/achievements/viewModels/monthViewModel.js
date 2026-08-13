import { daysInMonth, localDateIso } from '../domain/entryDate.js';
import { countByCategory, groupByDate, representativeEntries } from '../domain/periodSelectors.js';

export function buildMonthViewModel(entries, now = new Date()) {
  const grouped = groupByDate(entries);
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const leadingEmptyCount = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: leadingEmptyCount }, (_, index) => ({ key: `empty-${index}`, empty: true }));
  for (let day = 1; day <= daysInMonth(now); day += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), day);
    const key = localDateIso(date);
    const dayEntries = grouped.get(key) || [];
    cells.push({
      key,
      date,
      dayNumber: day,
      isToday: key === localDateIso(now),
      entries: dayEntries,
      categoryCounts: countByCategory(dayEntries),
    });
  }
  return {
    label: now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
    cells,
    totalEntries: entries.length,
    activeDays: grouped.size,
    categoryCounts: countByCategory(entries),
    representatives: representativeEntries(entries),
  };
}
