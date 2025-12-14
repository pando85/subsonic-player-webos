import { cookieMock } from '@/test/fixtures';

vi.mock('ofetch', () => ({
  $fetch: vi.fn(),
}));

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>();
  return {
    ...actual,
    getCookie: vi.fn(),
  };
});

const { $fetch } = await import('ofetch');
const $fetchMock = vi.mocked($fetch);

const { getCookie } = await import('h3');
const getCookieMock = vi.mocked(getCookie);

const artistApi = (await import('./artist')).default;

describe('artist-api', () => {
  beforeEach(() => {
    getCookieMock.mockReturnValue(cookieMock);
  });

  afterEach(() => {
    $fetchMock.mockReset();
    getCookieMock.mockReset();
  });

  describe('when getCookie returns undefined', () => {
    beforeEach(() => {
      getCookieMock.mockReturnValue(undefined);
    });

    it('returns the correct response', async () => {
      expect(await artistApi({} as never)).toEqual({
        data: null,
      });
    });
  });

  describe('when $fetch response for getArtistInfo2 or getArtist return null', () => {
    beforeEach(() => {
      $fetchMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    });

    it('returns the correct response', async () => {
      expect(await artistApi({} as never)).toEqual({
        data: null,
      });
    });
  });

  describe("when $fetch response for getArtistInfo2 or getArtist don't return a subsonic-response key", () => {
    beforeEach(() => {
      $fetchMock
        .mockResolvedValueOnce({
          'subsonic-response': {},
        })
        .mockResolvedValueOnce(null);
    });

    it('returns the correct response', async () => {
      expect(await artistApi({} as never)).toEqual({
        data: null,
      });
    });
  });

  describe('when $fetch response for getArtistInfo2 or getArtist status is not ok', () => {
    beforeEach(() => {
      $fetchMock
        .mockResolvedValueOnce({
          'subsonic-response': {
            status: 'failed',
          },
        })
        .mockResolvedValueOnce({
          'subsonic-response': {
            status: 'ok',
          },
        });
    });

    it('returns the correct response', async () => {
      expect(await artistApi({} as never)).toEqual({
        data: null,
      });
    });
  });

  describe('when $fetch response for getArtistInfo2 and getArtist returns a value', () => {
    beforeEach(() => {
      $fetchMock
        .mockResolvedValueOnce({
          'subsonic-response': {
            artistInfo2: {
              id: 'id',
              musicBrainzId: 'musicBrainzId',
            },
            status: 'ok',
          },
        })
        .mockResolvedValueOnce({
          'subsonic-response': {
            artist: {
              album: [],
              id: 'id',
              name: 'name',
            },
            status: 'ok',
          },
        })
        .mockResolvedValueOnce({
          'subsonic-response': {
            similarSongs2: {
              song: [],
            },
            status: 'ok',
          },
        })
        .mockResolvedValueOnce({
          'subsonic-response': {
            status: 'ok',
            topSongs: {
              song: [],
            },
          },
        });
    });

    it('returns the correct response', async () => {
      expect(await artistApi({} as never)).toEqual({
        data: expect.objectContaining({
          id: 'id',
          musicBrainzUrl: 'https://musicbrainz.org/artist/musicBrainzId',
          name: 'name',
        }),
      });
    });
  });
});
