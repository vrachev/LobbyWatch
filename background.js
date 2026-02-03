import { matchesPreset, normalizePreset, parseTeamCount } from './src/filter.js';
import { POLL_INTERVAL, NOTIFICATION_TIMEOUT_MS } from './src/constants.js';

const API_ENDPOINT = 'https://openfront.io/api/public_lobbies';
const ALARM_NAME = 'ofp-keepalive';

let isMonitoring = false;
let presets = [];
let mapSizes = {};
let autoJoinEnabled = false;
let lastMatchedGameId = null;
let pollTimeoutId = null;
let notifiedGameIds = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FOCUS_TAB') {
    focusTab(sender.tab?.id)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'START_MONITORING') {
    startMonitoring(message.presets, message.mapSizes, message.autoJoin, sender.tab?.id);
    sendResponse({ success: true });
    return;
  }

  if (message.type === 'STOP_MONITORING') {
    stopMonitoring();
    sendResponse({ success: true });
    return;
  }

  if (message.type === 'UPDATE_PRESETS') {
    presets = (message.presets || []).map(normalizePreset);
    sendResponse({ success: true });
    return;
  }

  if (message.type === 'UPDATE_AUTOJOIN') {
    autoJoinEnabled = message.autoJoin;
    sendResponse({ success: true });
    return;
  }

  if (message.type === 'GET_STATUS') {
    sendResponse({
      isMonitoring,
      presetsCount: presets.length,
      autoJoinEnabled
    });
    return;
  }
});

async function focusTab(tabId) {
  if (!tabId) return;
  await chrome.tabs.update(tabId, { active: true });
  const tab = await chrome.tabs.get(tabId);
  if (tab.windowId) {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
}

function startMonitoring(newPresets, newMapSizes, newAutoJoin, tabId) {
  presets = (newPresets || []).map(normalizePreset);
  mapSizes = newMapSizes || {};
  autoJoinEnabled = newAutoJoin || false;
  isMonitoring = true;
  lastMatchedGameId = null;
  chrome.storage.local.set({ ofp_monitoring_tab: tabId });
  poll();
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 });
}

function stopMonitoring() {
  isMonitoring = false;
  if (pollTimeoutId) {
    clearTimeout(pollTimeoutId);
    pollTimeoutId = null;
  }
  chrome.alarms.clear(ALARM_NAME);
  for (const [gameId, data] of notifiedGameIds.entries()) {
    if (data.timeoutId) clearTimeout(data.timeoutId);
    chrome.notifications.clear(`ofp-${gameId}`);
  }
  notifiedGameIds.clear();
}

async function poll() {
  if (!isMonitoring) return;
  try {
    const lobbies = await fetchLobbies();
    if (lobbies) {
      await processLobbies(lobbies);
      await sendLobbyUpdate(lobbies);
    }
  } catch (err) {
    console.error('[OFP Background] Poll error:', err);
  }
  if (isMonitoring) {
    pollTimeoutId = setTimeout(poll, POLL_INTERVAL);
  }
}

async function fetchLobbies() {
  try {
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.lobbies || [];
  } catch (error) {
    console.error('[OFP Background] Failed to fetch lobbies:', error);
    return null;
  }
}

async function processLobbies(lobbies) {
  const lobby = lobbies[0];
  if (!lobby) return;

  const activePresets = presets.filter(p => p.active);
  if (activePresets.length === 0) return;

  const matchingPresets = activePresets.filter(p => matchesPreset(lobby, p, mapSizes));
  if (matchingPresets.length > 0 && lobby.gameID !== lastMatchedGameId) {
    lastMatchedGameId = lobby.gameID;
    if (autoJoinEnabled) {
      await triggerAutoJoin(lobby.gameID);
    } else {
      await sendNotification(lobby, matchingPresets);
    }
  }
  checkNotifiedGames(lobbies);
}

async function sendNotification(lobby, matchingPresets) {
  const config = lobby.gameConfig || {};
  const mapName = formatMapName(config.gameMap);
  const gameMode = config.gameMode || 'FFA';
  const playerCount = lobby.numClients || 0;
  const maxPlayers = config.maxPlayers || 0;
  const teamCount = parseTeamCount(config.playerTeams, maxPlayers);

  let body = `${gameMode} - ${playerCount}/${maxPlayers} players`;
  if (teamCount > 0) {
    body += ` (${teamCount} teams)`;
  }

  const notificationId = `ofp-${lobby.gameID}`;

  try {
    await chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: `Game Found: ${mapName}`,
      message: body,
      priority: 2,
      requireInteraction: true
    });

    const timeoutId = setTimeout(() => {
      chrome.notifications.clear(notificationId);
      notifiedGameIds.delete(lobby.gameID);
    }, NOTIFICATION_TIMEOUT_MS);

    notifiedGameIds.set(lobby.gameID, {
      notificationId,
      timeoutId,
      createdAt: Date.now()
    });
  } catch (err) {
    console.error('[OFP Background] Notification failed:', err);
  }
}

async function triggerAutoJoin(gameID) {
  const result = await chrome.storage.local.get('ofp_monitoring_tab');
  const tabId = result.ofp_monitoring_tab;
  if (tabId) {
    try {
      await focusTab(tabId);
      await chrome.tabs.sendMessage(tabId, { type: 'AUTO_JOIN', gameID });
    } catch (err) {
      console.error('[OFP Background] Failed to trigger auto-join:', err);
    }
  }
}

async function sendLobbyUpdate(lobbies) {
  const result = await chrome.storage.local.get('ofp_monitoring_tab');
  const tabId = result.ofp_monitoring_tab;
  if (tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'LOBBY_UPDATE', lobbies });
    } catch {}
  }
}

function checkNotifiedGames(lobbies) {
  if (notifiedGameIds.size === 0) return;
  const currentLobbyIds = new Set(lobbies.map(l => l.gameID));
  for (const [gameId, data] of notifiedGameIds.entries()) {
    if (!currentLobbyIds.has(gameId)) {
      if (data.timeoutId) clearTimeout(data.timeoutId);
      chrome.notifications.clear(data.notificationId);
      notifiedGameIds.delete(gameId);
    }
  }
}

function formatMapName(rawName) {
  if (!rawName) return 'Unknown Map';
  return rawName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (!notificationId.startsWith('ofp-')) return;
  const gameId = notificationId.replace('ofp-', '');
  const data = notifiedGameIds.get(gameId);
  if (data) {
    if (data.timeoutId) clearTimeout(data.timeoutId);
    notifiedGameIds.delete(gameId);
  }
  chrome.notifications.clear(notificationId);
  const result = await chrome.storage.local.get('ofp_monitoring_tab');
  if (result.ofp_monitoring_tab) {
    await focusTab(result.ofp_monitoring_tab);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME || !isMonitoring) return;
  const result = await chrome.storage.local.get('ofp_monitoring_tab');
  const tabId = result.ofp_monitoring_tab;
  if (!tabId) {
    stopMonitoring();
    return;
  }
  try {
    await chrome.tabs.get(tabId);
    if (!pollTimeoutId) poll();
  } catch {
    stopMonitoring();
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get('ofp_monitoring_tab', (result) => {
    if (result.ofp_monitoring_tab === tabId && isMonitoring) stopMonitoring();
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!isMonitoring || changeInfo.url === undefined) return;
  chrome.storage.local.get('ofp_monitoring_tab', (result) => {
    if (result.ofp_monitoring_tab !== tabId) return;
    try {
      const url = new URL(changeInfo.url);
      const isOnHomePage = url.hostname === 'openfront.io' &&
        (url.pathname === '/' || url.pathname === '') &&
        !url.hash.startsWith('#join=');
      if (!isOnHomePage) stopMonitoring();
    } catch {
      stopMonitoring();
    }
  });
});

