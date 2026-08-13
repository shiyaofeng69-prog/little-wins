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

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setToken(null);
    setUser(null);
    apiService.setAuthToken(null);
  }, []);

  const localLogin = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.localLogin();
      const { token: jwtToken, user: userData } = response;
      if (jwtToken) {
        localStorage.setItem(TOKEN_KEY, jwtToken);
        setToken(jwtToken);
        setUser(userData);
        apiService.setAuthToken(jwtToken);
      }
      return { success: true };
  } catch {
      return { success: false, error: 'Local login failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyToken = useCallback(async () => {
    try {
      const userData = await apiService.verifyToken(token);
      setUser(userData.user);
      apiService.setAuthToken(token);
  } catch {
      // If verify fails, clear token and in self-host mode immediately local-login
      logout();
      if (!config.enable_google_oauth) {
        await localLogin();
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [token, config.enable_google_oauth, logout, localLogin]);

  useEffect(() => {
    if (configLoading) return;
    if (token) {
      verifyToken();
    } else if (!config.enable_google_oauth) {
      // In self-host mode, auto-login to local account on first visit
      localLogin();
    } else {
      setLoading(false);
    }
  }, [token, configLoading, config.enable_google_oauth, verifyToken, localLogin]);

  const login = async (googleToken) => {
    try {
      setLoading(true);
      const response = await apiService.googleAuth(googleToken);
      const { token: jwtToken, user: userData } = response;
      localStorage.setItem(TOKEN_KEY, jwtToken);
      setToken(jwtToken);
      setUser(userData);
      apiService.setAuthToken(jwtToken);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
