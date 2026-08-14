import { useMemo, useState } from 'react';
import { ArrowRight, Check, Loader2, LockKeyhole, Sparkles } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useConfig } from '../../../contexts/ConfigContext.jsx';
import apiService from '../../../services/api.js';
import { classifyWin, categoryForKey } from '../../../utils/winClassifier.js';
import { listGuestWins, saveGuestWin } from '../guestWins.js';
import { migrateGuestWins } from '../migrateGuestWins.js';
import './AccountJourney.css';

const currentDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

function AccountBrand({ label }) {
  return (
    <Link className="account-brand" to="/">
      <span><Sparkles size={17} /></span><strong>小小做到</strong><i>/</i><b>{label}</b>
    </Link>
  );
}

function SavedWin({ entry, onAnother }) {
  const insight = classifyWin(entry);
  const category = categoryForKey(entry.category);
  return (
    <section className="account-saved" aria-live="polite">
      <span className="account-saved__check"><Check /></span>
      <p className="account-kicker">已经留在这台设备上</p>
      <h1>{insight.encouragement}</h1>
      <article>
        <span style={{ '--guest-category': category.color }}><i />{category.label}</span>
        <strong>{insight.title}</strong>
        {entry.feeling ? <p>{entry.feeling}</p> : null}
      </article>
      <p className="account-saved__explain">创建账户后，这条记录会和以后的微光一起保存在你的看板中。</p>
      <div className="account-actions">
        <Link className="account-button account-button--primary" to="/register">保存我的成长记录 <ArrowRight /></Link>
        <button className="account-button account-button--quiet" type="button" onClick={onAnother}>再记一件</button>
      </div>
      <p className="account-inline-link">已经有账户？<Link to="/login">登录并带走这条记录</Link></p>
    </section>
  );
}

export function FirstWinPage() {
  const { isAuthenticated } = useAuth();
  const [latest, setLatest] = useState(() => listGuestWins()[0] || null);
  const [content, setContent] = useState('');
  const [feeling, setFeeling] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inferred = useMemo(() => classifyWin({ content }), [content]);
  const contentError = touched && !content.trim() ? '先写下一件已经发生的小事，不需要写得完整。' : '';

  if (isAuthenticated) return <Navigate to="/dashboard?period=today&compose=1" replace />;

  const save = (event) => {
    event.preventDefault();
    setTouched(true);
    if (!content.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const now = new Date();
      const entry = saveGuestWin({
        content,
        feeling,
        category: inferred.category.key,
        date: currentDate(),
        time: now.toISOString(),
      });
      setLatest(entry);
      setContent('');
      setFeeling('');
    } catch (saveError) {
      setError(saveError?.message || '这台设备暂时无法保存，文字仍在这里。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="account-journey">
      <header><AccountBrand label="FIRST WIN" /><Link to="/login">登录</Link></header>
      <aside>
        <p className="account-kicker">先记录，再决定是否注册</p>
        <h2>今天已经发生的努力，不需要账户才能算数。</h2>
        <p>起床、喝水、打开文档、回复一条拖了很久的消息——写下一句就够了，分类交给我们。</p>
        <small><LockKeyhole /> 注册前，记录只保存在这台设备上。</small>
      </aside>
      <div className="account-workspace">
        {latest ? <SavedWin entry={latest} onAnother={() => setLatest(null)} /> : (
          <form className="account-form" onSubmit={save} noValidate>
            <p className="account-kicker">你的第一张贴纸</p>
            <h1>此刻，什么让你感到自己“做到了”？</h1>
            <div className={`account-field ${contentError ? 'is-error' : ''}`}>
              <label htmlFor="first-win-content">已经做到的事情</label>
              <textarea
                id="first-win-content"
                autoFocus
                rows={6}
                maxLength={800}
                value={content}
                placeholder="例如：我终于打开了拖了很久的文档"
                aria-invalid={Boolean(contentError)}
                aria-describedby="first-win-content-help"
                onBlur={() => setTouched(true)}
                onChange={(event) => setContent(event.target.value)}
              />
              <small id="first-win-content-help">{contentError || `${content.length}/800 · 不用完整，也不用漂亮`}</small>
            </div>
            <div className="account-field">
              <label htmlFor="first-win-feeling">当时的感受 <span>可选</span></label>
              <input id="first-win-feeling" maxLength={300} value={feeling} placeholder="例如：松了一口气" onChange={(event) => setFeeling(event.target.value)} />
              <small>会和这件事一起被保存。</small>
            </div>
            {content.trim() ? <p className="account-inference"><i style={{ '--guest-category': inferred.category.color }} />我们会先整理到“{inferred.category.label}”，之后可以修改。</p> : null}
            {error ? <p className="account-error" role="alert">{error}</p> : null}
            <button className="account-button account-button--primary" type="submit" disabled={!content.trim() || saving}>
              {saving ? <><Loader2 className="account-spinner" />正在保存</> : <>记住这件事 <ArrowRight /></>}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

const validateEmail = (email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated, loading: authLoading } = useAuth();
  const { config, loading: configLoading } = useConfig();
  const [form, setForm] = useState({ name: '', email: '', password: '', consent: false });
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const guestCount = listGuestWins().length;
  const errors = {
    email: !form.email.trim() ? '请填写邮箱地址。' : (!validateEmail(form.email) ? '邮箱格式不完整，请检查后再试。' : ''),
    password: form.password.length < 12 ? '密码至少需要 12 个字符，可以使用一句容易记住的话。' : '',
    consent: !form.consent ? '创建账户前，请先确认隐私与使用约定。' : '',
  };
  const invalid = Boolean(errors.email || errors.password || errors.consent);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  if (!authLoading && isAuthenticated && !submitting) {
    return <Navigate to="/dashboard?period=today" replace />;
  }

  if (!configLoading && !config.enable_email_auth) {
    return (
      <main className="account-journey account-journey--register">
        <header><AccountBrand label="ACCOUNT" /><Link to="/login">返回登录</Link></header>
        <aside>
          <p className="account-kicker">账户方式由部署者管理</p>
          <h2>这个版本暂未开放邮箱注册。</h2>
          <p>你的本机记录仍然安全保留，不会因为离开这个页面而消失。</p>
        </aside>
        <div className="account-workspace">
          <section className="account-saved">
            <span className="account-saved__check"><LockKeyhole /></span>
            <p className="account-kicker">记录没有丢失</p>
            <h1>使用当前站点提供的方式登录</h1>
            <p className="account-saved__explain">登录后，仍可以把这台设备上的小胜利带进自己的看板。</p>
            <div className="account-actions">
              <Link className="account-button account-button--primary" to="/login">查看登录方式 <ArrowRight /></Link>
              <Link className="account-button account-button--quiet" to="/start">继续留在本机记录</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true, consent: true });
    if (invalid || submitting) return;
    setSubmitting(true);
    setError('');
    const result = await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
    if (!result.success) {
      setError(result.error || '账户没有创建成功，请保留当前页面后重试。');
      setSubmitting(false);
      return;
    }
    const migration = await migrateGuestWins(apiService);
    if (migration.migrated > 0 && result.user?.id) {
      localStorage.setItem(`little-wins:onboarded:user:${result.user.id}`, 'true');
    }
    navigate('/dashboard?period=today', {
      replace: true,
      state: { migratedGuestWins: migration.migrated, remainingGuestWins: migration.remaining },
    });
  };

  return (
    <main className="account-journey account-journey--register">
      <header><AccountBrand label="SAVE YOUR WINS" /><Link to="/login">已有账户</Link></header>
      <aside>
        <p className="account-kicker">为这些做到留一个位置</p>
        <h2>{guestCount ? `你已经记下 ${guestCount} 件值得留下的事。` : '从今天开始，把努力留在自己的看板里。'}</h2>
        <p>{guestCount ? '账户创建后，我们会把这台设备上的记录安全搬过去。迁移失败的记录仍会留在原处。' : '账户只用来同步和保护记录，不会改变这款产品安静、无压力的节奏。'}</p>
      </aside>
      <div className="account-workspace">
        <form className="account-form" onSubmit={submit} noValidate>
          <p className="account-kicker">创建账户</p>
          <h1>继续收藏已经发生的努力</h1>
          <div className="account-field">
            <label htmlFor="register-name">怎么称呼你 <span>可选</span></label>
            <input id="register-name" maxLength={60} autoComplete="name" value={form.name} placeholder="例如：小风" onChange={(event) => change('name', event.target.value)} />
            <small>只会显示在你的个人空间中。</small>
          </div>
          <div className={`account-field ${touched.email && errors.email ? 'is-error' : ''}`}>
            <label htmlFor="register-email">邮箱地址</label>
            <input id="register-email" type="email" autoComplete="email" value={form.email} placeholder="name@example.com" aria-invalid={Boolean(touched.email && errors.email)} aria-describedby="register-email-help" onBlur={() => setTouched((value) => ({ ...value, email: true }))} onChange={(event) => change('email', event.target.value)} />
            <small id="register-email-help">{touched.email && errors.email ? errors.email : '用于登录和找回你的记录。'}</small>
          </div>
          <div className={`account-field ${touched.password && errors.password ? 'is-error' : ''}`}>
            <label htmlFor="register-password">账户密码</label>
            <input id="register-password" type="password" minLength={12} maxLength={128} autoComplete="new-password" value={form.password} aria-invalid={Boolean(touched.password && errors.password)} aria-describedby="register-password-help" onBlur={() => setTouched((value) => ({ ...value, password: true }))} onChange={(event) => change('password', event.target.value)} />
            <small id="register-password-help">{touched.password && errors.password ? errors.password : '至少 12 个字符；一句只有你知道的话也可以。'}</small>
          </div>
          <label className={`account-consent ${touched.consent && errors.consent ? 'is-error' : ''}`}>
            <input type="checkbox" checked={form.consent} onChange={(event) => change('consent', event.target.checked)} />
            <span>我已阅读并同意<Link to="/privacy">隐私与使用约定</Link>。</span>
          </label>
          {touched.consent && errors.consent ? <p className="account-error">{errors.consent}</p> : null}
          {error ? <p className="account-error" role="alert">{error}</p> : null}
          <button className="account-button account-button--primary" type="submit" disabled={invalid || submitting}>
            {submitting ? <><Loader2 className="account-spinner" />正在创建并迁移</> : <>创建账户并保存记录 <ArrowRight /></>}
          </button>
          <p className="account-inline-link">已经有账户？<Link to="/login">登录并迁移本机记录</Link></p>
        </form>
      </div>
    </main>
  );
}
