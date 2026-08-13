import { addDays, localDateIso, startOfWeek } from '../domain/entryDate.js';
import { countByCategory, groupByDate } from '../domain/periodSelectors.js';

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function buildWeekViewModel(entries, now = new Date()) {
  const grouped = groupByDate(entries);
  const weekStart = startOfWeek(now);
  const days = DAY_LABELS.map((label, index) => {
    const date = addDays(weekStart, index);
    const key = localDateIso(date);
    const dayEntries = grouped.get(key) || [];
    return {
      key,
      label,
      date,
      dayNumber: date.getDate(),
      isToday: key === localDateIso(now),
      entries: dayEntries,
      categoryCounts: countByCategory(dayEntries),
    };
  });
  const activeDays = days.filter((day) => day.entries.length > 0).length;
  return {
    days,
    activeDays,
    totalEntries: entries.length,
    categoryCounts: countByCategory(entries),
    summary: activeDays > 0
      ? `你在 ${activeDays} 个不同的日子留下了记录。`
      : '这一周还留着空白，什么时候回来都不晚。',
  };
}
