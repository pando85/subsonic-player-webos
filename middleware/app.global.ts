export default defineNuxtRouteMiddleware(async (to) => {
  const { setDefaultTheme } = useTheme();
  const { autoLogin, isAuthenticated } = useAuth();
  const { closeModal } = useModal();
  const { resetQueueState } = useQueue();
  const { getPlaylists, playlists } = usePlaylist();

  closeModal();
  resetQueueState();

  await callOnce(async () => {
    await autoLogin();
  });

  if (import.meta.client) {
    await callOnce(() => {
      setDefaultTheme();
    });
  }

  if (isAuthenticated.value && !playlists.value.length) {
    await getPlaylists();
  }

  if (to.name === ROUTE_NAMES.login && isAuthenticated.value) {
    return navigateTo({
      name: ROUTE_NAMES.index,
    });
  }

  if (to.name !== ROUTE_NAMES.login && !isAuthenticated.value) {
    // For webOS file:// protocol, don't include redirect query at all
    // The file system paths cause navigation issues
    const isWebOS = import.meta.client && window.location.protocol === 'file:';

    if (isWebOS) {
      return navigateTo({
        name: ROUTE_NAMES.login,
      });
    }

    // For normal HTTP(S), include redirect query
    return navigateTo({
      name: ROUTE_NAMES.login,
      query: {
        redirect: to.fullPath,
      },
    });
  }
});
