import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { doc, setDoc, collection, query, limit, getDocs } from 'firebase/firestore';

const API = 'https://alfa-leetcode-api.onrender.com';
let activeDocId = null; // resolved from Firebase on first load
const AVATAR_COLORS = [
  { bg: 'var(--blue-bg)', color: '#60a5fa' },
  { bg: 'var(--purple-bg)', color: '#a78bfa' },
  { bg: 'var(--orange-bg)', color: '#fb923c' },
];

function getTodayDateString() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function getYesterdayUTCKey() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000).toString();
}

function formatDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function getInitials(s) {
  return s.slice(0, 2).toUpperCase();
}

async function loadFromFirebase() {
  if (!db) return null;
  try {
    const qSnap = await getDocs(query(collection(db, 'groups'), limit(1)));
    if (qSnap.empty) return null;
    const first = qSnap.docs[0];
    activeDocId = first.id;
    return first.data();
  } catch (e) {
    console.error('Firebase load error:', e);
    return null;
  }
}

async function saveToFirebase(data) {
  if (!db || !activeDocId) return;
  try {
    await setDoc(doc(db, 'groups', activeDocId), data, { merge: true });
  } catch (e) {
    console.error('Firebase save error:', e);
  }
}

function calculateCurrentStreak(calendar) {
  const now = new Date();
  const todayUTC = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);
  const DAY = 86400;

  let day = todayUTC;
  if (!(calendar[day] > 0)) day -= DAY;

  let streak = 0;
  while (calendar[day] > 0) {
    streak++;
    day -= DAY;
  }
  return streak;
}

async function checkYesterdayMisses(users) {
  const yesterdayKey = getYesterdayUTCKey();
  return Promise.all(users.map(async (username) => {
    try {
      const res = await fetch(`${API}/${username}/calendar`);
      if (!res.ok) return false;
      const calData = await res.json();
      const calendar = JSON.parse(calData.submissionCalendar || '{}');
      return !(calendar[yesterdayKey] > 0);
    } catch {
      return false;
    }
  }));
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

    const now = new Date();
    const todayKey = (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000).toString();

    const calendar = JSON.parse(calData.submissionCalendar || '{}');
    const todayCount = calendar[todayKey] || 0;

    return {
      username,
      totalSolved: stats.solvedProblem || 0,
      easySolved: stats.easySolved || 0,
      mediumSolved: stats.mediumSolved || 0,
      hardSolved: stats.hardSolved || 0,
      streak: calculateCurrentStreak(calendar),
      totalActiveDays: calData.totalActiveDays || 0,
      submittedToday: todayCount > 0,
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


// ── Player Card ───────────────────────────────────────────────────────────────
function PlayerCard({ user, data, index, groupPenalty, penalties, onAddPenalty, onRemovePenalty }) {
  const av = AVATAR_COLORS[index];
  const isSubmitted = data && !data.error && data.submittedToday;

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
          × {groupPenalty}
        </span>
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
function Dashboard({ users, penalty, penalties, onPenaltyChange, onReset, autoPenaltyMsg, onDismissAlert }) {
  const [data, setData] = useState(users.map(() => null));
  const [status, setStatus] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    setStatus('fetching live data...');
    setData(users.map(() => null));
    const results = await Promise.all(users.map(u => fetchUserData(u)));
    setData(results);
    setLastUpdated(new Date());
    setStatus('');
  }, [users]);

  useEffect(() => { refresh(); }, [refresh]);

  const totalSolved = data.reduce((sum, d) => sum + (d && !d.error ? d.totalSolved : 0), 0);
  const submittedCount = data.filter(d => d && !d.error && d.submittedToday).length;
  const totalPenalties = penalties.reduce((a, b) => a + b, 0);

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

      {autoPenaltyMsg && (
        <div style={{
          background: 'var(--red-bg)', border: '1px solid var(--red-border)',
          borderRadius: 10, padding: '10px 14px', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <span style={{ fontSize: 13, color: 'var(--red)', fontFamily: "'JetBrains Mono', monospace" }}>
            ⚠ {autoPenaltyMsg}
          </span>
          <button
            onClick={onDismissAlert}
            style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: '1.5rem' }}>
        <SummaryCard label="total solved (combined)" value={totalSolved} />
        <SummaryCard label="submitted today" value={`${submittedCount} / ${users.length}`} highlight={submittedCount === users.length} />
        <SummaryCard label="penalty" value={penalty} text />
        <SummaryCard label="total penalties" value={totalPenalties} danger={totalPenalties > 0} />
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {users.map((user, i) => (
          <PlayerCard
            key={user}
            user={user}
            data={data[i]}
            index={i}
            groupPenalty={penalty}
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
            <div key={p.user} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: rank < users.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: rank === 0 ? 'var(--accent)' : 'var(--muted)', width: 20, fontFamily: "'JetBrains Mono', monospace" }}>
                #{rank + 1}
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: AVATAR_COLORS[p.index % AVATAR_COLORS.length].bg,
                color: AVATAR_COLORS[p.index % AVATAR_COLORS.length].color,
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
  const [group, setGroup] = useState(null);   // { users, penalty, penalties, lastCheckedDate }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoPenaltyMsg, setAutoPenaltyMsg] = useState('');

  useEffect(() => {
    (async () => {
      const fbData = await loadFromFirebase();

      if (!fbData || !fbData.users || fbData.users.length === 0) {
        setError('No group configured in Firebase. Create a document at groups/main with fields: users (array), penalty (string).');
        setLoading(false);
        return;
      }

      let penalties = fbData.penalties ?? fbData.users.map(() => 0);
      const today = getTodayDateString();

      if (!fbData.lastCheckedDate) {
        // First run — just initialize the date
        await saveToFirebase({ penalties, lastCheckedDate: today });
      } else if (fbData.lastCheckedDate !== today) {
        // New day — check if anyone missed yesterday
        const missed = await checkYesterdayMisses(fbData.users);
        const newPenalties = [...penalties];
        const missedNames = [];

        missed.forEach((m, i) => {
          if (m) {
            newPenalties[i]++;
            missedNames.push(fbData.users[i]);
          }
        });

        penalties = newPenalties;

        if (missedNames.length > 0) {
          setAutoPenaltyMsg(`Auto-penalty applied: ${missedNames.join(', ')} missed yesterday's submission`);
        }

        await saveToFirebase({ penalties, lastCheckedDate: today });
      }

      setGroup({ ...fbData, penalties });
      setLoading(false);
    })();
  }, []);

  const handlePenaltyChange = (idx, delta) => {
    setGroup(prev => {
      const penalties = [...prev.penalties];
      penalties[idx] = Math.max(0, penalties[idx] + delta);
      saveToFirebase({ penalties });
      return { ...prev, penalties };
    });
  };

  const handleReset = () => {
    if (window.confirm('Reset all penalties to zero?')) {
      const zeroed = group.users.map(() => 0);
      setGroup(prev => ({ ...prev, penalties: zeroed }));
      saveToFirebase({ penalties: zeroed, lastCheckedDate: getTodayDateString() });
      setAutoPenaltyMsg('');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--muted)' }}>
          loading...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '2rem' }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--red)', lineHeight: 1.7 }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      users={group.users}
      penalty={group.penalty}
      penalties={group.penalties}
      onPenaltyChange={handlePenaltyChange}
      onReset={handleReset}
      autoPenaltyMsg={autoPenaltyMsg}
      onDismissAlert={() => setAutoPenaltyMsg('')}
    />
  );
}
