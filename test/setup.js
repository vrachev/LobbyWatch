// Test setup - mock Chrome APIs and global objects
import { vi } from 'vitest';

// Mock chrome.storage
globalThis.chrome = {
  storage: {
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
  runtime: {
    id: 'mock-extension-id',
    getURL: vi.fn((path) => `chrome-extension://mock-id/${path}`),
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
  },
};

// Mock fetch for API calls
globalThis.fetch = vi.fn();

// Helper to create mock lobby data
globalThis.createMockLobby = (overrides = {}) => ({
  gameID: 'test-game-123',
  numClients: 50,
  msUntilStart: 30000,
  gameConfig: {
    gameMap: 'europe',
    gameMode: 'FFA',
    maxPlayers: 100,
    playerTeams: null,
    ...overrides.gameConfig,
  },
  ...overrides,
});

// Helper to create mock preset
globalThis.createMockPreset = (overrides = {}) => ({
  id: 'preset-' + Math.random().toString(36).slice(2, 6),
  name: 'Test Preset',
  active: true,
  mode: 'Any',
  maps: [],
  sizes: [],
  teamCountMin: 0,
  teamCountMax: Infinity,
  playersPerTeamMin: 0,
  playersPerTeamMax: Infinity,
  ...overrides,
});

// Mock API response helper
globalThis.mockApiResponse = (lobbies) => {
  globalThis.fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ lobbies }),
  });
};

// Mock API error helper
globalThis.mockApiError = (status = 500) => {
  globalThis.fetch.mockResolvedValueOnce({
    ok: false,
    status,
  });
};

// Helper to create lobby with deep overrides
globalThis.createLobbyWithOverrides = (base, overrides) => {
  return {
    ...base,
    ...overrides,
    gameConfig: {
      ...(base.gameConfig || {}),
      ...(overrides.gameConfig || {})
    }
  };
};

// Helper to generate multiple team lobbies for bulk testing
globalThis.generateTeamLobbies = (count) => {
  const maps = ['europe', 'africa', 'asia', 'world', 'northamerica'];
  const teamConfigs = [2, 4, 10, 25, 50];

  return Array.from({ length: count }, (_, i) => ({
    gameID: `team-${i}-${Date.now()}`,
    numClients: 50 + Math.floor(Math.random() * 50),
    msUntilStart: 10000 + Math.floor(Math.random() * 50000),
    gameConfig: {
      gameMap: maps[i % maps.length],
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: teamConfigs[i % teamConfigs.length]
    }
  }));
};

// Helper to generate multiple FFA lobbies for bulk testing
globalThis.generateFFALobbies = (count) => {
  const maps = ['europe', 'africa', 'asia', 'world', 'northamerica'];

  return Array.from({ length: count }, (_, i) => ({
    gameID: `ffa-${i}-${Date.now()}`,
    numClients: 30 + Math.floor(Math.random() * 70),
    msUntilStart: 5000 + Math.floor(Math.random() * 55000),
    gameConfig: {
      gameMap: maps[i % maps.length],
      gameMode: 'FFA',
      maxPlayers: 100,
      playerTeams: null
    }
  }));
};
