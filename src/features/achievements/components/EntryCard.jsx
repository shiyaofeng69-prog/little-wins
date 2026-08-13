import { Heart } from 'lucide-react';
import { categoryForKey } from '../../../utils/winClassifier.js';
import { formatEntryTime } from '../domain/entryDate.js';

export function CategoryPill({ categoryKey, showEnglish = true }) {
  const category = categoryForKey(categoryKey);
  return (
    <span className="period-category" style={{ '--category-color': category.color }}>
      <i />
      {category.label}
      {showEnglish && <b>· {category.key.toUpperCase()}</b>}
    </span>
  );
}

export function EntryCard({ entry, onOpen, compact = false, isNew = false }) {
  return (
    <button
      className={`period-entry-card${compact ? ' is-compact' : ''}${isNew ? ' is-new' : ''}`}
      onClick={() => onOpen(entry)}
      type="button"
    >
      <span className="period-entry-card__meta">
        <CategoryPill categoryKey={entry.category} showEnglish={!compact} />
        <time>{formatEntryTime(entry)}</time>
      </span>
      <strong>{entry.title}</strong>
      {!compact && <small>{entry.encouragement}</small>}
      {entry.celebrated && <Heart className="period-entry-card__heart" size={14} fill="currentColor" aria-label="已珍藏" />}
    </button>
  );
}
