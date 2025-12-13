import MD5 from 'crypto-js/md5';

// Storage key constant (hardcoded to avoid import issues on webOS)
const AUTH_STORAGE_KEY = 'subsonic_auth_params';

// Helper to check if we're on webOS (file:// protocol)
function isWebOS() {
  if (!import.meta.client) return false;
  try {
    return window.location.protocol === 'file:';
  } catch {
    return false;
  }
}

// Get auth token from localStorage (for webOS)
function getAuthFromLocalStorage(): string | null {
  if (!import.meta.client) return null;
  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error('[useAuth] Error reading from localStorage:', e);
    return null;
  }
}

// Set auth token in localStorage (for webOS)
function setAuthInLocalStorage(value: string | null) {
  if (!import.meta.client) return;
  try {
    if (value) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (e) {
    console.error('[useAuth] Error writing to localStorage:', e);
  }
}

// Get auth token from storage (localStorage for webOS, cookie for web)
function getAuthToken(): string | null {
  if (isWebOS()) {
    return getAuthFromLocalStorage();
  }
  return useCookie(COOKIE_NAMES.auth).value ?? null;
}

// Set auth token in storage
function setAuthToken(value: string | null) {
  if (isWebOS()) {
    setAuthInLocalStorage(value);
  } else {
    const cookie = useCookie(COOKIE_NAMES.auth, {
      expires: new Date(
        new Date().setDate(new Date().getDate() + DAYS_COOKIE_EXPIRES),
      ),
    });
    cookie.value = value;
  }
}

export function useAuth() {
  const { fetchData } = useAPI();
  const user = useUser();

  const loading = ref(false);
  const error = ref<null | string>(null);
  const isAuthenticated = useState(STATE_NAMES.userAuthenticated, () => false);

  // Initialize user from stored auth token (only on client side)
  if (import.meta.client) {
    const storedToken = getAuthToken();
    if (storedToken) {
      user.value = loadSession(storedToken);
    }
  }

  function logout() {
    clearNuxtData();
    setAuthToken(null);
    user.value = loadSession('');
    clearNuxtState(STATES_TO_CLEAR);
  }

  async function autoLogin() {
    if (!user.value?.server) {
      return;
    }

    const { data: loggedIn, error: loginError } = await fetchData('/ping');

    if (loginError?.message) {
      logout();
      return;
    }

    if (loggedIn) {
      isAuthenticated.value = true;
    }
  }

  async function login(auth: AuthData) {
    console.log('[useAuth] login called with:', {
      server: auth.server,
      username: auth.username,
    });
    loading.value = true;
    error.value = null;

    const { password, server, username } = auth;

    const saltValue = generateRandomString();
    const hashValue = MD5(`${password}${saltValue}`).toString();

    const params = {
      salt: saltValue,
      server,
      token: hashValue,
      username,
    };

    console.log('[useAuth] Attempting ping to:', server);
    const { data: loggedIn, error: loginError } = await fetchData(
      '/rest/ping',
      {
        baseURL: server,
        params: {
          s: params.salt,
          t: params.token,
          u: params.username,
        },
      },
    );
    console.log('[useAuth] Ping result:', {
      loggedIn,
      loginError: loginError?.message,
    });

    if (loginError?.message) {
      error.value = loginError.message;
      loading.value = false;
      isAuthenticated.value = false;

      return;
    }

    if (loggedIn) {
      const authToken = convertToQueryString(params);
      console.log('[useAuth] Login successful, storing token');
      setAuthToken(authToken);
      user.value = loadSession(authToken);
      isAuthenticated.value = true;
      console.log('[useAuth] isAuthenticated set to true');
    }

    loading.value = false;
  }

  return {
    autoLogin,
    error,
    isAuthenticated,
    loading,
    login,
    logout,
  };
}
