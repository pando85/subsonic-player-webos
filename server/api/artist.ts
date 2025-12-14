import type { UseFetchOptions } from '#app';

import { defineEventHandler, getCookie, getQuery } from 'h3';
import { $fetch } from 'ofetch';

import { getBaseOptions } from '@/composables/useApi/utils';
import { COOKIE_NAMES } from '@/composables/useAuth/constant';
import { PREVIEW_TRACK_COUNT } from '@/settings/constants';
import { formatArtist } from '@/utils/Formatters';

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event);

  async function fetchData<DataT = SubsonicResponse>(
    url: string,
    options: UseFetchOptions<SubsonicResponse, DataT>,
  ) {
    try {
      const authCookie = getCookie(event, COOKIE_NAMES.auth);

      if (!authCookie) {
        throw new Error(`No ${COOKIE_NAMES.auth} cookie found.`);
      }

      const { baseParams, baseURL } = getBaseOptions(authCookie);

      const response = (await $fetch(url, {
        baseURL,
        params: {
          ...baseParams,
          ...options.params,
        },
      })) as { 'subsonic-response': SubsonicResponse };

      const subsonicResponse = response['subsonic-response'];

      if (subsonicResponse?.status !== 'ok') {
        throw new Error('No response from server.');
      }

      if (subsonicResponse.status === 'ok') {
        return subsonicResponse;
      }
    } catch {
      return null;
    }
  }

  const artistInfoResponse = await fetchData('/getArtistInfo2', {
    params: {
      id,
    },
  });

  const artistResponse = await fetchData('/getArtist', {
    params: {
      id,
    },
  });

  if (!artistInfoResponse || !artistResponse) {
    return {
      data: null,
    };
  }

  const similarSongsResponse = await fetchData('/getSimilarSongs2', {
    params: {
      count: PREVIEW_TRACK_COUNT,
      id,
    },
  });

  const topSongsResponse = await fetchData('/getTopSongs', {
    params: {
      artist: artistResponse.artist.name,
      count: PREVIEW_TRACK_COUNT,
    },
  });

  const mergedArtists = {
    ...artistInfoResponse.artistInfo2,
    ...artistResponse.artist,
    similarSongs: similarSongsResponse?.similarSongs2?.song,
    topSongs: topSongsResponse?.topSongs?.song,
  };

  return {
    data: formatArtist(mergedArtists),
  };
});
