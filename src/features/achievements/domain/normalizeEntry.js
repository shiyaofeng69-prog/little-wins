import { categoryForKey, classifyWin } from '../../../utils/winClassifier.js';
import { dateOf, localDateIso, localMonthKey } from './entryDate.js';

export function normalizeEntry(entry, entryMeta = {}) {
  const occurredAt = dateOf(entry);
  if (!occurredAt) return null;
  const inferred = classifyWin(entry);
  const category = entryMeta.category || entry.category || inferred.category.key;
  return {
    ...entry,
    title: inferred.title,
    occurredAt,
    localDateKey: localDateIso(occurredAt),
    localMonthKey: localMonthKey(occurredAt),
    category,
    categoryDefinition: categoryForKey(category),
    action: inferred.action,
    actionKey: inferred.actionKey,
    encouragement: inferred.encouragement,
    feeling: entryMeta.feeling ?? entry.feeling ?? '',
    celebrated: entryMeta.celebrated ?? Boolean(entry.celebrated),
    archived: entryMeta.archived ?? Boolean(entry.archived_at),
  };
}

export function normalizeEntries(entries = [], meta = {}) {
  return entries
    .map((entry) => normalizeEntry(entry, meta[entry.id]))
    .filter(Boolean);
}
