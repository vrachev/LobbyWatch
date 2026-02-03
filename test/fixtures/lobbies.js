// Realistic lobby fixtures representing API responses from /api/public_lobbies

export const LOBBY_FIXTURES = {
  // ============ Real API Format Examples ============
  // These match the actual format returned by openfront.io/api/public_lobbies

  realFfaAustralia: {
    gameID: 'real-ffa-001',
    numClients: 33,
    msUntilStart: 40063,
    gameConfig: {
      gameMap: 'Australia',
      gameMode: 'Free For All',  // Real API uses "Free For All", not "FFA"
      maxPlayers: 40
      // Note: playerTeams is undefined for FFA
    }
  },

  realTeamDuos: {
    gameID: 'real-duos-001',
    numClients: 45,
    msUntilStart: 25000,
    gameConfig: {
      gameMap: 'Europe',
      gameMode: 'Team',
      maxPlayers: 60,
      playerTeams: 'Duos'  // String format: team count = maxPlayers / 2 = 30
    }
  },

  realTeamTrios: {
    gameID: 'real-trios-001',
    numClients: 32,
    msUntilStart: 33972,
    gameConfig: {
      gameMap: 'New York City',
      gameMode: 'Team',
      maxPlayers: 60,
      playerTeams: 'Trios'  // String format: team count = maxPlayers / 3 = 20
    }
  },

  realTeamQuads: {
    gameID: 'real-quads-001',
    numClients: 50,
    msUntilStart: 18000,
    gameConfig: {
      gameMap: 'World',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 'Quads'  // String format: team count = maxPlayers / 4 = 25
    }
  },

  realTeamNumeric: {
    gameID: 'real-numeric-001',
    numClients: 40,
    msUntilStart: 15000,
    gameConfig: {
      gameMap: 'Lisbon',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 2  // Numeric format: team count = 2
    }
  },

  // ============ FFA Variants ============

  ffaEuropeSmall: {
    gameID: 'ffa-eu-small-001',
    numClients: 45,
    msUntilStart: 15000,
    gameConfig: {
      gameMap: 'europe',
      gameMode: 'FFA',
      maxPlayers: 50,
      playerTeams: null
    }
  },

  ffaEuropeLarge: {
    gameID: 'ffa-eu-large-001',
    numClients: 78,
    msUntilStart: 30000,
    gameConfig: {
      gameMap: 'europe',
      gameMode: 'FFA',
      maxPlayers: 100,
      playerTeams: null
    }
  },

  ffaAfrica: {
    gameID: 'ffa-africa-001',
    numClients: 62,
    msUntilStart: 20000,
    gameConfig: {
      gameMap: 'africa',
      gameMode: 'FFA',
      maxPlayers: 100,
      playerTeams: null
    }
  },

  ffaWorld: {
    gameID: 'ffa-world-001',
    numClients: 150,
    msUntilStart: 45000,
    gameConfig: {
      gameMap: 'world',
      gameMode: 'FFA',
      maxPlayers: 200,
      playerTeams: null
    }
  },

  ffaStraitOfGibraltar: {
    gameID: 'ffa-gibraltar-001',
    numClients: 30,
    msUntilStart: 10000,
    gameConfig: {
      gameMap: 'straitofgibraltar',
      gameMode: 'FFA',
      maxPlayers: 50,
      playerTeams: null
    }
  },

  ffaDeglaciatedAntarctica: {
    gameID: 'ffa-antarctica-001',
    numClients: 25,
    msUntilStart: 8000,
    gameConfig: {
      gameMap: 'deglaciatedantarctica',
      gameMode: 'FFA',
      maxPlayers: 50,
      playerTeams: null
    }
  },

  // ============ Team Variants - Duos (high team count, 2 players/team) ============

  teamDuosAfrica: {
    gameID: 'team-duos-africa-001',
    numClients: 86,
    msUntilStart: 4000,
    gameConfig: {
      gameMap: 'africa',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 50 // 2 per team
    }
  },

  teamDuosEurope: {
    gameID: 'team-duos-europe-001',
    numClients: 78,
    msUntilStart: 12000,
    gameConfig: {
      gameMap: 'europe',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 50 // 2 per team
    }
  },

  // ============ Team Variants - Squads (low team count, high players/team) ============

  teamSquadsWorld: {
    gameID: 'team-squads-world-001',
    numClients: 72,
    msUntilStart: 20000,
    gameConfig: {
      gameMap: 'world',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 4 // 25 per team
    }
  },

  teamSquadsAsia: {
    gameID: 'team-squads-asia-001',
    numClients: 90,
    msUntilStart: 5000,
    gameConfig: {
      gameMap: 'asia',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 2 // 50 per team
    }
  },

  teamFourTeamsEurope: {
    gameID: 'team-4teams-europe-001',
    numClients: 80,
    msUntilStart: 15000,
    gameConfig: {
      gameMap: 'europe',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 4 // 25 per team
    }
  },

  teamTenTeamsWorld: {
    gameID: 'team-10teams-world-001',
    numClients: 95,
    msUntilStart: 3000,
    gameConfig: {
      gameMap: 'world',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 10 // 10 per team
    }
  },

  // ============ Edge Cases - Missing/Partial Data ============

  missingGameConfig: {
    gameID: 'minimal-001',
    numClients: 10,
    msUntilStart: 60000
    // gameConfig is undefined
  },

  partialGameConfigMapOnly: {
    gameID: 'partial-map-001',
    numClients: 20,
    msUntilStart: 30000,
    gameConfig: {
      gameMap: 'europe'
      // gameMode, maxPlayers, playerTeams all undefined
    }
  },

  partialGameConfigModeOnly: {
    gameID: 'partial-mode-001',
    numClients: 15,
    msUntilStart: 25000,
    gameConfig: {
      gameMode: 'FFA'
      // gameMap, maxPlayers, playerTeams all undefined
    }
  },

  emptyGameConfig: {
    gameID: 'empty-config-001',
    numClients: 5,
    msUntilStart: 50000,
    gameConfig: {}
  },

  nullGameConfig: {
    gameID: 'null-config-001',
    numClients: 8,
    msUntilStart: 40000,
    gameConfig: null
  },

  // ============ Edge Cases - Null/Zero Values ============

  nullPlayerTeams: {
    gameID: 'null-teams-001',
    numClients: 50,
    msUntilStart: 20000,
    gameConfig: {
      gameMap: 'europe',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: null
    }
  },

  zeroPlayerTeams: {
    gameID: 'zero-teams-001',
    numClients: 50,
    msUntilStart: 20000,
    gameConfig: {
      gameMap: 'europe',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 0
    }
  },

  zeroMaxPlayers: {
    gameID: 'zero-max-001',
    numClients: 0,
    msUntilStart: 20000,
    gameConfig: {
      gameMap: 'europe',
      gameMode: 'Team',
      maxPlayers: 0,
      playerTeams: 4
    }
  },

  nullMaxPlayers: {
    gameID: 'null-max-001',
    numClients: 50,
    msUntilStart: 20000,
    gameConfig: {
      gameMap: 'europe',
      gameMode: 'Team',
      maxPlayers: null,
      playerTeams: 4
    }
  },

  // ============ Boundary Cases - Team Count ============

  singleTeam: {
    gameID: 'single-team-001',
    numClients: 50,
    msUntilStart: 20000,
    gameConfig: {
      gameMap: 'world',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 1 // 100 per team
    }
  },

  twoTeams: {
    gameID: 'two-teams-001',
    numClients: 80,
    msUntilStart: 15000,
    gameConfig: {
      gameMap: 'world',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 2 // 50 per team
    }
  },

  manyTeams: {
    gameID: 'many-teams-001',
    numClients: 95,
    msUntilStart: 5000,
    gameConfig: {
      gameMap: 'world',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 100 // 1 per team
    }
  },

  fiftyTeams: {
    gameID: 'fifty-teams-001',
    numClients: 90,
    msUntilStart: 8000,
    gameConfig: {
      gameMap: 'europe',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 50 // 2 per team (duos)
    }
  },

  // ============ Boundary Cases - Players Per Team Calculation ============

  nonDivisiblePlayers: {
    gameID: 'non-divisible-001',
    numClients: 70,
    msUntilStart: 15000,
    gameConfig: {
      gameMap: 'europe',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 7 // 100/7 = 14.28 -> 14 per team
    }
  },

  exactlyOnePerTeam: {
    gameID: 'one-per-team-001',
    numClients: 48,
    msUntilStart: 10000,
    gameConfig: {
      gameMap: 'africa',
      gameMode: 'Team',
      maxPlayers: 50,
      playerTeams: 50 // 1 per team
    }
  },

  largePlayersPerTeam: {
    gameID: 'large-per-team-001',
    numClients: 180,
    msUntilStart: 30000,
    gameConfig: {
      gameMap: 'world',
      gameMode: 'Team',
      maxPlayers: 200,
      playerTeams: 2 // 100 per team
    }
  },

  threeTeamsNonDivisible: {
    gameID: 'three-teams-001',
    numClients: 90,
    msUntilStart: 12000,
    gameConfig: {
      gameMap: 'asia',
      gameMode: 'Team',
      maxPlayers: 100,
      playerTeams: 3 // 100/3 = 33.33 -> 33 per team
    }
  },

  // ============ Map Case Variations (for testing case sensitivity) ============

  ffaBlackSeaWithSpace: {
    gameID: 'ffa-blacksea-space-001',
    numClients: 45,
    msUntilStart: 15000,
    gameConfig: {
      gameMap: 'Black Sea', // with space
      gameMode: 'FFA',
      maxPlayers: 100,
      playerTeams: null
    }
  },

  ffaBlackSeaCamelCase: {
    gameID: 'ffa-blacksea-camel-001',
    numClients: 50,
    msUntilStart: 12000,
    gameConfig: {
      gameMap: 'BlackSea', // CamelCase
      gameMode: 'FFA',
      maxPlayers: 100,
      playerTeams: null
    }
  },

  ffaBlackSeaLowerCase: {
    gameID: 'ffa-blacksea-lower-001',
    numClients: 55,
    msUntilStart: 10000,
    gameConfig: {
      gameMap: 'blacksea', // lowercase no space
      gameMode: 'FFA',
      maxPlayers: 100,
      playerTeams: null
    }
  },

  ffaEuropeUpperCase: {
    gameID: 'ffa-europe-upper-001',
    numClients: 60,
    msUntilStart: 18000,
    gameConfig: {
      gameMap: 'EUROPE', // uppercase
      gameMode: 'FFA',
      maxPlayers: 100,
      playerTeams: null
    }
  },

  ffaEuropeMixedCase: {
    gameID: 'ffa-europe-mixed-001',
    numClients: 55,
    msUntilStart: 22000,
    gameConfig: {
      gameMap: 'EuRoPe', // mixed case
      gameMode: 'FFA',
      maxPlayers: 100,
      playerTeams: null
    }
  },

  emptyMapString: {
    gameID: 'empty-map-001',
    numClients: 40,
    msUntilStart: 25000,
    gameConfig: {
      gameMap: '',
      gameMode: 'FFA',
      maxPlayers: 100,
      playerTeams: null
    }
  },

  nullMap: {
    gameID: 'null-map-001',
    numClients: 35,
    msUntilStart: 28000,
    gameConfig: {
      gameMap: null,
      gameMode: 'FFA',
      maxPlayers: 100,
      playerTeams: null
    }
  },

  // ============ Humans vs Nations ============

  humansVsNations: {
    gameID: 'hvn-001',
    numClients: 4,
    msUntilStart: 57237,
    gameConfig: {
      gameMap: 'Achiran',
      gameMode: 'Team',
      maxPlayers: 27,
      playerTeams: 'Humans Vs Nations'
    }
  },

  humansVsNationsEurope: {
    gameID: 'hvn-europe-001',
    numClients: 8,
    msUntilStart: 30000,
    gameConfig: {
      gameMap: 'Europe',
      gameMode: 'Team',
      maxPlayers: 50,
      playerTeams: 'Humans Vs Nations'
    }
  },

  // ============ 5 Million Starting Gold ============

  fiveMillionGoldFFA: {
    gameID: '5m-gold-ffa-001',
    numClients: 50,
    msUntilStart: 30000,
    gameConfig: {
      gameMap: 'Europe',
      gameMode: 'FFA',
      maxPlayers: 100,
      startingGold: 5000000
    }
  },

  fiveMillionGoldTeam: {
    gameID: '5m-gold-team-001',
    numClients: 23,
    msUntilStart: 53405,
    gameConfig: {
      gameMap: 'World',
      gameMode: 'Team',
      maxPlayers: 30,
      playerTeams: 6,
      startingGold: 5000000
    }
  },

  normalGoldFFA: {
    gameID: 'normal-gold-ffa-001',
    numClients: 45,
    msUntilStart: 25000,
    gameConfig: {
      gameMap: 'Europe',
      gameMode: 'FFA',
      maxPlayers: 100
      // startingGold is undefined for normal games
    }
  }
};

// Helper to get all FFA lobbies (includes both "FFA" and "Free For All" modes)
export const FFA_LOBBIES = Object.entries(LOBBY_FIXTURES)
  .filter(([_, lobby]) => {
    const mode = lobby.gameConfig?.gameMode?.toLowerCase() || '';
    return mode === 'ffa' || mode.includes('free');
  })
  .map(([key, lobby]) => ({ key, ...lobby }));

// Helper to get all Team lobbies
export const TEAM_LOBBIES = Object.entries(LOBBY_FIXTURES)
  .filter(([_, lobby]) => lobby.gameConfig?.gameMode === 'Team')
  .map(([key, lobby]) => ({ key, ...lobby }));

// Helper to get real API format fixtures
export const REAL_API_LOBBIES = {
  ffa: LOBBY_FIXTURES.realFfaAustralia,
  duos: LOBBY_FIXTURES.realTeamDuos,
  trios: LOBBY_FIXTURES.realTeamTrios,
  quads: LOBBY_FIXTURES.realTeamQuads,
  numeric: LOBBY_FIXTURES.realTeamNumeric
};

// Helper to get all edge case lobbies
export const EDGE_CASE_LOBBIES = [
  LOBBY_FIXTURES.missingGameConfig,
  LOBBY_FIXTURES.partialGameConfigMapOnly,
  LOBBY_FIXTURES.partialGameConfigModeOnly,
  LOBBY_FIXTURES.emptyGameConfig,
  LOBBY_FIXTURES.nullGameConfig,
  LOBBY_FIXTURES.nullPlayerTeams,
  LOBBY_FIXTURES.zeroPlayerTeams,
  LOBBY_FIXTURES.zeroMaxPlayers,
  LOBBY_FIXTURES.nullMaxPlayers,
  LOBBY_FIXTURES.emptyMapString,
  LOBBY_FIXTURES.nullMap
];
