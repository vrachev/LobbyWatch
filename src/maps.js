const STATIC_MAPS = [
  'achiran', 'africa', 'asia', 'australia', 'baikal', 'baikalnukewars',
  'betweentwoseas', 'blacksea', 'britannia', 'deglaciatedantarctica',
  'eastasia', 'europe', 'europeclassic', 'falklandislands', 'faroeislands',
  'fourislands', 'gatewaytotheatlantic', 'giantworldmap', 'gulfofstlawrence',
  'halkidiki', 'iceland', 'italia', 'japan', 'lemnos', 'lisbon',
  'manicouagan', 'mars', 'mena', 'montreal', 'newyorkcity', 'northamerica',
  'oceania', 'pangaea', 'pluto', 'southamerica', 'straitofgibraltar',
  'straitofhormuz', 'surrounded', 'svalmel', 'twolakes', 'world'
];

// tiny: < 750k, small: 750k-1.2M, medium: 1.2M-1.8M, large: > 1.8M (num_land_tiles)
const SIZE_THRESHOLDS = { tiny: 750000, small: 1200000, medium: 1800000 };
const MAP_SIZES = ['tiny', 'small', 'medium', 'large'];

const STATIC_MAP_SIZES = {
  'achiran': 'small',
  'africa': 'large',
  'asia': 'large',
  'australia': 'large',
  'baikal': 'small',
  'baikalnukewars': 'small',
  'betweentwoseas': 'small',
  'blacksea': 'medium',
  'britannia': 'medium',
  'deglaciatedantarctica': 'large',
  'eastasia': 'large',
  'europe': 'large',
  'europeclassic': 'large',
  'falklandislands': 'tiny',
  'faroeislands': 'tiny',
  'fourislands': 'small',
  'gatewaytotheatlantic': 'small',
  'giantworldmap': 'large',
  'gulfofstlawrence': 'small',
  'halkidiki': 'medium',
  'iceland': 'small',
  'italia': 'medium',
  'japan': 'medium',
  'lemnos': 'small',
  'lisbon': 'tiny',
  'manicouagan': 'tiny',
  'mars': 'large',
  'mena': 'large',
  'montreal': 'tiny',
  'newyorkcity': 'tiny',
  'northamerica': 'large',
  'oceania': 'large',
  'pangaea': 'large',
  'pluto': 'small',
  'southamerica': 'large',
  'straitofgibraltar': 'tiny',
  'straitofhormuz': 'small',
  'surrounded': 'small',
  'svalmel': 'small',
  'twolakes': 'tiny',
  'world': 'tiny'
};

const MAPS_CACHE_KEY = 'ofp_maps_cache';
const SIZES_CACHE_KEY = 'ofp_sizes_cache';
const MAPS_CACHE_TTL = 24 * 60 * 60 * 1000;
const GITHUB_MAPS_URL = 'https://api.github.com/repos/openfrontio/OpenFrontIO/contents/resources/maps';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/openfrontio/OpenFrontIO/main/resources/maps';

function isExtensionContextValid() {
  try {
    return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

async function fetchMapsFromGitHub() {
  const response = await fetch(GITHUB_MAPS_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();

  return data
    .filter(item => item.type === 'dir')
    .map(item => item.name)
    .sort();
}

async function loadMapsFromCache(storage) {
  const result = await storage.local.get(MAPS_CACHE_KEY);
  const cached = result[MAPS_CACHE_KEY];
  if (cached?.maps?.length > 0) {
    const age = Date.now() - cached.timestamp;
    if (age < MAPS_CACHE_TTL) {
      return cached.maps;
    }
  }
  return null;
}

async function saveMapsToCache(storage, maps) {
  if (!isExtensionContextValid()) return;
  await storage.local.set({
    [MAPS_CACHE_KEY]: { maps, timestamp: Date.now() }
  });
}

function classifySize(numLandTiles) {
  if (numLandTiles < SIZE_THRESHOLDS.tiny) return 'tiny';
  if (numLandTiles < SIZE_THRESHOLDS.small) return 'small';
  if (numLandTiles < SIZE_THRESHOLDS.medium) return 'medium';
  return 'large';
}

async function fetchMapManifest(mapName) {
  const url = `${GITHUB_RAW_BASE}/${mapName}/manifest.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchAllMapSizes(mapNames, onProgress) {
  const sizes = { ...STATIC_MAP_SIZES };
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  for (const mapName of mapNames) {
    try {
      const manifest = await fetchMapManifest(mapName);
      const tiles = manifest?.map?.num_land_tiles;
      if (tiles) {
        sizes[mapName] = classifySize(tiles);
        onProgress?.(mapName, sizes[mapName]);
      }
    } catch (e) {
      if (!sizes[mapName]) {
        sizes[mapName] = 'medium';
      }
    }
    await delay(100);
  }

  return sizes;
}

async function loadSizesFromCache(storage) {
  const result = await storage.local.get(SIZES_CACHE_KEY);
  const cached = result[SIZES_CACHE_KEY];
  if (cached?.sizes && Object.keys(cached.sizes).length > 0) {
    const age = Date.now() - cached.timestamp;
    if (age < MAPS_CACHE_TTL) {
      return cached.sizes;
    }
  }
  return null;
}

async function saveSizesToCache(storage, sizes) {
  if (!isExtensionContextValid()) return;
  await storage.local.set({
    [SIZES_CACHE_KEY]: { sizes, timestamp: Date.now() }
  });
}

globalThis.OFP_MAPS = {
  STATIC_MAPS,
  MAPS_CACHE_KEY,
  MAPS_CACHE_TTL,
  GITHUB_MAPS_URL,
  fetchMapsFromGitHub,
  loadMapsFromCache,
  saveMapsToCache,
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
};
