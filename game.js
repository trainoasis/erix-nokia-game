// ============================================================
// Erix Nokia Game — modernized Qix/Erix clone
// ============================================================

(() => {
  'use strict';

  // --- Constants ---
  const CELL = 6;
  const COLS = 53;
  const ROWS = 40;
  const CANVAS_W = COLS * CELL;
  const CANVAS_H = ROWS * CELL;
  const TICK_MS = 60;

  const EMPTY  = 0;
  const TRAIL  = 1;
  const WALL   = 2;
  const FILLED = 3;
  const OUTER  = 4;

  const C_BG      = '#c7cf54';
  const C_WALL    = '#3a3a2a';
  const C_TRAIL   = '#6a6a3a';
  const C_FILLED  = '#8a9a30';
  const C_BALL    = '#3a3a2a';
  const C_SPLITTER = '#d62020';
  const C_PLAYER  = '#1a1a0a';

  // LEVELS is defined in levels.js and loaded before this script.

  // --- DOM refs ---
  const canvas      = document.getElementById('game-canvas');
  const ctx         = canvas.getContext('2d');
  const hudLevel    = document.getElementById('hud-level');
  const hudScore    = document.getElementById('hud-score');
  const hudLives    = document.getElementById('hud-lives');
  const overlay     = document.getElementById('overlay');
  const overlayText = document.getElementById('overlay-text');
  const overlayInput = document.getElementById('overlay-input');
  const nameInput   = document.getElementById('name-input');
  const overlayLB   = document.getElementById('overlay-leaderboard');
  const overlaySub  = document.getElementById('overlay-sub');
  const hudLBBtn    = document.getElementById('hud-lb-btn');
  const hudMuteBtn  = document.getElementById('hud-mute-btn');

  canvas.width  = CANVAS_W;
  canvas.height = CANVAS_H;

  // --- Leaderboard (via DB module) ---
  function getPlayerName() { return DB.getPlayerName(); }
  function setPlayerName(name) { DB.setPlayerName(name); }

  async function renderLeaderboard() {
    overlayLB.classList.remove('hidden');
    overlayLB.innerHTML = '<div style="text-align:center;font-size:10px;color:#5a5a3a;">Loading leaderboard...</div>';
    const lb = await DB.getLeaderboard();
    if (lb.length === 0) {
      overlayLB.innerHTML = '<div style="text-align:center;font-size:10px;color:#5a5a3a;">No scores yet.</div>';
      return;
    }
    overlayLB.innerHTML =
      '<div class="lb-header">' +
        '<span class="lb-title" tabindex="0">TOP SCORES<sup>*</sup></span>' +
        '<div class="lb-tooltip">Points for area claimed. Bonus for big fills &amp; level completion.</div>' +
      '</div>';
    const titleEl = overlayLB.querySelector('.lb-title');
    titleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      titleEl.parentElement.classList.toggle('show-tip');
    });
    lb.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'lb-row';
      const t = entry.turns != null ? entry.turns + 'T' : '';
      const lvl = entry.level ? 'L' + entry.level : '-';
      const hearts = entry.lives > 0 ? '\u2665'.repeat(entry.lives) : '-';
      const dateStr = entry.created_at || entry.date;
      const dateLabel = dateStr ? formatLeaderboardDate(dateStr) : '';
      row.innerHTML =
        '<span class="lb-rank">' + (i + 1) + '.</span>' +
        '<span class="lb-name">' + escHtml(entry.name || '???') + '</span>' +
        '<span class="lb-pts">' + entry.score + '</span>' +
        '<span class="lb-turns">' + t + '</span>' +
        '<span class="lb-lvl">' + lvl + '</span>' +
        '<span class="lb-hearts">' + hearts + '</span>' +
        '<span class="lb-date">' + dateLabel + '</span>';
      overlayLB.appendChild(row);
    });
  }

  function formatLeaderboardDate(d) {
    const dt = new Date(typeof d === 'number' ? d : d);
    if (isNaN(dt)) return '';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    return dd + '.' + mm + ' ' + hh + ':' + min;
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // --- Personalized messages ---
  function addr(msg) {
    const name = getPlayerName();
    return name ? name + ', ' + msg : msg.charAt(0).toUpperCase() + msg.slice(1);
  }

  function gameOverMessage() {
    const name = getPlayerName();
    const msgs = name
      ? [
          name + '... that was rough.',
          'Better luck next time, ' + name + '.',
          'Ouch, ' + name + '. Just ouch.',
          name + ', you call that playing?',
          'Not your finest moment, ' + name + '.',
        ]
      : [
          'That was rough.',
          'Better luck next time.',
          'Ouch. Just ouch.',
          'You call that playing?',
          'Not your finest moment.',
        ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  function winMessage() {
    const name = getPlayerName();
    const msgs = name
      ? [
          'Incredible, ' + name + '!',
          name + ', you absolute legend!',
          'Congrats ' + name + ', you crushed it!',
          name + ' - the Erix master!',
        ]
      : [
          'Incredible!',
          'You absolute legend!',
          'You crushed it!',
          'The Erix master!',
        ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  function levelCompleteMessage() {
    const name = getPlayerName();
    if (!name) return 'Nice work!';
    const msgs = [
      'Nice work, ' + name + '!',
      'Keep it up, ' + name + '!',
      name + ', you got this!',
      'Solid, ' + name + '.',
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  // --- Hype messages for big plays ---
  const HYPE_MSGS_BIG = [
    'Bravo stari!', 'Ujebemti, lepa!', 'Fuck yeaaah!',
    'omg omg omg', 'INSANE!', 'BEAST MODE!',
  ];
  const HYPE_MSGS_GOOD = [
    'Niiice!', 'Lepo!', 'Sweet!', 'Dayum!', 'Solid!', 'GG!',
  ];

  let hypeText = null;  // { text, timer }

  function showHype(msg) {
    hypeText = { text: msg, timer: 60 }; // ~60 ticks visible
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function drawHype() {
    if (!hypeText || hypeText.timer <= 0) { hypeText = null; return; }
    hypeText.timer--;
    const alpha = Math.min(1, hypeText.timer / 15); // fade out last 15 ticks
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3a3a2a';
    ctx.fillText(hypeText.text, CANVAS_W / 2 + 1, CANVAS_H / 2 - 19);
    ctx.fillStyle = '#c7cf54';
    ctx.fillText(hypeText.text, CANVAS_W / 2, CANVAS_H / 2 - 20);
    ctx.restore();
  }

  // --- Game state ---
  let grid = null;
  let player, balls, trail;
  let direction, queuedDirection;
  let stoppedAtEdge, lastAttemptedDir;
  let lives, score, level, totalPlayable;
  let turns, levelTurns;       // total turns + turns for current level
  let state; // 'title' | 'playing' | 'dying' | 'levelComplete' | 'gameOver' | 'won' | 'enterName'
  let tickTimer = null;
  let dyingTimer = 0;
  let pendingAction = null; // callback after name entry overlay
  let splitTimer = null;    // ball split interval for bonus level

  // -------------------------------------------------------
  // Initialization
  // -------------------------------------------------------
  function initGame() {
    lives = 3;
    score = 0;
    level = 0;
    turns = 0;
    state = 'title';
    showTitle();
  }

  function showTitle() {
    const name = getPlayerName();
    const greeting = name ? 'Welcome back, ' + name + '!' : 'ERIX';
    showOverlay(greeting, 'Press ENTER to start', { showInput: true, showLB: true });
    nameInput.value = name;
    nameInput.focus();
  }

  function startLevel() {
    const def = LEVELS[level];

    grid = [];
    for (let x = 0; x < COLS; x++) grid[x] = new Uint8Array(ROWS);

    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) {
          grid[x][y] = OUTER;
        } else if (x === 1 || y === 1 || x === COLS - 2 || y === ROWS - 2) {
          grid[x][y] = WALL;
        }
      }
    }

    totalPlayable = 0;
    for (let x = 2; x < COLS - 2; x++)
      for (let y = 2; y < ROWS - 2; y++)
        totalPlayable++;

    player = { x: Math.floor(COLS / 2), y: 1 };
    direction = null;
    queuedDirection = null;
    stoppedAtEdge = false;
    lastAttemptedDir = null;
    trail = [];
    levelTurns = 0;

    // Spawn positions: first ball always center, extras get progressively sketchier
    const spawnSlots = [
      { x: Math.floor(COLS / 2),     y: Math.floor(ROWS / 2) },      // center
      { x: Math.floor(COLS * 0.25),  y: Math.floor(ROWS * 0.25) },   // top-left area
      { x: Math.floor(COLS * 0.75),  y: Math.floor(ROWS * 0.75) },   // bottom-right area
      { x: Math.floor(COLS * 0.75),  y: Math.floor(ROWS * 0.25) },   // top-right area
      { x: Math.floor(COLS * 0.25),  y: Math.floor(ROWS * 0.75) },   // bottom-left area
    ];
    balls = [];
    const splittingBallCount = def.splittingBallCount || 0;
    for (let i = 0; i < def.ballCount; i++) {
      const slot = spawnSlots[i % spawnSlots.length];
      balls.push({
        x: slot.x + Math.floor(Math.random() * 3) - 1,
        y: slot.y + Math.floor(Math.random() * 3) - 1,
        dx: (Math.random() < 0.5 ? 1 : -1),
        dy: (Math.random() < 0.5 ? 1 : -1),
        // The first N balls are marked as splitters on levels that use them
        splitter: i < splittingBallCount,
      });
    }

    updateHUD();
    state = 'playing';
    hideOverlay();
    startTick();

    // Every splitIntervalMs, each ball flagged as a splitter tries to spawn a
    // clone next to itself. Respects maxBallCount if set. If
    // clonesAlsoSplit is true, the clone is itself a splitter.
    if (splittingBallCount > 0) {
      const intervalMs = def.splitIntervalMs || 20000;
      const clonesSplit = !!def.clonesAlsoSplit;
      const maxBalls = def.maxBallCount;
      splitTimer = setInterval(() => {
        if (state !== 'playing') return;
        const splitters = balls.filter(b => b.splitter);
        for (const splitter of splitters) {
          if (maxBalls != null && balls.length >= maxBalls) break;
          // Find an empty cell next to the splitter for the clone
          const offsets = [[1,0],[-1,0],[0,1],[0,-1]];
          let sx = splitter.x, sy = splitter.y;
          for (const [ox, oy] of offsets) {
            const c = cellType(splitter.x + ox, splitter.y + oy);
            if (c === EMPTY || c === -1) { sx = splitter.x + ox; sy = splitter.y + oy; break; }
          }
          if (sx >= 2 && sx < COLS - 2 && sy >= 2 && sy < ROWS - 2 && grid[sx][sy] === EMPTY) {
            balls.push({
              x: sx,
              y: sy,
              dx: -splitter.dx,
              dy: splitter.dy,
              splitter: clonesSplit,
            });
            SFX.split();
          }
        }
      }, intervalMs);
    }
  }

  // -------------------------------------------------------
  // Tick loop
  // -------------------------------------------------------
  function startTick() {
    stopTick();
    tickTimer = setInterval(gameTick, TICK_MS);
  }

  function stopTick() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (splitTimer) { clearInterval(splitTimer); splitTimer = null; }
  }

  function gameTick() {
    if (state === 'dying') {
      dyingTimer--;
      if (dyingTimer <= 0) {
        if (lives <= 0) {
          gameOver();
        } else {
          resetPlayerAfterDeath();
          state = 'playing';
        }
      }
      render();
      return;
    }
    if (state !== 'playing') return;

    movePlayer();
    if (state !== 'playing') { render(); return; }
    moveBalls();
    render();
  }

  // -------------------------------------------------------
  // Player movement
  // -------------------------------------------------------
  function cellType(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return -1;
    return grid[x][y];
  }

  function isSolid(x, y) {
    const c = cellType(x, y);
    return c === WALL || c === FILLED || c === OUTER || c === -1;
  }

  function movePlayer() {
    if (queuedDirection !== null) {
      direction = queuedDirection;
      queuedDirection = null;
    }
    if (direction === null) return;

    const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
    const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
    const nx = player.x + dx;
    const ny = player.y + dy;
    const target = cellType(nx, ny);

    const isDrawing = trail.length > 0;

    if (!isDrawing) {
      if (target === WALL || target === FILLED) {
        player.x = nx;
        player.y = ny;
        stoppedAtEdge = false;
        return;
      }
      if (target === EMPTY) {
        grid[nx][ny] = TRAIL;
        trail.push({ x: nx, y: ny });
        player.x = nx;
        player.y = ny;
        stoppedAtEdge = false;
        SFX.move();
        return;
      }
      direction = null;
      stoppedAtEdge = true;
      return;
    }

    if (target === TRAIL) {
      playerDie();
      return;
    }

    if (target === EMPTY) {
      grid[nx][ny] = TRAIL;
      trail.push({ x: nx, y: ny });
      player.x = nx;
      player.y = ny;
      stoppedAtEdge = false;
      SFX.move();
      return;
    }

    if (target === WALL || target === FILLED) {
      player.x = nx;
      player.y = ny;
      completeTrail();
      stoppedAtEdge = false;
      return;
    }

    direction = null;
    stoppedAtEdge = true;
  }

  function completeTrail() {
    for (const t of trail) {
      grid[t.x][t.y] = WALL;
    }

    const filledNow = fillRegions();

    if (grid[player.x][player.y] !== WALL) {
      for (let i = trail.length - 1; i >= 0; i--) {
        if (grid[trail[i].x][trail[i].y] === WALL) {
          player.x = trail[i].x;
          player.y = trail[i].y;
          break;
        }
      }
    }

    trail = [];
    direction = null;
    levelTurns++;
    turns++;

    // Bonus life: on level 5+ if you complete a level in <= 2 turns,
    // Bonus life only for epic single fills (>=25% of playable area), L6+
    const fillPct = filledNow / totalPlayable;
    const earnedLife = level >= 5 && fillPct >= 0.25;

    if (earnedLife && lives < 5) {
      lives++;
      SFX.levelUp();
    }

    updateHUD();
    SFX.fill();

    if (claimedCount() / totalPlayable >= LEVELS[level].requiredPercentage) {
      // Level finished in 1 turn = one-shot
      if (levelTurns === 1) {
        showHype(pickRandom(HYPE_MSGS_BIG));
      }
      levelComplete();
    } else if (fillPct >= 0.25) {
      // Massive single fill (25%+)
      showHype(pickRandom(HYPE_MSGS_BIG));
    } else if (fillPct >= 0.12) {
      // Decent fill (12%+)
      showHype(pickRandom(HYPE_MSGS_GOOD));
    }
  }

  function fillRegions() {
    const visited = [];
    for (let x = 0; x < COLS; x++) visited[x] = new Uint8Array(ROWS);

    const regions = [];

    for (let x = 2; x < COLS - 2; x++) {
      for (let y = 2; y < ROWS - 2; y++) {
        if (grid[x][y] !== EMPTY || visited[x][y]) continue;

        const cells = [];
        let hasBall = false;
        const queue = [x * ROWS + y];
        visited[x][y] = 1;

        while (queue.length > 0) {
          const code = queue.shift();
          const cx = (code / ROWS) | 0;
          const cy = code % ROWS;
          cells.push(code);

          for (const b of balls) {
            if (b.x === cx && b.y === cy) hasBall = true;
          }

          const nb = [
            [cx - 1, cy], [cx + 1, cy],
            [cx, cy - 1], [cx, cy + 1],
          ];
          for (const [ax, ay] of nb) {
            if (ax >= 2 && ax < COLS - 2 && ay >= 2 && ay < ROWS - 2 &&
                grid[ax][ay] === EMPTY && !visited[ax][ay]) {
              visited[ax][ay] = 1;
              queue.push(ax * ROWS + ay);
            }
          }
        }
        regions.push({ cells, hasBall });
      }
    }

    let filledNow = 0;
    for (const region of regions) {
      if (region.hasBall) continue;
      for (const code of region.cells) {
        const cx = (code / ROWS) | 0;
        const cy = code % ROWS;
        grid[cx][cy] = FILLED;
        filledNow++;
      }
    }

    score += filledNow * 10;
    if (filledNow > 100) score += filledNow * 5;
    return filledNow;
  }

  // -------------------------------------------------------
  // Ball movement
  // -------------------------------------------------------
  function moveBalls() {
    // ballSpeed may be fractional: 1.5 = always 1 step + 50% chance of a 2nd.
    const speed = LEVELS[level].ballSpeed;
    const fullSteps = Math.floor(speed);
    const extraStep = (speed - fullSteps) > Math.random() ? 1 : 0;
    const totalSteps = fullSteps + extraStep;
    for (let step = 0; step < totalSteps; step++) {
      for (const b of balls) {
        if (state !== 'playing') return;
        moveSingleBall(b);
      }
    }
  }

  function moveSingleBall(b) {
    const nx = b.x + b.dx;
    const ny = b.y + b.dy;

    if (cellType(nx, ny) === TRAIL) { playerDie(); return; }
    if (trail.length > 0 && nx === player.x && ny === player.y) { playerDie(); return; }

    const hitH = isSolid(b.x + b.dx, b.y);
    const hitV = isSolid(b.x, b.y + b.dy);
    const hitD = isSolid(nx, ny);

    if (hitH && hitV) {
      b.dx = -b.dx;
      b.dy = -b.dy;
    } else if (hitH || (hitD && !hitV)) {
      b.dx = -b.dx;
    } else if (hitV || (hitD && !hitH)) {
      b.dy = -b.dy;
    } else {
      b.x = nx;
      b.y = ny;
    }
  }

  // -------------------------------------------------------
  // Death / lives
  // -------------------------------------------------------
  function playerDie() {
    if (state !== 'playing') return;
    SFX.hit();
    lives--;

    for (const t of trail) grid[t.x][t.y] = EMPTY;
    trail = [];

    state = 'dying';
    dyingTimer = 15;
    updateHUD();

    if (lives <= 0) setTimeout(() => SFX.die(), 300);
  }

  function resetPlayerAfterDeath() {
    player.x = Math.floor(COLS / 2);
    player.y = 1;
    direction = null;
    queuedDirection = null;
    stoppedAtEdge = false;
    lastAttemptedDir = null;
  }

  // -------------------------------------------------------
  // Level transitions
  // -------------------------------------------------------
  function levelComplete() {
    stopTick();
    state = 'levelComplete';
    const pct = Math.floor((claimedCount() / totalPlayable) * 100);
    score += pct * 50;

    SFX.levelUp();

    if (level >= LEVELS.length - 1) {
      setTimeout(() => {
        state = 'won';
        SFX.win();
        finishGame(true);
      }, 600);
    } else {
      let msg = levelCompleteMessage() + '\nLevel ' + (level + 1) + ' done\n' + pct + '% filled in ' + levelTurns + ' turns\nScore: ' + score;
      const nextLevel = LEVELS[level + 1];
      if (nextLevel && nextLevel.hypeMessage) {
        msg += '\n\n' + nextLevel.hypeMessage;
      }
      showOverlay(msg, 'Press any key');
    }
  }

  function gameOver() {
    stopTick();
    state = 'gameOver';
    SFX.gameOver();
    finishGame(false);
  }

  function finishGame(won) {
    const name = getPlayerName();

    // If no name yet, prompt for it before showing final screen
    if (!name) {
      state = 'enterName';
      const msg = won
        ? 'YOU WIN!\nScore: ' + score + '  Turns: ' + turns
        : 'GAME OVER\nScore: ' + score + '  Turns: ' + turns;
      showOverlay(msg + '\n\nEnter your name:', 'Press ENTER to submit', { showInput: true });
      nameInput.value = '';
      nameInput.focus();
      pendingAction = () => showFinalScreen(won);
      return;
    }

    showFinalScreen(won);
  }

  async function showFinalScreen(won) {
    const name = getPlayerName();
    if (name) await DB.addScore(name, score, turns, level + 1, lives);

    const msg = won ? winMessage() : gameOverMessage();
    showOverlay(
      msg + '\nScore: ' + score + '  Turns: ' + turns,
      'Press ENTER to play again',
      { showLB: true }
    );
    if (won) state = 'won'; else state = 'gameOver';
  }

  // -------------------------------------------------------
  // Rendering
  // -------------------------------------------------------
  function render() {
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (!grid) return;

    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        const c = grid[x][y];
        let color = null;
        if (c === WALL) color = C_WALL;
        else if (c === TRAIL) color = C_TRAIL;
        else if (c === FILLED) color = C_FILLED;
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }

    for (const b of balls) {
      ctx.fillStyle = b.splitter ? C_SPLITTER : C_BALL;
      ctx.fillRect(b.x * CELL + 1, b.y * CELL + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = C_BG;
      ctx.fillRect(b.x * CELL + 1, b.y * CELL + 1, 1, 1);
    }

    if (state === 'dying' && dyingTimer % 2 !== 0) return;

    ctx.fillStyle = C_PLAYER;
    ctx.fillRect(player.x * CELL, player.y * CELL, CELL, CELL);
    ctx.fillStyle = C_BG;
    ctx.fillRect(player.x * CELL + 2, player.y * CELL + 2, CELL - 4, CELL - 4);

    drawHype();
  }

  // -------------------------------------------------------
  // HUD
  // -------------------------------------------------------
  function claimedCount() {
    // Count FILLED + interior WALL cells (trails count as claimed area)
    let count = 0;
    for (let x = 2; x < COLS - 2; x++)
      for (let y = 2; y < ROWS - 2; y++)
        if (grid[x][y] === FILLED || grid[x][y] === WALL) count++;
    return count;
  }

  function updateHUD() {
    hudLevel.textContent = 'LVL ' + (level + 1);
    const claimed = claimedCount();
    const pct = totalPlayable > 0 ? Math.floor((claimed / totalPlayable) * 100) : 0;
    const target = Math.floor(LEVELS[level].requiredPercentage * 100);
    hudScore.textContent = score + '  ' + pct + '/' + target + '%  TURNS:' + turns;
    hudLives.textContent = '\u2665'.repeat(Math.max(0, lives));
  }

  // -------------------------------------------------------
  // Overlay
  // -------------------------------------------------------
  function showOverlay(text, sub, opts) {
    opts = opts || {};
    overlayText.innerHTML = '';
    text.split('\n').forEach((line, i, arr) => {
      overlayText.appendChild(document.createTextNode(line));
      if (i < arr.length - 1) overlayText.appendChild(document.createElement('br'));
    });
    overlaySub.textContent = sub || '';

    if (opts.showInput) {
      overlayInput.classList.remove('hidden');
    } else {
      overlayInput.classList.add('hidden');
    }

    if (opts.showLB) {
      renderLeaderboard();
    } else {
      overlayLB.classList.add('hidden');
    }

    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
    overlayInput.classList.add('hidden');
    overlayLB.classList.add('hidden');
  }

  // -------------------------------------------------------
  // Input
  // -------------------------------------------------------
  function confirmNameAndProceed() {
    const val = nameInput.value.trim();
    if (val.length < 3) {
      nameInput.focus();
      return;
    }
    setPlayerName(val);

    if (pendingAction) {
      const action = pendingAction;
      pendingAction = null;
      action();
    } else {
      // Title screen → start game
      SFX.menuSelect();
      const startLvl = parseInt(new URLSearchParams(window.location.search).get('wlfdsl'));
      level = (startLvl >= 1 && startLvl <= LEVELS.length) ? startLvl - 1 : 0;
      startLevel();
    }
  }

  function toggleLeaderboard() {
    if (state === 'paused') {
      // Resume
      state = 'playing';
      hideOverlay();
      startTick();
      return;
    }
    if (state === 'playing') {
      // Pause and show leaderboard
      stopTick();
      state = 'paused';
      showOverlay('LEADERBOARD', 'Press ESC to resume', { showLB: true });
    }
  }

  function handleDirection(dir) {
    if (state === 'paused') {
      toggleLeaderboard(); // resume on any direction key
      return;
    }
    if (state === 'title' || state === 'enterName') return; // handled by Enter key
    if (state === 'levelComplete') {
      SFX.menuSelect();
      level++;
      startLevel();
      return;
    }
    if (state === 'gameOver' || state === 'won') return; // handled by Enter key
    if (state !== 'playing') return;

    if (stoppedAtEdge && dir === lastAttemptedDir) return;

    lastAttemptedDir = dir;
    stoppedAtEdge = false;

    if (direction === null) {
      direction = dir;
    } else {
      queuedDirection = dir;
    }
  }

  // Keyboard
  window.addEventListener('keydown', (e) => {
    // Escape: toggle leaderboard pause
    if (e.key === 'Escape') {
      e.preventDefault();
      toggleLeaderboard();
      return;
    }

    // Enter key: used for name submission and screen transitions
    if (e.key === 'Enter') {
      e.preventDefault();
      if (state === 'title' || state === 'enterName') {
        confirmNameAndProceed();
        return;
      }
      if (state === 'gameOver' || state === 'won') {
        SFX.menuSelect();
        initGame();
        return;
      }
      if (state === 'levelComplete') {
        SFX.menuSelect();
        level++;
        startLevel();
        return;
      }
      return;
    }

    // Don't capture keys when input is focused (let user type their name)
    if (document.activeElement === nameInput) return;

    const map = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right',
    };
    const dir = map[e.key];
    if (dir) {
      e.preventDefault();
      handleDirection(dir);
    } else if (state === 'levelComplete') {
      if (['Tab', 'Alt', 'Control', 'Shift', 'Meta'].indexOf(e.key) === -1) {
        SFX.menuSelect();
        level++;
        startLevel();
      }
    }
  });

  // Mute button
  function updateMuteBtn() {
    const on = '<svg width="16" height="16" viewBox="0 0 16 16"><polygon points="2,5 2,11 5,11 9,14 9,2 5,5" fill="#3a3a2a"/><path d="M11,4.5 Q14,8 11,11.5" stroke="#3a3a2a" stroke-width="1.5" fill="none"/><path d="M12.5,3 Q16.5,8 12.5,13" stroke="#3a3a2a" stroke-width="1.5" fill="none"/></svg>';
    const off = '<svg width="16" height="16" viewBox="0 0 16 16"><polygon points="2,5 2,11 5,11 9,14 9,2 5,5" fill="#3a3a2a"/><line x1="11" y1="4" x2="15" y2="12" stroke="#3a3a2a" stroke-width="2"/><line x1="15" y1="4" x2="11" y2="12" stroke="#3a3a2a" stroke-width="2"/></svg>';
    hudMuteBtn.innerHTML = SFX.isMuted() ? off : on;
    hudMuteBtn.title = SFX.isMuted() ? 'Unmute' : 'Mute';
  }
  updateMuteBtn();
  hudMuteBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    SFX.toggleMute();
    updateMuteBtn();
  });

  // Leaderboard button
  hudLBBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    toggleLeaderboard();
  });

  // D-Pad (mobile)
  const btnMap = { 'btn-up': 'up', 'btn-down': 'down', 'btn-left': 'left', 'btn-right': 'right' };
  for (const [id, dir] of Object.entries(btnMap)) {
    document.getElementById(id).addEventListener('pointerdown', (e) => {
      e.preventDefault();
      handleDirection(dir);
    });
  }

  // Touch swipe on canvas
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!touchStart) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
      handleDirection(Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up'));
      touchStart = { x: t.clientX, y: t.clientY };
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => { touchStart = null; });

  overlay.addEventListener('pointerdown', (e) => {
    // Don't steal focus from name input
    if (e.target === nameInput) return;
    e.preventDefault();

    if (state === 'title' || state === 'enterName') {
      confirmNameAndProceed();
    } else if (state === 'levelComplete') {
      SFX.menuSelect();
      level++;
      startLevel();
    } else if (state === 'gameOver' || state === 'won') {
      SFX.menuSelect();
      initGame();
    }
  });

  // -------------------------------------------------------
  // Boot
  // -------------------------------------------------------
  initGame();
  render();

})();
