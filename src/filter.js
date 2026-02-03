export function normalizeMapId(mapName) {
  if (!mapName) return '';
  return mapName.toLowerCase().replace(/[\s\-_]/g, '');
}

export function normalizeMode(apiMode) {
  if (!apiMode) return 'FFA';
  const lower = apiMode.toLowerCase();
  if (lower === 'ffa' || lower.includes('free')) return 'FFA';
  if (lower === 'team' || lower.includes('team')) return 'Team';
  return apiMode;
}

export function parseTeamCount(playerTeams, maxPlayers = 0) {
  if (typeof playerTeams === 'number') return playerTeams;
  if (typeof playerTeams === 'string') {
    const lower = playerTeams.toLowerCase();
    if (lower === 'duos') return Math.floor(maxPlayers / 2);
    if (lower === 'trios') return Math.floor(maxPlayers / 3);
    if (lower === 'quads') return Math.floor(maxPlayers / 4);
  }
  return 0;
}

export function matchesPreset(lobby, preset, mapSizes = {}) {
  const config = lobby.gameConfig || {};
  const mode = normalizeMode(config.gameMode);

  if (preset.mode !== 'Any' && preset.mode !== mode) return false;

  if (preset.humansVsNations === true && config.playerTeams !== 'Humans Vs Nations') return false;
  if (preset.humansVsNations === false && config.playerTeams === 'Humans Vs Nations') return false;

  const mapId = normalizeMapId(config.gameMap);
  if (preset.maps?.length > 0 && !preset.maps.some(m => normalizeMapId(m) === mapId)) return false;

  if (preset.sizes?.length > 0) {
    const mapSize = mapSizes[mapId];
    if (!mapSize || !preset.sizes.includes(mapSize)) return false;
  }

  if (preset.randomSpawn && preset.randomSpawn !== 'any') {
    const hasRandomSpawn = config.randomSpawn === true;
    if (preset.randomSpawn === 'required' && !hasRandomSpawn) return false;
    if (preset.randomSpawn === 'excluded' && hasRandomSpawn) return false;
  }

  if (preset.startingGold && preset.startingGold !== 'any') {
    const has5MillionGold = config.startingGold === 5000000;
    if (preset.startingGold === 'required' && !has5MillionGold) return false;
    if (preset.startingGold === 'excluded' && has5MillionGold) return false;
  }

  if (mode === 'Team') {
    const maxPlayers = config.maxPlayers || 0;
    const teamCount = parseTeamCount(config.playerTeams, maxPlayers);
    const playersPerTeam = teamCount > 0 ? Math.floor(maxPlayers / teamCount) : 0;

    if (preset.teamCountMin > 0 && teamCount < preset.teamCountMin) return false;
    if (preset.teamCountMax < Infinity && teamCount > preset.teamCountMax) return false;
    if (preset.playersPerTeamMin > 0 && playersPerTeam < preset.playersPerTeamMin) return false;
    if (preset.playersPerTeamMax < Infinity && playersPerTeam > preset.playersPerTeamMax) return false;
  }

  return true;
}

export function checkForMatch(lobby, presets, mapSizes = {}) {
  if (!lobby) return { matched: false, presets: [] };

  const activePresets = presets.filter(p => p.active);
  if (activePresets.length === 0) return { matched: false, presets: [] };

  const matchingPresets = activePresets.filter(p => matchesPreset(lobby, p, mapSizes));
  return {
    matched: matchingPresets.length > 0,
    presets: matchingPresets
  };
}

export function createDefaultPreset() {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: 'New Preset',
    active: false,
    mode: 'Any',
    maps: [],
    sizes: [],
    teamCountMin: 0,
    teamCountMax: Infinity,
    playersPerTeamMin: 0,
    playersPerTeamMax: Infinity,
    humansVsNations: null,
    randomSpawn: 'any',
    startingGold: 'any'
  };
}

export function normalizePreset(preset) {
  return {
    id: preset.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: preset.name || 'Unnamed Preset',
    active: preset.active ?? false,
    mode: preset.mode || 'Any',
    maps: Array.isArray(preset.maps) ? preset.maps : [],
    sizes: Array.isArray(preset.sizes) ? preset.sizes : [],
    teamCountMin: preset.teamCountMin ?? 0,
    teamCountMax: (preset.teamCountMax == null) ? Infinity : preset.teamCountMax,
    playersPerTeamMin: preset.playersPerTeamMin ?? 0,
    playersPerTeamMax: (preset.playersPerTeamMax == null) ? Infinity : preset.playersPerTeamMax,
    humansVsNations: Object.hasOwn(preset, 'humansVsNations') ? preset.humansVsNations : null,
    randomSpawn: preset.randomSpawn || 'any',
    startingGold: preset.startingGold || 'any'
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.OFP_FILTER = {
    normalizeMapId,
    normalizeMode,
    parseTeamCount,
    matchesPreset,
    checkForMatch,
    createDefaultPreset,
    normalizePreset
  };
}
