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

      // 100 players / 4 teams = 25 per team
      const twentyFivePerTeam = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 4, maxPlayers: 100 }
      });
      // 100 players / 2 teams = 50 per team
      const fiftyPerTeam = createMockLobby({
        gameConfig: { gameMode: 'Team', playerTeams: 2, maxPlayers: 100 }
      });
      // 100 players / 10 teams = 10 per team
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

      // Should not throw
      expect(() => matchesPreset(lobby, preset)).not.toThrow();
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

// ============ Extended Edge Case Tests Using Fixtures ============

describe('matchesPreset - Extended Edge Cases', () => {
  describe('Game Mode Edge Cases', () => {
    it('handles lobby with uppercase gameMode', () => {
      const preset = createPreset({ mode: 'FFA' });
      const lobby = {
        gameID: 'test',
        gameConfig: { gameMode: 'FFA', gameMap: 'europe' }
      };
      expect(matchesPreset(lobby, preset)).toBe(true);
    });

    it('treats missing gameMode as FFA (default)', () => {
      const ffaPreset = createPreset({ mode: 'FFA' });
      const teamPreset = createPreset({ mode: 'Team' });
      const anyPreset = createPreset({ mode: 'Any' });

      expect(matchesPreset(LOBBY_FIXTURES.partialGameConfigMapOnly, ffaPreset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.partialGameConfigMapOnly, teamPreset)).toBe(false);
      expect(matchesPreset(LOBBY_FIXTURES.partialGameConfigMapOnly, anyPreset)).toBe(true);
    });

    it('mode filter short-circuits before evaluating other conditions', () => {
      // If mode doesn't match, we shouldn't evaluate team constraints
      const teamPreset = createPreset({
        mode: 'Team',
        maps: ['europe'],
        teamCountMin: 4,
        teamCountMax: 8
      });

      // FFA lobby on Europe - mode mismatch should reject immediately
      expect(matchesPreset(LOBBY_FIXTURES.ffaEuropeLarge, teamPreset)).toBe(false);
    });
  });

  describe('Map Filtering Edge Cases', () => {
    it('matches maps case-insensitively when lobby has uppercase map', () => {
      const preset = createPreset({ mode: 'Any', maps: ['europe'] });
      expect(matchesPreset(LOBBY_FIXTURES.ffaEuropeUpperCase, preset)).toBe(true);
    });

    it('matches maps case-insensitively when lobby has mixed case map', () => {
      const preset = createPreset({ mode: 'Any', maps: ['europe'] });
      expect(matchesPreset(LOBBY_FIXTURES.ffaEuropeMixedCase, preset)).toBe(true);
    });

    it('matches when preset has uppercase map and lobby has lowercase', () => {
      expect(matchesPreset(LOBBY_FIXTURES.ffaEuropeLarge, PRESET_FIXTURES.europeCaseVariant)).toBe(true);
    });

    it('rejects empty string gameMap when specific maps required', () => {
      const preset = createPreset({ mode: 'Any', maps: ['europe'] });
      expect(matchesPreset(LOBBY_FIXTURES.emptyMapString, preset)).toBe(false);
    });

    it('rejects null gameMap when specific maps required', () => {
      const preset = createPreset({ mode: 'Any', maps: ['europe'] });
      expect(matchesPreset(LOBBY_FIXTURES.nullMap, preset)).toBe(false);
    });

    it('matches any map when preset maps is empty array', () => {
      const preset = createPreset({ mode: 'Any', maps: [] });
      expect(matchesPreset(LOBBY_FIXTURES.ffaEuropeLarge, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.ffaAfrica, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.emptyMapString, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.nullMap, preset)).toBe(true);
    });

    it('handles unusual map names correctly', () => {
      expect(matchesPreset(LOBBY_FIXTURES.ffaStraitOfGibraltar, PRESET_FIXTURES.unusualMapNames)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.ffaDeglaciatedAntarctica, PRESET_FIXTURES.unusualMapNames)).toBe(true);
    });

    it('handles preset with all maps (large array)', () => {
      expect(matchesPreset(LOBBY_FIXTURES.ffaEuropeLarge, PRESET_FIXTURES.allMaps)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.ffaAfrica, PRESET_FIXTURES.allMaps)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.teamSquadsWorld, PRESET_FIXTURES.allMaps)).toBe(true);
    });

    it('matches Black Sea with space in API response against blacksea preset', () => {
      const preset = createPreset({ mode: 'FFA', maps: ['blacksea'] });
      expect(matchesPreset(LOBBY_FIXTURES.ffaBlackSeaWithSpace, preset)).toBe(true);
    });

    it('matches BlackSea CamelCase in API response against blacksea preset', () => {
      const preset = createPreset({ mode: 'FFA', maps: ['blacksea'] });
      expect(matchesPreset(LOBBY_FIXTURES.ffaBlackSeaCamelCase, preset)).toBe(true);
    });

    it('matches blacksea lowercase in API response against blacksea preset', () => {
      const preset = createPreset({ mode: 'FFA', maps: ['blacksea'] });
      expect(matchesPreset(LOBBY_FIXTURES.ffaBlackSeaLowerCase, preset)).toBe(true);
    });

    it('matches Black Sea variations against allMaps preset', () => {
      expect(matchesPreset(LOBBY_FIXTURES.ffaBlackSeaWithSpace, PRESET_FIXTURES.allMaps)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.ffaBlackSeaCamelCase, PRESET_FIXTURES.allMaps)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.ffaBlackSeaLowerCase, PRESET_FIXTURES.allMaps)).toBe(true);
    });

    it('matches maps with various space/dash/underscore variations', () => {
      const preset = createPreset({ mode: 'Any', maps: ['straitofgibraltar'] });

      // API might return different formats
      const withSpaces = createMockLobby({ gameConfig: { gameMap: 'Strait of Gibraltar' } });
      const withDashes = createMockLobby({ gameConfig: { gameMap: 'strait-of-gibraltar' } });
      const withUnderscores = createMockLobby({ gameConfig: { gameMap: 'strait_of_gibraltar' } });

      expect(matchesPreset(withSpaces, preset)).toBe(true);
      expect(matchesPreset(withDashes, preset)).toBe(true);
      expect(matchesPreset(withUnderscores, preset)).toBe(true);
    });

    it('rejects when map not in preset list', () => {
      const preset = createPreset({ mode: 'Any', maps: ['europe'] });
      expect(matchesPreset(LOBBY_FIXTURES.ffaAfrica, preset)).toBe(false);
    });
  });

  describe('Team Count Boundary Values', () => {
    it('matches exactly at teamCountMin boundary', () => {
      const preset = createPreset({
        mode: 'Team',
        teamCountMin: 4,
        teamCountMax: Infinity
      });
      // teamFourTeamsEurope has playerTeams: 4
      expect(matchesPreset(LOBBY_FIXTURES.teamFourTeamsEurope, preset)).toBe(true);
    });

    it('matches exactly at teamCountMax boundary', () => {
      const preset = createPreset({
        mode: 'Team',
        teamCountMin: 0,
        teamCountMax: 4
      });
      expect(matchesPreset(LOBBY_FIXTURES.teamFourTeamsEurope, preset)).toBe(true);
    });

    it('rejects one below teamCountMin', () => {
      const preset = createPreset({
        mode: 'Team',
        teamCountMin: 4,
        teamCountMax: Infinity
      });
      // threeTeamsNonDivisible has playerTeams: 3
      expect(matchesPreset(LOBBY_FIXTURES.threeTeamsNonDivisible, preset)).toBe(false);
    });

    it('rejects one above teamCountMax', () => {
      const preset = createPreset({
        mode: 'Team',
        teamCountMin: 0,
        teamCountMax: 4
      });
      // teamTenTeamsWorld has playerTeams: 10
      expect(matchesPreset(LOBBY_FIXTURES.teamTenTeamsWorld, preset)).toBe(false);
    });

    it('teamCountMin of 0 effectively disables min check', () => {
      const preset = createPreset({
        mode: 'Team',
        teamCountMin: 0,
        teamCountMax: Infinity
      });
      expect(matchesPreset(LOBBY_FIXTURES.singleTeam, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.twoTeams, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.manyTeams, preset)).toBe(true);
    });

    it('teamCountMax of Infinity effectively disables max check', () => {
      const preset = createPreset({
        mode: 'Team',
        teamCountMin: 0,
        teamCountMax: Infinity
      });
      expect(matchesPreset(LOBBY_FIXTURES.manyTeams, preset)).toBe(true); // 100 teams
    });

    it('handles null playerTeams as 0 for team count check', () => {
      const preset = createPreset({
        mode: 'Team',
        teamCountMin: 1,
        teamCountMax: Infinity
      });
      // nullPlayerTeams has playerTeams: null
      expect(matchesPreset(LOBBY_FIXTURES.nullPlayerTeams, preset)).toBe(false);
    });

    it('handles single team (playerTeams: 1)', () => {
      const preset = createPreset({
        mode: 'Team',
        teamCountMin: 1,
        teamCountMax: 1
      });
      expect(matchesPreset(LOBBY_FIXTURES.singleTeam, preset)).toBe(true);
    });

    it('handles high team counts (50+ teams)', () => {
      const preset = createPreset({
        mode: 'Team',
        teamCountMin: 50,
        teamCountMax: Infinity
      });
      expect(matchesPreset(LOBBY_FIXTURES.fiftyTeams, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.manyTeams, preset)).toBe(true); // 100 teams
    });

    it('exact team count range works', () => {
      expect(matchesPreset(LOBBY_FIXTURES.teamFourTeamsEurope, PRESET_FIXTURES.exactFourTeams)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.twoTeams, PRESET_FIXTURES.exactFourTeams)).toBe(false);
      expect(matchesPreset(LOBBY_FIXTURES.teamTenTeamsWorld, PRESET_FIXTURES.exactFourTeams)).toBe(false);
    });
  });

  describe('Players Per Team Boundary Values', () => {
    it('uses Math.floor for non-integer division', () => {
      // nonDivisiblePlayers: 100/7 = 14.28 -> 14 per team
      const preset = createPreset({
        mode: 'Team',
        playersPerTeamMin: 14,
        playersPerTeamMax: 14
      });
      expect(matchesPreset(LOBBY_FIXTURES.nonDivisiblePlayers, preset)).toBe(true);
    });

    it('handles 100/3 = 33 per team correctly', () => {
      // threeTeamsNonDivisible: 100/3 = 33.33 -> 33 per team
      const exactPreset = createPreset({
        mode: 'Team',
        playersPerTeamMin: 33,
        playersPerTeamMax: 33
      });
      const rangePreset = createPreset({
        mode: 'Team',
        playersPerTeamMin: 30,
        playersPerTeamMax: 35
      });
      expect(matchesPreset(LOBBY_FIXTURES.threeTeamsNonDivisible, exactPreset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.threeTeamsNonDivisible, rangePreset)).toBe(true);
    });

    it('matches exactly at playersPerTeamMin boundary', () => {
      // teamSquadsWorld: 100/4 = 25 per team
      const preset = createPreset({
        mode: 'Team',
        playersPerTeamMin: 25,
        playersPerTeamMax: Infinity
      });
      expect(matchesPreset(LOBBY_FIXTURES.teamSquadsWorld, preset)).toBe(true);
    });

    it('matches exactly at playersPerTeamMax boundary', () => {
      // teamSquadsWorld: 100/4 = 25 per team
      const preset = createPreset({
        mode: 'Team',
        playersPerTeamMin: 0,
        playersPerTeamMax: 25
      });
      expect(matchesPreset(LOBBY_FIXTURES.teamSquadsWorld, preset)).toBe(true);
    });

    it('rejects one below playersPerTeamMin', () => {
      // teamSquadsWorld: 25 per team
      const preset = createPreset({
        mode: 'Team',
        playersPerTeamMin: 26,
        playersPerTeamMax: Infinity
      });
      expect(matchesPreset(LOBBY_FIXTURES.teamSquadsWorld, preset)).toBe(false);
    });

    it('rejects one above playersPerTeamMax', () => {
      // teamSquadsWorld: 25 per team
      const preset = createPreset({
        mode: 'Team',
        playersPerTeamMin: 0,
        playersPerTeamMax: 24
      });
      expect(matchesPreset(LOBBY_FIXTURES.teamSquadsWorld, preset)).toBe(false);
    });

    it('handles zero maxPlayers resulting in 0 playersPerTeam', () => {
      const preset = createPreset({
        mode: 'Team',
        playersPerTeamMin: 1,
        playersPerTeamMax: Infinity
      });
      expect(matchesPreset(LOBBY_FIXTURES.zeroMaxPlayers, preset)).toBe(false);
    });

    it('handles null maxPlayers as 0', () => {
      const preset = createPreset({
        mode: 'Team',
        playersPerTeamMin: 1,
        playersPerTeamMax: Infinity
      });
      expect(matchesPreset(LOBBY_FIXTURES.nullMaxPlayers, preset)).toBe(false);
    });

    it('handles single player per team', () => {
      // manyTeams: 100/100 = 1 per team
      const preset = createPreset({
        mode: 'Team',
        playersPerTeamMin: 1,
        playersPerTeamMax: 1
      });
      expect(matchesPreset(LOBBY_FIXTURES.manyTeams, preset)).toBe(true);
    });

    it('handles large players per team (100/team)', () => {
      // largePlayersPerTeam: 200/2 = 100 per team
      const preset = createPreset({
        mode: 'Team',
        playersPerTeamMin: 100,
        playersPerTeamMax: 100
      });
      expect(matchesPreset(LOBBY_FIXTURES.largePlayersPerTeam, preset)).toBe(true);
    });

    it('playersPerTeamMin of 0 allows any value', () => {
      const preset = createPreset({
        mode: 'Team',
        playersPerTeamMin: 0,
        playersPerTeamMax: Infinity
      });
      expect(matchesPreset(LOBBY_FIXTURES.manyTeams, preset)).toBe(true); // 1/team
      expect(matchesPreset(LOBBY_FIXTURES.largePlayersPerTeam, preset)).toBe(true); // 100/team
    });

    it('playersPerTeamMax of Infinity allows any value', () => {
      const preset = createPreset({
        mode: 'Team',
        playersPerTeamMin: 0,
        playersPerTeamMax: Infinity
      });
      expect(matchesPreset(LOBBY_FIXTURES.largePlayersPerTeam, preset)).toBe(true); // 100/team
    });
  });

  describe('Combined Filter Tests', () => {
    it('matches when all filters are at exact boundary values simultaneously', () => {
      // teamFourTeamsEurope: europe, Team, 4 teams, 25/team
      const preset = createPreset({
        mode: 'Team',
        maps: ['europe'],
        teamCountMin: 4,
        teamCountMax: 4,
        playersPerTeamMin: 25,
        playersPerTeamMax: 25
      });
      expect(matchesPreset(LOBBY_FIXTURES.teamFourTeamsEurope, preset)).toBe(true);
    });

    it('rejects when one filter fails even if others pass', () => {
      // teamFourTeamsEurope: europe, Team, 4 teams, 25/team
      // Preset expects africa instead of europe
      const preset = createPreset({
        mode: 'Team',
        maps: ['africa'],
        teamCountMin: 4,
        teamCountMax: 4,
        playersPerTeamMin: 25,
        playersPerTeamMax: 25
      });
      expect(matchesPreset(LOBBY_FIXTURES.teamFourTeamsEurope, preset)).toBe(false);
    });

    it('competitive duos on Europe scenario', () => {
      const preset = PRESET_FIXTURES.competitiveDuosEurope;
      // Should match teamDuosEurope: europe, Team, 50 teams, 2/team
      expect(matchesPreset(LOBBY_FIXTURES.teamDuosEurope, preset)).toBe(true);
      // Should reject teamDuosAfrica: wrong map
      expect(matchesPreset(LOBBY_FIXTURES.teamDuosAfrica, preset)).toBe(false);
      // Should reject teamSquadsWorld: wrong map and wrong team config
      expect(matchesPreset(LOBBY_FIXTURES.teamSquadsWorld, preset)).toBe(false);
    });

    it('casual large teams scenario', () => {
      const preset = PRESET_FIXTURES.casualLargeTeamsAny;
      // Should match teamSquadsWorld: 4 teams, 25/team
      expect(matchesPreset(LOBBY_FIXTURES.teamSquadsWorld, preset)).toBe(true);
      // Should match teamSquadsAsia: 2 teams, 50/team
      expect(matchesPreset(LOBBY_FIXTURES.teamSquadsAsia, preset)).toBe(true);
      // Should reject teamDuosAfrica: 50 teams (> max 8), 2/team (< min 10)
      expect(matchesPreset(LOBBY_FIXTURES.teamDuosAfrica, preset)).toBe(false);
    });

    it('FFA on Europe or Africa scenario', () => {
      const preset = PRESET_FIXTURES.ffaEuropeOrAfrica;
      expect(matchesPreset(LOBBY_FIXTURES.ffaEuropeLarge, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.ffaAfrica, preset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.ffaWorld, preset)).toBe(false);
      expect(matchesPreset(LOBBY_FIXTURES.teamDuosEurope, preset)).toBe(false); // wrong mode
    });
  });

  describe('Edge Cases with Missing/Partial Data', () => {
    it('handles lobby with missing gameConfig', () => {
      const anyPreset = createPreset({ mode: 'Any' });
      const ffaPreset = createPreset({ mode: 'FFA' });

      expect(matchesPreset(LOBBY_FIXTURES.missingGameConfig, anyPreset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.missingGameConfig, ffaPreset)).toBe(true); // defaults to FFA
    });

    it('handles lobby with empty gameConfig', () => {
      const anyPreset = createPreset({ mode: 'Any' });
      expect(matchesPreset(LOBBY_FIXTURES.emptyGameConfig, anyPreset)).toBe(true);
    });

    it('handles lobby with null gameConfig', () => {
      const anyPreset = createPreset({ mode: 'Any' });
      // gameConfig is null, so config = {} and mode defaults to FFA
      expect(matchesPreset(LOBBY_FIXTURES.nullGameConfig, anyPreset)).toBe(true);
    });

    it('handles lobby with only gameMap in config', () => {
      const europePreset = createPreset({ mode: 'Any', maps: ['europe'] });
      const africaPreset = createPreset({ mode: 'Any', maps: ['africa'] });

      expect(matchesPreset(LOBBY_FIXTURES.partialGameConfigMapOnly, europePreset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.partialGameConfigMapOnly, africaPreset)).toBe(false);
    });

    it('handles lobby with only gameMode in config', () => {
      const ffaPreset = createPreset({ mode: 'FFA' });
      const teamPreset = createPreset({ mode: 'Team' });

      expect(matchesPreset(LOBBY_FIXTURES.partialGameConfigModeOnly, ffaPreset)).toBe(true);
      expect(matchesPreset(LOBBY_FIXTURES.partialGameConfigModeOnly, teamPreset)).toBe(false);
    });
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

// ============ Real-World Scenario Tests ============

describe('Real-World Scenarios', () => {
  describe('User: "I only play FFA on Europe"', () => {
    const userPreset = createPreset({
      active: true,
      name: 'FFA Europe Only',
      mode: 'FFA',
      maps: ['europe']
    });

    it('notifies for FFA Europe lobby', () => {
      const result = checkForMatch(LOBBY_FIXTURES.ffaEuropeLarge, [userPreset]);
      expect(result.matched).toBe(true);
    });

    it('ignores FFA Africa lobby', () => {
      const result = checkForMatch(LOBBY_FIXTURES.ffaAfrica, [userPreset]);
      expect(result.matched).toBe(false);
    });

    it('ignores Team Europe lobby', () => {
      const result = checkForMatch(LOBBY_FIXTURES.teamDuosEurope, [userPreset]);
      expect(result.matched).toBe(false);
    });

    it('ignores Team Africa lobby', () => {
      const result = checkForMatch(LOBBY_FIXTURES.teamDuosAfrica, [userPreset]);
      expect(result.matched).toBe(false);
    });
  });

  describe('User: "I want duos on any map"', () => {
    const userPreset = createPreset({
      active: true,
      name: 'Duos Any Map',
      mode: 'Team',
      maps: [],
      teamCountMin: 40,
      playersPerTeamMax: 3
    });

    it('matches 50-team duos game on Africa', () => {
      const result = checkForMatch(LOBBY_FIXTURES.teamDuosAfrica, [userPreset]);
      expect(result.matched).toBe(true);
    });

    it('matches 50-team duos game on Europe', () => {
      const result = checkForMatch(LOBBY_FIXTURES.teamDuosEurope, [userPreset]);
      expect(result.matched).toBe(true);
    });

    it('ignores 4-team large squad game', () => {
      const result = checkForMatch(LOBBY_FIXTURES.teamSquadsWorld, [userPreset]);
      expect(result.matched).toBe(false);
    });

    it('ignores FFA game', () => {
      const result = checkForMatch(LOBBY_FIXTURES.ffaEuropeLarge, [userPreset]);
      expect(result.matched).toBe(false);
    });
  });

  describe('User: "Large teams only (25+ players/team)"', () => {
    const userPreset = createPreset({
      active: true,
      name: 'Large Teams',
      mode: 'Team',
      maps: [],
      playersPerTeamMin: 25
    });

    it('matches 4-team squad game (25/team)', () => {
      const result = checkForMatch(LOBBY_FIXTURES.teamSquadsWorld, [userPreset]);
      expect(result.matched).toBe(true);
    });

    it('matches 2-team squad game (50/team)', () => {
      const result = checkForMatch(LOBBY_FIXTURES.teamSquadsAsia, [userPreset]);
      expect(result.matched).toBe(true);
    });

    it('ignores duos (2/team)', () => {
      const result = checkForMatch(LOBBY_FIXTURES.teamDuosAfrica, [userPreset]);
      expect(result.matched).toBe(false);
    });
  });

  describe('User with multiple presets', () => {
    const presets = [
      createPreset({ active: true, name: 'FFA Europe', mode: 'FFA', maps: ['europe'] }),
      createPreset({ active: true, name: 'Team Any', mode: 'Team', maps: [] }),
      createPreset({ active: false, name: 'Disabled', mode: 'Any', maps: [] })
    ];

    it('FFA Europe triggers FFA Europe preset', () => {
      const result = checkForMatch(LOBBY_FIXTURES.ffaEuropeLarge, presets);
      expect(result.matched).toBe(true);
      expect(result.presets).toHaveLength(1);
      expect(result.presets[0].name).toBe('FFA Europe');
    });

    it('Team Africa triggers Team Any preset', () => {
      const result = checkForMatch(LOBBY_FIXTURES.teamDuosAfrica, presets);
      expect(result.matched).toBe(true);
      expect(result.presets).toHaveLength(1);
      expect(result.presets[0].name).toBe('Team Any');
    });

    it('FFA Africa triggers no presets (no match)', () => {
      const result = checkForMatch(LOBBY_FIXTURES.ffaAfrica, presets);
      expect(result.matched).toBe(false);
      expect(result.presets).toHaveLength(0);
    });

    it('Disabled preset does not trigger even though it would match', () => {
      // FFA World would match "Disabled" preset (mode: Any), but it's inactive
      const result = checkForMatch(LOBBY_FIXTURES.ffaWorld, presets);
      expect(result.matched).toBe(false);
    });
  });
});

// ============ Size Filtering Tests ============

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

    // 25 teams should NOT match 1-6 team filter
    const lobby25Teams = { gameConfig: { gameMode: 'Team', playerTeams: 25, maxPlayers: 100 } };
    expect(matchesPreset(lobby25Teams, preset)).toBe(false);

    // 4 teams should match 1-6 team filter
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

describe('Real API Format Integration', () => {
  describe('FFA with "Free For All" gameMode', () => {
    it('normalizes "Free For All" to FFA for matching', () => {
      const ffaPreset = normalizePreset({ id: 'ffa', mode: 'FFA' });
      const anyPreset = normalizePreset({ id: 'any', mode: 'Any' });
      const teamPreset = normalizePreset({ id: 'team', mode: 'Team' });

      // Real API uses "Free For All", not "FFA"
      expect(matchesPreset(REAL_API_LOBBIES.ffa, ffaPreset)).toBe(true);
      expect(matchesPreset(REAL_API_LOBBIES.ffa, anyPreset)).toBe(true);
      expect(matchesPreset(REAL_API_LOBBIES.ffa, teamPreset)).toBe(false);
    });

    it('FFA lobbies have no playerTeams field', () => {
      expect(REAL_API_LOBBIES.ffa.gameConfig.playerTeams).toBeUndefined();
    });
  });

  describe('Team with "Duos" string playerTeams', () => {
    it('matches Team mode presets', () => {
      const teamPreset = normalizePreset({ id: 'team', mode: 'Team' });
      expect(matchesPreset(REAL_API_LOBBIES.duos, teamPreset)).toBe(true);
    });

    it('calculates correct team count (maxPlayers / 2)', () => {
      // realTeamDuos: maxPlayers=60, playerTeams='Duos' -> 60/2 = 30 teams
      const presetMax20 = normalizePreset({ id: 't', mode: 'Team', teamCountMax: 20 });
      const presetMax40 = normalizePreset({ id: 't', mode: 'Team', teamCountMax: 40 });

      expect(matchesPreset(REAL_API_LOBBIES.duos, presetMax20)).toBe(false); // 30 > 20
      expect(matchesPreset(REAL_API_LOBBIES.duos, presetMax40)).toBe(true);  // 30 <= 40
    });
  });

  describe('Team with "Trios" string playerTeams', () => {
    it('calculates correct team count (maxPlayers / 3)', () => {
      // realTeamTrios: maxPlayers=60, playerTeams='Trios' -> 60/3 = 20 teams
      const presetMax15 = normalizePreset({ id: 't', mode: 'Team', teamCountMax: 15 });
      const presetMax25 = normalizePreset({ id: 't', mode: 'Team', teamCountMax: 25 });

      expect(matchesPreset(REAL_API_LOBBIES.trios, presetMax15)).toBe(false); // 20 > 15
      expect(matchesPreset(REAL_API_LOBBIES.trios, presetMax25)).toBe(true);  // 20 <= 25
    });

    it('calculates correct players per team', () => {
      // 20 teams, 60 max players -> 3 players per team
      const preset3PPT = normalizePreset({ id: 't', mode: 'Team', playersPerTeamMin: 3, playersPerTeamMax: 3 });
      const preset4PPT = normalizePreset({ id: 't', mode: 'Team', playersPerTeamMin: 4, playersPerTeamMax: 4 });

      expect(matchesPreset(REAL_API_LOBBIES.trios, preset3PPT)).toBe(true);
      expect(matchesPreset(REAL_API_LOBBIES.trios, preset4PPT)).toBe(false);
    });
  });

  describe('Team with "Quads" string playerTeams', () => {
    it('calculates correct team count (maxPlayers / 4)', () => {
      // realTeamQuads: maxPlayers=100, playerTeams='Quads' -> 100/4 = 25 teams
      const presetMax20 = normalizePreset({ id: 't', mode: 'Team', teamCountMax: 20 });
      const presetMax30 = normalizePreset({ id: 't', mode: 'Team', teamCountMax: 30 });

      expect(matchesPreset(REAL_API_LOBBIES.quads, presetMax20)).toBe(false); // 25 > 20
      expect(matchesPreset(REAL_API_LOBBIES.quads, presetMax30)).toBe(true);  // 25 <= 30
    });
  });

  describe('Team with numeric playerTeams', () => {
    it('uses numeric value directly as team count', () => {
      // realTeamNumeric: maxPlayers=100, playerTeams=2 -> 2 teams directly
      const presetMax3 = normalizePreset({ id: 't', mode: 'Team', teamCountMax: 3 });
      const presetMax1 = normalizePreset({ id: 't', mode: 'Team', teamCountMax: 1 });

      expect(matchesPreset(REAL_API_LOBBIES.numeric, presetMax3)).toBe(true);  // 2 <= 3
      expect(matchesPreset(REAL_API_LOBBIES.numeric, presetMax1)).toBe(false); // 2 > 1
    });

    it('calculates correct players per team', () => {
      // 2 teams, 100 max players -> 50 players per team
      const preset50PPT = normalizePreset({ id: 't', mode: 'Team', playersPerTeamMin: 50, playersPerTeamMax: 50 });
      const preset25PPT = normalizePreset({ id: 't', mode: 'Team', playersPerTeamMin: 25, playersPerTeamMax: 25 });

      expect(matchesPreset(REAL_API_LOBBIES.numeric, preset50PPT)).toBe(true);
      expect(matchesPreset(REAL_API_LOBBIES.numeric, preset25PPT)).toBe(false);
    });
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
