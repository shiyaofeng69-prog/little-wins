const DAY_MS = 86_400_000;

export function dateOf(entry) {
  if (!entry) return null;
  const fallback = entry.date ? `${entry.date}T12:00:00` : null;
  const date = new Date(entry.created_at || entry.time || fallback);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function localDateIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function localMonthKey(date = new Date()) {
  return localDateIso(date).slice(0, 7);
}

export function startOfLocalDay(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfLocalDay(date = new Date()) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function startOfWeek(date = new Date()) {
  const result = startOfLocalDay(date);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfJourney(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() - 5, 1);
}

export function startOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1);
}

export function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function daysInMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function daysInYear(year) {
  return Math.round((new Date(year + 1, 0, 1) - new Date(year, 0, 1)) / DAY_MS);
}

export function dayOfYear(date) {
  return Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 1)) / DAY_MS,
  );
}

export function periodRange(period, now = new Date()) {
  const end = endOfLocalDay(now);
  const starts = {
    today: startOfLocalDay(now),
    week: startOfWeek(now),
    month: startOfMonth(now),
    journey: startOfJourney(now),
    year: startOfYear(now),
  };
  return { start: starts[period] || starts.today, end };
}

export function formatEntryTime(entry) {
  return dateOf(entry)?.toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }) || '--:--';
}
