export const PERIODS = [
  { key: 'today', label: '今日', title: 'TODAY', rangeLabel: '今天' },
  { key: 'week', label: '本周', title: 'WEEK', rangeLabel: '本周' },
  { key: 'month', label: '本月', title: 'MONTH', rangeLabel: '本月' },
  { key: 'journey', label: '旅程', title: 'JOURNEY', rangeLabel: '最近六个月' },
  { key: 'year', label: '今年', title: 'YEAR', rangeLabel: '今年' },
];

export const PERIOD_ALIASES = Object.freeze({ half: 'journey' });
export const DEFAULT_PERIOD = 'today';

const periodKeys = new Set(PERIODS.map((period) => period.key));

export function resolvePeriodKey(value) {
  const candidate = PERIOD_ALIASES[value] || value;
  return periodKeys.has(candidate) ? candidate : DEFAULT_PERIOD;
}

export function isLegacyPeriod(value) {
  return Object.hasOwn(PERIOD_ALIASES, value);
}

export function periodDefinition(key) {
  const resolved = resolvePeriodKey(key);
  return PERIODS.find((period) => period.key === resolved) || PERIODS[0];
}
