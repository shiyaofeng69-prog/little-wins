import { categoryForKey } from '../../../utils/winClassifier.js';

export function CategorySummary({ counts, emptyLabel = '还没有分类记录' }) {
  const items = Object.entries(counts || {}).filter(([, count]) => count > 0);
  if (items.length === 0) return <span className="category-summary__empty">{emptyLabel}</span>;
  return (
    <div className="category-summary" aria-label="分类分布">
      {items.map(([key, count]) => {
        const category = categoryForKey(key);
        return (
          <span key={key} style={{ '--category-color': category.color }}>
            <i />{category.label}<b>{count}</b>
          </span>
        );
      })}
    </div>
  );
}
