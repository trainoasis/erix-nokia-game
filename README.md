# Erix Nokia Game

A modernized take on the classic Nokia 3310 Erix (Qix) game, built with vanilla JavaScript and HTML5 Canvas.

Claim territory by drawing lines across the playfield while dodging bouncing balls. Fill enough area to advance through 10 increasingly chaotic levels.

Inspired by [this early prototype](https://github.com/trainoasis/ErixGame) using CreateJS.

## How to play

- Move along the border edges with **arrow keys** or **WASD**
- Step off the border to start drawing a line through empty space
- Connect your line back to any solid edge to claim the area without balls
- If a ball hits your active line or you cross your own trail, you lose a life
- Fill the required percentage to complete each level

Mobile: use the on-screen D-pad or swipe gestures.

## Features

- Nokia 3310 LCD pixel aesthetic
- 10 levels with progressive difficulty (more balls, trickier spawn positions)
- Procedural 8-bit sound effects (Web Audio API)
- Edge-stop mechanic — line stops at boundaries, change direction to continue
- Bonus lives for efficient play (25%+ fill in one move, or completing a level in 2 turns)
- Leaderboard with player names, scores, and turn counts
- Mobile-friendly with touch controls

## Run locally

```
npm install
cp .env.example .env   # fill in your Supabase credentials
npm start
```

Then open http://localhost:3000.

## Stack

Vanilla JS, HTML5 Canvas, CSS, Web Audio API, Express, Supabase.
