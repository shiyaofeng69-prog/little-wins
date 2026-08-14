import { listGuestWins, removeGuestWin } from './guestWins.js';

export async function migrateGuestWins(api, storage = globalThis.localStorage) {
  const pending = listGuestWins(storage);
  const result = { migrated: 0, remaining: pending.length, failures: [] };
  for (const entry of pending) {
    try {
      await api.createMoodEntry({
        mood: 4,
        date: entry.date,
        time: entry.time,
        content: entry.content,
        category: entry.category,
        feeling: entry.feeling,
        selected_options: [],
      }, `guest-win:${entry.id}`);
      removeGuestWin(entry.id, storage);
      result.migrated += 1;
    } catch (error) {
      result.failures.push({ id: entry.id, message: error?.message || 'migration failed' });
    }
  }
  result.remaining = listGuestWins(storage).length;
  return result;
}
