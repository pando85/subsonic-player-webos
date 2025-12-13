import MD5 from 'crypto-js/md5';

export function useAuth() {
  const { fetchData } = useAPI();
  const user = useUser();

  const loading = ref(false);
  const error = ref<null | string>(null);
  const isAuthenticated = useState(STATE_NAMES.userAuthenticated, () => false);

  // Initialize user from stored auth token
  // Always call loadSession to maintain consistent behavior (returns null values if no token)
  const storedToken = getAuthToken();
  user.value = loadSession(storedToken ?? '');

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

// Get auth token from storage (localStorage for webOS, cookie for web)
function getAuthToken(): null | string {
  if (isWebOS()) {
    return getAuthFromLocalStorage();
  }
  return useCookie(COOKIE_NAMES.auth).value ?? null;
}

// Set auth token in storage
function setAuthToken(value: null | string) {
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
