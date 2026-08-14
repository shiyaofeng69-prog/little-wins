import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, Clock3, Code2, Download,
  Edit3, Image as ImageIcon, Loader2, LogOut, Plus,
  Settings, Sparkles, Trash2, UploadCloud, UserRound, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import { useToast } from '../ui/ToastProvider';
import { useMoodData } from '../../hooks/useMoodData';
import apiService from '../../services/api';
import { classifyWin, WIN_CATEGORIES } from '../../utils/winClassifier';
import { PERIODS, periodDefinition } from '../../features/achievements/config/periods.js';
import { buildEncouragement } from '../../features/achievements/domain/encouragement.js';
import { dateOf, localDateIso } from '../../features/achievements/domain/entryDate.js';
import { normalizeEntry } from '../../features/achievements/domain/normalizeEntry.js';
import { entriesForPeriod } from '../../features/achievements/domain/periodSelectors.js';
import { SaveAcknowledgement } from '../../features/achievements/feedback/SaveAcknowledgement.jsx';
import { usePeriodRoute } from '../../features/achievements/hooks/usePeriodRoute.js';
import { PeriodViewRouter } from '../../features/achievements/views/PeriodViews.jsx';
import './AchievementExperience.css';
import '../../features/achievements/styles/period-views.css';

const META_KEY = 'little-wins:achievement-meta:v1';
const LEGACY_META_KEY = 'micro-wins:achievement-meta:v1';

const readJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
};
const idempotencyKey = () => globalThis.crypto?.randomUUID?.() || `win-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const localTimeValue = (entry) => {
  const value = dateOf(entry);
  if (!value) return '12:00';
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
};
const formatTime = (entry) => dateOf(entry)?.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) || '--:--';

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
  const { config } = useConfig();
  const canLogout = config.enable_email_auth || config.enable_google_oauth || config.local_login_requires_password;
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
        {!isSettings && <button className="win-compose-trigger" onClick={onCompose} aria-label="记下一个小胜利"><Plus size={20} /><span>记下一个小胜利</span></button>}
        <button className="win-icon-button" onClick={() => navigate('/dashboard/settings')} aria-label="设置"><Settings size={18} /></button>
        {canLogout && <button className="win-icon-button" onClick={logout} aria-label="退出登录"><LogOut size={17} /></button>}
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

function EmptyBoard({ onCompose, hasOtherEntries }) {
  return <div className="win-empty"><Sparkles /><h2>{hasOtherEntries ? '这段时间还没有贴纸。' : '你的第一束微光，正在等你。'}</h2><p>{hasOtherEntries ? '可以换一个时间范围看看，也可以记下此刻的小小做到。' : '起床、喝水、回复消息——都可以是一件值得记住的事。'}</p><button onClick={onCompose}>记下一个做到 <ArrowRight size={16} /></button></div>;
}

function ComposeModal({ onClose, onSaved, initialCategory }) {
  const { user } = useAuth();
  const draftKey = `little-wins:compose-draft:user:${user?.id || 'anonymous'}`;
  const initialDraft = readJson(draftKey, {});
  const [content, setContent] = useState(typeof initialDraft.content === 'string' ? initialDraft.content.slice(0, 800) : '');
  const [feeling, setFeeling] = useState(typeof initialDraft.feeling === 'string' ? initialDraft.feeling.slice(0, 300) : '');
  const [category, setCategory] = useState(WIN_CATEGORIES.some((item) => item.key === initialDraft.category) ? initialDraft.category : (initialCategory || ''));
  const [requestKey] = useState(typeof initialDraft.idempotencyKey === 'string' && /^[A-Za-z0-9._:-]{8,128}$/.test(initialDraft.idempotencyKey) ? initialDraft.idempotencyKey : idempotencyKey);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState(initialDraft.content ? 'draft' : 'idle');
  const [saveError, setSaveError] = useState('');
  const { show } = useToast();
  const inferred = content.trim() ? classifyWin({ content }).category.key : '';
  const effectiveCategory = category || inferred;
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (content || feeling || category) {
        localStorage.setItem(draftKey, JSON.stringify({ content, feeling, category, idempotencyKey: requestKey, updatedAt: new Date().toISOString() }));
        if (!saving) setSaveState((current) => current === 'error' ? current : 'draft');
      } else {
        localStorage.removeItem(draftKey);
        setSaveState('idle');
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [category, content, draftKey, feeling, requestKey, saving]);
  const save = async (event) => {
    event.preventDefault();
    if (!content.trim() || saving) return;
    setSaving(true);
    setSaveState('saving');
    setSaveError('');
    const now = new Date();
    try {
      const response = await apiService.createMoodEntry({ mood: 4, date: localDateIso(now), time: now.toISOString(), content: content.trim(), category: effectiveCategory, feeling: feeling.trim(), selected_options: [] }, requestKey);
      const entry = response.entry || { id: response.entry_id, mood: 4, date: localDateIso(now), created_at: now.toISOString(), content: content.trim(), category: effectiveCategory, feeling: feeling.trim(), selections: [] };
      localStorage.removeItem(draftKey);
      setSaveState('saved');
      onSaved(entry, { category: effectiveCategory, feeling: feeling.trim() });
    } catch (error) {
      console.error(error);
      const message = error?.message || '暂时无法连接服务';
      setSaveError(message);
      show(`暂时没有收好：${message}。文字仍在这里。`, 'error');
      setSaveState('error');
      setSaving(false);
    }
  };
  return (
    <div className="win-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="compose-modal" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="compose-title">
        <button type="button" className="modal-close" onClick={onClose} aria-label="关闭"><X /></button>
        <div className="modal-title"><i /><div><h2 id="compose-title">记下一个小胜利</h2><p>此时此刻，什么让你感到自己“做到了”？</p></div></div>
        <label>描述这一瞬间 <span>/ DESCRIPTION</span></label>
        <textarea autoFocus value={content} onChange={(event) => setContent(event.target.value)} placeholder="写下你的小成就…" rows={5} maxLength={800} />
        <label>我们替你整理到 <span>/ CATEGORY</span></label>
        <div className="compose-categories">
          {WIN_CATEGORIES.map((item) => <button type="button" key={item.key} className={effectiveCategory === item.key ? 'is-selected' : ''} onClick={() => setCategory(item.key)}><CategoryPill category={item} /></button>)}
        </div>
        <small className="auto-note">先写内容，我们会自动分类；你也可以轻轻修正。</small>
        <label>当时的感受 <span>/ FEELING · 可选</span></label>
        <div className="feeling-input"><input value={feeling} maxLength={300} onChange={(event) => setFeeling(event.target.value)} placeholder="那个时刻，我觉得…" /></div>
        <div className={`compose-save-state is-${saveState}`} aria-live="polite">{saveState === 'draft' && '草稿已保存在这台设备'}{saveState === 'saving' && '正在保存…'}{saveState === 'error' && `保存失败：${saveError || '请稍后重试'}。草稿仍在`}</div>
        <footer><span><Clock3 size={14} /> 今天，{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span><button type="submit" disabled={!content.trim() || saving}>{saving ? <Loader2 className="spin" /> : <Sparkles size={16} />}保存这个瞬间</button></footer>
      </form>
    </div>
  );
}

function DetailModal({ entry, meta, onClose, onUpdate, onMetaUpdate, onArchive, onDelete, onCelebrate }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [feeling, setFeeling] = useState(meta?.feeling || entry.feeling || '');
  const [categoryKey, setCategoryKey] = useState(meta?.category || entry.category || classifyWin(entry).category.key);
  const [entryDate, setEntryDate] = useState(entry.date || localDateIso(dateOf(entry)));
  const [entryTime, setEntryTime] = useState(localTimeValue(entry));
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inferred = classifyWin(entry);
  const category = WIN_CATEGORIES.find((item) => item.key === categoryKey) || inferred.category;
  const { show } = useToast();
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  const save = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const timestamp = new Date(`${entryDate}T${entryTime}:00`);
      const response = await apiService.updateMoodEntry(entry.id, { content: content.trim(), category: categoryKey, feeling: feeling.trim() || null, date: entryDate, time: timestamp.toISOString() });
      const updated = { ...entry, ...(response.entry || {}), content: content.trim(), category: categoryKey, feeling: feeling.trim() };
      onUpdate(updated);
      onMetaUpdate({ category: categoryKey, feeling: feeling.trim() });
      setEditing(false);
      show('修改已经保存。', 'success');
    } catch (error) {
      console.error(error);
      show('修改暂时没有保存，请再试一次。', 'error');
    } finally { setSaving(false); }
  };
  const removePermanently = async () => {
    if (!deleteConfirm || deleting) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try { await onDelete(); } catch { setDeleteConfirm(false); } finally { setDeleting(false); }
  };
  return (
    <div className="win-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="modal-close" onClick={onClose} aria-label="关闭"><X /></button>
        <div className="detail-photo"><div><ImageIcon /></div><span /></div>
        <div className="detail-copy">
          <div className="detail-copy__meta"><CategoryPill category={category} /><span>今天 {formatTime(entry)} 记录</span></div>
          <h2 id="detail-title">{inferred.title}</h2>
          {editing ? <div className="detail-edit-form"><label>做到的事情<textarea value={content} maxLength={800} onChange={(event) => setContent(event.target.value)} rows={5} /></label><label>分类<select value={categoryKey} onChange={(event) => setCategoryKey(event.target.value)}>{WIN_CATEGORIES.map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}</select></label><label>当时的感受<input value={feeling} maxLength={300} onChange={(event) => setFeeling(event.target.value)} placeholder="可以留空" /></label><div><label>日期<input type="date" max={localDateIso()} value={entryDate} onChange={(event) => setEntryDate(event.target.value)} /></label><label>时间<input type="time" value={entryTime} onChange={(event) => setEntryTime(event.target.value)} /></label></div></div> : <p>{entry.content}</p>}
          {!editing && feeling && <blockquote>“{feeling}”</blockquote>}
          <div className="detail-reflection"><span>THIS MOMENT</span><strong>{inferred.encouragement}</strong></div>
        </div>
        <footer>
          <div>{editing ? <button onClick={save} disabled={saving || !content.trim() || !entryDate || !entryTime}><Check />{saving ? '正在保存' : '保存修改'}</button> : <button onClick={() => setEditing(true)}><Edit3 />编辑内容</button>}<button onClick={onArchive}><Trash2 />移入存档</button><button className={deleteConfirm ? 'delete-confirm' : ''} onClick={removePermanently} disabled={deleting}>{deleteConfirm ? (deleting ? '正在删除' : '再次点击永久删除') : '永久删除'}</button></div>
          <div><button className={`celebrate-button ${meta?.celebrated ? 'is-active' : ''}`} onClick={onCelebrate}><Sparkles />{meta?.celebrated ? '已珍藏这一刻' : '庆祝这一刻'}</button></div>
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

function SettingsPage({ entries, meta, onRestore }) {
  const exportData = () => {
    const completeEntries = entries.map((entry) => ({ ...entry, ...meta[entry.id] }));
    const blob = new Blob([JSON.stringify({ version: 1, exported_at: new Date().toISOString(), entries: completeEntries }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = '小小做到-我的成就.json'; anchor.click(); URL.revokeObjectURL(url);
  };
  const archivedEntries = entries.filter((entry) => entry.archived_at || meta[entry.id]?.archived);
  return (
    <main className="settings-page">
      <section><h2>自动分类</h2><div className="settings-categories">{WIN_CATEGORIES.map((category) => <article key={category.key}><CategoryPill category={category} /><span>固定分类</span></article>)}</div></section>
      <section><h2>存档</h2>{archivedEntries.length === 0 ? <p className="settings-note">还没有存档的记录。</p> : <div className="archive-list">{archivedEntries.map((entry) => <article key={entry.id}><span>{classifyWin(entry).title}</span><button onClick={() => onRestore(entry)}>恢复到看板</button></article>)}</div>}</section>
      <section><h2>温柔提醒</h2><p className="settings-note">系统通知仍在规划中；正式可用前不会显示无效开关。</p></section>
      <section><h2>数据、隐私与开源</h2><div className="data-cards"><button onClick={exportData}><Download /><strong>导出完整记录</strong><span>包含分类、感受、珍藏和存档状态</span></button><article><UploadCloud /><strong>账户同步</strong><span>记录与整理信息已保存在当前账户</span></article><a href="https://github.com/shiyaofeng69-prog/little-wins" target="_blank" rel="noreferrer"><Code2 /><strong>查看对应源码</strong><span>AGPL-3.0 · 修改与来源说明</span></a></div></section>
      <footer>小小做到 · Little Wins · Version 0.2.0<br /><span>基于 Nightlio 的开源工程基础重新设计。记录不是为了终点，而是为了感知一路走来的每一步。</span><br /><Link to="/privacy">隐私与使用约定</Link></footer>
    </main>
  );
}

export default function AchievementExperience() {
  const location = useLocation();
  const { params, period, patchParams, setPeriod } = usePeriodRoute();
  const { user } = useAuth();
  const { show } = useToast();
  const { pastEntries, setPastEntries, loading, error, refreshHistory } = useMoodData();
  const [meta, setMeta] = useState({});
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [acknowledgement, setAcknowledgement] = useState(null);
  const [newEntryId, setNewEntryId] = useState(null);
  const migrationStarted = useRef(false);
  const onboardingKey = user?.id ? `little-wins:onboarded:user:${user.id}` : 'little-wins:onboarded';
  const [onboarded, setOnboarded] = useState(() => (localStorage.getItem(onboardingKey) || localStorage.getItem('little-wins:onboarded') || localStorage.getItem('micro-wins:onboarded')) === 'true');
  const isSettings = location.pathname.endsWith('/settings');
  const selectedId = params.get('achievement');
  const visibleEntries = useMemo(() => entriesForPeriod(pastEntries, meta, period), [pastEntries, meta, period]);
  const selectedEntry = pastEntries.find((entry) => String(entry.id) === selectedId);
  const scopedMetaKey = user?.id ? `${META_KEY}:user:${user.id}` : META_KEY;
  const serverMetaMigrationKey = user?.id ? `little-wins:server-meta-migration:v1:user:${user.id}` : null;
  useEffect(() => {
    const scoped = readJson(scopedMetaKey, null);
    if (scoped) {
      setMeta(scoped);
      setMetaLoaded(true);
      return;
    }
    const legacy = readJson(META_KEY, readJson(LEGACY_META_KEY, {}));
    setMeta(legacy);
    if (user?.id) {
      localStorage.setItem(scopedMetaKey, JSON.stringify(legacy));
      localStorage.removeItem(META_KEY);
      localStorage.removeItem(LEGACY_META_KEY);
    }
    setMetaLoaded(true);
  }, [scopedMetaKey, user?.id]);
  useEffect(() => {
    if (!pastEntries.length) return;
    setMeta((current) => {
      const next = { ...current };
      const preferServer = serverMetaMigrationKey && localStorage.getItem(serverMetaMigrationKey) === 'done';
      pastEntries.forEach((entry) => {
        const local = next[entry.id] || {};
        next[entry.id] = {
          ...local,
          category: preferServer ? (entry.category || local.category) : (local.category || entry.category),
          feeling: preferServer ? (entry.feeling || '') : (local.feeling ?? entry.feeling ?? ''),
          celebrated: preferServer ? Boolean(entry.celebrated) : (local.celebrated ?? Boolean(entry.celebrated)),
          archived: preferServer ? Boolean(entry.archived_at) : (local.archived ?? Boolean(entry.archived_at)),
        };
      });
      return next;
    });
  }, [pastEntries, serverMetaMigrationKey]);
  useEffect(() => { if (user?.id && metaLoaded) localStorage.setItem(scopedMetaKey, JSON.stringify(meta)); }, [meta, metaLoaded, scopedMetaKey, user?.id]);
  useEffect(() => {
    if (!user?.id || !metaLoaded || !pastEntries.length || migrationStarted.current) return;
    if (localStorage.getItem(serverMetaMigrationKey) === 'done') return;
    migrationStarted.current = true;
    (async () => {
      try {
        for (const entry of pastEntries) {
          const local = meta[entry.id];
          if (!local) continue;
          const payload = {};
          if (local.category && local.category !== entry.category) payload.category = local.category;
          if (typeof local.feeling === 'string' && local.feeling !== (entry.feeling || '')) payload.feeling = local.feeling;
          if (typeof local.celebrated === 'boolean' && local.celebrated !== Boolean(entry.celebrated)) payload.celebrated = local.celebrated;
          if (typeof local.archived === 'boolean' && local.archived !== Boolean(entry.archived_at)) payload.archived = local.archived;
          if (Object.keys(payload).length) await apiService.updateMoodEntry(entry.id, payload);
        }
        localStorage.setItem(serverMetaMigrationKey, 'done');
        await refreshHistory();
      } catch (error) {
        console.error('Failed to migrate local achievement metadata.', error);
        migrationStarted.current = false;
      }
    })();
  }, [meta, metaLoaded, pastEntries, refreshHistory, serverMetaMigrationKey, user?.id]);
  useEffect(() => {
    if (!acknowledgement) return undefined;
    const timer = window.setTimeout(() => setAcknowledgement(null), 6500);
    return () => window.clearTimeout(timer);
  }, [acknowledgement]);
  const openCompose = () => patchParams({ compose: '1' });
  const onSaved = (entry, entryMeta) => {
    const nextMeta = { ...meta, [entry.id]: { ...meta[entry.id], ...entryMeta } };
    const normalized = normalizeEntry(entry, nextMeta[entry.id]);
    const categoryCount = entriesForPeriod([entry, ...pastEntries], nextMeta, period).filter((item) => item.category === normalized.category).length;
    const categoryLabel = WIN_CATEGORIES.find((item) => item.key === normalized.category)?.label || '';
    setPastEntries((items) => [entry, ...items]);
    setMeta(nextMeta);
    setNewEntryId(entry.id);
    setAcknowledgement(buildEncouragement(normalized, { categoryCount, categoryLabel, rangeLabel: periodDefinition(period).rangeLabel }));
    patchParams({ compose: null });
  };
  const updateEntry = (updated) => setPastEntries((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
  if (!onboarded && !loading && pastEntries.length === 0) return <Onboarding onBegin={() => { localStorage.setItem(onboardingKey, 'true'); localStorage.removeItem('little-wins:onboarded'); localStorage.removeItem('micro-wins:onboarded'); setOnboarded(true); setTimeout(openCompose, 0); }} onSkip={() => { localStorage.setItem(onboardingKey, 'true'); localStorage.removeItem('little-wins:onboarded'); localStorage.removeItem('micro-wins:onboarded'); setOnboarded(true); }} />;
  return (
    <div className="win-app">
      <AchievementHeader period={period} setPeriod={setPeriod} onCompose={openCompose} isSettings={isSettings} />
      <SideReference section={isSettings ? 'SETTINGS' : period.toUpperCase()} />
      {isSettings ? <SettingsPage entries={pastEntries} meta={meta} onRestore={async (entry) => { try { const response = await apiService.updateMoodEntry(entry.id, { archived: false }); updateEntry(response.entry); setMeta((current) => ({ ...current, [entry.id]: { ...current[entry.id], archived: false } })); show('已经恢复到看板。', 'success'); } catch { show('暂时没有恢复成功，请再试一次。', 'error'); refreshHistory(); } }} /> : (
        <main className="win-canvas">
          <SaveAcknowledgement message={acknowledgement} onClose={() => setAcknowledgement(null)} />
          {loading && <div className="win-loading"><Loader2 className="spin" /> 正在展开你的微光…</div>}
          {!loading && error && <div className="win-loading">暂时没有打开收藏盒。<button onClick={refreshHistory}>重新读取</button></div>}
          {!loading && !error && visibleEntries.length === 0 && <EmptyBoard onCompose={openCompose} hasOtherEntries={pastEntries.length > 0} />}
          {!loading && !error && visibleEntries.length > 0 && <PeriodViewRouter period={period} entries={visibleEntries} onOpen={(entry) => patchParams({ achievement: entry.id })} newEntryId={newEntryId} />}
        </main>
      )}
      {!isSettings && <footer className="win-status"><span><i />这里已经收藏了 <strong>{visibleEntries.length}</strong> 个值得肯定的瞬间</span><span>{periodDefinition(period).rangeLabel} · 只记录真实发生的做到</span></footer>}
      {!isSettings && params.get('compose') === '1' && <ComposeModal onClose={() => patchParams({ compose: null })} onSaved={onSaved} />}
      {!isSettings && selectedEntry && <DetailModal entry={selectedEntry} meta={meta[selectedEntry.id]} onClose={() => patchParams({ achievement: null })} onUpdate={updateEntry} onMetaUpdate={(patch) => setMeta((current) => ({ ...current, [selectedEntry.id]: { ...current[selectedEntry.id], ...patch } }))} onArchive={async () => { try { const response = await apiService.updateMoodEntry(selectedEntry.id, { archived: true }); updateEntry(response.entry); setMeta((current) => ({ ...current, [selectedEntry.id]: { ...current[selectedEntry.id], archived: true } })); patchParams({ achievement: null }); show('已经移入存档，可以随时在设置中恢复。', 'success'); } catch { show('暂时没有存档成功，请再试一次。', 'error'); refreshHistory(); } }} onDelete={async () => { try { await apiService.deleteMoodEntry(selectedEntry.id); setPastEntries((items) => items.filter((item) => item.id !== selectedEntry.id)); setMeta((current) => { const next = { ...current }; delete next[selectedEntry.id]; return next; }); patchParams({ achievement: null }); show('这条记录已经永久删除。', 'success'); } catch { show('暂时没有删除成功，请再试一次。', 'error'); throw new Error('delete failed'); } }} onCelebrate={async () => { const next = !meta[selectedEntry.id]?.celebrated; try { const response = await apiService.updateMoodEntry(selectedEntry.id, { celebrated: next }); updateEntry(response.entry); setMeta((current) => ({ ...current, [selectedEntry.id]: { ...current[selectedEntry.id], celebrated: next } })); } catch { show('暂时没有保存珍藏状态，请再试一次。', 'error'); refreshHistory(); } }} />}
    </div>
  );
}
