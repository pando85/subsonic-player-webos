import type { UseFetchOptions } from 'nuxt/app';

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
    console.error('[useApi] Error reading from localStorage:', e);
    return null;
  }
}

// Get auth token from storage (localStorage for webOS, cookie for web)
function getAuthToken(): string | null {
  if (isWebOS()) {
    return getAuthFromLocalStorage();
  }
  return useCookie(COOKIE_NAMES.auth).value ?? null;
}

export function useAPI() {
  const config = useRuntimeConfig();
  const { IMAGE_SIZE } = config.public;

  const { addErrorSnack } = useSnack();

  function getUrl(path: string, param: Record<string, number | string>) {
    const authToken = getAuthToken();
    const { baseParams, baseURL } = getBaseOptions(authToken || '');

    // If no baseURL is available, return empty string
    if (!baseURL) {
      console.warn('[useApi] Cannot generate URL without server URL');
      return '';
    }

    const url = new URL(`${baseURL}/${path}`);
    url.search = convertToQueryString({
      ...baseParams,
      ...param,
    });

    return url.toString();
  }

  function getImageUrl(image: string, size = IMAGE_SIZE) {
    return getUrl('getCoverArt', {
      id: image,
      size,
    });
  }

  function getStreamUrl(streamUrlId: string) {
    // If radio station.
    if (isUrl(streamUrlId)) {
      return streamUrlId;
    }

    return getUrl('stream', {
      id: streamUrlId,
    });
  }

  function getDownloadUrl(id: string) {
    return getUrl('download', {
      id,
    });
  }

  async function fetchData<DataT = SubsonicResponse>(
    url: string,
    options: UseFetchOptions<SubsonicResponse, DataT> = {},
  ) {
    try {
      const { $api } = useNuxtApp();
      const authToken = getAuthToken();

      const { baseParams, baseURL } = getBaseOptions(authToken || '');

      // If no baseURL is available and none was provided in options, we can't make the request
      const effectiveBaseURL = options.baseURL ?? baseURL;
      if (!effectiveBaseURL) {
        throw new Error('No server URL configured. Please log in again.');
      }

      const response = await $api(url, {
        ...options,
        baseURL: effectiveBaseURL,
        params: {
          ...baseParams,
          ...options.params,
        },
      } as never);

      if (!response) {
        throw new Error(DEFAULT_ERROR_MESSAGE);
      }

      let result = response as DataT;

      if (options.transform) {
        result = await options.transform(response as SubsonicResponse);
      }

      return {
        data: result,
        error: null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error : new Error(error as string);

      addErrorSnack(errorMessage.message);

      return {
        data: null,
        error: errorMessage,
      };
    }
  }

  return {
    fetchData,
    getDownloadUrl,
    getImageUrl,
    getStreamUrl,
  };
}
