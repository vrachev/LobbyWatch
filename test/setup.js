import { vi } from 'vitest';

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

globalThis.fetch = vi.fn();

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

globalThis.mockApiResponse = (lobbies) => {
  globalThis.fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ lobbies }),
  });
};

globalThis.mockApiError = (status = 500) => {
  globalThis.fetch.mockResolvedValueOnce({
    ok: false,
    status,
  });
};

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
