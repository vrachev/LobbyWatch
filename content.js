(function() {
  'use strict';

  let pollingInterval = null;
  let urlCheckInterval = null;
  let isMonitoring = false;
  let uiCreated = false;
  let currentLobby = null;
  let lastError = null;
  let presets = [];
  let editingPreset = null;
  let lastMatchedGameId = null;
  let notifiedGameIds = new Map();
  let shadowRoot = null;
  let autoJoinEnabled = false;

  const POLL_INTERVAL = 2000;
  const NOTIFICATION_TIMEOUT_MS = 60000;
  const MAX_Z_INDEX = 2147483647;
  const API_ENDPOINT = '/api/public_lobbies';
  const STORAGE_KEY = 'ofp_presets';

  function normalizeMapId(mapName) {
    if (!mapName) return '';
    return mapName.toLowerCase().replace(/[\s\-_]/g, '');
  }

  function normalizeMode(apiMode) {
    if (!apiMode) return 'FFA';
    const lower = apiMode.toLowerCase();
    if (lower === 'ffa' || lower.includes('free')) return 'FFA';
    if (lower === 'team' || lower.includes('team')) return 'Team';
    return apiMode;
  }

  function parseTeamCount(playerTeams, maxPlayers = 0) {
    if (typeof playerTeams === 'number') return playerTeams;
    if (typeof playerTeams === 'string') {
      const lower = playerTeams.toLowerCase();
      if (lower === 'duos') return Math.floor(maxPlayers / 2);
      if (lower === 'trios') return Math.floor(maxPlayers / 3);
      if (lower === 'quads') return Math.floor(maxPlayers / 4);
    }
    return 0;
  }

  function matchesPreset(lobby, preset, mapSizesArg = {}) {
    const config = lobby.gameConfig || {};
    const mode = normalizeMode(config.gameMode);

    if (preset.mode !== 'Any' && preset.mode !== mode) return false;

    if (preset.humansVsNations === true && config.playerTeams !== 'Humans Vs Nations') return false;
    if (preset.humansVsNations === false && config.playerTeams === 'Humans Vs Nations') return false;

    const mapId = normalizeMapId(config.gameMap);
    if (preset.maps?.length > 0 && !preset.maps.some(m => normalizeMapId(m) === mapId)) return false;

    if (preset.sizes?.length > 0) {
      const mapSize = mapSizesArg[mapId];
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
      const mp = config.maxPlayers || 0;
      const teamCount = parseTeamCount(config.playerTeams, mp);
      const playersPerTeam = teamCount > 0 ? Math.floor(mp / teamCount) : 0;

      if (preset.teamCountMin > 0 && teamCount < preset.teamCountMin) return false;
      if (preset.teamCountMax < Infinity && teamCount > preset.teamCountMax) return false;
      if (preset.playersPerTeamMin > 0 && playersPerTeam < preset.playersPerTeamMin) return false;
      if (preset.playersPerTeamMax < Infinity && playersPerTeam > preset.playersPerTeamMax) return false;
    }

    return true;
  }

  function checkForMatch(lobby, presetsArg, mapSizesArg = {}) {
    if (!lobby) return { matched: false, presets: [] };

    const activePresets = presetsArg.filter(p => p.active);
    if (activePresets.length === 0) return { matched: false, presets: [] };

    const matchingPresets = activePresets.filter(p => matchesPreset(lobby, p, mapSizesArg));
    return {
      matched: matchingPresets.length > 0,
      presets: matchingPresets
    };
  }

  function createDefaultPreset() {
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

  function normalizePreset(preset) {
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

  function isBetaFlagEnabled(flag) {
    const flags = (localStorage.getItem('ofp_beta_flags') || '').split(',');
    return flags.includes(flag);
  }

  const { STATIC_MAPS, STATIC_MAP_SIZES } = window.OFP_MAPS;
  let maps = [...STATIC_MAPS];
  let mapSizes = { ...STATIC_MAP_SIZES };
  let sizeFetchInProgress = false;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUTO_JOIN') {
      handleAutoJoin(message.gameID);
      sendResponse({ success: true });
    }
    return false;
  });

  function handleAutoJoin(gameID) {
    const lobbyCard = findLobbyCard();
    if (lobbyCard) {
      lobbyCard.click();
      showAutoJoinToast();
    } else {
      window.location.hash = `#join=${gameID}`;
    }
  }

  async function fetchMapsFromGitHub() {
    try {
      const freshMaps = await window.OFP_MAPS.fetchMapsFromGitHub();
      if (freshMaps.length > 0) {
        await window.OFP_MAPS.saveMapsToCache(chrome.storage, freshMaps);
        return freshMaps;
      }
    } catch (error) {
      console.error('[OFP] Failed to fetch maps from GitHub:', error);
    }
    return null;
  }

  async function loadMapsFromCache() {
    try {
      return await window.OFP_MAPS.loadMapsFromCache(chrome.storage);
    } catch (e) {
      console.error('[OFP] Failed to load maps from cache:', e);
    }
    return null;
  }

  async function loadSizesFromCache() {
    try {
      return await window.OFP_MAPS.loadSizesFromCache(chrome.storage);
    } catch (e) {
      console.error('[OFP] Failed to load sizes from cache:', e);
    }
    return null;
  }

  async function fetchAllMapSizes() {
    if (sizeFetchInProgress) return;
    sizeFetchInProgress = true;

    try {
      const sizes = await window.OFP_MAPS.fetchAllMapSizes(maps, (mapName, size) => {
        mapSizes[mapName] = size;
      });
      mapSizes = sizes;
      await window.OFP_MAPS.saveSizesToCache(chrome.storage, sizes);
    } catch (e) {
      console.error('[OFP] Failed to fetch map sizes:', e);
    } finally {
      sizeFetchInProgress = false;
    }
  }

  async function initializeMaps() {
    const cachedMaps = await loadMapsFromCache();
    if (cachedMaps) maps = cachedMaps;

    const cachedSizes = await loadSizesFromCache();
    if (cachedSizes) mapSizes = cachedSizes;

    fetchMapsFromGitHub().then(freshMaps => {
      if (freshMaps) {
        maps = freshMaps;
        fetchAllMapSizes();
      }
    });
  }

  const PANEL_CSS = `
    :host {
      all: initial;
    }

    * {
      box-sizing: border-box;
    }

    .hidden { display: none !important; }

    #ofp-panel {
      position: fixed;
      width: 240px;
      background: rgba(17, 24, 39, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      overflow-y: auto;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      font-size: 14px;
      color: #f3f4f6;
      line-height: 1.4;
      backdrop-filter: blur(8px);
      transition: background 0.3s ease, border-color 0.3s ease;
    }


    .ofp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: rgba(0, 0, 0, 0.15);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px 12px 0 0;
    }

    .ofp-header-title {
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f3f4f6;
    }

    .ofp-header-title svg {
      width: 16px;
      height: 16px;
      fill: #3b82f6;
    }

    .ofp-monitor-btn {
      padding: 4px 12px;
      border: none;
      border-radius: 6px;
      background: #3b82f6;
      color: white;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
      font-family: inherit;
    }

    .ofp-monitor-btn:hover {
      background: #2563eb;
    }

    .ofp-monitor-btn.active {
      background: #ef4444;
    }

    .ofp-monitor-btn.active:hover {
      background: #dc2626;
    }

    .ofp-autojoin-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-size: 11px;
      margin-left: auto;
    }

    .ofp-autojoin-toggle input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .ofp-toggle-label {
      color: #6b7280;
      transition: color 0.2s;
    }

    .ofp-autojoin-toggle input:not(:checked) ~ .ofp-toggle-notify {
      color: #10b981;
    }

    .ofp-autojoin-toggle input:checked ~ .ofp-toggle-autojoin {
      color: #10b981;
    }

    .ofp-toggle-slider {
      position: relative;
      width: 28px;
      height: 16px;
      background: #4b5563;
      border-radius: 8px;
      transition: background 0.2s;
    }

    .ofp-toggle-slider::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 12px;
      height: 12px;
      background: #f3f4f6;
      border-radius: 50%;
      transition: transform 0.2s;
    }

    .ofp-autojoin-toggle input:checked ~ .ofp-toggle-slider {
      background: #059669;
    }

    .ofp-autojoin-toggle input:checked ~ .ofp-toggle-slider::before {
      transform: translateX(12px);
    }

    .ofp-autojoin-toggle:hover .ofp-toggle-slider {
      background: #6b7280;
    }

    .ofp-autojoin-toggle input:checked:hover ~ .ofp-toggle-slider {
      background: #10b981;
    }

    .ofp-section-label {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #9ca3af;
      margin-bottom: 8px;
    }

    .ofp-section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .ofp-section-header .ofp-section-label {
      margin-bottom: 0;
      flex: 1;
    }

    .ofp-current-game {
      padding: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .ofp-game-info {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      padding: 12px;
      transition: background 0.3s ease, box-shadow 0.3s ease;
    }

    .ofp-game-info.monitoring {
      background: rgba(13, 102, 170, .5)
    }

    .ofp-game-map {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 4px;
      color: #f3f4f6;
    }

    .ofp-game-details {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .ofp-game-mode {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .ofp-game-mode.ffa {
      background: #059669;
      color: white;
    }

    .ofp-game-mode.team {
      background: #7c3aed;
      color: white;
    }

    .ofp-game-players {
      font-size: 12px;
      color: #9ca3af;
    }

    .ofp-game-countdown {
      font-size: 12px;
      color: #dbeafe;
      font-weight: 500;
    }

    .ofp-game-teams {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 4px;
    }

    .ofp-no-lobby {
      padding: 12px;
      text-align: center;
      color: #9ca3af;
      font-size: 13px;
    }

    .ofp-welcome {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }

    .ofp-welcome-text {
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.5;
    }

    .ofp-welcome-text strong {
      color: #3b82f6;
    }

    .ofp-presets-section {
      padding: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    .ofp-add-preset-btn {
      width: 22px;
      height: 22px;
      border: none;
      background: #3b82f6;
      color: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease;
      line-height: 1;
    }

    .ofp-add-preset-btn:hover {
      background: #2563eb;
    }

    .ofp-delete-all-btn {
      background: #6b7280;
    }

    .ofp-delete-all-btn:hover {
      background: #ef4444;
    }

    .ofp-preset-list {
      flex: 1;
      min-height: 60px;
      overflow-y: auto;
      margin-bottom: 8px;
    }

    .ofp-no-presets {
      color: #9ca3af;
      font-size: 12px;
      text-align: center;
      padding: 12px;
    }

    .ofp-preset-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 0 6px 8px;
      border-radius: 6px;
      transition: background 0.15s ease;
    }

    .ofp-preset-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .ofp-preset-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      flex: 1;
    }

    .ofp-preset-toggle input[type="checkbox"] {
      width: 14px;
      height: 14px;
      accent-color: #3b82f6;
      cursor: pointer;
    }

    .ofp-preset-name {
      font-size: 12px;
      color: #f3f4f6;
    }

    .ofp-preset-edit {
      width: 24px;
      height: 24px;
      border: none;
      background: rgba(59, 130, 246, 0.3);
      color: #9ca3af;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .ofp-preset-edit:hover {
      background: rgba(59, 130, 246, 0.5);
      color: #f3f4f6;
    }

    .ofp-preset-delete {
      width: 24px;
      height: 24px;
      border: none;
      background: rgba(107, 114, 128, 0.3);
      color: #9ca3af;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .ofp-preset-delete:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .ofp-match-status {
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 6px;
      font-size: 12px;
    }

    .ofp-match-none, .ofp-match-no {
      color: #9ca3af;
    }

    .ofp-match-yes {
      color: #059669;
      font-weight: 500;
    }

    .ofp-status {
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      border-radius: 0 0 12px 12px;
    }

    .ofp-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #059669;
      animation: pulse 2s infinite;
    }

    .ofp-status-dot.inactive {
      background: #6b7280;
      animation: none;
    }

    .ofp-status-dot.error {
      background: #ef4444;
      animation: none;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .ofp-status-text {
      color: #9ca3af;
    }

    .ofp-status .ofp-size-badge {
      margin-left: auto;
      font-size: 10px;
      padding: 2px 6px;
    }

    .ofp-beta-warning {
      padding: 6px 10px;
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      font-size: 11px;
      text-align: center;
      border-top: 1px solid rgba(245, 158, 11, 0.2);
    }

    .ofp-error {
      padding: 10px 12px;
      background: rgba(239, 68, 68, 0.1);
      color: #fca5a5;
      font-size: 12px;
      border-top: 1px solid rgba(239, 68, 68, 0.2);
    }

    .ofp-autojoin-toast {
      padding: 10px 12px;
      background: rgba(5, 150, 105, 0.15);
      color: #6ee7b7;
      font-size: 12px;
      font-weight: 500;
      text-align: center;
      border-top: 1px solid rgba(5, 150, 105, 0.2);
      animation: ofp-fade-in 0.2s ease;
    }

    @keyframes ofp-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Modal */
    .ofp-modal {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ofp-modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
    }

    .ofp-modal-content {
      position: relative;
      width: 390px;
      max-height: 80vh;
      background: rgba(17, 24, 39, 0.95);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 16px 64px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      color: #f3f4f6;
      backdrop-filter: blur(8px);
    }

    .ofp-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      font-weight: 600;
      font-size: 15px;
    }

    .ofp-close-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: #9ca3af;
      cursor: pointer;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.15s ease;
    }

    .ofp-close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #f3f4f6;
    }

    .ofp-modal-body {
      padding: 14px;
      overflow-y: auto;
      flex: 1;
    }

    .ofp-modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      gap: 12px;
    }

    .ofp-modal-actions {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }

    .ofp-form-group {
      margin-bottom: 14px;
    }

    .ofp-form-group:last-child {
      margin-bottom: 0;
    }

    .ofp-form-group > label {
      display: block;
      font-size: 11px;
      font-weight: 500;
      color: #9ca3af;
      margin-bottom: 6px;
    }

    .ofp-form-group input[type="text"] {
      width: 100%;
      padding: 8px 10px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #f3f4f6;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s ease;
      box-sizing: border-box;
    }

    .ofp-form-group input[type="text"]:focus {
      border-color: #3b82f6;
    }

    .ofp-form-group input[type="text"]::placeholder {
      color: #6b7280;
    }

    .ofp-radio-group {
      display: flex;
      gap: 14px;
    }

    .ofp-radio-group label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-size: 13px;
      color: #f3f4f6;
    }

    .ofp-radio-group input[type="radio"] {
      accent-color: #3b82f6;
      cursor: pointer;
    }

    .ofp-map-count {
      font-weight: 400;
      color: #3b82f6;
    }

    .ofp-map-list {
      max-height: 160px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 6px;
      padding: 6px;
      margin-top: 6px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2px;
    }

    .ofp-map-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      transition: background 0.15s ease;
      color: #f3f4f6;
    }

    .ofp-map-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .ofp-map-item.selected {
      background: rgba(37, 99, 235, 0.2);
    }

    .ofp-map-item input[type="checkbox"] {
      width: 12px;
      height: 12px;
      accent-color: #3b82f6;
      cursor: pointer;
    }

    .ofp-map-item span:first-of-type {
      flex: 1;
    }

    .ofp-size-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .ofp-size-badge.ofp-size-tiny { background: #7c3aed; color: white; }
    .ofp-size-badge.ofp-size-small { background: #059669; color: white; }
    .ofp-size-badge.ofp-size-medium { background: #f59e0b; color: white; }
    .ofp-size-badge.ofp-size-large { background: #ef4444; color: white; }

    .ofp-size-filter {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .ofp-size-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 16px;
      cursor: pointer;
      font-size: 11px;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }

    .ofp-size-chip:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .ofp-size-chip.selected {
      background: rgba(37, 99, 235, 0.3);
      border-color: #3b82f6;
    }

    .ofp-size-chip input[type="checkbox"] {
      display: none;
    }

    .ofp-slider-group {
      margin-bottom: 10px;
    }

    .ofp-slider-group:last-child {
      margin-bottom: 0;
    }

    .ofp-slider-label {
      display: block;
      font-size: 12px;
      margin-bottom: 6px;
      color: #f3f4f6;
    }

    .ofp-slider-label span {
      color: #3b82f6;
      font-weight: 500;
    }

    .ofp-dual-slider {
      display: flex;
      gap: 8px;
    }

    .ofp-dual-slider input[type="range"] {
      flex: 1;
      height: 6px;
      appearance: none;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      cursor: pointer;
    }

    .ofp-dual-slider input[type="range"]::-webkit-slider-thumb {
      appearance: none;
      width: 14px;
      height: 14px;
      background: #2563eb;
      border-radius: 50%;
      cursor: pointer;
    }

    .ofp-btn {
      padding: 7px 14px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }

    .ofp-btn-primary {
      background: #3b82f6;
      color: white;
    }

    .ofp-btn-primary:hover {
      background: #2563eb;
    }

    .ofp-btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #f3f4f6;
    }

    .ofp-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .ofp-btn-danger {
      background: #ef4444;
      color: white;
    }

    .ofp-btn-danger:hover {
      background: #dc2626;
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  `;


  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  function findSiteButtons() {
    const statsBtn = document.querySelector('button[title="Stats"]');
    const settingsBtn = document.querySelector('button[title="Settings"]');
    return { statsBtn, settingsBtn };
  }

  function positionPanel() {
    if (!shadowRoot) return;
    const panel = shadowRoot.getElementById('ofp-panel');
    if (!panel) return;

    const { statsBtn, settingsBtn } = findSiteButtons();

    if (statsBtn && settingsBtn) {
      const statsRect = statsBtn.getBoundingClientRect();
      const settingsRect = settingsBtn.getBoundingClientRect();

      const gap = 12;
      const header = document.querySelector('header');
      const headerBottom = header ? header.getBoundingClientRect().bottom : 170;
      const top = Math.round(headerBottom) + gap;
      const maxBottom = settingsRect.top - gap;
      const height = maxBottom - top;

      panel.style.top = `${top}px`;
      panel.style.bottom = 'auto';
      panel.style.height = `${height}px`;
      panel.style.right = '16px';
    } else {
      // Fallback positioning if buttons not found
      panel.style.top = '140px';
      panel.style.bottom = '110px';
      panel.style.right = '16px';
    }
  }

  function setupPositionObserver() {
    window.addEventListener('resize', debounce(positionPanel, 100));
    setTimeout(positionPanel, 500);
    setTimeout(positionPanel, 1500);
  }


  function formatMapName(mapId) {
    if (!mapId) return 'Unknown';
    return mapId
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  function formatCountdown(ms) {
    if (ms <= 0) return 'Starting...';
    const seconds = Math.ceil(ms / 1000);
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    }
    return `${seconds}s`;
  }

  function fuzzyMatch(query, text) {
    query = query.toLowerCase();
    text = text.toLowerCase();
    if (text.includes(query)) return true;
    let qi = 0;
    for (let i = 0; i < text.length && qi < query.length; i++) {
      if (text[i] === query[qi]) qi++;
    }
    return qi === query.length;
  }


  function getDefaultPresets() {
    return [
      {
        id: 'default-2t',
        name: 'Team 2T',
        active: false,
        mode: 'Team',
        maps: [],
        sizes: [],
        teamCountMin: 2,
        teamCountMax: 2,
        playersPerTeamMin: 0,
        playersPerTeamMax: Infinity,
        randomSpawn: 'any'
      },
      {
        id: 'default-2-6t-large',
        name: 'Team 2-6T Large',
        active: false,
        mode: 'Team',
        maps: [],
        sizes: ['large'],
        teamCountMin: 2,
        teamCountMax: 6,
        playersPerTeamMin: 0,
        playersPerTeamMax: Infinity,
        randomSpawn: 'any'
      },
      {
        id: 'default-team-any',
        name: 'Team',
        active: false,
        mode: 'Team',
        maps: [],
        sizes: [],
        teamCountMin: 0,
        teamCountMax: Infinity,
        playersPerTeamMin: 0,
        playersPerTeamMax: Infinity,
        randomSpawn: 'any'
      }
    ];
  }

  async function loadPresets() {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      const rawPresets = result[STORAGE_KEY] || [];

      // Normalize presets to ensure all fields have valid defaults
      // This handles old presets and Infinity→null serialization issues
      presets = rawPresets.map(normalizePreset);

      if (presets.length === 0) {
        presets = getDefaultPresets();
        await savePresets();
      }
    } catch (e) {
      console.error('[OFP] Failed to load presets:', e);
      presets = [];
    }
  }

  async function savePresets() {
    try {
      await chrome.storage.sync.set({ [STORAGE_KEY]: presets });

      if (isMonitoring) {
        chrome.runtime.sendMessage({ type: 'UPDATE_PRESETS', presets: presets })
          .catch(err => console.error('[OFP] Failed to sync presets to background:', err));
      }
    } catch (e) {
      console.error('[OFP] Failed to save presets:', e);
    }
  }

  function generatePresetName(preset) {
    const parts = [];

    if (preset.mode && preset.mode !== 'Any') {
      parts.push(preset.mode);
    }

    if (preset.humansVsNations === true) {
      parts.push('HvN');
    } else if (preset.humansVsNations === false) {
      parts.push('No HvN');
    }

    if (preset.mode === 'Team') {
      const tcMin = preset.teamCountMin || 0;
      const tcMax = preset.teamCountMax === Infinity ? 0 : preset.teamCountMax;
      if (tcMin > 0 || tcMax > 0) {
        if (tcMin === tcMax && tcMin > 0) {
          parts.push(`${tcMin}T`);
        } else if (tcMin > 0 && tcMax > 0) {
          parts.push(`${tcMin}-${tcMax}T`);
        } else if (tcMin > 0) {
          parts.push(`${tcMin}+T`);
        } else if (tcMax > 0) {
          parts.push(`≤${tcMax}T`);
        }
      }

      const pptMin = preset.playersPerTeamMin || 0;
      const pptMax = preset.playersPerTeamMax === Infinity ? 0 : preset.playersPerTeamMax;
      if (pptMin > 0 || pptMax > 0) {
        if (pptMin === pptMax && pptMin > 0) {
          parts.push(`${pptMin}v${pptMin}`);
        } else if (pptMin > 0 && pptMax > 0) {
          parts.push(`${pptMin}-${pptMax}per`);
        } else if (pptMin > 0) {
          parts.push(`${pptMin}+per`);
        } else if (pptMax > 0) {
          parts.push(`≤${pptMax}per`);
        }
      }
    }

    if (preset.randomSpawn === 'required') {
      parts.push('Random Spawn');
    } else if (preset.randomSpawn === 'excluded') {
      parts.push('No Random Spawn');
    }

    if (preset.startingGold === 'required') {
      parts.push('5M Gold');
    } else if (preset.startingGold === 'excluded') {
      parts.push('Normal Gold');
    }

    if (preset.sizes && preset.sizes.length > 0 && preset.sizes.length < 4) {
      const sizeNames = preset.sizes.map(s => s.charAt(0).toUpperCase() + s.slice(1));
      parts.push(sizeNames.join('/'));
    }

    if (preset.maps && preset.maps.length > 0) {
      if (preset.maps.length === maps.length) {
        parts.push('All Maps');
      } else if (preset.maps.length <= 2) {
        parts.push(preset.maps.map(m => formatMapName(m)).join(', '));
      } else {
        const mapNames = preset.maps.slice(0, 2).map(m => formatMapName(m));
        mapNames.push(`+${preset.maps.length - 2}`);
        parts.push(mapNames.join(', '));
      }
    }

    if (parts.length === 0) {
      return 'Any Game';
    }

    return parts.join(' ');
  }

  function updatePresetName() {
    if (!shadowRoot || !editingPreset) return;

    const mode = shadowRoot.querySelector('[name="ofp-mode"]:checked')?.value || 'Any';
    const hvn = shadowRoot.querySelector('[name="ofp-hvn"]:checked')?.value || 'any';
    const randomSpawn = shadowRoot.querySelector('[name="ofp-random-spawn"]:checked')?.value || 'any';
    const startingGold = shadowRoot.querySelector('[name="ofp-starting-gold"]:checked')?.value || 'any';
    const teamMin = parseInt(shadowRoot.getElementById('ofp-team-min')?.value) || 0;
    const teamMax = parseInt(shadowRoot.getElementById('ofp-team-max')?.value) || 20;
    const pptMin = parseInt(shadowRoot.getElementById('ofp-ppt-min')?.value) || 0;
    const pptMax = parseInt(shadowRoot.getElementById('ofp-ppt-max')?.value) || 100;

    const tempPreset = {
      mode,
      humansVsNations: hvn === 'yes' ? true : hvn === 'no' ? false : null,
      maps: editingPreset.maps || [],
      sizes: editingPreset.sizes || [],
      teamCountMin: teamMin,
      teamCountMax: teamMax >= 20 ? Infinity : teamMax,
      playersPerTeamMin: pptMin,
      playersPerTeamMax: pptMax >= 100 ? Infinity : pptMax,
      randomSpawn,
      startingGold
    };

    const nameInput = shadowRoot.getElementById('ofp-preset-name-input');
    if (nameInput) {
      nameInput.value = generatePresetName(tempPreset);
    }
  }


  async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  async function joinLobby(gameID) {
    await chrome.runtime.sendMessage({ type: 'FOCUS_TAB' });
    const lobbyCard = findLobbyCard();
    if (lobbyCard) {
      lobbyCard.click();
      showAutoJoinToast();
    } else {
      window.location.hash = `#join=${gameID}`;
    }
  }

  function findLobbyCard() {
    // The lobby card is a button with h-40 class containing "Join next Game" text
    // When clicked, it turns green (from-green-600) and queues the player to join
    const buttons = document.querySelectorAll('button.h-40');
    for (const btn of buttons) {
      if (btn.textContent && btn.textContent.includes('Join next Game')) {
        return btn;
      }
    }

    // Fallback: find any button containing "Join next Game"
    const allButtons = document.querySelectorAll('button');
    for (const btn of allButtons) {
      if (btn.textContent && btn.textContent.includes('Join next Game')) {
        return btn;
      }
    }

    return null;
  }

  function showAutoJoinToast() {
    if (!shadowRoot) return;
    const toast = shadowRoot.getElementById('ofp-autojoin-toast');
    if (toast) {
      toast.classList.remove('hidden');
      // Auto-hide after 10 seconds (game should start by then)
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 10000);
    }
  }

  async function sendNotification(lobby, matchingPresets) {
    const config = lobby.gameConfig || {};
    const presetNames = matchingPresets.map(p => p.name).join(', ');
    const mapName = formatMapName(config.gameMap);
    const gameMode = config.gameMode || 'FFA';
    const playerCount = lobby.numClients || 0;
    const maxPlayers = config.maxPlayers || 0;
    const teamCount = parseTeamCount(config.playerTeams, maxPlayers);

    let body = `${gameMode} - ${playerCount}/${maxPlayers} players`;
    if (teamCount > 0) {
      body += ` (${teamCount} teams)`;
    }

    // Try Web Notifications API (works better on macOS)
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if (Notification.permission === 'granted') {
        try {
          const notification = new Notification(`Game Found: ${mapName}`, {
            body: body,
            icon: chrome.runtime.getURL('icons/icon128.png'),
            tag: 'ofp-match', // Prevents duplicate notifications
            requireInteraction: true
          });

          const timeoutId = setTimeout(() => {
            notification.close();
            notifiedGameIds.delete(lobby.gameID);
          }, NOTIFICATION_TIMEOUT_MS);

          notification.onclick = () => {
            clearTimeout(timeoutId);
            window.focus();
            notification.close();
            notifiedGameIds.delete(lobby.gameID);
          };

          notifiedGameIds.set(lobby.gameID, {
            notification: notification,
            timeoutId: timeoutId,
            createdAt: Date.now()
          });
          return;
        } catch (e) {
          console.error('[OFP] Web notification failed:', e);
        }
      } else if (Notification.permission === 'denied') {
        showNotificationPermissionError();
      }
    }
  }

  function showNotificationPermissionError() {
    if (!shadowRoot) return;
    const errorEl = shadowRoot.getElementById('ofp-error');
    if (errorEl) {
      errorEl.textContent = 'Notifications blocked. Click the lock icon in your browser address bar to enable.';
      errorEl.classList.remove('hidden');
      errorEl.onclick = () => {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            errorEl.classList.add('hidden');
          }
        });
      };
    }
  }


  async function fetchLobbies() {
    try {
      const response = await fetch(API_ENDPOINT);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      lastError = null;
      return data.lobbies || [];
    } catch (error) {
      lastError = error.message;
      console.error('[OFP] Failed to fetch lobbies:', error);
      return null;
    }
  }


  function checkNotifiedGames(lobbies) {
    if (notifiedGameIds.size === 0) return;

    if (!window.OFP_NOTIFICATIONS) {
      console.error('[OFP] Notifications module not loaded');
      return;
    }

    const { getGamesToDismiss } = window.OFP_NOTIFICATIONS;
    const toDismiss = getGamesToDismiss(notifiedGameIds, lobbies, NOTIFICATION_TIMEOUT_MS);

    for (const { gameID, notificationData } of toDismiss) {
      const { notification, timeoutId } = notificationData;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (notification) {
        notification.close();
      }
      notifiedGameIds.delete(gameID);
    }
  }

  function dismissAllNotifications() {
    for (const [gameID, notificationData] of notifiedGameIds.entries()) {
      const { notification, timeoutId } = notificationData || {};
      if (timeoutId) clearTimeout(timeoutId);
      if (notification) notification.close();
    }
    notifiedGameIds.clear();
  }


  function updatePresetList() {
    if (!shadowRoot) return;
    const container = shadowRoot.getElementById('ofp-preset-list');
    if (!container) return;

    if (presets.length === 0) {
      container.innerHTML = '<div class="ofp-no-presets">No presets yet</div>';
      return;
    }

    container.innerHTML = presets.map(preset => `
      <div class="ofp-preset-item" data-id="${preset.id}">
        <label class="ofp-preset-toggle">
          <input type="checkbox" ${preset.active ? 'checked' : ''} data-action="toggle" data-id="${preset.id}">
          <span class="ofp-preset-name">${escapeHtml(preset.name)}</span>
        </label>
        <button class="ofp-preset-delete" data-action="delete" data-id="${preset.id}" title="Delete">
          <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
        <button class="ofp-preset-edit" data-action="edit" data-id="${preset.id}" title="Edit">
          <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        </button>
      </div>
    `).join('');

    container.querySelectorAll('[data-action="toggle"]').forEach(el => {
      el.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const preset = presets.find(p => p.id === id);
        if (preset) {
          preset.active = e.target.checked;
          savePresets();
          updateMatchStatus();
        }
      });
    });

    container.querySelectorAll('[data-action="edit"]').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        openPresetEditor(presets.find(p => p.id === id));
      });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const preset = presets.find(p => p.id === id);
        if (preset && confirm(`Delete preset "${preset.name}"?`)) {
          presets = presets.filter(p => p.id !== id);
          savePresets();
          updatePresetList();
          updateMatchStatus();
        }
      });
    });
  }

  function updateMatchStatus() {
    if (!shadowRoot) return;
    const statusEl = shadowRoot.getElementById('ofp-match-status');
    if (!statusEl) return;

    const { matched, presets: matchingPresets } = checkForMatch(currentLobby, presets, mapSizes);

    if (!currentLobby) {
      statusEl.innerHTML = '<span class="ofp-match-none">No active lobby</span>';
      return;
    }

    if (presets.filter(p => p.active).length === 0) {
      statusEl.innerHTML = '<span class="ofp-match-none">No active presets</span>';
      return;
    }

    if (matched) {
      const names = matchingPresets.map(p => escapeHtml(p.name)).join(', ');
      statusEl.innerHTML = `<span class="ofp-match-yes">Match: ${names}</span>`;
    } else {
      statusEl.innerHTML = '<span class="ofp-match-no">No match</span>';
    }
  }

  function updateUI(lobbies) {
    if (!shadowRoot) return;
    const gameInfo = shadowRoot.getElementById('ofp-game-info');
    const noLobby = shadowRoot.getElementById('ofp-no-lobby');
    const sizeBadge = shadowRoot.getElementById('ofp-game-size');
    const errorEl = shadowRoot.getElementById('ofp-error');

    if (lobbies === null) {
      if (sizeBadge) sizeBadge.classList.add('hidden');
      errorEl.textContent = lastError || 'Failed to fetch lobby data';
      errorEl.classList.remove('hidden');
      return;
    }

    errorEl.classList.add('hidden');

    if (!lobbies.length) {
      gameInfo.classList.add('hidden');
      noLobby.classList.remove('hidden');
      noLobby.textContent = 'No active lobby';
      if (sizeBadge) sizeBadge.classList.add('hidden');
      currentLobby = null;
      updateMatchStatus();
      return;
    }

    const lobby = lobbies[0];
    currentLobby = lobby;
    const config = lobby.gameConfig || {};

    gameInfo.classList.remove('hidden');
    noLobby.classList.add('hidden');

    shadowRoot.getElementById('ofp-map-name').textContent = formatMapName(config.gameMap);

    if (sizeBadge) {
      const mapId = (config.gameMap || '').toLowerCase().replace(/\s+/g, '');
      const size = mapSizes[mapId];
      if (size) {
        const sizeLabel = size.charAt(0).toUpperCase();
        sizeBadge.textContent = sizeLabel;
        sizeBadge.className = `ofp-size-badge ofp-size-${size}`;
      } else {
        sizeBadge.classList.add('hidden');
      }
    }

    const modeEl = shadowRoot.getElementById('ofp-game-mode');
    const mode = normalizeMode(config.gameMode);
    modeEl.textContent = mode;
    modeEl.className = `ofp-game-mode ${mode.toLowerCase()}`;

    shadowRoot.getElementById('ofp-players').textContent =
      `${lobby.numClients || 0} / ${config.maxPlayers || '?'} players`;

    shadowRoot.getElementById('ofp-countdown').textContent =
      formatCountdown(lobby.msUntilStart);

    updateMatchStatus();
    if (isMonitoring) {
      const { matched } = checkForMatch(lobby, presets, mapSizes);
      if (matched && lobby.gameID !== lastMatchedGameId) {
        lastMatchedGameId = lobby.gameID;
      }
    }
  }


  function openPresetEditor(preset = null) {
    if (!shadowRoot) return;
    editingPreset = preset ? { ...preset } : createDefaultPreset();
    const modal = shadowRoot.getElementById('ofp-modal');
    const isNew = !preset;

    shadowRoot.getElementById('ofp-modal-title').textContent = isNew ? 'New Preset' : 'Edit Preset';
    shadowRoot.getElementById('ofp-preset-name-input').value = generatePresetName(editingPreset);

    shadowRoot.querySelectorAll('[name="ofp-mode"]').forEach(el => {
      el.checked = el.value === editingPreset.mode;
    });

    shadowRoot.querySelectorAll('[name="ofp-random-spawn"]').forEach(el => {
      el.checked = el.value === (editingPreset.randomSpawn || 'any');
    });

    shadowRoot.querySelectorAll('[name="ofp-starting-gold"]').forEach(el => {
      el.checked = el.value === (editingPreset.startingGold || 'any');
    });

    shadowRoot.getElementById('ofp-map-search').value = '';
    renderMapList('');

    if (!editingPreset.sizes) editingPreset.sizes = [];
    updateSizeChips();

    const hvnValue = editingPreset.humansVsNations === true ? 'yes' :
                     editingPreset.humansVsNations === false ? 'no' : 'any';
    shadowRoot.querySelectorAll('[name="ofp-hvn"]').forEach(el => {
      el.checked = el.value === hvnValue;
    });

    shadowRoot.getElementById('ofp-team-min').value = editingPreset.teamCountMin || 0;
    shadowRoot.getElementById('ofp-team-max').value = editingPreset.teamCountMax === Infinity ? 20 : editingPreset.teamCountMax;
    shadowRoot.getElementById('ofp-ppt-min').value = editingPreset.playersPerTeamMin || 0;
    shadowRoot.getElementById('ofp-ppt-max').value = editingPreset.playersPerTeamMax === Infinity ? 100 : editingPreset.playersPerTeamMax;

    updateSliderLabels();
    updateTeamSlidersVisibility();

    const deleteBtn = shadowRoot.getElementById('ofp-delete-preset');
    deleteBtn.classList.toggle('hidden', isNew);

    modal.classList.remove('hidden');
  }

  function closePresetEditor() {
    if (!shadowRoot) return;
    shadowRoot.getElementById('ofp-modal').classList.add('hidden');
    editingPreset = null;
  }

  function renderMapList(searchQuery) {
    if (!shadowRoot) return;
    const container = shadowRoot.getElementById('ofp-map-list');
    const selectedMaps = editingPreset?.maps || [];

    const filteredMaps = searchQuery
      ? maps.filter(m => fuzzyMatch(searchQuery, formatMapName(m)))
      : maps;

    container.innerHTML = filteredMaps.map(mapId => {
      const isSelected = selectedMaps.includes(mapId);
      const size = mapSizes[mapId] || 'medium';
      const sizeLabel = size.charAt(0).toUpperCase();
      return `
        <label class="ofp-map-item ${isSelected ? 'selected' : ''}">
          <input type="checkbox" value="${mapId}" ${isSelected ? 'checked' : ''}>
          <span>${formatMapName(mapId)}</span>
          <span class="ofp-size-badge ofp-size-${size}">${sizeLabel}</span>
        </label>
      `;
    }).join('');

    container.querySelectorAll('input[type="checkbox"]').forEach(el => {
      el.addEventListener('change', (e) => {
        const mapId = e.target.value;
        if (e.target.checked) {
          if (!editingPreset.maps.includes(mapId)) {
            editingPreset.maps.push(mapId);
          }
        } else {
          editingPreset.maps = editingPreset.maps.filter(m => m !== mapId);
        }
        e.target.parentElement.classList.toggle('selected', e.target.checked);
        updateMapCount();
        updatePresetName();
      });
    });

    updateMapCount();
  }

  function updateMapCount() {
    if (!shadowRoot) return;
    const count = editingPreset?.maps?.length || 0;
    const label = shadowRoot.getElementById('ofp-map-count');
    if (label) {
      label.textContent = count === 0 ? 'Any map' : `${count} selected`;
    }
  }

  function updateSizeCount() {
    if (!shadowRoot) return;
    const count = editingPreset?.sizes?.length || 0;
    const label = shadowRoot.getElementById('ofp-size-count');
    if (label) {
      label.textContent = count === 0 ? 'Any size' : `${count} selected`;
    }
  }

  function updateSizeChips() {
    if (!shadowRoot) return;
    const selectedSizes = editingPreset?.sizes || [];
    shadowRoot.querySelectorAll('.ofp-size-chip').forEach(chip => {
      const size = chip.dataset.size;
      const isSelected = selectedSizes.includes(size);
      chip.classList.toggle('selected', isSelected);
      chip.querySelector('input').checked = isSelected;
    });
    updateSizeCount();
  }

  function updateSliderLabels() {
    if (!shadowRoot) return;
    const teamMin = shadowRoot.getElementById('ofp-team-min').value;
    const teamMax = shadowRoot.getElementById('ofp-team-max').value;
    const pptMin = shadowRoot.getElementById('ofp-ppt-min').value;
    const pptMax = shadowRoot.getElementById('ofp-ppt-max').value;

    shadowRoot.getElementById('ofp-team-range-label').textContent =
      `${teamMin == 0 ? 'Any' : teamMin} - ${teamMax >= 20 ? '∞' : teamMax}`;
    shadowRoot.getElementById('ofp-ppt-range-label').textContent =
      `${pptMin == 0 ? 'Any' : pptMin} - ${pptMax >= 100 ? '∞' : pptMax}`;
  }

  function updateTeamSlidersVisibility() {
    if (!shadowRoot) return;
    const mode = shadowRoot.querySelector('[name="ofp-mode"]:checked')?.value || 'Any';
    const teamSection = shadowRoot.getElementById('ofp-team-settings');
    const hvnSection = shadowRoot.getElementById('ofp-hvn-settings');
    const isFFA = mode === 'FFA';
    if (teamSection) {
      teamSection.classList.toggle('hidden', isFFA);
    }
    if (hvnSection) {
      hvnSection.classList.toggle('hidden', isFFA);
    }
  }

  function savePreset() {
    if (!editingPreset || !shadowRoot) return;

    editingPreset.name = shadowRoot.getElementById('ofp-preset-name-input').value.trim() || 'Unnamed Preset';
    editingPreset.mode = shadowRoot.querySelector('[name="ofp-mode"]:checked')?.value || 'Any';
    editingPreset.randomSpawn = shadowRoot.querySelector('[name="ofp-random-spawn"]:checked')?.value || 'any';
    editingPreset.startingGold = shadowRoot.querySelector('[name="ofp-starting-gold"]:checked')?.value || 'any';

    // Humans vs Nations: 'any' -> null, 'yes' -> true, 'no' -> false
    const hvnValue = shadowRoot.querySelector('[name="ofp-hvn"]:checked')?.value || 'any';
    editingPreset.humansVsNations = hvnValue === 'yes' ? true : hvnValue === 'no' ? false : null;

    const teamMin = parseInt(shadowRoot.getElementById('ofp-team-min').value) || 0;
    const teamMax = parseInt(shadowRoot.getElementById('ofp-team-max').value) || 20;
    const pptMin = parseInt(shadowRoot.getElementById('ofp-ppt-min').value) || 0;
    const pptMax = parseInt(shadowRoot.getElementById('ofp-ppt-max').value) || 100;

    editingPreset.teamCountMin = teamMin;
    editingPreset.teamCountMax = teamMax >= 20 ? Infinity : teamMax;
    editingPreset.playersPerTeamMin = pptMin;
    editingPreset.playersPerTeamMax = pptMax >= 100 ? Infinity : pptMax;

    const existingIndex = presets.findIndex(p => p.id === editingPreset.id);
    if (existingIndex >= 0) {
      presets[existingIndex] = editingPreset;
    } else {
      presets.push(editingPreset);
    }

    savePresets();
    updatePresetList();
    updateMatchStatus();
    closePresetEditor();
  }

  function deletePreset() {
    if (!editingPreset) return;
    presets = presets.filter(p => p.id !== editingPreset.id);
    savePresets();
    updatePresetList();
    updateMatchStatus();
    closePresetEditor();
  }

  function deleteAllPresets() {
    if (presets.length === 0) return;
    if (!confirm('Delete all presets?')) return;
    presets = [];
    savePresets();
    updatePresetList();
    updateMatchStatus();
  }


  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }


  async function poll() {
    const lobbies = await fetchLobbies();
    updateUI(lobbies);

    if (lobbies) {
      await checkNotifiedGames(lobbies);
    }
  }

  function startPolling() {
    if (pollingInterval) return;

    poll();
    pollingInterval = setInterval(poll, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }

    chrome.runtime.sendMessage({ type: 'STOP_MONITORING' })
      .catch(err => console.error('[OFP] Failed to stop background monitoring:', err));

    // Don't stop URL polling - we need it for page state detection
  }

  // URL polling fallback for page state detection
  function startUrlPolling() {
    if (urlCheckInterval) return;
    let lastUrl = window.location.pathname + window.location.hash;
    urlCheckInterval = setInterval(() => {
      const currentUrl = window.location.pathname + window.location.hash;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        handleUrlChange();
      }
    }, 500);
  }

  function stopUrlPolling() {
    if (urlCheckInterval) {
      clearInterval(urlCheckInterval);
      urlCheckInterval = null;
    }
  }

  function showPanel() {
    if (!shadowRoot) return;
    const panel = shadowRoot.getElementById('ofp-panel');
    if (panel) {
      panel.classList.remove('hidden');
      positionPanel(); // Re-position when showing
    }
  }

  function hidePanel() {
    if (!shadowRoot) return;
    const panel = shadowRoot.getElementById('ofp-panel');
    if (panel) {
      panel.classList.add('hidden');
    }
  }

  function toggleMonitoring() {
    if (isMonitoring) {
      stopMonitoring();
    } else {
      isMonitoring = true;
      updateMonitoringUI();
      startPolling();
      chrome.runtime.sendMessage({
        type: 'START_MONITORING',
        presets: presets,
        mapSizes: mapSizes,
        autoJoin: autoJoinEnabled
      }).catch(err => console.error('[OFP] Failed to start background monitoring:', err));
      chrome.storage.local.set({ ofp_monitoring: true });
    }
  }

  function toggleAutoJoin() {
    autoJoinEnabled = !autoJoinEnabled;
    updateAutoJoinUI();
    chrome.storage.local.set({ ofp_autojoin: autoJoinEnabled });

    if (isMonitoring) {
      chrome.runtime.sendMessage({ type: 'UPDATE_AUTOJOIN', autoJoin: autoJoinEnabled })
        .catch(err => console.error('[OFP] Failed to update autoJoin in background:', err));
    }
  }

  function updateAutoJoinUI() {
    if (!shadowRoot) return;
    const checkbox = shadowRoot.getElementById('ofp-autojoin-checkbox');
    if (checkbox) {
      checkbox.checked = autoJoinEnabled;
    }
  }

  function updateMonitoringUI() {
    if (!shadowRoot) return;
    const monitorBtn = shadowRoot.getElementById('ofp-monitor-btn');
    const statusDot = shadowRoot.getElementById('ofp-status-dot');
    const statusText = shadowRoot.getElementById('ofp-status-text');
    const gameInfo = shadowRoot.getElementById('ofp-game-info');

    if (monitorBtn) {
      monitorBtn.textContent = isMonitoring ? 'Stop' : 'Start';
      monitorBtn.classList.toggle('active', isMonitoring);
    }

    if (statusDot && statusText) {
      if (isMonitoring) {
        statusDot.className = 'ofp-status-dot';
        statusText.textContent = 'Monitoring';
      } else {
        statusDot.className = 'ofp-status-dot inactive';
        statusText.textContent = 'Paused';
      }
    }

    if (gameInfo) {
      gameInfo.classList.toggle('monitoring', isMonitoring);
    }
  }


  function createUI() {
    const container = document.createElement('div');
    container.id = 'ofp-container';
    container.style.cssText = `position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: ${MAX_Z_INDEX};`;

    shadowRoot = container.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = PANEL_CSS;
    shadowRoot.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'ofp-panel';
    panel.innerHTML = `
      <div class="ofp-header">
        <span class="ofp-header-title">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          LobbyWatch
        </span>
        <div class="ofp-header-actions">
          <button class="ofp-monitor-btn" id="ofp-monitor-btn" title="Toggle monitoring">Start</button>
        </div>
      </div>

      <div class="ofp-current-game">
        <div class="ofp-section-label">Current Game</div>
        <div class="ofp-game-info hidden" id="ofp-game-info">
          <div class="ofp-game-map" id="ofp-map-name">Loading...</div>
          <div class="ofp-game-details">
            <span class="ofp-game-mode ffa" id="ofp-game-mode">FFA</span>
            <span class="ofp-size-badge hidden" id="ofp-game-size"></span>
            <span class="ofp-game-players" id="ofp-players">0 / 0 players</span>
            <span class="ofp-game-countdown" id="ofp-countdown">--</span>
          </div>
          <div class="ofp-game-teams hidden" id="ofp-teams"></div>
        </div>
        <div class="ofp-no-lobby" id="ofp-no-lobby">Loading...</div>
      </div>

      <div class="ofp-presets-section">
        <div class="ofp-section-header">
          <span class="ofp-section-label">Presets</span>
          <button class="ofp-add-preset-btn ofp-delete-all-btn" id="ofp-delete-all-presets" title="Delete All Presets">×</button>
          <button class="ofp-add-preset-btn" id="ofp-add-preset" title="Add Preset">+</button>
        </div>
        <div class="ofp-preset-list" id="ofp-preset-list"></div>
        <div class="ofp-match-status" id="ofp-match-status">
          <span class="ofp-match-none">No active presets</span>
        </div>
      </div>

      ${isBetaFlagEnabled('autojoin') ? '<div class="ofp-beta-warning">Beta: Auto-join may be unreliable when idle</div>' : ''}
      <div class="ofp-status">
        <span class="ofp-status-dot" id="ofp-status-dot"></span>
        <span class="ofp-status-text" id="ofp-status-text">Monitoring</span>
        ${isBetaFlagEnabled('autojoin') ? `
        <label class="ofp-autojoin-toggle">
          <input type="checkbox" id="ofp-autojoin-checkbox">
          <span class="ofp-toggle-label ofp-toggle-notify">Notify</span>
          <span class="ofp-toggle-slider"></span>
          <span class="ofp-toggle-label ofp-toggle-autojoin">Auto-join</span>
        </label>
        ` : ''}
      </div>

      <div class="ofp-error hidden" id="ofp-error"></div>
      <div class="ofp-autojoin-toast hidden" id="ofp-autojoin-toast">Auto-joined! Waiting for game to start...</div>
    `;

    const modal = document.createElement('div');
    modal.id = 'ofp-modal';
    modal.className = 'ofp-modal hidden';
    modal.innerHTML = `
      <div class="ofp-modal-backdrop"></div>
      <div class="ofp-modal-content">
        <div class="ofp-modal-header">
          <span id="ofp-modal-title">New Preset</span>
          <button class="ofp-close-btn" id="ofp-modal-close">&times;</button>
        </div>
        <div class="ofp-modal-body">
          <div class="ofp-form-group">
            <label>Preset Name</label>
            <input type="text" id="ofp-preset-name-input" placeholder="My Preset">
          </div>

          <div class="ofp-form-group">
            <label>Game Mode</label>
            <div class="ofp-radio-group">
              <label><input type="radio" name="ofp-mode" value="Any" checked> Any</label>
              <label><input type="radio" name="ofp-mode" value="FFA"> FFA</label>
              <label><input type="radio" name="ofp-mode" value="Team"> Team</label>
            </div>
          </div>

          <div class="ofp-form-group">
            <label>Random Spawn</label>
            <div class="ofp-radio-group">
              <label><input type="radio" name="ofp-random-spawn" value="any" checked> Any</label>
              <label><input type="radio" name="ofp-random-spawn" value="required"> Required</label>
              <label><input type="radio" name="ofp-random-spawn" value="excluded"> Excluded</label>
            </div>
          </div>

          <div class="ofp-form-group">
            <label>Starting Gold</label>
            <div class="ofp-radio-group">
              <label><input type="radio" name="ofp-starting-gold" value="any" checked> Any</label>
              <label><input type="radio" name="ofp-starting-gold" value="required"> 5 Million</label>
              <label><input type="radio" name="ofp-starting-gold" value="excluded"> Normal</label>
            </div>
          </div>

          <div class="ofp-form-group" id="ofp-hvn-settings">
            <label>Humans vs Nations</label>
            <div class="ofp-radio-group">
              <label><input type="radio" name="ofp-hvn" value="any" checked> Any</label>
              <label><input type="radio" name="ofp-hvn" value="yes"> Yes</label>
              <label><input type="radio" name="ofp-hvn" value="no"> No</label>
            </div>
          </div>

          <div class="ofp-form-group">
            <label>Map Size <span class="ofp-map-count" id="ofp-size-count">Any size</span></label>
            <div class="ofp-size-filter" id="ofp-size-filter">
              <label class="ofp-size-chip" data-size="tiny">
                <input type="checkbox" value="tiny">
                <span>Tiny</span>
              </label>
              <label class="ofp-size-chip" data-size="small">
                <input type="checkbox" value="small">
                <span>Small</span>
              </label>
              <label class="ofp-size-chip" data-size="medium">
                <input type="checkbox" value="medium">
                <span>Medium</span>
              </label>
              <label class="ofp-size-chip" data-size="large">
                <input type="checkbox" value="large">
                <span>Large</span>
              </label>
            </div>
          </div>

          <div class="ofp-form-group">
            <label>Maps <span class="ofp-map-count" id="ofp-map-count">Any map</span></label>
            <input type="text" id="ofp-map-search" placeholder="Search maps...">
            <div class="ofp-map-list" id="ofp-map-list"></div>
          </div>

          <div class="ofp-form-group" id="ofp-team-settings">
            <label>Team Settings</label>
            <div class="ofp-slider-group">
              <span class="ofp-slider-label">Teams: <span id="ofp-team-range-label">Any - ∞</span></span>
              <div class="ofp-dual-slider">
                <input type="range" id="ofp-team-min" min="0" max="20" value="0">
                <input type="range" id="ofp-team-max" min="0" max="20" value="20">
              </div>
            </div>
            <div class="ofp-slider-group">
              <span class="ofp-slider-label">Players/Team: <span id="ofp-ppt-range-label">Any - ∞</span></span>
              <div class="ofp-dual-slider">
                <input type="range" id="ofp-ppt-min" min="0" max="100" value="0">
                <input type="range" id="ofp-ppt-max" min="0" max="100" value="100">
              </div>
            </div>
          </div>
        </div>
        <div class="ofp-modal-footer">
          <button class="ofp-btn ofp-btn-danger hidden" id="ofp-delete-preset">Delete</button>
          <div class="ofp-modal-actions">
            <button class="ofp-btn ofp-btn-secondary" id="ofp-cancel-preset">Cancel</button>
            <button class="ofp-btn ofp-btn-primary" id="ofp-save-preset">Save</button>
          </div>
        </div>
      </div>
    `;

    shadowRoot.appendChild(panel);
    shadowRoot.appendChild(modal);
    document.documentElement.appendChild(container);

    shadowRoot.getElementById('ofp-monitor-btn').addEventListener('click', toggleMonitoring);
    shadowRoot.getElementById('ofp-autojoin-checkbox')?.addEventListener('change', toggleAutoJoin);
    shadowRoot.getElementById('ofp-add-preset').addEventListener('click', () => openPresetEditor());
    shadowRoot.getElementById('ofp-delete-all-presets').addEventListener('click', deleteAllPresets);
    shadowRoot.getElementById('ofp-modal-close').addEventListener('click', closePresetEditor);
    shadowRoot.getElementById('ofp-cancel-preset').addEventListener('click', closePresetEditor);
    shadowRoot.getElementById('ofp-save-preset').addEventListener('click', savePreset);
    shadowRoot.getElementById('ofp-delete-preset').addEventListener('click', deletePreset);
    shadowRoot.querySelector('.ofp-modal-backdrop').addEventListener('click', closePresetEditor);

    shadowRoot.getElementById('ofp-map-search').addEventListener('input', (e) => {
      renderMapList(e.target.value);
    });

    shadowRoot.querySelectorAll('[name="ofp-mode"]').forEach(el => {
      el.addEventListener('change', () => {
        updateTeamSlidersVisibility();
        updatePresetName();
      });
    });

    shadowRoot.querySelectorAll('[name="ofp-random-spawn"]').forEach(el => {
      el.addEventListener('change', updatePresetName);
    });

    shadowRoot.querySelectorAll('[name="ofp-starting-gold"]').forEach(el => {
      el.addEventListener('change', updatePresetName);
    });

    shadowRoot.querySelectorAll('[name="ofp-hvn"]').forEach(el => {
      el.addEventListener('change', updatePresetName);
    });

    shadowRoot.querySelectorAll('.ofp-size-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        if (!editingPreset) return;
        const size = chip.dataset.size;
        const isSelected = editingPreset.sizes.includes(size);

        if (isSelected) {
          editingPreset.sizes = editingPreset.sizes.filter(s => s !== size);
        } else {
          editingPreset.sizes.push(size);
        }

        const mapsOfSize = maps.filter(m => mapSizes[m] === size);
        if (isSelected) {
          editingPreset.maps = editingPreset.maps.filter(m => !mapsOfSize.includes(m));
        } else {
          mapsOfSize.forEach(m => {
            if (!editingPreset.maps.includes(m)) {
              editingPreset.maps.push(m);
            }
          });
        }

        chip.classList.toggle('selected', !isSelected);
        chip.querySelector('input').checked = !isSelected;
        updateSizeCount();
        updateMapCount();
        renderMapList(shadowRoot.getElementById('ofp-map-search')?.value || '');
        updatePresetName();
      });
    });

    ['ofp-team-min', 'ofp-team-max', 'ofp-ppt-min', 'ofp-ppt-max'].forEach(id => {
      shadowRoot.getElementById(id).addEventListener('input', () => {
        updateSliderLabels();
        updatePresetName();
      });
    });

    setupPositionObserver();
    positionPanel();
  }


  function isGameActive() {
    // The site adds 'in-game' class to body when game is running
    return document.body.classList.contains('in-game');
  }

  function shouldShowExtension() {
    // Must be on main openfront.io domain (not subdomains)
    if (window.location.hostname !== 'openfront.io') return false;
    return !isGameActive();
  }

  async function handleUrlChange() {
    if (shouldShowExtension()) {
      if (uiCreated) {
        showPanel();
        poll();
        if (isMonitoring && !pollingInterval) {
          startPolling();
        }
      } else {
        await loadPresets();
        if (isBetaFlagEnabled('autojoin')) {
          const savedState = await chrome.storage.local.get('ofp_autojoin');
          autoJoinEnabled = savedState.ofp_autojoin || false;
        }
        isMonitoring = false;
        createUI();
        uiCreated = true;
        updatePresetList();
        updateAutoJoinUI();
        updateMonitoringUI();
        poll();
      }
    } else {
      hidePanel();
      if (isMonitoring) {
        stopMonitoring();
      }
    }
  }

  function handleVisibilityChange() {
    if (!document.hidden && shouldShowExtension()) {
      poll();
      if (!pollingInterval) {
        startPolling();
      }
    }
  }

  function stopMonitoring() {
    if (!isMonitoring) return;
    isMonitoring = false;
    stopPolling();
    lastMatchedGameId = null;
    dismissAllNotifications();
    chrome.storage.local.set({ ofp_monitoring: false });
    updateMonitoringUI();
  }

  function setupAutoStopListeners() {
    // Watch for body class changes (game adds 'in-game' class when active)
    const bodyObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          handleGameStateChange();
        }
      }
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Listen for URL changes (SPA navigation) - still needed for initial state
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    // Intercept pushState/replaceState for SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleUrlChange();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handleUrlChange();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    window.addEventListener('pageshow', (event) => {
      if (event.persisted && shouldShowExtension()) {
        poll();
      }
    });
  }

  function handleGameStateChange() {
    if (isGameActive()) {
      hidePanel();
      if (isMonitoring) {
        stopMonitoring();
      }
    } else {
      if (uiCreated) {
        showPanel();
        poll();
        if (isMonitoring && !pollingInterval) {
          startPolling();
        }
      }
    }
  }


  async function init() {
    if (uiCreated) return;

    if (!shouldShowExtension()) {
      startUrlPolling();
      setupAutoStopListeners();
      return;
    }

    await initializeMaps();
    await loadPresets();

    if (isBetaFlagEnabled('autojoin')) {
      const savedState = await chrome.storage.local.get('ofp_autojoin');
      autoJoinEnabled = savedState.ofp_autojoin || false;
    }

    const hasActivePresets = presets.some(p => p.active);
    isMonitoring = hasActivePresets;

    createUI();
    uiCreated = true;
    updatePresetList();
    updateAutoJoinUI();
    updateMonitoringUI();

    poll();
    startPolling();

    if (isMonitoring) {
      chrome.runtime.sendMessage({
        type: 'START_MONITORING',
        presets: presets,
        mapSizes: mapSizes,
        autoJoin: autoJoinEnabled
      });
    }

    setupAutoStopListeners();
    startUrlPolling();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
