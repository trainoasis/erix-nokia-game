// ============================================================
// Leaderboard DB — calls server API with localStorage fallback
// ============================================================

const DB = (() => {
  const LB_KEY = 'erix_leaderboard';
  const NAME_KEY = 'erix_player_name';
  const MAX_LB = 20;

  // --- Error toast ---
  let toastTimer = null;
  function showError(msg) {
    const el = document.getElementById('error-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 5000);
  }

  async function readErrorMessage(res) {
    try {
      const body = await res.json();
      if (body && body.error) return body.error;
    } catch {}
    return 'HTTP ' + res.status;
  }

  // --- localStorage helpers ---
  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; }
    catch { return []; }
  }

  function saveLocal(lb) {
    localStorage.setItem(LB_KEY, JSON.stringify(lb));
  }

  // --- Public API ---
  return {
    getPlayerName() {
      return localStorage.getItem(NAME_KEY) || '';
    },

    setPlayerName(name) {
      localStorage.setItem(NAME_KEY, name.trim());
    },

    async addScore(name, score, turns, level, lives) {
      // Always save locally
      const lb = loadLocal();
      lb.push({ name, score, turns, level, lives, date: Date.now() });
      lb.sort((a, b) => b.score - a.score);
      if (lb.length > MAX_LB) lb.length = MAX_LB;
      saveLocal(lb);

      // Push to server
      try {
        const res = await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, score, turns, level, lives }),
        });
        if (!res.ok) {
          const msg = await readErrorMessage(res);
          console.warn('Server insert failed:', res.status, msg);
          showError('Score not saved: ' + msg);
        }
      } catch (e) {
        console.warn('Server insert failed:', e);
        showError('Score not saved: network error');
      }
    },

    async getLeaderboard() {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) return await res.json();
        const msg = await readErrorMessage(res);
        console.warn('Server fetch failed:', res.status, msg);
        showError('Leaderboard unavailable: ' + msg);
      } catch (e) {
        console.warn('Server fetch failed:', e);
        showError('Leaderboard unavailable: network error');
      }
      // Fallback to localStorage
      return loadLocal();
    }
  };
})();
