// ============================================================
// Level definitions — edit this file to tune or add levels
// ============================================================
//
// Fields (all optional unless marked required):
//   ballCount           (required) How many balls spawn at level start.
//   ballSpeed           (required) How many cells each ball moves per game
//                                  tick, on average. 1 = normal, 2 = double
//                                  speed. Fractional values work: 1.5 means
//                                  each ball always moves once and has a 50%
//                                  chance of moving a second time each tick.
//   requiredPercentage  (required) Fraction of the playable area (0-1) the
//                                  player must fill to finish the level.
//                                  e.g. 0.80 = 80%.
//   splittingBallCount             Of the starting balls, how many act as
//                                  "splitters" that periodically spawn a
//                                  clone next to themselves. Default 0.
//   splitIntervalMs                Milliseconds between clone spawns.
//                                  Default 20000 (20 seconds).
//   maxBallCount                   Hard ceiling on total live balls. Once
//                                  reached, splitting pauses. Omit for no cap.
//   clonesAlsoSplit                If true, the new balls spawned by a
//                                  splitter are themselves splitters,
//                                  causing exponential growth. Default false.
//   hypeMessage                    Banner appended to the PREVIOUS level's
//                                  completion screen to announce this one.
//                                  Useful for bonus / insanity levels.

const LEVELS = [
  { ballCount: 1, ballSpeed: 1, requiredPercentage: 0.65 },  // L1:  intro
  { ballCount: 2, ballSpeed: 1, requiredPercentage: 0.65 },  // L2:  +ball
  { ballCount: 3, ballSpeed: 1, requiredPercentage: 0.70 },  // L3:  +ball, +5%
  { ballCount: 3, ballSpeed: 1, requiredPercentage: 0.80 },  // L4:  precision (+10%)
  { ballCount: 4, ballSpeed: 1, requiredPercentage: 0.75 },  // L5:  +ball, breathing
  { ballCount: 5, ballSpeed: 1, requiredPercentage: 0.72 },  // L6:  +ball, breathing
  { ballCount: 5, ballSpeed: 1, requiredPercentage: 0.82 },  // L7:  precision (+10%)
  { ballCount: 6, ballSpeed: 1, requiredPercentage: 0.78 },  // L8:  +ball
  { ballCount: 6, ballSpeed: 1, requiredPercentage: 0.86 },  // L9:  precision (+8%)
  { ballCount: 7, ballSpeed: 1, requiredPercentage: 0.82 },  // L10: +ball
  // L11: splitters arrive — one red ball spawns a clone every 20 seconds
  {
    ballCount: 7,
    ballSpeed: 1,
    requiredPercentage: 0.82,
    splittingBallCount: 1,
    splitIntervalMs: 20000,
    maxBallCount: 10,
    hypeMessage: 'BONUS LEVEL!\nThe red ball splits every 20s!',
  },
  // L12: splitter arrives faster
  {
    ballCount: 7,
    ballSpeed: 1,
    requiredPercentage: 0.85,
    splittingBallCount: 1,
    splitIntervalMs: 15000,
    maxBallCount: 11,
  },
  // L13: a second splitter joins the party
  {
    ballCount: 8,
    ballSpeed: 1,
    requiredPercentage: 0.86,
    splittingBallCount: 2,
    splitIntervalMs: 15000,
    maxBallCount: 13,
    hypeMessage: 'TWO SPLITTERS NOW!\nBoth red balls spawn clones every 15s.',
  },
  // L14: balls move 50% faster on average
  {
    ballCount: 8,
    ballSpeed: 1.5,
    requiredPercentage: 0.87,
    splittingBallCount: 2,
    splitIntervalMs: 15000,
    maxBallCount: 13,
    hypeMessage: 'SPEED UP!\nEvery ball now moves noticeably faster.',
  },
  // L15: absolute insanity — three splitters, every 12s, clones split too
  {
    ballCount: 10,
    ballSpeed: 1.8,
    requiredPercentage: 0.90,
    splittingBallCount: 3,
    splitIntervalMs: 12000,
    maxBallCount: 20,
    clonesAlsoSplit: true,
    hypeMessage: 'ERIX INSANITY!\nThree splitters, 90% fill, and clones split too. Good luck.',
  },
];
