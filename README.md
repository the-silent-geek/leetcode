# lc.grind — LeetCode Accountability Tracker

A shared tracker for you and 2 friends. Submit daily or face the penalty.

## Features
- Live LeetCode stats (problems solved, streak, easy/medium/hard breakdown)
- Daily submission check — green if submitted, red if not
- Penalty counter per person
- Leaderboard sorted by problems solved
- Persists in localStorage — settings saved across sessions

## Deploy in 5 minutes

### Step 1 — Push to GitHub
1. Create a new repo on github.com
2. Run these commands:
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/lc-tracker.git
git push -u origin main
```

### Step 2 — Deploy on Vercel
1. Go to vercel.com and sign up (free)
2. Click "Add New Project"
3. Import your GitHub repo
4. Click Deploy — done!

Vercel gives you a URL like `lc-tracker.vercel.app` — share it with your friends.

### Step 3 — Use it
1. Open the URL
2. Enter all 3 LeetCode usernames + agree on a penalty
3. Check back every day — refresh to see who submitted

## Run locally
```bash
npm install
npm start
```

## Notes
- Data comes from `alfa-leetcode-api.onrender.com` — a free community API
- It may be slow on first load (free tier spins down after inactivity) — just wait 30 seconds and refresh
- Settings are saved in your browser's localStorage
- Each person's browser saves their own penalty count — use one person's laptop as the "source of truth" for penalties
