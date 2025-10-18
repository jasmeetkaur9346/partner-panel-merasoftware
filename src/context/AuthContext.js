import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useDispatch } from 'react-redux';
import SummaryApi, { MAIN_WEBSITE_URL } from '../common';
import CookieManager from '../utils/cookieManager';
import StorageService from '../utils/storageService';
import { setUserDetails, logout as logoutAction } from '../store/userSlice';

const AuthContext = createContext(null);

const normaliseUser = (rawUser) => {
  if (!rawUser) return null;

  const resolvedRole = (() => {
    if (typeof rawUser.role === 'string') {
      return rawUser.role.toLowerCase();
    }
    if (Array.isArray(rawUser.roles)) {
      const match = rawUser.roles.find((role) => role && role.toLowerCase() === 'partner');
      if (match) return match.toLowerCase();
      return rawUser.roles[0]?.toLowerCase() || '';
    }
    return '';
  })();

  return {
    _id: rawUser._id || rawUser.id || null,
    name: rawUser.name || '',
    email: rawUser.email || '',
    role: resolvedRole || 'partner',
    walletBalance: rawUser.walletBalance || 0,
    userDetails: rawUser.userDetails || null,
    bankAccounts: rawUser.bankAccounts || [],
  };
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || 'Request failed');
    error.response = data;
    throw error;
  }
  return data;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const dispatch = useDispatch();

  const resetSession = useCallback(() => {
    setUser(null);
    StorageService.clearAll();
    CookieManager.clearAll();
    dispatch(logoutAction());
  }, [dispatch]);

  const applySession = useCallback(
    (details) => {
      if (!details) {
        resetSession();
        return;
      }

      const normalised = normaliseUser(details);
      if (!normalised || normalised.role !== 'partner') {
        resetSession();
        return;
      }

      setUser(normalised);
      StorageService.setUserDetails(normalised);
      CookieManager.setUserDetails({
        id: normalised._id,
        name: normalised.name,
        email: normalised.email,
        role: normalised.role,
      });
      dispatch(setUserDetails(normalised));
    },
    [dispatch, resetSession],
  );

  useEffect(() => {
    let cancelled = false;

    const initialise = async () => {
      try {
        const cached = StorageService.getUserDetails();
        if (cached && !cancelled) {
          applySession(cached);
        }

        if (!SummaryApi.currentUser?.url) {
          return;
        }

        const data = await fetchJson(SummaryApi.currentUser.url, {
          method: (SummaryApi.currentUser.method || 'get').toUpperCase(),
          credentials: 'include',
        });

        const payload = data?.data?.user || data?.data || data?.user || null;
        const roles = [
          payload?.role,
          ...(Array.isArray(payload?.roles) ? payload.roles : []),
        ]
          .filter(Boolean)
          .map((role) => role.toLowerCase());

        if (!roles.includes('partner')) {
          applySession(null);
          return;
        }

        if (!cancelled) {
          applySession({ ...payload, role: 'partner' });
        }
      } catch (error) {
        console.warn('Failed to initialise partner session:', error?.message || error);
        applySession(null);
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    initialise();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      if (SummaryApi.logout?.url) {
        await fetchJson(SummaryApi.logout.url, {
          method: (SummaryApi.logout.method || 'get').toUpperCase(),
          credentials: 'include',
        });
      }
    } catch (error) {
      console.warn('Partner logout request failed:', error?.message || error);
    } finally {
      resetSession();
      if (MAIN_WEBSITE_URL) {
        window.location.href = MAIN_WEBSITE_URL;
      }
    }
  }, [resetSession]);

  const value = useMemo(
    () => ({
      user,
      initializing,
      logout,
      setSessionUser: applySession,
    }),
    [user, initializing, logout, applySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
