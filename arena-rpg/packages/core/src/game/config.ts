/**
 * Tunable game parameters (design doc §8 "Parametre Tablosu").
 * Keys mirror the doc so designers and code speak the same language.
 * The server is the only place these are applied authoritatively.
 */
export const GAME_CONFIG = {
  fighter: {
    max_count: 5,
    /** Account level needed for the 1st..5th fighter slot. */
    unlock_levels: [1, 10, 25, 45, 70],
    /** Extra XP for fighters lagging behind the account's highest fighter. */
    catchup_xp_bonus: 0.5,
    /** Catch-up stops once the fighter is within this many levels of the highest. (Assumption – doc says "yaklaşana kadar".) */
    catchup_level_gap: 5,
    max_level: 100,
  },
  skill: {
    points_per_level: 1,
    bonus_point_every_levels: 10,
    /** YP cost of buying rank 1..5 of a skill. */
    rank_costs: [1, 2, 2, 3, 4],
    /** YP spent in a branch needed to unlock tier 1, 2, 3, mastery. */
    tier_unlock_points: [0, 5, 15, 30],
    respec_cooldown_hours: 24,
    first_respec_free: true,
  },
  expedition: {
    research_max_level: 5,
    slots_by_research: [1, 1, 2, 2, 2, 3],
    scout_slot_per_levels: 25,
    min_duration_ratio: 0.4,
    /** Upper bound for any boosted probability (rare reward, extra reward…). */
    chance_cap: 0.75,
  },
  combat: {
    flee_hp_threshold: 0.3,
    evasion_cap: 0.4,
    crit_chance_cap: 0.5,
  },
  plunder: {
    base_rate: 0.4,
    protected_gold_ratio: 0.25,
  },
  seer: {
    night_hours: { from: 22, to: 6 },
    time_warp_reduction: 0.25,
    prophecy_reset_hour: 0,
    timezone: 'Europe/Istanbul',
  },
  research: {
    /** Name of the "Araştırma" tab in the main menu. */
    tab_name: 'Rasathane',
  },
  market: {
    /** Salı Pazarı NPC food stock refresh. */
    food_refresh_minutes: 60,
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;
