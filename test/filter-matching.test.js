import { describe, it, expect } from 'vitest';
import { matchesPreset, checkForMatch, createDefaultPreset, normalizePreset, parseTeamCount } from '../src/filter.js';
import { LOBBY_FIXTURES, REAL_API_LOBBIES } from './fixtures/lobbies.js';
import { PRESET_FIXTURES, createPreset } from './fixtures/presets.js';

describe('matchesPreset', () => {
  describe('Game Mode Filtering', () => {
    it('matches any mode when preset mode is "Any"', () => {
      const preset = createMockPreset({ mode: 'Any' });

      const ffaLobby = createMockLobby({ gameConfig: { gameMode: 'FFA' } });
      const teamLobby = createMockLobby({ gameConfig: { gameMode: 'Team' } });

      expect(matchesPreset(ffaLobby, preset)).toBe(true);
      expect(matchesPreset(teamLobby, preset)).toBe(true);
    });

    it('matches only FFA games when preset mode is "FFA"', () => {
      const preset = createMockPreset({ mode: 'FFA' });

      const ffaLobby = createMockLobby({ gameConfig: { gameMode: 'FFA' } });
      const teamLobby = createMockLobby({ gameConfig: { gameMode: 'Team' } });

      expect(matchesPreset(ffaLobby, preset)).toBe(true);
      expect(matchesPreset(teamLobby, preset)).toBe(false);
    });

    it('matches only Team games when preset mode is "Team"', () => {
      const preset = createMockPreset({ mode: 'Team' });

      const ffaLobby = createMockLobby({ gameConfig: { gameMode: 'FFA' } });
      const teamLobby = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 4, maxPlayers: 100 }
      });

      expect(matchesPreset(ffaLobby, preset)).toBe(false);
      expect(matchesPreset(teamLobby, preset)).toBe(true);
    });

    it('defaults to FFA when gameMode is not specified', () => {
      const ffaPreset = createMockPreset({ mode: 'FFA' });
      const teamPreset = createMockPreset({ mode: 'Team' });

      const lobby = createMockLobby({ gameConfig: {} });

      expect(matchesPreset(lobby, ffaPreset)).toBe(true);
      expect(matchesPreset(lobby, teamPreset)).toBe(false);
    });

    it('normalizes "Free For All" API response to FFA', () => {
      const ffaPreset = createMockPreset({ mode: 'FFA' });
      const teamPreset = createMockPreset({ mode: 'Team' });

      const freeForAllLobby = createMockLobby({ gameConfig: { gameMode: 'Free For All' } });
      const freeforallLobby = createMockLobby({ gameConfig: { gameMode: 'Free for All' } });

      expect(matchesPreset(freeForAllLobby, ffaPreset)).toBe(true);
      expect(matchesPreset(freeForAllLobby, teamPreset)).toBe(false);
      expect(matchesPreset(freeforallLobby, ffaPreset)).toBe(true);
      expect(matchesPreset(freeforallLobby, teamPreset)).toBe(false);
    });
  });

  describe('Map Filtering', () => {
    it('matches any map when maps array is empty', () => {
      const preset = createMockPreset({ maps: [] });

      const europeLobby = createMockLobby({ gameConfig: { gameMap: 'europe' } });
      const africaLobby = createMockLobby({ gameConfig: { gameMap: 'africa' } });
      const worldLobby = createMockLobby({ gameConfig: { gameMap: 'world' } });

      expect(matchesPreset(europeLobby, preset)).toBe(true);
      expect(matchesPreset(africaLobby, preset)).toBe(true);
      expect(matchesPreset(worldLobby, preset)).toBe(true);
    });

    it('matches only specified maps when maps array has entries', () => {
      const preset = createMockPreset({ maps: ['europe', 'africa'] });

      const europeLobby = createMockLobby({ gameConfig: { gameMap: 'europe' } });
      const africaLobby = createMockLobby({ gameConfig: { gameMap: 'africa' } });
      const worldLobby = createMockLobby({ gameConfig: { gameMap: 'world' } });

      expect(matchesPreset(europeLobby, preset)).toBe(true);
      expect(matchesPreset(africaLobby, preset)).toBe(true);
      expect(matchesPreset(worldLobby, preset)).toBe(false);
    });

    it('matches maps case-insensitively', () => {
      const preset = createMockPreset({ maps: ['Europe', 'AFRICA'] });

      const europeLobby = createMockLobby({ gameConfig: { gameMap: 'europe' } });
      const africaLobby = createMockLobby({ gameConfig: { gameMap: 'africa' } });

      expect(matchesPreset(europeLobby, preset)).toBe(true);
      expect(matchesPreset(africaLobby, preset)).toBe(true);
    });

    it('handles missing gameMap gracefully', () => {
      const preset = createMockPreset({ maps: ['europe'] });

      const lobby = createMockLobby({ gameConfig: {} });

      expect(matchesPreset(lobby, preset)).toBe(false);
    });
  });

  describe('Team Count Filtering', () => {
    it('ignores team count filters for FFA games', () => {
      const preset = createMockPreset({
        mode: 'Any',
        teamCountMin: 4,
        teamCountMax: 8
      });

      const ffaLobby = createMockLobby({ gameConfig: { gameMode: 'FFA' } });

      expect(matchesPreset(ffaLobby, preset)).toBe(true);
    });

    it('filters by minimum team count', () => {
      const preset = createMockPreset({
        mode: 'Team',
        teamCountMin: 4,
        teamCountMax: Infinity
      });

      const twoTeams = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 2, maxPlayers: 100 }
      });
      const fourTeams = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 4, maxPlayers: 100 }
      });
      const sixTeams = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 6, maxPlayers: 100 }
      });

      expect(matchesPreset(twoTeams, preset)).toBe(false);
      expect(matchesPreset(fourTeams, preset)).toBe(true);
      expect(matchesPreset(sixTeams, preset)).toBe(true);
    });

    it('filters by maximum team count', () => {
      const preset = createMockPreset({
        mode: 'Team',
        teamCountMin: 0,
        teamCountMax: 4
      });

      const twoTeams = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 2, maxPlayers: 100 }
      });
      const fourTeams = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 4, maxPlayers: 100 }
      });
      const sixTeams = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 6, maxPlayers: 100 }
      });

      expect(matchesPreset(twoTeams, preset)).toBe(true);
      expect(matchesPreset(fourTeams, preset)).toBe(true);
      expect(matchesPreset(sixTeams, preset)).toBe(false);
    });

    it('filters by team count range', () => {
      const preset = createMockPreset({
        mode: 'Team',
        teamCountMin: 3,
        teamCountMax: 5
      });

      const twoTeams = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 2, maxPlayers: 100 }
      });
      const fourTeams = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 4, maxPlayers: 100 }
      });
      const sixTeams = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 6, maxPlayers: 100 }
      });

      expect(matchesPreset(twoTeams, preset)).toBe(false);
      expect(matchesPreset(fourTeams, preset)).toBe(true);
      expect(matchesPreset(sixTeams, preset)).toBe(false);
    });
  });

  describe('Players Per Team Filtering', () => {
    it('ignores players per team filters for FFA games', () => {
      const preset = createMockPreset({
        mode: 'Any',
        playersPerTeamMin: 10,
        playersPerTeamMax: 20
      });

      const ffaLobby = createMockLobby({ gameConfig: { gameMode: 'FFA' } });

      expect(matchesPreset(ffaLobby, preset)).toBe(true);
    });

    it('calculates players per team correctly', () => {
      const preset = createMockPreset({
        mode: 'Team',
        playersPerTeamMin: 20,
        playersPerTeamMax: 30
      });

      const twentyFivePerTeam = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 4, maxPlayers: 100 }
      });
      const fiftyPerTeam = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 2, maxPlayers: 100 }
      });
      const tenPerTeam = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 10, maxPlayers: 100 }
      });

      expect(matchesPreset(twentyFivePerTeam, preset)).toBe(true);
      expect(matchesPreset(fiftyPerTeam, preset)).toBe(false);
      expect(matchesPreset(tenPerTeam, preset)).toBe(false);
    });

    it('handles zero teams gracefully', () => {
      const preset = createMockPreset({
        mode: 'Team',
        playersPerTeamMin: 10,
        playersPerTeamMax: 100
      });

      const zeroTeams = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 0, maxPlayers: 100 }
      });

      // 0 players per team should fail minimum of 10
      expect(matchesPreset(zeroTeams, preset)).toBe(false);
    });
  });

  describe('Combined Filters', () => {
    it('matches when all criteria are satisfied', () => {
      const preset = createMockPreset({
        mode: 'Team',
        maps: ['europe', 'africa'],
        teamCountMin: 2,
        teamCountMax: 6,
        playersPerTeamMin: 10,
        playersPerTeamMax: 50
      });

      const matchingLobby = createMockLobby({
        gameConfig: {
          gameMode: 'Team',
          gameMap: 'europe',
          playerTeams: 4,
          maxPlayers: 100  // 25 per team
        }
      });

      expect(matchesPreset(matchingLobby, preset)).toBe(true);
    });

    it('fails when mode does not match', () => {
      const preset = createMockPreset({
        mode: 'Team',
        maps: ['europe'],
        teamCountMin: 2,
        teamCountMax: 6
      });

      const ffaLobby = createMockLobby({
        gameConfig: { gameMode: 'FFA', gameMap: 'europe' }
      });

      expect(matchesPreset(ffaLobby, preset)).toBe(false);
    });

    it('fails when map does not match', () => {
      const preset = createMockPreset({
        mode: 'Team',
        maps: ['europe'],
        teamCountMin: 2,
        teamCountMax: 6
      });

      const wrongMapLobby = createMockLobby({
        gameConfig: {
          gameMode: 'Team',
          gameMap: 'africa',
          playerTeams: 4,
          maxPlayers: 100
        }
      });

      expect(matchesPreset(wrongMapLobby, preset)).toBe(false);
    });

    it('fails when team count is out of range', () => {
      const preset = createMockPreset({
        mode: 'Team',
        maps: ['europe'],
        teamCountMin: 2,
        teamCountMax: 4
      });

      const tooManyTeams = createMockLobby({
        gameConfig: {
          gameMode: 'Team',
          gameMap: 'europe',
          playerTeams: 8,
          maxPlayers: 100
        }
      });

      expect(matchesPreset(tooManyTeams, preset)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles missing gameConfig gracefully', () => {
      const preset = createMockPreset({ mode: 'Any' });
      const lobby = { gameID: 'test' };

      expect(matchesPreset(lobby, preset)).toBe(true);
    });

    it('handles null/undefined preset values', () => {
      const preset = createMockPreset({
        maps: null,
        teamCountMin: undefined,
        teamCountMax: undefined
      });
      const lobby = createMockLobby();

      expect(() => matchesPreset(lobby, preset)).not.toThrow();
    });

    it('handles lobby with partial gameConfig', () => {
      const lobby = {
        gameID: 'partial',
        numClients: 20,
        gameConfig: {
          gameMap: 'europe'
        }
      };

      const preset = createMockPreset({ active: true, mode: 'FFA', maps: ['europe'] });

      const result = matchesPreset(lobby, preset);
      expect(result).toBe(true);
    });

    it('handles unusual map names', () => {
      const lobby = createMockLobby({
        gameConfig: {
          gameMap: 'baikalnukewars',
          gameMode: 'FFA'
        }
      });

      const preset = createMockPreset({
        active: true,
        maps: ['baikalnukewars']
      });

      expect(matchesPreset(lobby, preset)).toBe(true);
    });
  });
});

describe('checkForMatch', () => {
  it('returns no match when lobby is null', () => {
    const presets = [createMockPreset({ active: true })];
    const result = checkForMatch(null, presets);

    expect(result.matched).toBe(false);
    expect(result.presets).toEqual([]);
  });

  it('returns no match when no presets are active', () => {
    const presets = [
      createMockPreset({ active: false }),
      createMockPreset({ active: false })
    ];
    const lobby = createMockLobby();

    const result = checkForMatch(lobby, presets);

    expect(result.matched).toBe(false);
    expect(result.presets).toEqual([]);
  });

  it('returns match when at least one active preset matches (OR logic)', () => {
    const presets = [
      createMockPreset({ active: true, mode: 'Team' }),  // Won't match FFA
      createMockPreset({ active: true, mode: 'FFA' }),   // Will match
      createMockPreset({ active: false, mode: 'Any' })   // Inactive
    ];
    const lobby = createMockLobby({ gameConfig: { gameMode: 'FFA' } });

    const result = checkForMatch(lobby, presets);

    expect(result.matched).toBe(true);
    expect(result.presets).toHaveLength(1);
    expect(result.presets[0].mode).toBe('FFA');
  });

  it('returns all matching presets', () => {
    const presets = [
      createMockPreset({ active: true, mode: 'Any', name: 'Any Mode' }),
      createMockPreset({ active: true, mode: 'FFA', name: 'FFA Only' }),
      createMockPreset({ active: true, mode: 'Team', name: 'Team Only' })
    ];
    const lobby = createMockLobby({ gameConfig: { gameMode: 'FFA' } });

    const result = checkForMatch(lobby, presets);

    expect(result.matched).toBe(true);
    expect(result.presets).toHaveLength(2);
    expect(result.presets.map(p => p.name)).toContain('Any Mode');
    expect(result.presets.map(p => p.name)).toContain('FFA Only');
  });

  it('returns no match when no active presets match', () => {
    const presets = [
      createMockPreset({ active: true, mode: 'Team' }),
      createMockPreset({ active: true, maps: ['africa'] })
    ];
    const lobby = createMockLobby({
      gameConfig: { gameMode: 'FFA', gameMap: 'europe' }
    });

    const result = checkForMatch(lobby, presets);

    expect(result.matched).toBe(false);
    expect(result.presets).toEqual([]);
  });

  it('handles empty presets array', () => {
    const lobby = createMockLobby();
    const result = checkForMatch(lobby, []);

    expect(result.matched).toBe(false);
    expect(result.presets).toEqual([]);
  });
});

describe('createDefaultPreset', () => {
  it('creates a preset with default values', () => {
    const preset = createDefaultPreset();

    expect(preset.id).toBeDefined();
    expect(preset.name).toBe('New Preset');
    expect(preset.active).toBe(false);
    expect(preset.mode).toBe('Any');
    expect(preset.maps).toEqual([]);
    expect(preset.teamCountMin).toBe(0);
    expect(preset.teamCountMax).toBe(Infinity);
    expect(preset.playersPerTeamMin).toBe(0);
    expect(preset.playersPerTeamMax).toBe(Infinity);
  });

  it('generates unique IDs', () => {
    const preset1 = createDefaultPreset();
    const preset2 = createDefaultPreset();

    expect(preset1.id).not.toBe(preset2.id);
  });
});

describe('checkForMatch - Extended', () => {
  it('returns matching presets in original order', () => {
    const presets = [
      createPreset({ active: true, name: 'First', mode: 'Any' }),
      createPreset({ active: true, name: 'Second', mode: 'Any' }),
      createPreset({ active: true, name: 'Third', mode: 'Any' })
    ];
    const result = checkForMatch(LOBBY_FIXTURES.ffaEuropeLarge, presets);

    expect(result.matched).toBe(true);
    expect(result.presets.map(p => p.name)).toEqual(['First', 'Second', 'Third']);
  });

  it('correctly filters out inactive presets that would otherwise match', () => {
    const presets = [
      createPreset({ active: false, name: 'Inactive Any', mode: 'Any' }),
      createPreset({ active: true, name: 'Active FFA', mode: 'FFA' }),
      createPreset({ active: false, name: 'Inactive FFA', mode: 'FFA' })
    ];
    const result = checkForMatch(LOBBY_FIXTURES.ffaEuropeLarge, presets);

    expect(result.matched).toBe(true);
    expect(result.presets).toHaveLength(1);
    expect(result.presets[0].name).toBe('Active FFA');
  });

  it('handles mix of matching and non-matching active presets', () => {
    const presets = [
      createPreset({ active: true, name: 'Europe FFA', mode: 'FFA', maps: ['europe'] }),
      createPreset({ active: true, name: 'Africa FFA', mode: 'FFA', maps: ['africa'] }),
      createPreset({ active: true, name: 'Team Only', mode: 'Team' })
    ];
    const result = checkForMatch(LOBBY_FIXTURES.ffaEuropeLarge, presets);

    expect(result.matched).toBe(true);
    expect(result.presets).toHaveLength(1);
    expect(result.presets[0].name).toBe('Europe FFA');
  });

  it('is pure/stateless - same inputs produce same outputs', () => {
    const presets = [createPreset({ active: true, mode: 'Any' })];

    const result1 = checkForMatch(LOBBY_FIXTURES.ffaEuropeLarge, presets);
    const result2 = checkForMatch(LOBBY_FIXTURES.ffaEuropeLarge, presets);

    expect(result1.matched).toBe(result2.matched);
    expect(result1.presets).toHaveLength(result2.presets.length);
  });

  it('correctly matches different lobbies against same presets', () => {
    const presets = [
      createPreset({ active: true, name: 'FFA Only', mode: 'FFA' }),
      createPreset({ active: true, name: 'Team Only', mode: 'Team' })
    ];

    const ffaResult = checkForMatch(LOBBY_FIXTURES.ffaEuropeLarge, presets);
    const teamResult = checkForMatch(LOBBY_FIXTURES.teamSquadsWorld, presets);

    expect(ffaResult.matched).toBe(true);
    expect(ffaResult.presets[0].name).toBe('FFA Only');

    expect(teamResult.matched).toBe(true);
    expect(teamResult.presets[0].name).toBe('Team Only');
  });

  it('efficiently handles 100 presets', () => {
    const presets = Array.from({ length: 100 }, (_, i) =>
      createPreset({ active: true, name: `Preset ${i}`, mode: 'Any' })
    );

    const start = performance.now();
    const result = checkForMatch(LOBBY_FIXTURES.ffaEuropeLarge, presets);
    const duration = performance.now() - start;

    expect(result.matched).toBe(true);
    expect(result.presets).toHaveLength(100);
    expect(duration).toBeLessThan(10); // Should complete in under 10ms
  });

  it('efficiently handles 1000 presets', () => {
    const presets = Array.from({ length: 1000 }, (_, i) =>
      createPreset({ active: true, name: `Preset ${i}`, mode: 'Any' })
    );

    const start = performance.now();
    const result = checkForMatch(LOBBY_FIXTURES.ffaEuropeLarge, presets);
    const duration = performance.now() - start;

    expect(result.matched).toBe(true);
    expect(result.presets).toHaveLength(1000);
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
  });
});

describe('createDefaultPreset - Extended', () => {
  it('ID format is alphanumeric', () => {
    const preset = createDefaultPreset();
    expect(preset.id).toMatch(/^[a-z0-9]+$/);
  });

  it('ID length is reasonable (8-16 chars)', () => {
    const preset = createDefaultPreset();
    expect(preset.id.length).toBeGreaterThanOrEqual(8);
    expect(preset.id.length).toBeLessThanOrEqual(16);
  });

  it('default preset matches any FFA lobby when activated', () => {
    const preset = createDefaultPreset();
    preset.active = true;

    const result = checkForMatch(LOBBY_FIXTURES.ffaEuropeLarge, [preset]);
    expect(result.matched).toBe(true);
  });

  it('default preset matches any Team lobby when activated', () => {
    const preset = createDefaultPreset();
    preset.active = true;

    const result = checkForMatch(LOBBY_FIXTURES.teamSquadsWorld, [preset]);
    expect(result.matched).toBe(true);
  });
});

describe('Size Filtering', () => {
  const mapSizes = {
    'europe': 'large',
    'africa': 'large',
    'world': 'tiny',
    'britannia': 'medium',
    'achiran': 'small',
    'faroeislands': 'tiny'
  };

  describe('matchesPreset with sizes', () => {
    it('matches any size when sizes array is empty', () => {
      const preset = createMockPreset({ sizes: [] });

      const europeLobby = createMockLobby({ gameConfig: { gameMap: 'europe' } });
      const worldLobby = createMockLobby({ gameConfig: { gameMap: 'world' } });
      const britanniaLobby = createMockLobby({ gameConfig: { gameMap: 'britannia' } });

      expect(matchesPreset(europeLobby, preset, mapSizes)).toBe(true);
      expect(matchesPreset(worldLobby, preset, mapSizes)).toBe(true);
      expect(matchesPreset(britanniaLobby, preset, mapSizes)).toBe(true);
    });

    it('matches only specified size when sizes array has single entry', () => {
      const preset = createMockPreset({ sizes: ['large'] });

      const europeLobby = createMockLobby({ gameConfig: { gameMap: 'europe' } });
      const worldLobby = createMockLobby({ gameConfig: { gameMap: 'world' } });
      const britanniaLobby = createMockLobby({ gameConfig: { gameMap: 'britannia' } });

      expect(matchesPreset(europeLobby, preset, mapSizes)).toBe(true);  // large
      expect(matchesPreset(worldLobby, preset, mapSizes)).toBe(false);  // tiny
      expect(matchesPreset(britanniaLobby, preset, mapSizes)).toBe(false);  // medium
    });

    it('matches multiple sizes (OR logic)', () => {
      const preset = createMockPreset({ sizes: ['tiny', 'large'] });

      const europeLobby = createMockLobby({ gameConfig: { gameMap: 'europe' } });
      const worldLobby = createMockLobby({ gameConfig: { gameMap: 'world' } });
      const britanniaLobby = createMockLobby({ gameConfig: { gameMap: 'britannia' } });
      const achiranLobby = createMockLobby({ gameConfig: { gameMap: 'achiran' } });

      expect(matchesPreset(europeLobby, preset, mapSizes)).toBe(true);  // large
      expect(matchesPreset(worldLobby, preset, mapSizes)).toBe(true);  // tiny
      expect(matchesPreset(britanniaLobby, preset, mapSizes)).toBe(false);  // medium
      expect(matchesPreset(achiranLobby, preset, mapSizes)).toBe(false);  // small
    });

    it('handles unknown map sizes by rejecting', () => {
      const preset = createMockPreset({ sizes: ['large'] });

      const unknownLobby = createMockLobby({ gameConfig: { gameMap: 'unknownmap' } });

      expect(matchesPreset(unknownLobby, preset, mapSizes)).toBe(false);
    });

    it('handles unknown map sizes with empty mapSizes object', () => {
      const preset = createMockPreset({ sizes: ['large'] });

      const europeLobby = createMockLobby({ gameConfig: { gameMap: 'europe' } });

      expect(matchesPreset(europeLobby, preset, {})).toBe(false);
    });

    it('handles missing mapSizes parameter (defaults to empty)', () => {
      const preset = createMockPreset({ sizes: ['large'] });

      const europeLobby = createMockLobby({ gameConfig: { gameMap: 'europe' } });

      // When mapSizes is not provided, defaults to {}
      expect(matchesPreset(europeLobby, preset)).toBe(false);
    });

    it('empty sizes array matches even when mapSizes is empty', () => {
      const preset = createMockPreset({ sizes: [] });

      const europeLobby = createMockLobby({ gameConfig: { gameMap: 'europe' } });

      expect(matchesPreset(europeLobby, preset, {})).toBe(true);
    });
  });

  describe('Combined filters with sizes', () => {
    it('matches when mode, maps, and sizes all match', () => {
      const preset = createMockPreset({
        mode: 'FFA',
        maps: ['europe', 'africa'],
        sizes: ['large']
      });

      const europeFfaLobby = createMockLobby({
        gameConfig: { gameMode: 'FFA', gameMap: 'europe' }
      });

      expect(matchesPreset(europeFfaLobby, preset, mapSizes)).toBe(true);
    });

    it('rejects when size does not match even if mode and maps match', () => {
      const preset = createMockPreset({
        mode: 'FFA',
        maps: ['europe', 'world'],
        sizes: ['large']  // Only large maps
      });

      const worldFfaLobby = createMockLobby({
        gameConfig: { gameMode: 'FFA', gameMap: 'world' }
      });

      expect(matchesPreset(worldFfaLobby, preset, mapSizes)).toBe(false);  // world is tiny
    });

    it('rejects when mode does not match even if size matches', () => {
      const preset = createMockPreset({
        mode: 'Team',
        sizes: ['large']
      });

      const europeFfaLobby = createMockLobby({
        gameConfig: { gameMode: 'FFA', gameMap: 'europe' }
      });

      expect(matchesPreset(europeFfaLobby, preset, mapSizes)).toBe(false);
    });

    it('rejects when map does not match even if size matches', () => {
      const preset = createMockPreset({
        maps: ['africa'],  // Only africa
        sizes: ['large']
      });

      const europeLobby = createMockLobby({
        gameConfig: { gameMap: 'europe' }  // europe is large but not in maps list
      });

      expect(matchesPreset(europeLobby, preset, mapSizes)).toBe(false);
    });

    it('all four sizes can be selected', () => {
      const preset = createMockPreset({
        sizes: ['tiny', 'small', 'medium', 'large']
      });

      expect(matchesPreset(createMockLobby({ gameConfig: { gameMap: 'europe' } }), preset, mapSizes)).toBe(true);
      expect(matchesPreset(createMockLobby({ gameConfig: { gameMap: 'world' } }), preset, mapSizes)).toBe(true);
      expect(matchesPreset(createMockLobby({ gameConfig: { gameMap: 'britannia' } }), preset, mapSizes)).toBe(true);
      expect(matchesPreset(createMockLobby({ gameConfig: { gameMap: 'achiran' } }), preset, mapSizes)).toBe(true);
    });
  });

  describe('checkForMatch with sizes', () => {
    it('passes mapSizes through to matchesPreset', () => {
      const presets = [
        createMockPreset({ active: true, name: 'Large Only', sizes: ['large'] }),
        createMockPreset({ active: true, name: 'Tiny Only', sizes: ['tiny'] })
      ];

      const europeLobby = createMockLobby({ gameConfig: { gameMap: 'europe' } });
      const worldLobby = createMockLobby({ gameConfig: { gameMap: 'world' } });

      const europeResult = checkForMatch(europeLobby, presets, mapSizes);
      const worldResult = checkForMatch(worldLobby, presets, mapSizes);

      expect(europeResult.matched).toBe(true);
      expect(europeResult.presets).toHaveLength(1);
      expect(europeResult.presets[0].name).toBe('Large Only');

      expect(worldResult.matched).toBe(true);
      expect(worldResult.presets).toHaveLength(1);
      expect(worldResult.presets[0].name).toBe('Tiny Only');
    });

    it('multiple presets can match different sizes', () => {
      const presets = [
        createMockPreset({ active: true, name: 'Large Maps', sizes: ['large'] }),
        createMockPreset({ active: true, name: 'Any Size', sizes: [] })
      ];

      const europeLobby = createMockLobby({ gameConfig: { gameMap: 'europe' } });
      const result = checkForMatch(europeLobby, presets, mapSizes);

      expect(result.matched).toBe(true);
      expect(result.presets).toHaveLength(2);  // Both should match
    });
  });

  describe('Real-world size filtering scenarios', () => {
    it('User: "I only want large maps" scenario', () => {
      const preset = createMockPreset({
        active: true,
        name: 'Large Maps Only',
        mode: 'Any',
        sizes: ['large']
      });

      expect(matchesPreset(createMockLobby({ gameConfig: { gameMap: 'europe' } }), preset, mapSizes)).toBe(true);
      expect(matchesPreset(createMockLobby({ gameConfig: { gameMap: 'africa' } }), preset, mapSizes)).toBe(true);
      expect(matchesPreset(createMockLobby({ gameConfig: { gameMap: 'world' } }), preset, mapSizes)).toBe(false);
      expect(matchesPreset(createMockLobby({ gameConfig: { gameMap: 'britannia' } }), preset, mapSizes)).toBe(false);
    });

    it('User: "Medium or large maps for team games" scenario', () => {
      const preset = createMockPreset({
        active: true,
        name: 'Team on Med/Large',
        mode: 'Team',
        sizes: ['medium', 'large']
      });

      // Team game on europe (large) - should match
      const teamEurope = createMockLobby({
        gameConfig: { gameMode: 'Team', gameMap: 'europe', playerTeams: 4, maxPlayers: 100 }
      });
      expect(matchesPreset(teamEurope, preset, mapSizes)).toBe(true);

      // Team game on britannia (medium) - should match
      const teamBritannia = createMockLobby({
        gameConfig: { gameMode: 'Team', gameMap: 'britannia', playerTeams: 4, maxPlayers: 100 }
      });
      expect(matchesPreset(teamBritannia, preset, mapSizes)).toBe(true);

      // Team game on world (tiny) - should NOT match
      const teamWorld = createMockLobby({
        gameConfig: { gameMode: 'Team', gameMap: 'world', playerTeams: 4, maxPlayers: 100 }
      });
      expect(matchesPreset(teamWorld, preset, mapSizes)).toBe(false);

      // FFA on europe (large) - should NOT match (wrong mode)
      const ffaEurope = createMockLobby({
        gameConfig: { gameMode: 'FFA', gameMap: 'europe' }
      });
      expect(matchesPreset(ffaEurope, preset, mapSizes)).toBe(false);
    });

    it('User: "Quick games on tiny maps" scenario', () => {
      const preset = createMockPreset({
        active: true,
        name: 'Quick Tiny Maps',
        mode: 'FFA',
        sizes: ['tiny']
      });

      expect(matchesPreset(createMockLobby({ gameConfig: { gameMode: 'FFA', gameMap: 'world' } }), preset, mapSizes)).toBe(true);
      expect(matchesPreset(createMockLobby({ gameConfig: { gameMode: 'FFA', gameMap: 'faroeislands' } }), preset, mapSizes)).toBe(true);
      expect(matchesPreset(createMockLobby({ gameConfig: { gameMode: 'FFA', gameMap: 'europe' } }), preset, mapSizes)).toBe(false);
    });
  });
});

describe('createDefaultPreset - sizes', () => {
  it('creates preset with empty sizes array', () => {
    const preset = createDefaultPreset();
    expect(preset.sizes).toEqual([]);
  });
});

describe('normalizePreset', () => {
  it('preserves valid numeric teamCountMax value', () => {
    const raw = { id: 'test', mode: 'Team', teamCountMax: 6 };
    const normalized = normalizePreset(raw);
    expect(normalized.teamCountMax).toBe(6);
  });

  it('converts undefined teamCountMax to Infinity', () => {
    const raw = { id: 'test', mode: 'Team', teamCountMax: undefined };
    const normalized = normalizePreset(raw);
    expect(normalized.teamCountMax).toBe(Infinity);
  });

  it('converts null teamCountMax to Infinity (storage serialization fix)', () => {
    const raw = { id: 'test', mode: 'Team', teamCountMax: null };
    const normalized = normalizePreset(raw);
    expect(normalized.teamCountMax).toBe(Infinity);
  });

  it('handles missing teamCountMax field (old presets)', () => {
    const raw = { id: 'test', mode: 'Team' };
    const normalized = normalizePreset(raw);
    expect(normalized.teamCountMax).toBe(Infinity);
  });

  it('normalizes all filter fields with defaults', () => {
    const raw = { id: 'test' };
    const normalized = normalizePreset(raw);

    expect(normalized.id).toBe('test');
    expect(normalized.name).toBe('Unnamed Preset');
    expect(normalized.active).toBe(false);
    expect(normalized.mode).toBe('Any');
    expect(normalized.maps).toEqual([]);
    expect(normalized.sizes).toEqual([]);
    expect(normalized.teamCountMin).toBe(0);
    expect(normalized.teamCountMax).toBe(Infinity);
    expect(normalized.playersPerTeamMin).toBe(0);
    expect(normalized.playersPerTeamMax).toBe(Infinity);
  });

  it('properly normalizes preset so team filter works correctly', () => {
    // Simulate old preset missing teamCountMax (was undefined)
    // This caused the bug where 25-team games matched 1-6 team filter
    const oldPreset = { id: 'old', mode: 'Team', teamCountMin: 1 };
    const normalized = normalizePreset(oldPreset);

    // After normalization, teamCountMax should be Infinity
    // This means the preset matches ANY team count (not a specific range)
    const lobby25Teams = { gameConfig: { gameMode: 'Team', playerTeams: 25, maxPlayers: 100 } };
    expect(matchesPreset(lobby25Teams, normalized)).toBe(true);
  });

  it('normalized preset with explicit teamCountMax rejects games outside range', () => {
    const preset = normalizePreset({
      id: 'test',
      mode: 'Team',
      teamCountMin: 1,
      teamCountMax: 6
    });

    const lobby25Teams = { gameConfig: { gameMode: 'Team', playerTeams: 25, maxPlayers: 100 } };
    expect(matchesPreset(lobby25Teams, preset)).toBe(false);

    const lobby4Teams = { gameConfig: { gameMode: 'Team', playerTeams: 4, maxPlayers: 100 } };
    expect(matchesPreset(lobby4Teams, preset)).toBe(true);
  });
});

describe('parseTeamCount', () => {
  describe('numeric values', () => {
    it('returns numeric value as-is', () => {
      expect(parseTeamCount(33)).toBe(33);
      expect(parseTeamCount(4)).toBe(4);
      expect(parseTeamCount(100)).toBe(100);
    });

    it('returns 0 for zero', () => {
      expect(parseTeamCount(0)).toBe(0);
    });

    it('ignores maxPlayers when playerTeams is numeric', () => {
      expect(parseTeamCount(50, 100)).toBe(50);
      expect(parseTeamCount(2, 60)).toBe(2);
    });
  });

  describe('string values - Duos format (real API)', () => {
    it('calculates team count as maxPlayers / 2', () => {
      expect(parseTeamCount('Duos', 100)).toBe(50);  // 100 / 2 = 50 teams
      expect(parseTeamCount('Duos', 60)).toBe(30);   // 60 / 2 = 30 teams
    });

    it('handles case insensitivity', () => {
      expect(parseTeamCount('duos', 100)).toBe(50);
      expect(parseTeamCount('DUOS', 100)).toBe(50);
    });

    it('floors the result for odd maxPlayers', () => {
      expect(parseTeamCount('Duos', 99)).toBe(49);   // 99 / 2 = 49.5 -> 49
    });
  });

  describe('string values - Trios format (real API)', () => {
    it('calculates team count as maxPlayers / 3', () => {
      expect(parseTeamCount('Trios', 60)).toBe(20);  // 60 / 3 = 20 teams
      expect(parseTeamCount('Trios', 99)).toBe(33);  // 99 / 3 = 33 teams
    });

    it('handles case insensitivity', () => {
      expect(parseTeamCount('trios', 60)).toBe(20);
      expect(parseTeamCount('TRIOS', 60)).toBe(20);
    });
  });

  describe('string values - Quads format (real API)', () => {
    it('calculates team count as maxPlayers / 4', () => {
      expect(parseTeamCount('Quads', 100)).toBe(25); // 100 / 4 = 25 teams
      expect(parseTeamCount('Quads', 60)).toBe(15);  // 60 / 4 = 15 teams
    });

    it('handles case insensitivity', () => {
      expect(parseTeamCount('quads', 100)).toBe(25);
      expect(parseTeamCount('QUADS', 100)).toBe(25);
    });
  });

  describe('edge cases', () => {
    it('returns 0 for null', () => {
      expect(parseTeamCount(null)).toBe(0);
    });

    it('returns 0 for undefined', () => {
      expect(parseTeamCount(undefined)).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(parseTeamCount('')).toBe(0);
    });

    it('returns 0 for unrecognized strings', () => {
      expect(parseTeamCount('some random text', 100)).toBe(0);
      expect(parseTeamCount('5 teams', 100)).toBe(0);
    });

    it('returns 0 for string format without maxPlayers', () => {
      expect(parseTeamCount('Duos')).toBe(0);      // No maxPlayers, can't calculate
      expect(parseTeamCount('Trios', 0)).toBe(0);  // maxPlayers = 0
    });
  });
});

describe('matchesPreset with string playerTeams (real API format)', () => {
  it('correctly filters Trios lobbies', () => {
    const preset = normalizePreset({
      id: 'test',
      mode: 'Team',
      teamCountMin: 0,
      teamCountMax: 8
    });

    // 60 players / 3 = 20 teams, should NOT match max 8 teams
    const lobbyTrios60 = { gameConfig: { gameMode: 'Team', playerTeams: 'Trios', maxPlayers: 60 } };
    expect(matchesPreset(lobbyTrios60, preset)).toBe(false);

    // 24 players / 3 = 8 teams, should match max 8 teams
    const lobbyTrios24 = { gameConfig: { gameMode: 'Team', playerTeams: 'Trios', maxPlayers: 24 } };
    expect(matchesPreset(lobbyTrios24, preset)).toBe(true);
  });

  it('correctly filters Duos lobbies', () => {
    const preset = normalizePreset({
      id: 'test',
      mode: 'Team',
      teamCountMin: 0,
      teamCountMax: 10
    });

    // 100 players / 2 = 50 teams, should NOT match max 10 teams
    const lobbyDuos100 = { gameConfig: { gameMode: 'Team', playerTeams: 'Duos', maxPlayers: 100 } };
    expect(matchesPreset(lobbyDuos100, preset)).toBe(false);

    // 16 players / 2 = 8 teams, should match max 10 teams
    const lobbyDuos16 = { gameConfig: { gameMode: 'Team', playerTeams: 'Duos', maxPlayers: 16 } };
    expect(matchesPreset(lobbyDuos16, preset)).toBe(true);
  });

  it('correctly filters Quads lobbies', () => {
    const preset = normalizePreset({
      id: 'test',
      mode: 'Team',
      teamCountMin: 0,
      teamCountMax: 10
    });

    // 100 players / 4 = 25 teams, should NOT match max 10 teams
    const lobbyQuads100 = { gameConfig: { gameMode: 'Team', playerTeams: 'Quads', maxPlayers: 100 } };
    expect(matchesPreset(lobbyQuads100, preset)).toBe(false);

    // 40 players / 4 = 10 teams, should match max 10 teams
    const lobbyQuads40 = { gameConfig: { gameMode: 'Team', playerTeams: 'Quads', maxPlayers: 40 } };
    expect(matchesPreset(lobbyQuads40, preset)).toBe(true);
  });

  it('handles mixed numeric and string playerTeams values', () => {
    const preset = normalizePreset({
      id: 'test',
      mode: 'Team',
      teamCountMin: 2,
      teamCountMax: 6
    });

    // Numeric value: 4 teams, should match
    const numericLobby = { gameConfig: { gameMode: 'Team', playerTeams: 4, maxPlayers: 100 } };
    expect(matchesPreset(numericLobby, preset)).toBe(true);

    // Trios: 15 players / 3 = 5 teams, should match (2-6 range)
    const triosInRange = { gameConfig: { gameMode: 'Team', playerTeams: 'Trios', maxPlayers: 15 } };
    expect(matchesPreset(triosInRange, preset)).toBe(true);

    // Trios: 30 players / 3 = 10 teams, should NOT match (outside 2-6 range)
    const triosOutRange = { gameConfig: { gameMode: 'Team', playerTeams: 'Trios', maxPlayers: 30 } };
    expect(matchesPreset(triosOutRange, preset)).toBe(false);
  });
});

describe('matchesPreset with Humans vs Nations filter', () => {
  describe('humansVsNations: true (only match HvN lobbies)', () => {
    it('matches HvN lobby when preset has humansVsNations: true', () => {
      const preset = normalizePreset({ id: 'hvn', mode: 'Team', humansVsNations: true });
      expect(matchesPreset(LOBBY_FIXTURES.humansVsNations, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.humansVsNationsEurope, preset)).toBe(true);
    });

    it('does not match regular team lobby when preset has humansVsNations: true', () => {
      const preset = normalizePreset({ id: 'hvn', mode: 'Team', humansVsNations: true });
      expect(matchesPreset(LOBBY_FIXTURES.teamFourTeamsEurope, preset)).toBe(false);
      expect(matchesPreset(LOBBY_FIXTURES.teamDuosEurope, preset)).toBe(false);
      expect(matchesPreset(LOBBY_FIXTURES.realTeamDuos, preset)).toBe(false);
    });

    it('does not match FFA lobby when preset has humansVsNations: true', () => {
      const preset = normalizePreset({ id: 'hvn', mode: 'Any', humansVsNations: true });
      expect(matchesPreset(LOBBY_FIXTURES.ffaEuropeSmall, preset)).toBe(false);
    });
  });

  describe('humansVsNations: false (exclude HvN lobbies)', () => {
    it('does not match HvN lobby when preset has humansVsNations: false', () => {
      const preset = normalizePreset({ id: 'no-hvn', mode: 'Team', humansVsNations: false });
      expect(matchesPreset(LOBBY_FIXTURES.humansVsNations, preset)).toBe(false);
      expect(matchesPreset(LOBBY_FIXTURES.humansVsNationsEurope, preset)).toBe(false);
    });

    it('matches regular team lobby when preset has humansVsNations: false', () => {
      const preset = normalizePreset({ id: 'no-hvn', mode: 'Team', humansVsNations: false });
      expect(matchesPreset(LOBBY_FIXTURES.teamFourTeamsEurope, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.teamDuosEurope, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.realTeamDuos, preset)).toBe(true);
    });

    it('matches FFA lobby when preset has humansVsNations: false (FFA has no HvN)', () => {
      const preset = normalizePreset({ id: 'no-hvn', mode: 'Any', humansVsNations: false });
      expect(matchesPreset(LOBBY_FIXTURES.ffaEuropeSmall, preset)).toBe(true);
    });
  });

  describe('humansVsNations: null (any, no filter)', () => {
    it('matches HvN lobby when preset has humansVsNations: null', () => {
      const preset = normalizePreset({ id: 'any', mode: 'Team', humansVsNations: null });
      expect(matchesPreset(LOBBY_FIXTURES.humansVsNations, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.humansVsNationsEurope, preset)).toBe(true);
    });

    it('matches regular team lobby when preset has humansVsNations: null', () => {
      const preset = normalizePreset({ id: 'any', mode: 'Team', humansVsNations: null });
      expect(matchesPreset(LOBBY_FIXTURES.teamFourTeamsEurope, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.teamDuosEurope, preset)).toBe(true);
    });

    it('matches FFA lobby when preset has humansVsNations: null', () => {
      const preset = normalizePreset({ id: 'any', mode: 'Any', humansVsNations: null });
      expect(matchesPreset(LOBBY_FIXTURES.ffaEuropeSmall, preset)).toBe(true);
    });
  });

  describe('humansVsNations with map filter', () => {
    it('respects map filter when matching HvN lobbies', () => {
      const presetEurope = normalizePreset({ id: 'hvn-eu', mode: 'Team', humansVsNations: true, maps: ['europe'] });
      const presetAsia = normalizePreset({ id: 'hvn-asia', mode: 'Team', humansVsNations: true, maps: ['asia'] });

      // humansVsNationsEurope has gameMap: 'Europe'
      expect(matchesPreset(LOBBY_FIXTURES.humansVsNationsEurope, presetEurope)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.humansVsNationsEurope, presetAsia)).toBe(false);

      // humansVsNations has gameMap: 'Achiran'
      expect(matchesPreset(LOBBY_FIXTURES.humansVsNations, presetEurope)).toBe(false);
    });
  });

  describe('preset fixtures', () => {
    it('hvnOnly preset matches only HvN lobbies', () => {
      expect(matchesPreset(LOBBY_FIXTURES.humansVsNations, PRESET_FIXTURES.hvnOnly)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.teamFourTeamsEurope, PRESET_FIXTURES.hvnOnly)).toBe(false);
    });

    it('noHvn preset excludes HvN lobbies', () => {
      expect(matchesPreset(LOBBY_FIXTURES.humansVsNations, PRESET_FIXTURES.noHvn)).toBe(false);
      expect(matchesPreset(LOBBY_FIXTURES.teamFourTeamsEurope, PRESET_FIXTURES.noHvn)).toBe(true);
    });

    it('anyHvn preset matches both HvN and regular lobbies', () => {
      expect(matchesPreset(LOBBY_FIXTURES.humansVsNations, PRESET_FIXTURES.anyHvn)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.teamFourTeamsEurope, PRESET_FIXTURES.anyHvn)).toBe(true);
    });
  });
});

describe('matchesPreset with 5 Million Starting Gold filter', () => {
  describe('startingGold: required (only match 5M gold lobbies)', () => {
    it('matches 5M gold lobby when preset has startingGold: required', () => {
      const preset = normalizePreset({ id: '5m-gold', mode: 'Any', startingGold: 'required' });
      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldFFA, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldTeam, preset)).toBe(true);
    });

    it('does not match normal gold lobby when preset has startingGold: required', () => {
      const preset = normalizePreset({ id: '5m-gold', mode: 'Any', startingGold: 'required' });
      expect(matchesPreset(LOBBY_FIXTURES.normalGoldFFA, preset)).toBe(false);
      expect(matchesPreset(LOBBY_FIXTURES.ffaEuropeSmall, preset)).toBe(false);
    });
  });

  describe('startingGold: excluded (exclude 5M gold lobbies)', () => {
    it('does not match 5M gold lobby when preset has startingGold: excluded', () => {
      const preset = normalizePreset({ id: 'no-5m-gold', mode: 'Any', startingGold: 'excluded' });
      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldFFA, preset)).toBe(false);
      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldTeam, preset)).toBe(false);
    });

    it('matches normal gold lobby when preset has startingGold: excluded', () => {
      const preset = normalizePreset({ id: 'no-5m-gold', mode: 'Any', startingGold: 'excluded' });
      expect(matchesPreset(LOBBY_FIXTURES.normalGoldFFA, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.ffaEuropeSmall, preset)).toBe(true);
    });
  });

  describe('startingGold: any (no filter)', () => {
    it('matches 5M gold lobby when preset has startingGold: any', () => {
      const preset = normalizePreset({ id: 'any-gold', mode: 'Any', startingGold: 'any' });
      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldFFA, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldTeam, preset)).toBe(true);
    });

    it('matches normal gold lobby when preset has startingGold: any', () => {
      const preset = normalizePreset({ id: 'any-gold', mode: 'Any', startingGold: 'any' });
      expect(matchesPreset(LOBBY_FIXTURES.normalGoldFFA, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.ffaEuropeSmall, preset)).toBe(true);
    });
  });

  describe('startingGold with mode filter', () => {
    it('respects mode filter when matching 5M gold lobbies', () => {
      const presetFFA = normalizePreset({ id: 'ffa-5m', mode: 'FFA', startingGold: 'required' });
      const presetTeam = normalizePreset({ id: 'team-5m', mode: 'Team', startingGold: 'required' });

      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldFFA, presetFFA)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldFFA, presetTeam)).toBe(false);
      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldTeam, presetTeam)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldTeam, presetFFA)).toBe(false);
    });
  });

  describe('preset fixtures', () => {
    it('fiveMillionGoldRequired preset matches only 5M gold lobbies', () => {
      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldFFA, PRESET_FIXTURES.fiveMillionGoldRequired)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.normalGoldFFA, PRESET_FIXTURES.fiveMillionGoldRequired)).toBe(false);
    });

    it('fiveMillionGoldExcluded preset excludes 5M gold lobbies', () => {
      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldFFA, PRESET_FIXTURES.fiveMillionGoldExcluded)).toBe(false);
      expect(matchesPreset(LOBBY_FIXTURES.normalGoldFFA, PRESET_FIXTURES.fiveMillionGoldExcluded)).toBe(true);
    });

    it('ffaFiveMillionGold preset matches only FFA 5M gold lobbies', () => {
      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldFFA, PRESET_FIXTURES.ffaFiveMillionGold)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.fiveMillionGoldTeam, PRESET_FIXTURES.ffaFiveMillionGold)).toBe(false);
      expect(matchesPreset(LOBBY_FIXTURES.normalGoldFFA, PRESET_FIXTURES.ffaFiveMillionGold)).toBe(false);
    });
  });
});
