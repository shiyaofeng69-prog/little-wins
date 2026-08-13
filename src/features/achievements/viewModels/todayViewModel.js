export function buildTodayViewModel(entries, now = new Date()) {
  return {
    dateLabel: now.toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    }),
    entries: [...entries].sort((left, right) => left.occurredAt - right.occurredAt),
  };
}
