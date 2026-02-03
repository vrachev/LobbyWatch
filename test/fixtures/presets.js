// Preset fixtures for testing filter matching logic

// Base preset structure with all required fields
const basePreset = {
  id: 'preset-base',
  name: 'Base Preset',
  active: true,
  mode: 'Any',
  maps: [],
  sizes: [],
  teamCountMin: 0,
  teamCountMax: Infinity,
  playersPerTeamMin: 0,
  playersPerTeamMax: Infinity,
  randomSpawn: 'any', // 'any', 'required', 'excluded'
  startingGold: 'any' // 'any', 'required', 'excluded' (5 million gold)
};

// Helper to create preset with overrides
export function createPreset(overrides = {}) {
  return {
    ...basePreset,
    id: 'preset-' + Math.random().toString(36).slice(2, 8),
    ...overrides
  };
}

export const PRESET_FIXTURES = {
  // ============ Catch-All Presets ============

  anyGame: createPreset({
    id: 'any-game',
    name: 'Any Game',
    mode: 'Any',
    maps: []
  }),

  // ============ Mode-Specific Presets ============

  ffaOnly: createPreset({
    id: 'ffa-only',
    name: 'FFA Only',
    mode: 'FFA',
    maps: []
  }),

  teamOnly: createPreset({
    id: 'team-only',
    name: 'Team Only',
    mode: 'Team',
    maps: []
  }),

  // ============ Map-Specific Presets ============

  europeOnly: createPreset({
    id: 'europe-only',
    name: 'Europe Only',
    mode: 'Any',
    maps: ['europe']
  }),

  europeCaseVariant: createPreset({
    id: 'europe-case',
    name: 'Europe (Uppercase)',
    mode: 'Any',
    maps: ['EUROPE'] // uppercase to test case insensitivity
  }),

  europeMultiCase: createPreset({
    id: 'europe-multi-case',
    name: 'Europe (Mixed Case)',
    mode: 'Any',
    maps: ['EuRoPe'] // mixed case
  }),

  africaOnly: createPreset({
    id: 'africa-only',
    name: 'Africa Only',
    mode: 'Any',
    maps: ['africa']
  }),

  multipleMaps: createPreset({
    id: 'multi-maps',
    name: 'Europe, Africa, Asia',
    mode: 'Any',
    maps: ['europe', 'africa', 'asia']
  }),

  unusualMapNames: createPreset({
    id: 'unusual-maps',
    name: 'Unusual Maps',
    mode: 'Any',
    maps: ['straitofgibraltar', 'deglaciatedantarctica', 'baikalnukewars']
  }),

  allMaps: createPreset({
    id: 'all-maps',
    name: 'All Maps',
    mode: 'Any',
    maps: [
      'achiran', 'africa', 'asia', 'australia', 'baikal', 'baikalnukewars',
      'betweentwoseas', 'blacksea', 'britannia', 'deglaciatedantarctica',
      'eastasia', 'europe', 'europeclassic', 'falklandislands', 'faroeislands',
      'fourislands', 'gatewaytotheatlantic', 'giantworldmap', 'gulfofstlawrence',
      'halkidiki', 'iceland', 'italia', 'japan', 'lemnos', 'lisbon',
      'manicouagan', 'mars', 'mena', 'montreal', 'newyorkcity', 'northamerica',
      'oceania', 'pangaea', 'pluto', 'southamerica', 'straitofgibraltar',
      'straitofhormuz', 'surrounded', 'svalmel', 'twolakes', 'world'
    ]
  }),

  // ============ Team Constraint Presets - Duos ============

  duosOnly: createPreset({
    id: 'duos-only',
    name: 'Duos Only',
    mode: 'Team',
    maps: [],
    teamCountMin: 40, // 40+ teams
    teamCountMax: Infinity,
    playersPerTeamMin: 0,
    playersPerTeamMax: 3 // 3 or fewer per team
  }),

  strictDuos: createPreset({
    id: 'strict-duos',
    name: 'Strict Duos (exactly 2/team)',
    mode: 'Team',
    maps: [],
    teamCountMin: 0,
    teamCountMax: Infinity,
    playersPerTeamMin: 2,
    playersPerTeamMax: 2 // exactly 2 per team
  }),

  // ============ Team Constraint Presets - Squads ============

  squadsOnly: createPreset({
    id: 'squads-only',
    name: 'Squads Only',
    mode: 'Team',
    maps: [],
    teamCountMin: 0,
    teamCountMax: 10, // 10 or fewer teams
    playersPerTeamMin: 10, // 10+ per team
    playersPerTeamMax: Infinity
  }),

  largeTeamsOnly: createPreset({
    id: 'large-teams',
    name: 'Large Teams (25+/team)',
    mode: 'Team',
    maps: [],
    teamCountMin: 0,
    teamCountMax: 6,
    playersPerTeamMin: 25,
    playersPerTeamMax: Infinity
  }),

  // ============ Exact Value Presets ============

  exactFourTeams: createPreset({
    id: 'exact-4-teams',
    name: 'Exactly 4 Teams',
    mode: 'Team',
    maps: [],
    teamCountMin: 4,
    teamCountMax: 4
  }),

  exactTwoTeams: createPreset({
    id: 'exact-2-teams',
    name: 'Exactly 2 Teams',
    mode: 'Team',
    maps: [],
    teamCountMin: 2,
    teamCountMax: 2
  }),

  exactTwentyFivePerTeam: createPreset({
    id: 'exact-25-per-team',
    name: 'Exactly 25 Per Team',
    mode: 'Team',
    maps: [],
    playersPerTeamMin: 25,
    playersPerTeamMax: 25
  }),

  exactFiftyPerTeam: createPreset({
    id: 'exact-50-per-team',
    name: 'Exactly 50 Per Team',
    mode: 'Team',
    maps: [],
    playersPerTeamMin: 50,
    playersPerTeamMax: 50
  }),

  // ============ Boundary Value Presets ============

  minOneTeam: createPreset({
    id: 'min-1-team',
    name: 'Min 1 Team',
    mode: 'Team',
    maps: [],
    teamCountMin: 1,
    teamCountMax: Infinity
  }),

  maxOneHundredTeams: createPreset({
    id: 'max-100-teams',
    name: 'Max 100 Teams',
    mode: 'Team',
    maps: [],
    teamCountMin: 0,
    teamCountMax: 100
  }),

  minOnePerTeam: createPreset({
    id: 'min-1-per-team',
    name: 'Min 1 Per Team',
    mode: 'Team',
    maps: [],
    playersPerTeamMin: 1,
    playersPerTeamMax: Infinity
  }),

  maxOneHundredPerTeam: createPreset({
    id: 'max-100-per-team',
    name: 'Max 100 Per Team',
    mode: 'Team',
    maps: [],
    playersPerTeamMin: 0,
    playersPerTeamMax: 100
  }),

  // ============ Combined Filter Presets (Real-World Scenarios) ============

  competitiveDuosEurope: createPreset({
    id: 'comp-duos-eu',
    name: 'Competitive Duos on Europe',
    mode: 'Team',
    maps: ['europe'],
    teamCountMin: 40,
    teamCountMax: 50,
    playersPerTeamMin: 2,
    playersPerTeamMax: 2
  }),

  casualLargeTeamsAny: createPreset({
    id: 'casual-large',
    name: 'Casual Large Teams',
    mode: 'Team',
    maps: [],
    teamCountMin: 2,
    teamCountMax: 8,
    playersPerTeamMin: 10,
    playersPerTeamMax: Infinity
  }),

  ffaEuropeOrAfrica: createPreset({
    id: 'ffa-eu-af',
    name: 'FFA on Europe or Africa',
    mode: 'FFA',
    maps: ['europe', 'africa']
  }),

  teamSmallSquadsSpecificMaps: createPreset({
    id: 'team-small-squads-maps',
    name: 'Small Squads on Europe/Africa/Asia',
    mode: 'Team',
    maps: ['europe', 'africa', 'asia'],
    teamCountMin: 2,
    teamCountMax: 4,
    playersPerTeamMin: 20,
    playersPerTeamMax: 50
  }),

  // ============ Disabled Presets (for active/inactive testing) ============

  disabledAny: createPreset({
    id: 'disabled-any',
    name: 'Disabled Any',
    active: false,
    mode: 'Any',
    maps: []
  }),

  disabledFfa: createPreset({
    id: 'disabled-ffa',
    name: 'Disabled FFA',
    active: false,
    mode: 'FFA',
    maps: []
  }),

  // ============ Edge Case Presets ============

  emptyMapsArray: createPreset({
    id: 'empty-maps',
    name: 'Empty Maps (Any Map)',
    mode: 'Any',
    maps: []
  }),

  zeroMinValues: createPreset({
    id: 'zero-mins',
    name: 'All Zero Mins',
    mode: 'Team',
    maps: [],
    teamCountMin: 0,
    playersPerTeamMin: 0
  }),

  infinityMaxValues: createPreset({
    id: 'infinity-maxes',
    name: 'All Infinity Maxes',
    mode: 'Team',
    maps: [],
    teamCountMax: Infinity,
    playersPerTeamMax: Infinity
  }),

  // ============ Humans vs Nations Presets ============

  hvnOnly: createPreset({
    id: 'hvn-only',
    name: 'Humans vs Nations Only',
    mode: 'Team',
    humansVsNations: true
  }),

  noHvn: createPreset({
    id: 'no-hvn',
    name: 'Exclude Humans vs Nations',
    mode: 'Team',
    humansVsNations: false
  }),

  anyHvn: createPreset({
    id: 'any-hvn',
    name: 'Any (including HvN)',
    mode: 'Team',
    humansVsNations: null
  }),

  hvnAnyMode: createPreset({
    id: 'hvn-any-mode',
    name: 'HvN with Any Mode',
    mode: 'Any',
    humansVsNations: true
  }),

  // ============ Random Spawn Presets ============

  randomSpawnRequired: createPreset({
    id: 'random-spawn-required',
    name: 'Random Spawn Required',
    mode: 'Any',
    maps: [],
    randomSpawn: 'required'
  }),

  randomSpawnExcluded: createPreset({
    id: 'random-spawn-excluded',
    name: 'No Random Spawn',
    mode: 'Any',
    maps: [],
    randomSpawn: 'excluded'
  }),

  teamRandomSpawnRequired: createPreset({
    id: 'team-random-spawn',
    name: 'Team with Random Spawn',
    mode: 'Team',
    maps: [],
    randomSpawn: 'required'
  }),

  // ============ 5 Million Starting Gold Presets ============

  fiveMillionGoldRequired: createPreset({
    id: 'five-million-gold-required',
    name: '5M Gold Required',
    mode: 'Any',
    maps: [],
    startingGold: 'required'
  }),

  fiveMillionGoldExcluded: createPreset({
    id: 'five-million-gold-excluded',
    name: 'Normal Gold Only',
    mode: 'Any',
    maps: [],
    startingGold: 'excluded'
  }),

  ffaFiveMillionGold: createPreset({
    id: 'ffa-five-million-gold',
    name: 'FFA 5M Gold',
    mode: 'FFA',
    maps: [],
    startingGold: 'required'
  })
};

// Helper to get active presets only
export const ACTIVE_PRESETS = Object.values(PRESET_FIXTURES).filter(p => p.active);

// Helper to get inactive presets only
export const INACTIVE_PRESETS = Object.values(PRESET_FIXTURES).filter(p => !p.active);

// Helper to get FFA-mode presets
export const FFA_PRESETS = Object.values(PRESET_FIXTURES).filter(p => p.mode === 'FFA');

// Helper to get Team-mode presets
export const TEAM_PRESETS = Object.values(PRESET_FIXTURES).filter(p => p.mode === 'Team');

// Helper to get Any-mode presets
export const ANY_MODE_PRESETS = Object.values(PRESET_FIXTURES).filter(p => p.mode === 'Any');
