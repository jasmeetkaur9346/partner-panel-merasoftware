const COOKIE_DOMAIN = process.env.REACT_APP_COOKIE_DOMAIN || null;

const isSecureContext = () => {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:';
};

const DEFAULT_OPTIONS = {
  path: '/',
  sameSite: COOKIE_DOMAIN ? 'None' : 'Lax',
  secure: COOKIE_DOMAIN ? true : isSecureContext(),
};

const serialize = (value) => {
  try {
    return encodeURIComponent(JSON.stringify(value));
  } catch (error) {
    console.error('Failed to serialise cookie value:', error);
    return '';
  }
};

const parseValue = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch (_error) {
    return null;
  }
};

const setCookie = (name, value, options = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (COOKIE_DOMAIN && !opts.domain) {
    opts.domain = COOKIE_DOMAIN;
  }

  if (opts.sameSite === 'None') {
    opts.secure = true;
  }
  let cookie = `${name}=${serialize(value)}`;

  if (opts.path) cookie += `; path=${opts.path}`;
  if (opts.maxAge) cookie += `; max-age=${opts.maxAge}`;
  if (opts.expires) cookie += `; expires=${opts.expires.toUTCString()}`;
  if (opts.domain) cookie += `; domain=${opts.domain}`;
  if (opts.secure) cookie += '; Secure';
  if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;

  document.cookie = cookie;
};

const buildRemovalString = (name, options = {}) => {
  const parts = [
    `${name}=`,
    'Max-Age=0',
    `Expires=${new Date(0).toUTCString()}`,
    'path=/',
  ];
  if (options.domain) parts.push(`domain=${options.domain}`);
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
};

const removeCookie = (name) => {
  const secure = isSecureContext();
  const sameSite = COOKIE_DOMAIN ? 'None' : DEFAULT_OPTIONS.sameSite;
  if (COOKIE_DOMAIN) {
    document.cookie = buildRemovalString(name, { domain: COOKIE_DOMAIN, secure, sameSite });
  }
  document.cookie = buildRemovalString(name, { secure, sameSite });
};

const getCookie = (name) => {
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookie of cookies) {
    const [cookieName, ...rest] = cookie.split('=');
    if (cookieName === name) {
      return parseValue(rest.join('='));
    }
  }
  return null;
};

const CookieManager = {
  set(name, value, options) {
    setCookie(name, value, options);
  },

  get(name) {
    return getCookie(name);
  },

  remove(name) {
    removeCookie(name);
  },

  setUserDetails(user) {
    this.set('user-details', user, { maxAge: 7 * 24 * 60 * 60 });
  },

  clearAll() {
    this.remove('user-details');
  },
};

export default CookieManager;
