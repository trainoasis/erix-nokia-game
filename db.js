// ============================================================
// Leaderboard DB — calls server API with localStorage fallback
// ============================================================

const DB = (() => {
  const LB_KEY = 'erix_leaderboard';
  const NAME_KEY = 'erix_player_name';
  const MAX_LB = 20;

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
        await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, score, turns, level, lives }),
        });
      } catch (e) {
        console.warn('Server insert failed:', e);
      }
    },

    async getLeaderboard() {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Server fetch failed:', e);
      }
      // Fallback to localStorage
      return loadLocal();
    }
  };
})();
