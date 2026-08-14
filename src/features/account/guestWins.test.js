import assert from 'node:assert/strict';
import test from 'node:test';
import { GUEST_WINS_KEY, listGuestWins, saveGuestWin } from './guestWins.js';
import { migrateGuestWins } from './migrateGuestWins.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test('guest repository rejects blank and oversized content', () => {
  const storage = new MemoryStorage();
  assert.throws(() => saveGuestWin({ content: '   ' }, storage));
  assert.throws(() => saveGuestWin({ content: 'x'.repeat(801) }, storage));
  assert.equal(listGuestWins(storage).length, 0);
});

test('guest repository ignores corrupt storage and normalizes category', () => {
  const storage = new MemoryStorage();
  storage.setItem(GUEST_WINS_KEY, '{bad json');
  const entry = saveGuestWin({ content: '我打开了文档', category: 'admin' }, storage);
  assert.equal(entry.category, 'daily-life');
  assert.equal(listGuestWins(storage).length, 1);
});

test('migration removes only successful records and is safe to retry', async () => {
  const storage = new MemoryStorage();
  saveGuestWin({ id: 'guest-win-a', content: '完成了第一件事' }, storage);
  saveGuestWin({ id: 'guest-win-b', content: '完成了第二件事' }, storage);
  const calls = [];
  const api = {
    async createMoodEntry(payload, key) {
      calls.push({ payload, key });
      if (payload.content.includes('第二')) throw new Error('offline');
      return { entry_id: 1 };
    },
  };
  const first = await migrateGuestWins(api, storage);
  assert.deepEqual({ migrated: first.migrated, remaining: first.remaining }, { migrated: 1, remaining: 1 });
  assert.equal(listGuestWins(storage)[0].content, '完成了第二件事');
  assert.ok(calls.every((call) => call.key.startsWith('guest-win:')));

  api.createMoodEntry = async () => ({ entry_id: 2 });
  const second = await migrateGuestWins(api, storage);
  assert.deepEqual({ migrated: second.migrated, remaining: second.remaining }, { migrated: 1, remaining: 0 });
});
