import React, { useState, useEffect, useCallback } from 'react';

const API = 'https://alfa-leetcode-api.onrender.com';
const STORAGE_KEY = 'lc_grind_state';
const AVATAR_COLORS = [
  { bg: 'var(--blue-bg)', color: '#60a5fa' },
  { bg: 'var(--purple-bg)', color: '#a78bfa' },
  { bg: 'var(--orange-bg)', color: '#fb923c' },
];

function getTodayMidnightUnix() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000).toString();
}

function formatDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function getInitials(s) {
  return s.slice(0, 2).toUpperCase();
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveToStorage(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

async function fetchUserData(username) {
  try {
    const [calRes, statsRes] = await Promise.all([
      fetch(`${API}/${username}/calendar`),
      fetch(`${API}/${username}/solved`)
    ]);
    
    if (!calRes.ok || !statsRes.ok) throw new Error('API error');
    
    const calData = await calRes.json();
    const stats = await statsRes.json();

    // 1. UTC-Safe Key for India (5:30 AM reset)
    const now = new Date();
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
    const todayKey = todayUTC.toString();

    // 2. Parse Calendar and Check Today
    const calendar = JSON.parse(calData.submissionCalendar || '{}');
    const todayCount = calendar[todayKey] || 0;
    const submittedToday = todayCount > 0;

    return {
      username,
      totalSolved: stats.solvedProblem || 0,
      easySolved: stats.easySolved || 0,
      mediumSolved: stats.mediumSolved || 0,
      hardSolved: stats.hardSolved || 0,
      
      // Note: The API often provides 'streak' inside the calData 
      // but calculating it manually from the calendar is more reliable
      streak: calData.streak || 0, 
      totalActiveDays: calData.totalActiveDays || 0,
      
      submittedToday,
      todayCount,
      lastUpdated: new Date().toLocaleTimeString('en-IN'),
      error: null,
    };
  } catch (e) {
    console.error(`Error for ${username}:`, e);
    return {
      username, totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0,
      streak: 0, totalActiveDays: 0, submittedToday: false, todayCount: 0,
      error: 'API is sleeping or username is invalid. Try again in 30s.',
    };
  }
}


// ── Setup Screen ──────────────────────────────────────────────────────────────
function SetupScreen({ onStart }) {
  const [users, setUsers] = useState(['', '', '']);
  const [penalty, setPenalty] = useState('');
  const [error, setError] = useState('');

  const handleStart = () => {
    if (users.some(u => !u.trim())) { setError('Please enter all 3 LeetCode usernames'); return; }
    setError('');
    onStart(users.map(u => u.trim()), penalty.trim() || 'buy chai for the group');
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '4rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: '#e8e8f0', marginBottom: 8 }}>
          lc<span style={{ color: 'var(--accent)' }}>.</span>grind
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted2)', lineHeight: 1.6 }}>
          accountability tracker for you and your friends<br />
          submit daily or face the consequences
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.75rem' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
          Setup your squad
        </div>

        {['Player 1', 'Player 2', 'Player 3'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: AVATAR_COLORS[i].bg, color: AVATAR_COLORS[i].color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700
            }}>
              {i + 1}
            </div>
            <input
              type="text"
              value={users[i]}
              onChange={e => setUsers(u => { const n = [...u]; n[i] = e.target.value; return n; })}
              placeholder={`${label} — leetcode username`}
              style={{
                flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace", outline: 'none',
              }}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
            />
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '1rem 0' }} />

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
          Penalty for missing a day
        </div>
        <input
          type="text"
          value={penalty}
          onChange={e => setPenalty(e.target.value)}
          placeholder="e.g. buy chai, ₹50, 20 pushups"
          style={{
            width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14,
            outline: 'none', marginBottom: 4
          }}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
        />

        {error && <div style={{ fontSize: 12, color: 'var(--red)', margin: '8px 0', fontFamily: "'JetBrains Mono', monospace" }}>{error}</div>}

        <button
          onClick={handleStart}
          style={{
            width: '100%', marginTop: 16, padding: '12px', background: 'var(--accent)',
            color: '#0a0a0f', border: 'none', borderRadius: 10, fontSize: 14,
            fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5,
          }}
        >
          Start tracking →
        </button>
      </div>
    </div>
  );
}

// ── Player Card ───────────────────────────────────────────────────────────────
function PlayerCard({ user, data, index, penalty, penalties, onAddPenalty, onRemovePenalty }) {
  const av = AVATAR_COLORS[index];
  const isSubmitted = data && !data.error && data.submittedToday;
  const isMissed = data && !data.error && !data.submittedToday;

  const borderColor = !data ? 'var(--border)'
    : data.error ? 'var(--border)'
    : isSubmitted ? 'var(--green-border)'
    : 'var(--red-border)';

  const streakDots = Array.from({ length: 7 }, (_, k) => ({
    active: data && !data.error && k < Math.min(data.streak, 7)
  }));

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${borderColor}`,
      borderRadius: 16, padding: '1.25rem', transition: 'border-color 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: av.bg, color: av.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
        }}>
          {getInitials(user)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user}
          </div>
          <a
            href={`https://leetcode.com/${user}/`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 11, color: 'var(--muted2)', fontFamily: "'JetBrains Mono', monospace", textDecoration: 'none' }}
          >
            leetcode.com/{user} ↗
          </a>
        </div>
      </div>

      {data && data.error ? (
        <div style={{ fontSize: 12, color: 'var(--red)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5, marginBottom: 12 }}>
          {data.error}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <StatBox label="solved" value={data ? data.totalSolved : '—'} />
            <StatBox label="streak" value={data ? `${data.streak}d` : '—'} />
            <StatBox label="easy" value={data ? data.easySolved : '—'} small />
            <StatBox label="medium" value={data ? data.mediumSolved : '—'} small />
          </div>

          <div style={{
            padding: '6px 12px', borderRadius: 20, textAlign: 'center',
            fontSize: 12, fontWeight: 600, marginBottom: 10,
            background: !data ? 'var(--surface2)' : isSubmitted ? 'var(--green-bg)' : 'var(--red-bg)',
            color: !data ? 'var(--muted)' : isSubmitted ? 'var(--green)' : 'var(--red)',
            border: `1px solid ${!data ? 'var(--border)' : isSubmitted ? 'var(--green-border)' : 'var(--red-border)'}`,
          }}>
            {!data ? 'loading...' : isSubmitted ? `submitted today (${data.todayCount}x)` : 'not submitted yet'}
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {streakDots.map((dot, k) => (
              <div key={k} style={{
                width: 9, height: 9, borderRadius: '50%',
                background: dot.active ? 'var(--green)' : 'var(--surface2)',
                border: `1px solid ${dot.active ? 'var(--green-border)' : 'var(--border)'}`,
              }} />
            ))}
          </div>
        </>
      )}

      <div style={{ height: 1, background: 'var(--border)', marginBottom: 10 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--red)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
          {penalties} miss{penalties !== 1 ? 'es' : ''}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          × {penalty}
        </span>
        <button onClick={onRemovePenalty} style={penBtnStyle}>−</button>
        <button onClick={onAddPenalty} style={penBtnStyle}>+</button>
      </div>
    </div>
  );
}

const penBtnStyle = {
  width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer',
  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1,
};

function StatBox({ label, value, small }) {
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: small ? '6px 10px' : '8px 10px' }}>
      <div style={{ fontSize: small ? 16 : 20, fontWeight: 600, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ users, penalty, penalties, onPenaltyChange, onReset }) {
  const [data, setData] = useState([null, null, null]);
  const [status, setStatus] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    setStatus('fetching live data...');
    setData([null, null, null]);
    const results = await Promise.all(users.map(u => fetchUserData(u)));
    setData(results);
    setLastUpdated(new Date());
    setStatus('');
  }, [users]);

  useEffect(() => { refresh(); }, [refresh]);

  const totalSolved = data.reduce((sum, d) => sum + (d && !d.error ? d.totalSolved : 0), 0);
  const submittedCount = data.filter(d => d && !d.error && d.submittedToday).length;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700 }}>
          lc<span style={{ color: 'var(--accent)' }}>.</span>grind
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted2)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '5px 12px', borderRadius: 20 }}>
          {formatDate()}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: '1.5rem' }}>
        <SummaryCard label="total solved (combined)" value={totalSolved} />
        <SummaryCard label="submitted today" value={`${submittedCount} / 3`} highlight={submittedCount === 3} />
        <SummaryCard label="penalty" value={penalty} text />
        <SummaryCard label="total penalties" value={penalties.reduce((a, b) => a + b, 0)} danger={penalties.reduce((a, b) => a + b, 0) > 0} />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          onClick={refresh}
          style={{
            padding: '8px 18px', background: 'var(--accent)', color: '#0a0a0f',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Refresh data
        </button>
        {status && (
          <span style={{ fontSize: 12, color: 'var(--muted2)', fontFamily: "'JetBrains Mono', monospace" }}>{status}</span>
        )}
        {lastUpdated && !status && (
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={onReset}
          style={{ marginLeft: 'auto', padding: '8px 14px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {users.map((user, i) => (
          <PlayerCard
            key={user}
            user={user}
            data={data[i]}
            index={i}
            penalty={penalty}
            penalties={penalties[i]}
            onAddPenalty={() => onPenaltyChange(i, 1)}
            onRemovePenalty={() => onPenaltyChange(i, -1)}
          />
        ))}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Leaderboard</div>
        {[...users.map((u, i) => ({ user: u, solved: data[i]?.totalSolved || 0, streak: data[i]?.streak || 0, index: i }))]
          .sort((a, b) => b.solved - a.solved)
          .map((p, rank) => (
            <div key={p.user} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: rank < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: rank === 0 ? 'var(--accent)' : 'var(--muted)', width: 20, fontFamily: "'JetBrains Mono', monospace" }}>
                #{rank + 1}
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: AVATAR_COLORS[p.index].bg, color: AVATAR_COLORS[p.index].color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
              }}>
                {getInitials(p.user)}
              </div>
              <div style={{ flex: 1, fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>{p.user}</div>
              <div style={{ fontSize: 13, color: 'var(--muted2)' }}>{p.solved} solved</div>
              <div style={{ fontSize: 12, color: 'var(--green)', background: 'var(--green-bg)', padding: '2px 8px', borderRadius: 12 }}>{p.streak}d streak</div>
            </div>
          ))}
      </div>

      <div style={{ marginTop: '1rem', fontSize: 11, color: 'var(--muted)', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }}>
        data from alfa-leetcode-api.onrender.com — may be slow on first load
      </div>
    </div>
  );
}

function SummaryCard({ label, value, highlight, danger, text }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <div style={{
        fontSize: text ? 12 : 22, fontWeight: 600,
        fontFamily: text ? 'inherit' : "'JetBrains Mono', monospace",
        color: highlight ? 'var(--green)' : danger ? 'var(--red)' : 'var(--text)',
        lineHeight: 1.2,
      }}>
        {value}
      </div>
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [appState, setAppState] = useState(() => loadFromStorage());

  const handleStart = (users, penalty) => {
    const newState = { users, penalty, penalties: [0, 0, 0] };
    setAppState(newState);
    saveToStorage(newState);
  };

  const handlePenaltyChange = (idx, delta) => {
    setAppState(prev => {
      const penalties = [...prev.penalties];
      penalties[idx] = Math.max(0, penalties[idx] + delta);
      const next = { ...prev, penalties };
      saveToStorage(next);
      return next;
    });
  };

  const handleReset = () => {
    if (window.confirm('Reset everything? This will clear all usernames and penalties.')) {
      localStorage.removeItem(STORAGE_KEY);
      setAppState(null);
    }
  };

  if (!appState || appState.users.length < 3) {
    return <SetupScreen onStart={handleStart} />;
  }

  return (
    <Dashboard
      users={appState.users}
      penalty={appState.penalty}
      penalties={appState.penalties}
      onPenaltyChange={handlePenaltyChange}
      onReset={handleReset}
    />
  );
}
