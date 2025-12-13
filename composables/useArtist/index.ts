export function useArtist() {
  const { fetchData } = useAPI();

  async function getArtists() {
    const { data: artistsData } = await fetchData('/getArtists', {
      transform: /* istanbul ignore next -- @preserve */ (response) =>
        (response.artists.index || [])
          .flatMap((index) => index.artist!)
          .map(formatArtist),
    });

    return artistsData || [];
  }

  /* istanbul ignore next -- @preserve */
  async function getArtist(id: string) {
    // Fetch all artist data in parallel
    const [artistInfoResponse, artistResponse] = await Promise.all([
      fetchData('/getArtistInfo2', {
        params: { id },
      }),
      fetchData('/getArtist', {
        params: { id },
      }),
    ]);

    if (!artistInfoResponse.data || !artistResponse.data) {
      return { data: null };
    }

    // Fetch additional data based on the artist
    const [similarSongsResponse, topSongsResponse] = await Promise.all([
      fetchData('/getSimilarSongs2', {
        params: {
          count: PREVIEW_TRACK_COUNT,
          id,
        },
      }),
      fetchData('/getTopSongs', {
        params: {
          artist: artistResponse.data.artist.name,
          count: PREVIEW_TRACK_COUNT,
        },
      }),
    ]);

    // Merge all artist data
    const mergedArtists = {
      ...artistInfoResponse.data.artistInfo2,
      ...artistResponse.data.artist,
      similarSongs: similarSongsResponse.data?.similarSongs2?.song,
      topSongs: topSongsResponse.data?.topSongs?.song,
    };

    return {
      data: formatArtist(mergedArtists),
    };
  }

  return {
    getArtist,
    getArtists,
  };
}
