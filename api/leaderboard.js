const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Simple in-memory rate limiter (resets on cold start, good enough)
const rateMap = new Map();
const RATE_WINDOW = 60_000;
const RATE_MAX = 5;

function rateOk(ip) {
  const now = Date.now();
  const hits = (rateMap.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  if (hits.length >= RATE_MAX) return false;
  hits.push(now);
  rateMap.set(ip, hits);
  return true;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('leaderboard')
      .select('name, score, turns, level, lives, created_at')
      .order('score', { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    return res.json(data);
  }

  if (req.method === 'POST') {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!rateOk(ip)) return res.status(429).json({ error: 'Too many requests' });

    const { name, score, turns, level, lives } = req.body;

    if (typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 20) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    if (!Number.isInteger(score) || score < 0 || score > 100_000) {
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
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
