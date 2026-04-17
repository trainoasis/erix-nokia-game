// ============================================================
// Level definitions — edit this file to tune or add levels
// ============================================================
//
// Fields:
//   ballCount             - How many balls spawn at the start of the level.
//   ballSpeed             - How many cells each ball moves per game tick.
//                           1 = normal. 2 = each ball moves twice per tick
//                           (effectively double speed). Integer only.
//   requiredPercentage    - Fraction of the playable area (0-1) the player
//                           must fill to finish the level. e.g. 0.80 = 80%.
//   ballSplittingEnabled  - If true, one ball is marked as a "splitter" and
//                           spawns a new ball next to itself every 20 seconds.

const LEVELS = [
  { ballCount: 1, ballSpeed: 1, requiredPercentage: 0.65 },  // L1:  easy intro
  { ballCount: 2, ballSpeed: 1, requiredPercentage: 0.65 },  // L2:  second ball
  { ballCount: 2, ballSpeed: 1, requiredPercentage: 0.72 },  // L3:  higher target
  { ballCount: 3, ballSpeed: 1, requiredPercentage: 0.68 },  // L4:  three balls
  { ballCount: 3, ballSpeed: 1, requiredPercentage: 0.75 },  // L5:  tighter target
  { ballCount: 4, ballSpeed: 1, requiredPercentage: 0.70 },  // L6:  four balls
  { ballCount: 4, ballSpeed: 1, requiredPercentage: 0.75 },  // L7:  tighter
  { ballCount: 5, ballSpeed: 1, requiredPercentage: 0.72 },  // L8:  five balls
  { ballCount: 5, ballSpeed: 1, requiredPercentage: 0.78 },  // L9:  tough target
  { ballCount: 6, ballSpeed: 1, requiredPercentage: 0.80 },  // L10: six balls, 80%
  // Bonus level 11: same ball count as L10, but one ball splits every 20s
  { ballCount: 6, ballSpeed: 1, requiredPercentage: 0.80, ballSplittingEnabled: true },
];
