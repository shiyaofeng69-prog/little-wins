import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Code2, Download,
  Edit3, Heart, Image as ImageIcon, Loader2, LogOut, MoreHorizontal, Plus,
  Settings, Share2, Sparkles, Trash2, UploadCloud, UserRound, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/ToastProvider';
import { useMoodData } from '../../hooks/useMoodData';
import apiService from '../../services/api';
import { classifyWin, WIN_CATEGORIES } from '../../utils/winClassifier';
import './AchievementExperience.css';

const PERIODS = [
  { key: 'today', label: '今日', title: 'TODAY' },
  { key: 'week', label: '今周', title: 'BOARD' },
  { key: 'month', label: '今月', title: 'COLLECTION' },
  { key: 'half', label: '半年', title: 'CHRONICLE' },
  { key: 'year', label: '今年', title: '年度回顾' },
];
const META_KEY = 'little-wins:achievement-meta:v1';
const PREF_KEY = 'little-wins:preferences:v1';
const LEGACY_META_KEY = 'micro-wins:achievement-meta:v1';
const LEGACY_PREF_KEY = 'micro-wins:preferences:v1';

const readJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
};
const dateOf = (entry) => new Date(entry.created_at || entry.time || `${entry.date}T12:00:00`);
const dateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const startFor = (period) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === 'month') start.setDate(1);
  if (period === 'half') start.setMonth(start.getMonth() - 5, 1);
  if (period === 'year') start.setMonth(0, 1);
  return start;
};
const formatTime = (entry) => dateOf(entry).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

function Brand({ pageTitle }) {
  return (
    <div className="win-brand">
      <span className="win-brand__mark"><Sparkles size={17} /></span>
      <strong>小小做到</strong><i>/</i><b>{pageTitle}</b>
    </div>
  );
}

function AchievementHeader({ period, setPeriod, onCompose, isSettings }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const current = PERIODS.find((item) => item.key === period) || PERIODS[0];
  return (
    <header className={`win-header ${isSettings ? 'is-settings' : ''}`}>
      {isSettings ? (
        <button className="win-icon-button" onClick={() => navigate('/dashboard?period=today')} aria-label="返回微光板"><ArrowLeft size={18} /></button>
      ) : null}
      <Brand pageTitle={isSettings ? '设置' : current.title} />
      {!isSettings && (
        <nav className="win-period-nav" aria-label="查看时间范围">
          {PERIODS.map((item) => <button key={item.key} className={period === item.key ? 'is-active' : ''} onClick={() => setPeriod(item.key)}>{item.label}</button>)}
        </nav>
      )}
      <div className="win-header__actions">
        {!isSettings && <button className="win-compose-trigger" onClick={onCompose}><Plus size={20} /><span>记下一个小胜利</span></button>}
        <button className="win-icon-button" onClick={() => navigate('/dashboard/settings')} aria-label="设置"><Settings size={18} /></button>
        <button className="win-icon-button" onClick={logout} aria-label="退出登录"><LogOut size={17} /></button>
      </div>
    </header>
  );
}

function SideReference({ section }) {
  return <aside className="win-reference" aria-hidden="true"><span>REF.WIN.01</span><span>{section}</span><span>COLLECTION</span></aside>;
}

function CategoryPill({ category }) {
  return <span className="win-category" style={{ '--category-color': category.color }}><i />{category.label}<b>· {category.key.toUpperCase()}</b></span>;
}

function WinCard({ entry, meta, onOpen, compact = false }) {
  const inferred = classifyWin(entry);
  const category = WIN_CATEGORIES.find((item) => item.key === meta?.category) || inferred.category;
  return (
    <button className={`win-card ${compact ? 'is-compact' : ''}`} onClick={() => onOpen(entry)}>
      <div><CategoryPill category={category} /><time>{formatTime(entry)}</time></div>
      <h3>{inferred.title}</h3>
      <p>{inferred.encouragement}</p>
      {meta?.celebrated && <Heart className="win-card__heart" size={15} fill="currentColor" />}
    </button>
  );
}

function TodayTimeline({ entries, meta, onOpen }) {
  const today = new Date();
  return (
    <section className="today-view">
      <div className="today-date">{today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
      <div className="today-line" />
      {entries.map((entry, index) => {
        const category = WIN_CATEGORIES.find((item) => item.key === meta[entry.id]?.category) || classifyWin(entry).category;
        return (
          <article className={`timeline-item ${index % 2 ? 'is-left' : 'is-right'}`} key={entry.id}>
            <span className="timeline-item__time">{formatTime(entry)}</span>
            <i className="timeline-item__dot" style={{ background: category.color }} />
            <WinCard entry={entry} meta={meta[entry.id]} onOpen={onOpen} />
          </article>
        );
      })}
    </section>
  );
}

function CollectionBoard({ entries, meta, onOpen, period }) {
  return (
    <section className={`collection-view collection-view--${period}`}>
      <div className="collection-watermark">每一个做到，都值得被看见</div>
      {entries.map((entry, index) => (
        <div className={`collection-item collection-item--${index % 8}`} key={entry.id}>
          <WinCard entry={entry} meta={meta[entry.id]} onOpen={onOpen} compact />
        </div>
      ))}
      {entries.length > 2 && <div className="memory-polaroid memory-polaroid--one"><div /><em>Morning Gold</em></div>}
      {entries.length > 4 && <div className="memory-polaroid memory-polaroid--two"><div /><em>Quiet breath</em></div>}
    </section>
  );
}

function YearReview({ entries, meta }) {
  const year = new Date().getFullYear();
  const counts = WIN_CATEGORIES.map((category) => ({ category, count: entries.filter((entry) => (meta[entry.id]?.category || classifyWin(entry).category.key) === category.key).length })).filter((item) => item.count);
  const activeDays = new Set(entries.map((entry) => dateKey(dateOf(entry)))).size;
  const dayDots = Array.from({ length: 186 }, () => null);
  entries.forEach((entry) => {
    const date = dateOf(entry);
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((date - yearStart) / 86400000);
    dayDots[Math.min(185, Math.floor((dayOfYear / 365) * 186))] = entry;
  });
  const cared = counts.find((item) => item.category.key === 'self-care')?.count || 0;
  return (
    <section className="year-review">
      <div className="year-review__intro">
        <h1><b>{year}：</b>微小而确定的光芒</h1>
        <p>在这一年里，你一共标记了 <strong>{entries.length}</strong> 次努力。每一个圆点，都是一次对生活或对自己的拥抱。</p>
      </div>
      <div className="year-map">
        <div className="year-counts">{counts.map(({ category, count }) => <div key={category.key}><span>{category.label}</span><strong>{count}</strong><small>次</small></div>)}</div>
        <div className="year-dots">{dayDots.map((entry, index) => { const category = entry ? WIN_CATEGORIES.find((item) => item.key === (meta[entry.id]?.category || classifyWin(entry).category.key)) : null; return <i key={index} style={{ background: category?.color || '#eeece7' }} />; })}</div>
        <div className="year-months"><span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span><span>SEP</span><span>NOV</span><span>DEC</span></div>
      </div>
      <div className="year-insights">
        <article><Clock3 /><h3>你回来过的日子</h3><strong>{activeDays}</strong><span> DAYS NOTICED</span><p>不要求连续。每一次回来，都算数。</p></article>
        <article className="is-accent"><Sparkles /><h3>被看见的努力</h3><strong>{entries.length}</strong><span> MOMENTS</span><p>它们没有因为微小而失去意义。</p></article>
        <article><Heart /><h3>自我关怀力</h3><strong>{cared}</strong><span> GENTLE MOMENTS</span><p>你正在练习把温柔也留给自己。</p></article>
      </div>
    </section>
  );
}

function EmptyBoard({ onCompose }) {
  return <div className="win-empty"><Sparkles /><h2>你的第一束微光，正在等你。</h2><p>起床、喝水、回复消息——都可以是一件值得记住的事。</p><button onClick={onCompose}>记下第一个做到 <ArrowRight size={16} /></button></div>;
}

function ComposeModal({ onClose, onSaved, initialCategory }) {
  const [content, setContent] = useState('');
  const [feeling, setFeeling] = useState('');
  const [category, setCategory] = useState(initialCategory || '');
  const [saving, setSaving] = useState(false);
  const { show } = useToast();
  const inferred = content.trim() ? classifyWin({ content }).category.key : '';
  const effectiveCategory = category || inferred;
  const save = async (event) => {
    event.preventDefault();
    if (!content.trim() || saving) return;
    setSaving(true);
    const now = new Date();
    try {
      const response = await apiService.createMoodEntry({ mood: 4, date: now.toISOString().slice(0, 10), time: now.toISOString(), content: content.trim(), selected_options: [] });
      const entry = { id: response.entry_id, mood: 4, date: now.toISOString().slice(0, 10), time: now.toISOString(), created_at: now.toISOString(), content: content.trim(), selections: [] };
      onSaved(entry, { category: effectiveCategory, feeling: feeling.trim() });
      show('已经替你收好了。这件事值得被记住。', 'success');
    } catch (error) {
      console.error(error);
      show('暂时没有收好，但文字还在这里。请再试一次。', 'error');
      setSaving(false);
    }
  };
  return (
    <div className="win-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="compose-modal" onSubmit={save}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="关闭"><X /></button>
        <div className="modal-title"><i /><div><h2>记下一个小胜利</h2><p>此时此刻，什么让你感到自己“做到了”？</p></div></div>
        <label>描述这一瞬间 <span>/ DESCRIPTION</span></label>
        <textarea autoFocus value={content} onChange={(event) => setContent(event.target.value)} placeholder="写下你的小成就…" rows={5} maxLength={800} />
        <label>我们替你整理到 <span>/ CATEGORY</span></label>
        <div className="compose-categories">
          {WIN_CATEGORIES.map((item) => <button type="button" key={item.key} className={effectiveCategory === item.key ? 'is-selected' : ''} onClick={() => setCategory(item.key)}><CategoryPill category={item} /></button>)}
        </div>
        <small className="auto-note">先写内容，我们会自动分类；你也可以轻轻修正。</small>
        <label>当时的感受 <span>/ FEELING · 可选</span></label>
        <div className="feeling-input"><input value={feeling} onChange={(event) => setFeeling(event.target.value)} placeholder="那个时刻，我觉得…" /><ImageIcon size={18} /></div>
        <footer><span><Clock3 size={14} /> 今天，{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span><button type="submit" disabled={!content.trim() || saving}>{saving ? <Loader2 className="spin" /> : <Sparkles size={16} />}保存这个瞬间</button></footer>
      </form>
    </div>
  );
}

function DetailModal({ entry, meta, onClose, onUpdate, onArchive, onCelebrate }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [saving, setSaving] = useState(false);
  const inferred = classifyWin(entry);
  const category = WIN_CATEGORIES.find((item) => item.key === meta?.category) || inferred.category;
  const save = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const response = await apiService.updateMoodEntry(entry.id, { content: content.trim() });
      onUpdate({ ...entry, ...(response.entry || {}), content: content.trim() });
      setEditing(false);
    } finally { setSaving(false); }
  };
  return (
    <div className="win-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className="detail-modal">
        <button className="modal-close" onClick={onClose} aria-label="关闭"><X /></button>
        <div className="detail-photo"><div><ImageIcon /></div><span /></div>
        <div className="detail-copy">
          <div className="detail-copy__meta"><CategoryPill category={category} /><span>今天 {formatTime(entry)} 记录</span></div>
          <h2>{inferred.title}</h2>
          {editing ? <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={7} /> : <p>{entry.content}</p>}
          {meta?.feeling && <blockquote>“{meta.feeling}”</blockquote>}
          <div className="detail-reflection"><span>THIS MOMENT</span><strong>{inferred.encouragement}</strong></div>
        </div>
        <footer>
          <div>{editing ? <button onClick={save} disabled={saving}><Check />保存修改</button> : <button onClick={() => setEditing(true)}><Edit3 />编辑内容</button>}<button onClick={onArchive}><Trash2 />移入存档</button></div>
          <div><button className={`celebrate-button ${meta?.celebrated ? 'is-active' : ''}`} onClick={onCelebrate}><Sparkles />{meta?.celebrated ? '已珍藏这一刻' : '庆祝这一刻'}</button><button aria-label="分享"><Share2 /></button></div>
        </footer>
      </article>
    </div>
  );
}

function Onboarding({ onBegin, onSkip }) {
  return (
    <div className="onboarding">
      <Brand pageTitle="ONBOARDING" />
      <button className="win-icon-button onboarding__profile" onClick={onSkip}><UserRound /></button>
      <div className="onboarding-card"><div><ImageIcon /></div><span><Sparkles fill="currentColor" /></span></div>
      <div className="onboarding-copy"><h1>欢迎来到你的胜利看板</h1><p>每一个微小的做到，都是通往更好的基石。<br />在这里，我们只记录那些让你感到踏实的瞬间。</p><button onClick={onBegin}>开启你的第一个小胜利 <ArrowRight /></button><small>BEGIN YOUR JOURNEY OF NOTICING</small></div>
      <footer>这里将会记录你的成长轨迹</footer>
    </div>
  );
}

function SettingsPage({ entries, preferences, setPreferences }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = '小小做到-我的成就.json'; anchor.click(); URL.revokeObjectURL(url);
  };
  const toggle = (key) => setPreferences((current) => ({ ...current, [key]: !current[key] }));
  return (
    <main className="settings-page">
      <section><h2>分类管理</h2><div className="settings-categories">{WIN_CATEGORIES.map((category) => <article key={category.key}><CategoryPill category={category} /><MoreHorizontal /></article>)}<button><Plus />添加新分类</button></div></section>
      <section><h2>温柔提醒</h2><div className="reminder-row"><div><strong>晨间回顾</strong><p>在上午 08:30 提醒你记录昨天的微小成就</p></div><button className={`switch ${preferences.morning ? 'is-on' : ''}`} onClick={() => toggle('morning')}><i /></button></div><div className="reminder-row"><div><strong>晚间温柔</strong><p>在下午 21:00 邀请你进行今天的正向反馈</p></div><button className={`switch ${preferences.evening ? 'is-on' : ''}`} onClick={() => toggle('evening')}><i /></button></div></section>
      <section><h2>数据、隐私与开源</h2><div className="data-cards"><button onClick={exportData}><Download /><strong>导出我的成就</strong><span>下载 JSON 格式，只属于你</span></button><article><UploadCloud /><strong>云端同步</strong><span>记录已安全保存在当前账户</span></article><a href="https://github.com/shiyaofeng69-prog/little-wins" target="_blank" rel="noreferrer"><Code2 /><strong>查看对应源码</strong><span>AGPL-3.0 · 修改与来源说明</span></a></div></section>
      <footer>小小做到 · Little Wins · Version 0.2.0<br /><span>基于 Nightlio 的开源工程基础重新设计。记录不是为了终点，而是为了感知一路走来的每一步。</span></footer>
    </main>
  );
}

export default function AchievementExperience() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { pastEntries, setPastEntries, loading, error } = useMoodData();
  const [meta, setMeta] = useState(() => readJson(META_KEY, readJson(LEGACY_META_KEY, {})));
  const [preferences, setPreferences] = useState(() => readJson(PREF_KEY, readJson(LEGACY_PREF_KEY, { morning: true, evening: false })));
  const [onboarded, setOnboarded] = useState(() => (localStorage.getItem('little-wins:onboarded') || localStorage.getItem('micro-wins:onboarded')) === 'true');
  const isSettings = location.pathname.endsWith('/settings');
  const period = params.get('period') || 'today';
  const selectedId = params.get('achievement');
  const visibleEntries = useMemo(() => pastEntries.filter((entry) => !meta[entry.id]?.archived && dateOf(entry) >= startFor(period)).sort((a, b) => dateOf(a) - dateOf(b)), [pastEntries, meta, period]);
  const selectedEntry = pastEntries.find((entry) => String(entry.id) === selectedId);
  useEffect(() => { localStorage.setItem(META_KEY, JSON.stringify(meta)); }, [meta]);
  useEffect(() => { localStorage.setItem(PREF_KEY, JSON.stringify(preferences)); }, [preferences]);
  const patchParams = (patch) => { const next = new URLSearchParams(params); Object.entries(patch).forEach(([key, value]) => value == null ? next.delete(key) : next.set(key, value)); setParams(next); };
  const openCompose = () => patchParams({ compose: '1' });
  const onSaved = (entry, entryMeta) => { setPastEntries((items) => [entry, ...items]); setMeta((current) => ({ ...current, [entry.id]: { ...current[entry.id], ...entryMeta } })); patchParams({ compose: null }); };
  const updateEntry = (updated) => setPastEntries((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
  const setPeriod = (nextPeriod) => { navigate(`/dashboard?period=${nextPeriod}`); };
  if (!onboarded && !loading && pastEntries.length === 0) return <Onboarding onBegin={() => { localStorage.setItem('little-wins:onboarded', 'true'); setOnboarded(true); setTimeout(openCompose, 0); }} onSkip={() => { localStorage.setItem('little-wins:onboarded', 'true'); setOnboarded(true); }} />;
  return (
    <div className="win-app">
      <AchievementHeader period={period} setPeriod={setPeriod} onCompose={openCompose} isSettings={isSettings} />
      <SideReference section={isSettings ? 'SETTINGS' : period.toUpperCase()} />
      {isSettings ? <SettingsPage entries={pastEntries} preferences={preferences} setPreferences={setPreferences} /> : (
        <main className="win-canvas">
          {loading && <div className="win-loading"><Loader2 className="spin" /> 正在展开你的微光…</div>}
          {!loading && error && <div className="win-loading">暂时没有打开收藏盒，请稍后再试。</div>}
          {!loading && !error && visibleEntries.length === 0 && <EmptyBoard onCompose={openCompose} />}
          {!loading && !error && visibleEntries.length > 0 && period === 'today' && <TodayTimeline entries={visibleEntries} meta={meta} onOpen={(entry) => patchParams({ achievement: entry.id })} />}
          {!loading && !error && visibleEntries.length > 0 && ['week', 'month', 'half'].includes(period) && <CollectionBoard entries={visibleEntries} meta={meta} onOpen={(entry) => patchParams({ achievement: entry.id })} period={period} />}
          {!loading && !error && visibleEntries.length > 0 && period === 'year' && <YearReview entries={visibleEntries} meta={meta} />}
        </main>
      )}
      {!isSettings && <footer className="win-status"><span><i />这里已经收藏了 <strong>{visibleEntries.length}</strong> 个值得肯定的瞬间</span><span><CalendarDays /> {period.toUpperCase()} · {Math.min(100, visibleEntries.length * 8)}%</span></footer>}
      {params.get('compose') === '1' && <ComposeModal onClose={() => patchParams({ compose: null })} onSaved={onSaved} />}
      {selectedEntry && <DetailModal entry={selectedEntry} meta={meta[selectedEntry.id]} onClose={() => patchParams({ achievement: null })} onUpdate={updateEntry} onArchive={() => { setMeta((current) => ({ ...current, [selectedEntry.id]: { ...current[selectedEntry.id], archived: true } })); patchParams({ achievement: null }); }} onCelebrate={() => setMeta((current) => ({ ...current, [selectedEntry.id]: { ...current[selectedEntry.id], celebrated: !current[selectedEntry.id]?.celebrated } }))} />}
    </div>
  );
}
