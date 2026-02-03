import { describe, it, expect, beforeEach, vi } from 'vitest';

// Load the maps module (sets globalThis.OFP_MAPS)
import '../src/maps.js';

// Destructure from globals
const {
  fetchMapsFromGitHub,
  loadMapsFromCache,
  saveMapsToCache,
  STATIC_MAPS,
  MAPS_CACHE_KEY,
  MAPS_CACHE_TTL,
  GITHUB_MAPS_URL,
  // Size-related exports
  MAP_SIZES,
  SIZE_THRESHOLDS,
  STATIC_MAP_SIZES,
  SIZES_CACHE_KEY,
  GITHUB_RAW_BASE,
  classifySize,
  fetchMapManifest,
  fetchAllMapSizes,
  loadSizesFromCache,
  saveSizesToCache
} = globalThis.OFP_MAPS;

describe('Map Fetching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchMapsFromGitHub', () => {
    it('fetches and parses map directories from GitHub API', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { name: 'europe', type: 'dir' },
          { name: 'africa', type: 'dir' },
          { name: 'README.md', type: 'file' }, // Should be filtered out
          { name: 'world', type: 'dir' }
        ])
      });

      const maps = await fetchMapsFromGitHub();

      expect(maps).toEqual(['africa', 'europe', 'world']); // Sorted, files filtered
      expect(fetch).toHaveBeenCalledWith(GITHUB_MAPS_URL);
    });

    it('returns empty array when no directories exist', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { name: 'README.md', type: 'file' }
        ])
      });

      const maps = await fetchMapsFromGitHub();
      expect(maps).toEqual([]);
    });

    it('throws on non-ok response', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403
      });

      await expect(fetchMapsFromGitHub()).rejects.toThrow('HTTP 403');
    });

    it('throws on rate limit (403)', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403
      });

      await expect(fetchMapsFromGitHub()).rejects.toThrow('HTTP 403');
    });

    it('throws on not found (404)', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(fetchMapsFromGitHub()).rejects.toThrow('HTTP 404');
    });

    it('throws on network error', async () => {
      globalThis.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchMapsFromGitHub()).rejects.toThrow('Network error');
    });
  });

  describe('loadMapsFromCache', () => {
    it('returns cached maps if valid', async () => {
      const mockStorage = {
        local: {
          get: vi.fn().mockResolvedValue({
            [MAPS_CACHE_KEY]: {
              maps: ['europe', 'africa'],
              timestamp: Date.now() - 1000 // 1 second ago
            }
          })
        }
      };

      const maps = await loadMapsFromCache(mockStorage);
      expect(maps).toEqual(['europe', 'africa']);
    });

    it('returns null if cache is expired', async () => {
      const mockStorage = {
        local: {
          get: vi.fn().mockResolvedValue({
            [MAPS_CACHE_KEY]: {
              maps: ['europe', 'africa'],
              timestamp: Date.now() - MAPS_CACHE_TTL - 1000 // Expired
            }
          })
        }
      };

      const maps = await loadMapsFromCache(mockStorage);
      expect(maps).toBeNull();
    });

    it('returns null if cache is empty', async () => {
      const mockStorage = {
        local: { get: vi.fn().mockResolvedValue({}) }
      };

      const maps = await loadMapsFromCache(mockStorage);
      expect(maps).toBeNull();
    });

    it('returns null if cached maps array is empty', async () => {
      const mockStorage = {
        local: {
          get: vi.fn().mockResolvedValue({
            [MAPS_CACHE_KEY]: {
              maps: [],
              timestamp: Date.now()
            }
          })
        }
      };

      const maps = await loadMapsFromCache(mockStorage);
      expect(maps).toBeNull();
    });

    it('returns null if cache has no maps property', async () => {
      const mockStorage = {
        local: {
          get: vi.fn().mockResolvedValue({
            [MAPS_CACHE_KEY]: {
              timestamp: Date.now()
            }
          })
        }
      };

      const maps = await loadMapsFromCache(mockStorage);
      expect(maps).toBeNull();
    });
  });

  describe('saveMapsToCache', () => {
    it('saves maps with timestamp', async () => {
      const mockStorage = {
        local: { set: vi.fn().mockResolvedValue(undefined) }
      };
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      await saveMapsToCache(mockStorage, ['europe', 'africa']);

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [MAPS_CACHE_KEY]: {
          maps: ['europe', 'africa'],
          timestamp: now
        }
      });
    });

    it('saves empty array if needed', async () => {
      const mockStorage = {
        local: { set: vi.fn().mockResolvedValue(undefined) }
      };
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      await saveMapsToCache(mockStorage, []);

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [MAPS_CACHE_KEY]: {
          maps: [],
          timestamp: now
        }
      });
    });
  });

  describe('STATIC_MAPS fallback', () => {
    it('contains expected maps', () => {
      expect(STATIC_MAPS).toContain('europe');
      expect(STATIC_MAPS).toContain('world');
      expect(STATIC_MAPS).toContain('africa');
      expect(STATIC_MAPS).toContain('asia');
      expect(STATIC_MAPS).toContain('northamerica');
    });

    it('contains 41 maps', () => {
      expect(STATIC_MAPS.length).toBe(41);
    });

    it('has all maps in lowercase', () => {
      for (const map of STATIC_MAPS) {
        expect(map).toBe(map.toLowerCase());
      }
    });

    it('has no duplicates', () => {
      const uniqueMaps = new Set(STATIC_MAPS);
      expect(uniqueMaps.size).toBe(STATIC_MAPS.length);
    });
  });

  describe('Constants', () => {
    it('MAPS_CACHE_TTL is 24 hours in milliseconds', () => {
      expect(MAPS_CACHE_TTL).toBe(24 * 60 * 60 * 1000);
    });

    it('GITHUB_MAPS_URL points to correct endpoint', () => {
      expect(GITHUB_MAPS_URL).toBe(
        'https://api.github.com/repos/openfrontio/OpenFrontIO/contents/resources/maps'
      );
    });
  });
});

describe('Size Classification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('classifySize', () => {
    it('classifies tiles below 750k as tiny', () => {
      expect(classifySize(0)).toBe('tiny');
      expect(classifySize(424994)).toBe('tiny'); // faroeislands
      expect(classifySize(651609)).toBe('tiny'); // world
      expect(classifySize(749999)).toBe('tiny');
    });

    it('classifies tiles at exactly 750k as small', () => {
      expect(classifySize(750000)).toBe('small');
    });

    it('classifies tiles 750k-1.2M as small', () => {
      expect(classifySize(767607)).toBe('small'); // surrounded
      expect(classifySize(874650)).toBe('small'); // lemnos
      expect(classifySize(1098655)).toBe('small'); // iceland
      expect(classifySize(1149943)).toBe('small'); // achiran
      expect(classifySize(1199999)).toBe('small');
    });

    it('classifies tiles at exactly 1.2M as medium', () => {
      expect(classifySize(1200000)).toBe('medium');
    });

    it('classifies tiles 1.2M-1.8M as medium', () => {
      expect(classifySize(1669657)).toBe('medium'); // britannia
      expect(classifySize(1729369)).toBe('medium'); // halkidiki
      expect(classifySize(1799999)).toBe('medium');
    });

    it('classifies tiles at exactly 1.8M as large', () => {
      expect(classifySize(1800000)).toBe('large');
    });

    it('classifies tiles above 1.8M as large', () => {
      expect(classifySize(1800001)).toBe('large');
      expect(classifySize(2183186)).toBe('large'); // africa
      expect(classifySize(2311229)).toBe('large'); // europe
      expect(classifySize(2333974)).toBe('large'); // giantworldmap
      expect(classifySize(10000000)).toBe('large');
    });
  });

  describe('fetchMapManifest', () => {
    it('fetches and parses manifest JSON', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          name: 'World',
          map: { num_land_tiles: 651609, width: 2000, height: 1000 }
        })
      });

      const manifest = await fetchMapManifest('world');

      expect(manifest.map.num_land_tiles).toBe(651609);
      expect(fetch).toHaveBeenCalledWith(`${GITHUB_RAW_BASE}/world/manifest.json`);
    });

    it('throws on fetch failure (404)', async () => {
      globalThis.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      await expect(fetchMapManifest('unknownmap')).rejects.toThrow('HTTP 404');
    });

    it('throws on network error', async () => {
      globalThis.fetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(fetchMapManifest('europe')).rejects.toThrow('Network error');
    });
  });

  describe('fetchAllMapSizes', () => {
    it('fetches sizes for all maps with progress callback', async () => {
      const maps = ['world', 'europe'];
      const progressCalls = [];

      globalThis.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ map: { num_land_tiles: 651609 } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ map: { num_land_tiles: 2311229 } })
        });

      const sizes = await fetchAllMapSizes(maps, (mapName, size) => {
        progressCalls.push({ mapName, size });
      });

      expect(sizes.world).toBe('tiny');
      expect(sizes.europe).toBe('large');
      expect(progressCalls).toHaveLength(2);
      expect(progressCalls[0]).toEqual({ mapName: 'world', size: 'tiny' });
      expect(progressCalls[1]).toEqual({ mapName: 'europe', size: 'large' });
    });

    it('falls back to static sizes on fetch failure', async () => {
      const maps = ['europe', 'unknownmap'];

      globalThis.fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const sizes = await fetchAllMapSizes(maps);

      // Falls back to STATIC_MAP_SIZES for europe
      expect(sizes.europe).toBe('large');
      // Unknown maps default to 'medium'
      expect(sizes.unknownmap).toBe('medium');
    });

    it('starts with static sizes as base', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ map: { num_land_tiles: 2000000 } })
      });

      const sizes = await fetchAllMapSizes(['europe']);

      // Should contain all static maps plus fetched data
      expect(Object.keys(sizes).length).toBeGreaterThanOrEqual(41);
    });
  });

  describe('loadSizesFromCache', () => {
    it('returns cached sizes if valid', async () => {
      const mockStorage = {
        local: {
          get: vi.fn().mockResolvedValue({
            [SIZES_CACHE_KEY]: {
              sizes: { europe: 'large', world: 'tiny' },
              timestamp: Date.now() - 1000
            }
          })
        }
      };

      const sizes = await loadSizesFromCache(mockStorage);
      expect(sizes).toEqual({ europe: 'large', world: 'tiny' });
    });

    it('returns null if cache is expired', async () => {
      const mockStorage = {
        local: {
          get: vi.fn().mockResolvedValue({
            [SIZES_CACHE_KEY]: {
              sizes: { europe: 'large' },
              timestamp: Date.now() - MAPS_CACHE_TTL - 1000
            }
          })
        }
      };

      const sizes = await loadSizesFromCache(mockStorage);
      expect(sizes).toBeNull();
    });

    it('returns null if cache is empty', async () => {
      const mockStorage = {
        local: { get: vi.fn().mockResolvedValue({}) }
      };

      const sizes = await loadSizesFromCache(mockStorage);
      expect(sizes).toBeNull();
    });

    it('returns null if cached sizes object is empty', async () => {
      const mockStorage = {
        local: {
          get: vi.fn().mockResolvedValue({
            [SIZES_CACHE_KEY]: {
              sizes: {},
              timestamp: Date.now()
            }
          })
        }
      };

      const sizes = await loadSizesFromCache(mockStorage);
      expect(sizes).toBeNull();
    });
  });

  describe('saveSizesToCache', () => {
    it('saves sizes with timestamp', async () => {
      const mockStorage = {
        local: { set: vi.fn().mockResolvedValue(undefined) }
      };
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      await saveSizesToCache(mockStorage, { europe: 'large', world: 'tiny' });

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [SIZES_CACHE_KEY]: {
          sizes: { europe: 'large', world: 'tiny' },
          timestamp: now
        }
      });
    });
  });

  describe('STATIC_MAP_SIZES fallback', () => {
    it('contains all STATIC_MAPS', () => {
      for (const map of STATIC_MAPS) {
        expect(STATIC_MAP_SIZES).toHaveProperty(map);
      }
    });

    it('only has valid size values', () => {
      for (const size of Object.values(STATIC_MAP_SIZES)) {
        expect(MAP_SIZES).toContain(size);
      }
    });

    it('contains known map sizes based on actual data', () => {
      expect(STATIC_MAP_SIZES.world).toBe('tiny'); // 651,609
      expect(STATIC_MAP_SIZES.faroeislands).toBe('tiny'); // 424,994
      expect(STATIC_MAP_SIZES.achiran).toBe('small'); // 1,149,943
      expect(STATIC_MAP_SIZES.britannia).toBe('medium'); // 1,669,657
      expect(STATIC_MAP_SIZES.europe).toBe('large'); // 2,311,229
      expect(STATIC_MAP_SIZES.africa).toBe('large'); // 2,183,186
    });
  });

  describe('Size Constants', () => {
    it('SIZE_THRESHOLDS defines correct boundaries', () => {
      expect(SIZE_THRESHOLDS.tiny).toBe(750000);
      expect(SIZE_THRESHOLDS.small).toBe(1200000);
      expect(SIZE_THRESHOLDS.medium).toBe(1800000);
    });

    it('MAP_SIZES contains all size categories', () => {
      expect(MAP_SIZES).toEqual(['tiny', 'small', 'medium', 'large']);
    });

    it('GITHUB_RAW_BASE points to correct endpoint', () => {
      expect(GITHUB_RAW_BASE).toBe(
        'https://raw.githubusercontent.com/openfrontio/OpenFrontIO/main/resources/maps'
      );
    });
  });
});
