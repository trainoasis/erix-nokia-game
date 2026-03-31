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
  const C_PLAYER  = '#1a1a0a';

  const LEVELS = [
    { balls: 1, ballSpeed: 1, requiredPct: 0.65 },
    { balls: 1, ballSpeed: 1, requiredPct: 0.72 },
    { balls: 2, ballSpeed: 1, requiredPct: 0.68 },
    { balls: 2, ballSpeed: 1, requiredPct: 0.75 },
    { balls: 3, ballSpeed: 1, requiredPct: 0.70 },
    { balls: 3, ballSpeed: 1, requiredPct: 0.72 },
    { balls: 4, ballSpeed: 1, requiredPct: 0.72 },
    { balls: 4, ballSpeed: 1, requiredPct: 0.75 },
    { balls: 5, ballSpeed: 1, requiredPct: 0.75 },
    { balls: 5, ballSpeed: 1, requiredPct: 0.80 },
  ];

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

  canvas.width  = CANVAS_W;
  canvas.height = CANVAS_H;

  // --- Leaderboard (via DB module) ---
  function getPlayerName() { return DB.getPlayerName(); }
  function setPlayerName(name) { DB.setPlayerName(name); }

  async function renderLeaderboard() {
    const lb = await DB.getLeaderboard();
    if (lb.length === 0) {
      overlayLB.classList.add('hidden');
      return;
    }
    overlayLB.classList.remove('hidden');
    overlayLB.innerHTML = '<div style="text-align:center;margin-bottom:6px;font-size:10px;color:#5a5a3a;">TOP SCORES</div>';
    lb.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'lb-row';
      const t = entry.turns != null ? entry.turns + 'T' : '';
      row.innerHTML =
        '<span class="lb-rank">' + (i + 1) + '.</span>' +
        '<span class="lb-name">' + escHtml(entry.name || '???') + '</span>' +
        '<span class="lb-score">' + entry.score + (t ? ' ' + t : '') + '</span>';
      overlayLB.appendChild(row);
    });
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

  // --- Game state ---
  let grid = null;
  let player, balls, trail;
  let direction, queuedDirection;
  let stoppedAtEdge, lastAttemptedDir;
  let lives, score, level, filledCount, totalPlayable;
  let turns, levelTurns;       // total turns + turns for current level
  let state; // 'title' | 'playing' | 'dying' | 'levelComplete' | 'gameOver' | 'won' | 'enterName'
  let tickTimer = null;
  let dyingTimer = 0;
  let pendingAction = null; // callback after name entry overlay

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
    filledCount = 0;

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
    for (let i = 0; i < def.balls; i++) {
      const slot = spawnSlots[i % spawnSlots.length];
      balls.push({
        x: slot.x + Math.floor(Math.random() * 3) - 1,
        y: slot.y + Math.floor(Math.random() * 3) - 1,
        dx: (Math.random() < 0.5 ? 1 : -1),
        dy: (Math.random() < 0.5 ? 1 : -1),
      });
    }

    updateHUD();
    state = 'playing';
    hideOverlay();
    startTick();
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
      if (target === WALL) {
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
    // or if a single fill covers >= 25% of playable area
    const fillPct = filledNow / totalPlayable;
    const earnedLife =
      (level >= 4 && levelTurns <= 2 && filledCount / totalPlayable >= LEVELS[level].requiredPct) ||
      (level >= 4 && fillPct >= 0.25);

    if (earnedLife && lives < 5) {
      lives++;
      SFX.levelUp();
    }

    updateHUD();
    SFX.fill();

    if (filledCount / totalPlayable >= LEVELS[level].requiredPct) {
      levelComplete();
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

    filledCount += filledNow;
    score += filledNow * 10;
    if (filledNow > 100) score += filledNow * 5;
    return filledNow;
  }

  // -------------------------------------------------------
  // Ball movement
  // -------------------------------------------------------
  function moveBalls() {
    const speed = LEVELS[level].ballSpeed;
    for (let step = 0; step < speed; step++) {
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
    const pct = Math.floor((filledCount / totalPlayable) * 100);
    score += pct * 50;

    SFX.levelUp();

    if (level >= LEVELS.length - 1) {
      setTimeout(() => {
        state = 'won';
        SFX.win();
        finishGame(true);
      }, 600);
    } else {
      showOverlay(
        levelCompleteMessage() + '\nLevel ' + (level + 1) + ' done\n' + pct + '% filled in ' + levelTurns + ' turns\nScore: ' + score,
        'Press any key'
      );
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
    if (name) await DB.addScore(name, score, turns);

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
        if (c === WALL || c === OUTER) color = C_WALL;
        else if (c === TRAIL) color = C_TRAIL;
        else if (c === FILLED) color = C_FILLED;
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }

    for (const b of balls) {
      ctx.fillStyle = C_BALL;
      ctx.fillRect(b.x * CELL + 1, b.y * CELL + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = C_BG;
      ctx.fillRect(b.x * CELL + 1, b.y * CELL + 1, 1, 1);
    }

    if (state === 'dying' && dyingTimer % 2 !== 0) return;

    ctx.fillStyle = C_PLAYER;
    ctx.fillRect(player.x * CELL, player.y * CELL, CELL, CELL);
    ctx.fillStyle = C_BG;
    ctx.fillRect(player.x * CELL + 2, player.y * CELL + 2, CELL - 4, CELL - 4);
  }

  // -------------------------------------------------------
  // HUD
  // -------------------------------------------------------
  function updateHUD() {
    hudLevel.textContent = 'LVL ' + (level + 1);
    const pct = totalPlayable > 0 ? Math.floor((filledCount / totalPlayable) * 100) : 0;
    const target = Math.floor(LEVELS[level].requiredPct * 100);
    hudScore.textContent = score + '  ' + pct + '/' + target + '%  T:' + turns;
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
    if (val) setPlayerName(val);

    if (pendingAction) {
      const action = pendingAction;
      pendingAction = null;
      action();
    } else {
      // Title screen → start game
      SFX.menuSelect();
      level = 0;
      startLevel();
    }
  }

  function handleDirection(dir) {
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
