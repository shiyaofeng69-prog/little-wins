const RESPONSES = {
  started: {
    headline: '你让这件事真正开始了。',
    evidence: '记录里出现了“开始”或“着手”的动作。',
  },
  completed: {
    headline: '这件事现在有了完成的时刻。',
    evidence: '记录里出现了完成、提交或解决的动作。',
  },
  persisted: {
    headline: '你又为它往前走了一小步。',
    evidence: '记录里出现了继续或坚持的动作。',
  },
  tried: {
    headline: '愿意试一次，已经让事情发生了变化。',
    evidence: '记录里出现了尝试或第一次行动。',
  },
  rested: {
    headline: '你把照顾自己也算进了今天。',
    evidence: '记录里出现了休息、吃饭、喝水或放松。',
  },
  courage: {
    headline: '你把一次面对留了下来。',
    evidence: '记录里出现了害怕、焦虑或面对的情境。',
  },
  noticed: {
    headline: '这件事现在有了被看见的位置。',
    evidence: '回应只引用了这条已保存的记录。',
  },
};

export function buildEncouragement(entry, context = {}) {
  const kind = RESPONSES[entry?.actionKey] ? entry.actionKey : 'noticed';
  const response = RESPONSES[kind];
  const categoryCount = Number(context.categoryCount || 0);
  const categoryLabel = context.categoryLabel || '';
  const supporting = categoryCount > 1 && categoryLabel
    ? `这是${context.rangeLabel || '这段时间'}第 ${categoryCount} 个“${categoryLabel}”瞬间。`
    : '它不需要很大，也值得被收好。';
  return {
    kind,
    headline: response.headline,
    evidence: response.evidence,
    supporting,
    liveMessage: `${response.headline}${supporting}`,
  };
}
