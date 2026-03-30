// ============================================================
// Leaderboard DB — Supabase with localStorage fallback
// ============================================================
//
// Setup:
//   1. Create a free Supabase project at https://supabase.com
//   2. Run the SQL below in the Supabase SQL editor
//   3. Paste your project URL and anon key below
//
// SQL:
//   create table leaderboard (
//     id bigint generated always as identity primary key,
//     name text not null,
//     score int not null,
//     turns int not null default 0,
//     created_at timestamptz default now()
//   );
//
//   alter table leaderboard enable row level security;
//
//   create policy "Anyone can read leaderboard"
//     on leaderboard for select using (true);
//
//   create policy "Anyone can insert into leaderboard"
//     on leaderboard for insert with check (true);
//
// ============================================================

const DB = (() => {
  // ---- CONFIG: paste your Supabase credentials here ----
  const SUPABASE_URL = '';   // e.g. 'https://xyz.supabase.co'
  const SUPABASE_KEY = '';   // anon/public key
  // -------------------------------------------------------

  const LB_KEY = 'erix_leaderboard';
  const NAME_KEY = 'erix_player_name';
  const MAX_LB = 10;

  let sb = null;

  function supabase() {
    if (sb) return sb;
    if (SUPABASE_URL && SUPABASE_KEY && window.supabase) {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return sb;
  }

  function isOnline() {
    return !!supabase();
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

    async addScore(name, score, turns) {
      // Always save locally
      const lb = loadLocal();
      lb.push({ name, score, turns, date: Date.now() });
      lb.sort((a, b) => b.score - a.score);
      if (lb.length > MAX_LB) lb.length = MAX_LB;
      saveLocal(lb);

      // Push to Supabase if available
      if (isOnline()) {
        try {
          await supabase()
            .from('leaderboard')
            .insert({ name, score, turns });
        } catch (e) {
          console.warn('Supabase insert failed:', e);
        }
      }
    },

    async getLeaderboard() {
      // Try Supabase first
      if (isOnline()) {
        try {
          const { data, error } = await supabase()
            .from('leaderboard')
            .select('name, score, turns')
            .order('score', { ascending: false })
            .limit(MAX_LB);
          if (!error && data) return data;
        } catch (e) {
          console.warn('Supabase fetch failed:', e);
        }
      }
      // Fallback to localStorage
      return loadLocal();
    }
  };
})();
