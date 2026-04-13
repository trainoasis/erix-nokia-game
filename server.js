const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(__dirname, { index: 'index.html' }));

// --- Supabase (server-side only) ---
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- Simple in-memory rate limiter (per IP, 5 inserts/min) ---
const rateMap = new Map();
const RATE_WINDOW = 60_000;
const RATE_MAX = 15;
const LEADERBOARD_LIMIT = 100;

function rateOk(ip) {
  const now = Date.now();
  const hits = (rateMap.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  if (hits.length >= RATE_MAX) return false;
  hits.push(now);
  rateMap.set(ip, hits);
  return true;
}

// Clean up rate map every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, hits] of rateMap) {
    const fresh = hits.filter(t => now - t < RATE_WINDOW);
    if (fresh.length === 0) rateMap.delete(ip);
    else rateMap.set(ip, fresh);
  }
}, 5 * 60_000);

// --- Routes ---

app.get('/api/leaderboard', async (_req, res) => {
  const { data, error } = await sb
    .from('leaderboard')
    .select('name, score, turns, level, lives, created_at')
    .order('score', { ascending: false })
    .limit(LEADERBOARD_LIMIT);

  if (error) return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  res.json(data);
});

app.post('/api/leaderboard', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!rateOk(ip)) return res.status(429).json({ error: 'Too many requests' });

  const { name, score, turns, level, lives } = req.body;

  // Validate
  if (typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 20) {
    return res.status(400).json({ error: 'Invalid name' });
  }
  if (!Number.isInteger(score) || score < 0) {
    return res.status(400).json({ error: 'Invalid score' });
  }
  if (!Number.isInteger(turns) || turns < 0 || turns > 100_000) {
    return res.status(400).json({ error: 'Invalid turns' });
  }
  const lvl = Number.isInteger(level) ? Math.min(Math.max(level, 0), 20) : 0;
  const hp = Number.isInteger(lives) ? Math.min(Math.max(lives, 0), 5) : 0;

  const { error } = await sb
    .from('leaderboard')
    .insert({ name: name.trim(), score, turns, level: lvl, lives: hp });

  if (error) return res.status(500).json({ error: 'Failed to save score' });
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
