import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import { useConfig } from './ConfigContext';

const AuthContext = createContext();
const TOKEN_KEY = 'little_wins_token';
const LEGACY_TOKEN_KEY = 'nightlio_token';

const readStoredToken = () => {
  const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  if (token && !localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, token);
  return token;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { config, loading: configLoading } = useConfig();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(readStoredToken);

  const persistSession = useCallback((response) => {
    const { token: jwtToken, user: userData } = response || {};
    if (!jwtToken || !userData) throw new Error('登录响应不完整，请重试。');
    localStorage.setItem(TOKEN_KEY, jwtToken);
    setToken(jwtToken);
    setUser(userData);
    apiService.setAuthToken(jwtToken);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setToken(null);
    setUser(null);
    apiService.setAuthToken(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) await apiService.logout();
    } catch {
      // Local state must still be cleared when the token is already expired.
    } finally {
      clearSession();
    }
  }, [clearSession, token]);

  const localLogin = useCallback(async (password) => {
    try {
      setLoading(true);
      const response = await apiService.localLogin(password);
      persistSession(response);
      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message || '进入失败，请检查本地访问密码。' };
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const verifyToken = useCallback(async () => {
    try {
      const userData = await apiService.verifyToken(token);
      setUser(userData.user);
      apiService.setAuthToken(token);
    } catch {
      // If verify fails, clear token and in self-host mode immediately local-login
      clearSession();
      if (!config.enable_google_oauth && config.local_login_enabled && !config.local_login_requires_password) {
        await localLogin();
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [token, config.enable_google_oauth, config.local_login_enabled, config.local_login_requires_password, clearSession, localLogin]);

  useEffect(() => {
    if (configLoading) return;
    if (token) {
      verifyToken();
    } else if (!config.enable_google_oauth && config.local_login_enabled && !config.local_login_requires_password) {
      // In self-host mode, auto-login to local account on first visit
      localLogin();
    } else {
      setLoading(false);
    }
  }, [token, configLoading, config.enable_google_oauth, config.local_login_enabled, config.local_login_requires_password, verifyToken, localLogin]);

  const login = async (googleToken) => {
    try {
      setLoading(true);
      const response = await apiService.googleAuth(googleToken);
      persistSession(response);
      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const emailLogin = async (credentials) => {
    try {
      setLoading(true);
      const response = await apiService.loginWithEmail(credentials);
      persistSession(response);
      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message || '邮箱或密码不正确。' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (account) => {
    try {
      setLoading(true);
      const response = await apiService.registerWithEmail(account);
      persistSession(response);
      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message || '暂时无法创建账户。' };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    emailLogin,
    register,
    localLogin,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
