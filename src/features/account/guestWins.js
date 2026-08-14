export const GUEST_WINS_KEY = 'little-wins:guest-wins:v1';

const CATEGORY_KEYS = new Set([
  'self-care', 'work-study', 'health', 'daily-life', 'connection', 'courage',
]);

const storageOrThrow = (storage) => {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new Error('This device cannot save a local record');
  }
  return storage;
};

const readRaw = (storage) => {
  try {
    const value = JSON.parse(storageOrThrow(storage).getItem(GUEST_WINS_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const normalizeGuestWin = (input) => {
  const content = typeof input?.content === 'string' ? input.content.trim() : '';
  if (!content || content.length > 800) throw new Error('记录内容需要在 1–800 字之间');
  const feeling = typeof input?.feeling === 'string' ? input.feeling.trim() : '';
  if (feeling.length > 300) throw new Error('感受最多填写 300 字');
  const category = CATEGORY_KEYS.has(input?.category) ? input.category : 'daily-life';
  const now = new Date();
  const id = typeof input?.id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(input.id)
    ? input.id
    : (globalThis.crypto?.randomUUID?.() || `guest-${now.getTime()}`);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input?.date || '')
    ? input.date
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timestamp = Number.isNaN(Date.parse(input?.time)) ? now.toISOString() : input.time;
  return {
    id,
    content,
    feeling,
    category,
    date,
    time: timestamp,
    created_at: timestamp,
  };
};

export const listGuestWins = (storage = globalThis.localStorage) =>
  readRaw(storage).flatMap((entry) => {
    try { return [normalizeGuestWin(entry)]; } catch { return []; }
  });

export const saveGuestWin = (input, storage = globalThis.localStorage) => {
  const entry = normalizeGuestWin(input);
  const current = listGuestWins(storage).filter((item) => item.id !== entry.id);
  storageOrThrow(storage).setItem(GUEST_WINS_KEY, JSON.stringify([entry, ...current].slice(0, 50)));
  return entry;
};

export const removeGuestWin = (id, storage = globalThis.localStorage) => {
  const next = listGuestWins(storage).filter((entry) => entry.id !== id);
  storageOrThrow(storage).setItem(GUEST_WINS_KEY, JSON.stringify(next));
};
