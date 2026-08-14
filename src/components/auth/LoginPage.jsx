import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import apiService from '../../services/api';
import { migrateGuestWins } from '../../features/account/migrateGuestWins.js';
import '../../features/account/components/AccountJourney.css';

// Prefer runtime config-provided client ID to avoid build-time mismatch.
// Falls back to Vite env only if present; otherwise null to block incorrect init.
const FALLBACK_GOOGLE_CLIENT_ID =
  (import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) || null;

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, localLogin, emailLogin } = useAuth();
  const { config } = useConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({});

  const googleClientId = useMemo(
    () => config.google_client_id || FALLBACK_GOOGLE_CLIENT_ID,
    [config.google_client_id],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const rootElement = document.getElementById('root');
    if (!rootElement) return undefined;

    const previousStyles = {
      background: rootElement.style.background,
      padding: rootElement.style.padding,
      margin: rootElement.style.margin,
      boxShadow: rootElement.style.boxShadow,
      border: rootElement.style.border,
      borderRadius: rootElement.style.borderRadius,
    };

    Object.assign(rootElement.style, {
      background: 'transparent',
      padding: '0',
      margin: '0',
      boxShadow: 'none',
      border: 'none',
      borderRadius: '0',
    });

    return () => {
      Object.assign(rootElement.style, previousStyles);
    };
  }, []);

  const handleGoogleResponse = useCallback(
    async (response) => {
      if (!response?.credential) {
        setMessage('没有收到 Google 登录信息，请重试。');
        return;
      }

      setIsLoading(true);
      setMessage('');

      try {
        const result = await login(response.credential);
        if (!result.success) {
          setMessage(result.error || '登录失败，请重试。');
        } else {
          const migration = await migrateGuestWins(apiService);
          if (migration.migrated > 0 && result.user?.id) localStorage.setItem(`little-wins:onboarded:user:${result.user.id}`, 'true');
          navigate('/dashboard?period=today', { replace: true });
        }
      } catch (error) {
        console.error('Login with Google failed.', error);
        setMessage('登录失败，请重试。');
      } finally {
        setIsLoading(false);
      }
    },
    [login, navigate],
  );



  useEffect(() => {
    if (!config.enable_google_oauth && !config.enable_email_auth && !config.local_login_enabled) {
      setMessage('服务尚未配置登录方式。请设置本地访问密码，或明确开启仅限可信网络的免密模式。');
    }
  }, [config.enable_email_auth, config.enable_google_oauth, config.local_login_enabled]);


  const initializeGoogle = useCallback(() => {
    if (typeof window === 'undefined' || !googleClientId) {
      return undefined;
    }

    const scriptSrc = 'https://accounts.google.com/gsi/client';

    const initialize = () => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
      });
    };

    if (window.google?.accounts?.id) {
      initialize();
      return undefined;
    }

    const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);

    if (existingScript) {
      existingScript.addEventListener('load', initialize);
      return () => existingScript.removeEventListener('load', initialize);
    }

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.defer = true;

    const handleLoad = () => {
      initialize();
    };

    const handleError = () => {
      setMessage('Google 登录服务加载失败，请检查网络。');
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, [googleClientId, handleGoogleResponse]);

  useEffect(() => {
    if (!config.enable_google_oauth) return undefined;
    if (!googleClientId) {
      setMessage('Google 登录已开启，但尚未配置客户端 ID。');
      return undefined;
    }

    return initializeGoogle();
  }, [config.enable_google_oauth, googleClientId, initializeGoogle]);

  const handleGoogleLogin = useCallback(() => {
    if (!config.enable_google_oauth) return;

    if (typeof window === 'undefined') {
      setMessage('Google 登录服务尚未加载，请刷新页面。');
      return;
    }

    if (!window.google?.accounts?.id) {
      setMessage('Google 登录服务尚未加载，请刷新页面。');
      return;
    }

    try {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          const tempDiv = document.createElement('div');
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          document.body.appendChild(tempDiv);

          window.google.accounts.id.renderButton(tempDiv, {
            theme: 'outline',
            size: 'large',
          });

          setTimeout(() => {
            const googleBtn = tempDiv.querySelector('div[role="button"]');
            if (googleBtn) {
              googleBtn.click();
            }
            document.body.removeChild(tempDiv);
          }, 100);
        }
      });
    } catch (error) {
      console.error('Google sign-in prompt failed.', error);
      setMessage('登录失败，请刷新页面后重试。');
    }
  }, [config.enable_google_oauth]);

  const handleSelfHostContinue = useCallback(async () => {
    setIsLoading(true);
    setMessage('');
    const result = await localLogin(localPassword);
    if (result.success) {
      const migration = await migrateGuestWins(apiService);
      if (migration.migrated > 0 && result.user?.id) localStorage.setItem(`little-wins:onboarded:user:${result.user.id}`, 'true');
      navigate('/dashboard?period=today', { replace: true });
    }
    else setMessage(result.error || '进入失败，请检查本地访问密码。');
    setIsLoading(false);
  }, [localLogin, localPassword, navigate]);

  const handleEmailContinue = useCallback(async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (!email.trim() || !password || isLoading) return;
    setIsLoading(true);
    setMessage('');
    const result = await emailLogin({ email: email.trim(), password });
    if (result.success) {
      const migration = await migrateGuestWins(apiService);
      if (migration.migrated > 0 && result.user?.id) localStorage.setItem(`little-wins:onboarded:user:${result.user.id}`, 'true');
      navigate('/dashboard?period=today', { replace: true });
    } else {
      setMessage(result.error || '邮箱或密码不正确，请检查后重试。');
    }
    setIsLoading(false);
  }, [email, emailLogin, isLoading, navigate, password]);

  return (
    <main className="account-journey account-journey--login">
      <header>
        <Link className="account-brand" to="/"><span><Sparkles size={17} /></span><strong>小小做到</strong><i>/</i><b>LOGIN</b></Link>
        <Link to="/start">先体验</Link>
      </header>
      <aside>
        <p className="account-kicker">欢迎回来</p>
        <h2>继续看见，那些你已经做到的事。</h2>
        <p>如果这台设备上还有未迁移的小胜利，登录后会自动把它们带回你的看板。</p>
        <small><Lock /> 密码只用于验证账户，不会以明文保存。</small>
      </aside>
      <div className="account-workspace">
        <form className="account-form" onSubmit={handleEmailContinue} noValidate>
          <p className="account-kicker">登录</p>
          <h1>打开你的微光板</h1>
          {config.enable_email_auth ? <>
            <div className={`account-field ${touched.email && !email.trim() ? 'is-error' : ''}`}>
              <label htmlFor="login-email">邮箱地址</label>
              <input id="login-email" type="email" autoComplete="email" value={email} aria-invalid={Boolean(touched.email && !email.trim())} onBlur={() => setTouched((value) => ({ ...value, email: true }))} onChange={(event) => setEmail(event.target.value)} />
              <small>{touched.email && !email.trim() ? '请填写注册时使用的邮箱地址。' : '使用创建账户时填写的邮箱。'}</small>
            </div>
            <div className={`account-field ${touched.password && !password ? 'is-error' : ''}`}>
              <label htmlFor="login-password">账户密码</label>
              <input id="login-password" type="password" autoComplete="current-password" value={password} aria-invalid={Boolean(touched.password && !password)} onBlur={() => setTouched((value) => ({ ...value, password: true }))} onChange={(event) => setPassword(event.target.value)} />
              <small>{touched.password && !password ? '请输入账户密码。' : '密码区分大小写。'}</small>
            </div>
            {message ? <p className="account-error" role="alert">{message}</p> : null}
            <button className="account-button account-button--primary" type="submit" disabled={!email.trim() || !password || isLoading}>
              {isLoading ? <><Loader2 className="account-spinner" />正在登录</> : <>登录并打开看板 <ArrowRight /></>}
            </button>
            <p className="account-inline-link">还没有账户？<Link to="/start">先记录一件小胜利</Link></p>
          </> : null}

          {config.enable_google_oauth ? <button type="button" className="account-button account-button--quiet account-login-alternative" onClick={handleGoogleLogin} disabled={isLoading}>{isLoading ? <Loader2 className="account-spinner" /> : <Sparkles />}使用 Google 登录</button> : null}

          {config.local_login_enabled ? <div className="account-local-login">
            {config.local_login_requires_password ? <div className="account-field"><label htmlFor="local-password">本地访问密码</label><input id="local-password" type="password" value={localPassword} onChange={(event) => setLocalPassword(event.target.value)} autoComplete="current-password" /><small>仅发送到你自己的服务。</small></div> : null}
            <button type="button" className="account-button account-button--quiet" onClick={handleSelfHostContinue} disabled={isLoading || (config.local_login_requires_password && !localPassword)}>进入自托管空间</button>
          </div> : null}
        </form>
      </div>
    </main>
  );
};

export default LoginPage;
