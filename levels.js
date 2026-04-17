// ============================================================
// Level definitions — edit this file to tune or add levels
// ============================================================
//
// Fields (all optional unless marked required):
//   ballCount                 (required) How many balls spawn at level start.
//   ballSpeed                 (required) How many cells each ball moves per
//                                        game tick. 1 = normal, 2 = double
//                                        speed. Integer only.
//   requiredPercentage        (required) Fraction of the playable area (0-1)
//                                        the player must fill to finish the
//                                        level. e.g. 0.80 = 80%.
//   splittingBallCount                   Of the starting balls, how many act
//                                        as "splitters" that periodically spawn
//                                        a clone next to themselves. Default 0.
//   splitIntervalMs                      Milliseconds between clone spawns.
//                                        Default 20000 (20 seconds).
//   maxBallCount                         Hard ceiling on total live balls.
//                                        Once reached, splitting pauses until
//                                        a ball is absorbed. Omit for no cap.
//   splittingClonesAlsoSplit             If true, spawned clones themselves
//                                        split (cascading). Default false.
//   hypeMessage                          Banner appended to the PREVIOUS level's
//                                        completion screen to announce this one.
//                                        Useful for bonus / insanity levels.

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
  // L11 bonus: one of the six balls splits every 20 seconds
  {
    ballCount: 6,
    ballSpeed: 1,
    requiredPercentage: 0.80,
    splittingBallCount: 1,
    splitIntervalMs: 20000,
    hypeMessage: 'BONUS LEVEL!\nThe red ball splits every 20s!',
  },
];
