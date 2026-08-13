const CATEGORIES = [
  { key: 'self-care', label: '自我照顾', color: 'var(--color-category-self-care)', keywords: ['休息', '睡', '洗澡', '吃饭', '喝水', '情绪', '放松', '照顾自己', '冥想', '呼吸'] },
  { key: 'work-study', label: '工作与学习', color: 'var(--color-category-work-study)', keywords: ['工作', '学习', '邮件', '会议', '报告', '作业', '阅读', '写完', '提交', '代码', '复习', '课程'] },
  { key: 'health', label: '健康与运动', color: 'var(--color-category-health)', keywords: ['运动', '跑步', '散步', '健身', '服药', '看医生', '预约', '体检', '瑜伽', '走路'] },
  { key: 'daily-life', label: '生活与日常', color: 'var(--color-category-daily-life)', keywords: ['整理', '打扫', '做饭', '洗衣', '购物', '收拾', '出门', '起床', '家务', '买菜'] },
  { key: 'connection', label: '关系与连接', color: 'var(--color-category-connection)', keywords: ['朋友', '家人', '妈妈', '爸爸', '同事', '联系', '感谢', '帮助', '陪伴', '聊天', '道歉'] },
  { key: 'courage', label: '勇气与突破', color: 'var(--color-category-courage)', keywords: ['终于', '害怕', '焦虑', '尝试', '第一次', '鼓起勇气', '没有逃避', '开始', '面对', '突破'] },
];

const ACTIONS = [
  { key: 'courage', label: '鼓起了勇气', keywords: ['害怕', '焦虑', '面对', '没有逃避', '鼓起勇气'] },
  { key: 'rested', label: '照顾了自己', keywords: ['休息', '睡', '放松', '照顾自己', '喝水', '吃饭'] },
  { key: 'persisted', label: '坚持了', keywords: ['坚持', '继续', '还是', '又一次'] },
  { key: 'completed', label: '完成了', keywords: ['完成', '做完', '写完', '提交', '回复', '解决'] },
  { key: 'tried', label: '尝试了', keywords: ['尝试', '第一次', '试着'] },
  { key: 'started', label: '开始了', keywords: ['开始', '着手', '打开', '起步'] },
];

const ENCOURAGEMENTS = {
  started: '开始了，也是一种做到。',
  completed: '这件事值得被好好记住。',
  persisted: '你为自己多走了一小步。',
  tried: '愿意尝试，本身就很珍贵。',
  rested: '照顾自己，也是今天的重要成就。',
  courage: '这并不容易，但你还是面对了。',
  default: '今天又多了一点微光。',
};

const hash = (value = '') => [...value].reduce((sum, char) => ((sum << 5) - sum + char.charCodeAt(0)) | 0, 0);

const makeTitle = (content = '') => {
  const clean = content.replace(/[#*_>`~]/g, '').replaceAll('[', '').replaceAll(']', '').replace(/\s+/g, ' ').trim();
  const firstSentence = clean.split(/[。！？!?\n]/)[0] || '今天的一件小事';
  return firstSentence.length > 26 ? `${firstSentence.slice(0, 26)}…` : firstSentence;
};

export const classifyWin = (entry) => {
  const content = entry?.content || '';
  const courageSignal = ['害怕', '焦虑', '面对', '没有逃避', '鼓起勇气', '第一次', '终于'].some((word) => content.includes(word));
  const category = CATEGORIES
    .map((item) => ({
      item,
      score: item.keywords.filter((word) => content.includes(word)).length + (item.key === 'courage' && courageSignal ? 0.5 : 0),
    }))
    .sort((a, b) => b.score - a.score)[0];
  const selectedCategory = category?.score > 0 ? category.item : CATEGORIES[3];
  const action = ACTIONS.find((item) => item.keywords.some((word) => content.includes(word)));
  const seed = Math.abs(hash(`${entry?.id || ''}${content}`));

  return {
    title: makeTitle(content),
    category: selectedCategory,
    action: action?.label || '做到了',
    actionKey: action?.key || 'noticed',
    encouragement: ENCOURAGEMENTS[action?.key] || ENCOURAGEMENTS.default,
    rotation: ((seed % 7) - 3) * 0.35,
    variant: seed % 4,
  };
};

export const WIN_CATEGORIES = CATEGORIES;

export const categoryForKey = (key) => CATEGORIES.find((category) => category.key === key) || CATEGORIES[3];
