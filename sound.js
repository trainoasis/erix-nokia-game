// Sound engine using Web Audio API — generates retro 8-bit sounds procedurally
const SFX = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctx;
  }

  // Ensure AudioContext is resumed on first user interaction
  function unlock() {
    const c = getCtx();
    if (c.state === 'suspended') c.resume();
  }
  window.addEventListener('keydown', unlock, { once: false });
  window.addEventListener('pointerdown', unlock, { once: false });

  function playTone(freq, duration, type = 'square', volume = 0.15) {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }

  return {
    move() {
      playTone(220, 0.04, 'square', 0.06);
    },
    fill() {
      // Rising arpeggio
      playTone(330, 0.1, 'square', 0.12);
      setTimeout(() => playTone(440, 0.1, 'square', 0.12), 60);
      setTimeout(() => playTone(550, 0.15, 'square', 0.12), 120);
    },
    hit() {
      // Creepy 8-bit laughter — randomized each time
      const c = getCtx();
      const laughCount = 4 + Math.floor(Math.random() * 4); // 4-7 "ha"s
      const baseFreq = 250 + Math.random() * 150;           // random pitch center
      const rising = Math.random() < 0.5;                   // rising or falling laugh

      for (let i = 0; i < laughCount; i++) {
        const delay = i * (70 + Math.random() * 40);
        const pitch = baseFreq + (rising ? i : -i) * (15 + Math.random() * 20);

        setTimeout(() => {
          // Each "ha" is a quick pitch-bent tone
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = 'square';
          const t = c.currentTime;
          osc.frequency.setValueAtTime(pitch, t);
          osc.frequency.linearRampToValueAtTime(pitch * 0.7, t + 0.08);
          gain.gain.setValueAtTime(0.18, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(t);
          osc.stop(t + 0.1);
        }, delay);
      }
    },
    die() {
      // Descending tones
      playTone(400, 0.15, 'square', 0.18);
      setTimeout(() => playTone(300, 0.15, 'square', 0.18), 120);
      setTimeout(() => playTone(200, 0.15, 'square', 0.18), 240);
      setTimeout(() => playTone(100, 0.3, 'sawtooth', 0.18), 360);
    },
    levelUp() {
      // Victory fanfare
      const notes = [523, 587, 659, 784, 880, 1047];
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.15, 'square', 0.14), i * 80);
      });
    },
    win() {
      // Big win
      const notes = [523, 659, 784, 1047, 784, 1047, 1319];
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.2, 'square', 0.16), i * 100);
      });
    },
    gameOver() {
      const notes = [400, 350, 300, 250, 200, 150];
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.25, 'sawtooth', 0.15), i * 150);
      });
    },
    menuSelect() {
      playTone(660, 0.08, 'square', 0.1);
    }
  };
})();
