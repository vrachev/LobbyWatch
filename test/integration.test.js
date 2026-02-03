import { describe, it, expect, beforeEach, vi } from 'vitest';
import { matchesPreset, checkForMatch } from '../src/filter.js';

describe('Integration Tests - API Response Scenarios', () => {
  describe('Real-world lobby scenarios', () => {
    it('matches a typical FFA Europe game', () => {
      const lobby = {
        gameID: 'abc123',
        numClients: 45,
        msUntilStart: 15000,
        gameConfig: {
          gameMap: 'europe',
          gameMode: 'FFA',
          maxPlayers: 100,
          playerTeams: null
        }
      };

      const presets = [
        createMockPreset({
          active: true,
          name: 'Europe FFA',
          mode: 'FFA',
          maps: ['europe']
        })
      ];

      const result = checkForMatch(lobby, presets);
      expect(result.matched).toBe(true);
      expect(result.presets[0].name).toBe('Europe FFA');
    });

    it('matches a Team game with duos format', () => {
      const lobby = {
        gameID: 'duo123',
        numClients: 86,
        msUntilStart: 4000,
        gameConfig: {
          gameMap: 'africa',
          gameMode: 'Team',
          maxPlayers: 100,
          playerTeams: 50  // 2 players per team (duos)
        }
      };

      const presets = [
        createMockPreset({
          active: true,
          name: 'Duos',
          mode: 'Team',
          teamCountMin: 40,
          teamCountMax: Infinity,
          playersPerTeamMin: 0,
          playersPerTeamMax: 3
        })
      ];

      const result = checkForMatch(lobby, presets);
      expect(result.matched).toBe(true);
    });

    it('matches a Team game with squad format', () => {
      const lobby = {
        gameID: 'squad123',
        numClients: 72,
        msUntilStart: 30000,
        gameConfig: {
          gameMap: 'world',
          gameMode: 'Team',
          maxPlayers: 100,
          playerTeams: 4  // 25 players per team
        }
      };

      const presets = [
        createMockPreset({
          active: true,
          name: 'Large Teams',
          mode: 'Team',
          teamCountMin: 2,
          teamCountMax: 6,
          playersPerTeamMin: 15,
          playersPerTeamMax: Infinity
        })
      ];

      const result = checkForMatch(lobby, presets);
      expect(result.matched).toBe(true);
    });

    it('does not match when all conditions fail', () => {
      const lobby = {
        gameID: 'nomatch123',
        numClients: 30,
        msUntilStart: 60000,
        gameConfig: {
          gameMap: 'asia',
          gameMode: 'FFA',
          maxPlayers: 50
        }
      };

      const presets = [
        createMockPreset({
          active: true,
          name: 'Europe Only',
          mode: 'FFA',
          maps: ['europe']
        }),
        createMockPreset({
          active: true,
          name: 'Team Games',
          mode: 'Team'
        })
      ];

      const result = checkForMatch(lobby, presets);
      expect(result.matched).toBe(false);
    });
  });

  describe('Multiple preset scenarios', () => {
    it('matches multiple presets for the same lobby', () => {
      const lobby = createMockLobby({
        gameConfig: {
          gameMap: 'europe',
          gameMode: 'FFA',
          maxPlayers: 100
        }
      });

      const presets = [
        createMockPreset({ active: true, name: 'Any Game', mode: 'Any' }),
        createMockPreset({ active: true, name: 'Europe Games', maps: ['europe'] }),
        createMockPreset({ active: true, name: 'FFA Only', mode: 'FFA' }),
        createMockPreset({ active: true, name: 'Team Only', mode: 'Team' })
      ];

      const result = checkForMatch(lobby, presets);
      expect(result.matched).toBe(true);
      expect(result.presets).toHaveLength(3);
      expect(result.presets.map(p => p.name)).toContain('Any Game');
      expect(result.presets.map(p => p.name)).toContain('Europe Games');
      expect(result.presets.map(p => p.name)).toContain('FFA Only');
    });

    it('respects preset enabled/disabled state', () => {
      const lobby = createMockLobby({
        gameConfig: { gameMap: 'europe', gameMode: 'FFA' }
      });

      const presets = [
        createMockPreset({ active: false, name: 'Disabled', mode: 'FFA' }),
        createMockPreset({ active: true, name: 'Enabled', mode: 'FFA' })
      ];

      const result = checkForMatch(lobby, presets);
      expect(result.matched).toBe(true);
      expect(result.presets).toHaveLength(1);
      expect(result.presets[0].name).toBe('Enabled');
    });
  });

  describe('Edge case API responses', () => {
    it('handles empty lobbies array', () => {
      const presets = [createMockPreset({ active: true })];

      // Simulating no lobby available
      const result = checkForMatch(null, presets);
      expect(result.matched).toBe(false);
    });

    it('handles lobby with missing gameConfig', () => {
      const lobby = {
        gameID: 'minimal',
        numClients: 10
        // gameConfig is undefined
      };

      const presets = [
        createMockPreset({ active: true, mode: 'Any' })
      ];

      const result = checkForMatch(lobby, presets);
      expect(result.matched).toBe(true);
    });

    it('handles lobby with partial gameConfig', () => {
      const lobby = {
        gameID: 'partial',
        numClients: 20,
        gameConfig: {
          gameMap: 'europe'
          // gameMode is undefined
        }
      };

      const presets = [
        createMockPreset({ active: true, mode: 'FFA', maps: ['europe'] })
      ];

      // Should default to FFA mode
      const result = checkForMatch(lobby, presets);
      expect(result.matched).toBe(true);
    });

    it('handles unusual map names', () => {
      const lobby = createMockLobby({
        gameConfig: {
          gameMap: 'baikalnukewars',
          gameMode: 'FFA'
        }
      });

      const presets = [
        createMockPreset({
          active: true,
          maps: ['baikalnukewars']
        })
      ];

      const result = checkForMatch(lobby, presets);
      expect(result.matched).toBe(true);
    });
  });

  describe('Notification deduplication scenarios', () => {
    it('different game IDs should be treated as different games', () => {
      const lobby1 = createMockLobby({ gameID: 'game-1' });
      const lobby2 = createMockLobby({ gameID: 'game-2' });

      const preset = createMockPreset({ active: true });

      const result1 = checkForMatch(lobby1, [preset]);
      const result2 = checkForMatch(lobby2, [preset]);

      // Both should match (deduplication logic is in content.js, not filter.js)
      expect(result1.matched).toBe(true);
      expect(result2.matched).toBe(true);
    });
  });

  describe('Complex filter combinations', () => {
    it('filters small team games on specific maps', () => {
      const preset = createMockPreset({
        active: true,
        mode: 'Team',
        maps: ['europe', 'africa', 'asia'],
        teamCountMin: 2,
        teamCountMax: 4,
        playersPerTeamMin: 20,
        playersPerTeamMax: 50
      });

      // Should match: Europe, 4 teams, 25 per team
      const matching = createMockLobby({
        gameConfig: {
          gameMode: 'Team',
          gameMap: 'europe',
          maxPlayers: 100,
          playerTeams: 4
        }
      });

      // Should not match: too many teams
      const tooManyTeams = createMockLobby({
        gameConfig: {
          gameMode: 'Team',
          gameMap: 'europe',
          maxPlayers: 100,
          playerTeams: 10
        }
      });

      // Should not match: wrong map
      const wrongMap = createMockLobby({
        gameConfig: {
          gameMode: 'Team',
          gameMap: 'world',
          maxPlayers: 100,
          playerTeams: 4
        }
      });

      // Should not match: FFA mode
      const ffaMode = createMockLobby({
        gameConfig: {
          gameMode: 'FFA',
          gameMap: 'europe'
        }
      });

      expect(matchesPreset(matching, preset)).toBe(true);
      expect(matchesPreset(tooManyTeams, preset)).toBe(false);
      expect(matchesPreset(wrongMap, preset)).toBe(false);
      expect(matchesPreset(ffaMode, preset)).toBe(false);
    });

    it('handles the "any" fallback for all filter options', () => {
      const preset = createMockPreset({
        active: true,
        mode: 'Any',
        maps: [],  // Any map
        teamCountMin: 0,  // Any (ignored for FFA)
        teamCountMax: Infinity,
        playersPerTeamMin: 0,
        playersPerTeamMax: Infinity
      });

      const ffa = createMockLobby({ gameConfig: { gameMode: 'FFA' } });
      const team = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 4, maxPlayers: 100 }
      });
      const randomMap = createMockLobby({ gameConfig: { gameMap: 'straitofhormuz' } });

      expect(matchesPreset(ffa, preset)).toBe(true);
      expect(matchesPreset(team, preset)).toBe(true);
      expect(matchesPreset(randomMap, preset)).toBe(true);
    });
  });
});

describe('Performance', () => {
  it('handles many presets efficiently', () => {
    const lobby = createMockLobby();
    const presets = Array.from({ length: 100 }, (_, i) =>
      createMockPreset({ active: true, name: `Preset ${i}` })
    );

    const start = performance.now();
    const result = checkForMatch(lobby, presets);
    const duration = performance.now() - start;

    expect(result.matched).toBe(true);
    expect(duration).toBeLessThan(10); // Should complete in under 10ms
  });
});
