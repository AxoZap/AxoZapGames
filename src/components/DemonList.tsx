import { Demon } from '../App';
import { Trophy, Zap, Calendar, Target, Trash2, Star, Moon, Edit, Youtube, Loader2, ExternalLink, Hash, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
const API_URL = "https://axozap-backend.peteystillwell.workers.dev/make-server-7e6e6986";

interface GddlData {
  tier: number | null;
  avgEnjoyment: number | null;
  myTier: number | null;
  enjoyment: number | null;
}

interface DemonListProps {
  demons: Demon[];
  allDemons: Demon[];          // Full unfiltered list — for trophy computation
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  isUnlocked: boolean;
  showFilteredRanks: boolean;
  onToggleRanks: () => void;
}

function GddlInline({ demon }: { demon: Demon }) {
  const [data, setData] = useState<GddlData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleFetch = () => {
    if (!demon.levelId || demon.rating === 'Moon' || loading) return;
    setLoading(true);
    fetch(`${API_URL}/gddl/${demon.levelId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setFetched(true); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const tierColor = (tier: number | null) => {
    if (tier === null) return 'var(--text-secondary)';
    if (tier <= 3)  return '#22c55e';
    if (tier <= 6)  return '#86efac';
    if (tier <= 10) return '#eab308';
    if (tier <= 15) return '#f97316';
    if (tier <= 20) return '#ef4444';
    if (tier <= 30) return '#a855f7';
    return '#dc2626';
  };

  if (!demon.levelId || demon.rating === 'Moon') {
    return <span style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>—</span>;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-secondary)' }} />
      </div>
    );
  }

  if (!fetched) {
    return (
      <button
        onClick={handleFetch}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          padding: '0.3rem 0.65rem',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        Load GDDL
      </button>
    );
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.6rem',
      fontSize: '0.82rem',
      background: 'rgba(255,255,255,0.03)',
      padding: '0.3rem 0.6rem',
      borderRadius: '6px',
      border: '1px solid var(--border)',
    }}>
      {/* GDDL Tier */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '2rem' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tier</span>
        <span style={{ fontWeight: 700, color: tierColor(data?.tier ?? null) }}>
          {data?.tier != null ? Math.round(data.tier) : '?'}
        </span>
      </div>
      {/* Avg Enjoyment */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '2.2rem' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Enj</span>
        <span style={{ fontWeight: 700, color: data?.avgEnjoyment != null ? '#f59e0b' : 'var(--text-secondary)' }}>
          {data?.avgEnjoyment != null ? Math.round(data.avgEnjoyment) : '—'}
        </span>
      </div>

      <div style={{ width: '1px', height: '1.75rem', background: 'var(--border)' }} />

      {/* My Tier */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '2rem' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mine</span>
        <span style={{ fontWeight: 700, color: tierColor(data?.myTier ?? null) }}>
          {data?.myTier != null ? data.myTier : '—'}
        </span>
      </div>

      {/* My Enjoyment */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '2rem' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Enj</span>
        <span style={{ fontWeight: 700, color: data?.enjoyment != null ? '#f59e0b' : 'var(--text-secondary)' }}>
          {data?.enjoyment != null ? data.enjoyment : '—'}
        </span>
      </div>

      <a
        href={`https://gdladder.com/level/${demon.levelId}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', marginLeft: '0.1rem' }}
        title="View on GDDL"
      >
        <ExternalLink size={11} />
      </a>
    </div>
  );
}

export function DemonList({ demons, allDemons, onDelete, onEdit, isUnlocked, showFilteredRanks, onToggleRanks }: DemonListProps) {
  // Always compute trophies from the FULL unfiltered list
  const demonTrophies = useMemo(() => {
    const trophyMap = new Map<string, boolean>();
    const seen = {
      difficulties: new Set<string>(),
      gauntlet: false,
      weekly: false,
      event: false,
    };

    allDemons.forEach((demon) => {
      const key = `${demon.difficulty}-${demon.rating}`;
      if (!seen.difficulties.has(key)) {
        trophyMap.set(`${demon.id}-difficulty`, true);
        seen.difficulties.add(key);
      }
      if (demon.gauntlet && !seen.gauntlet) {
        trophyMap.set(`${demon.id}-gauntlet`, true);
        seen.gauntlet = true;
      }
      if (demon.weekly && !seen.weekly) {
        trophyMap.set(`${demon.id}-weekly`, true);
        seen.weekly = true;
      }
      if (demon.event && !seen.event) {
        trophyMap.set(`${demon.id}-event`, true);
        seen.event = true;
      }
    });

    return trophyMap;
  }, [allDemons]);

  if (demons.length === 0) {
    return (
      <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <p>No demons found.</p>
      </div>
    );
  }

  const isFiltered = demons.length !== allDemons.length;

  return (
    <div className="card" style={{ overflow: 'hidden', borderRadius: '12px', background: 'var(--card-bg)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              {/* Rank header with toggle */}
              <th style={thStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Rank
                  {isFiltered && (
                    <button
                      onClick={onToggleRanks}
                      title={showFilteredRanks ? 'Showing filtered ranks — click for original' : 'Showing original ranks — click for filtered'}
                      style={{
                        background: showFilteredRanks ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${showFilteredRanks ? '#6366f1' : 'var(--border)'}`,
                        borderRadius: '4px',
                        padding: '0.1rem 0.3rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Hash size={11} color={showFilteredRanks ? '#818cf8' : 'var(--text-secondary)'} />
                    </button>
                  )}
                </div>
              </th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Difficulty</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Rating</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Special</th>
              <th style={thStyle}>Attempts</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>GDDL</th>
              {isUnlocked && <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {demons.map((demon, index) => {
              const isHidden = demon.hidden;
              const hideDetails = isHidden && !isUnlocked;

              return (
                <tr
                  key={demon.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.2s',
                    background: isHidden && isUnlocked ? 'rgba(239, 68, 68, 0.04)' : undefined,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = isHidden && isUnlocked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isHidden && isUnlocked ? 'rgba(239, 68, 68, 0.04)' : 'transparent')}
                >
                  {/* Rank */}
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                      #{showFilteredRanks ? index + 1 : (demon.placement || index + 1)}
                    </span>
                  </td>

                  {/* Name */}
                  <td style={{ padding: '1rem 1.25rem' }}>
                    {hideDetails ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-secondary)', fontStyle: 'italic', opacity: 0.75 }}>
                        <EyeOff size={16} />
                        <span>Demon Hidden</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ color: '#fff', fontWeight: 600 }}>{demon.name}</span>
                        {isHidden && (
                          <span style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}>
                            <EyeOff size={11} /> Hidden
                          </span>
                        )}
                        {demon.videoUrl && (
                          <a
                            href={demon.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }}
                            title="Watch Video"
                          >
                            <Youtube size={18} />
                          </a>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Difficulty */}
                  <td style={{ padding: '1rem 1.25rem' }}>
                    {hideDetails ? (
                      <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`tag tag-${demon.difficulty.toLowerCase()}`}>{demon.difficulty}</span>
                        {demonTrophies.get(`${demon.id}-difficulty`) && <Trophy size={16} color="#eab308" fill="#eab308" />}
                      </div>
                    )}
                  </td>

                  {/* Rating */}
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                    {hideDetails ? (
                      <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {demon.rating === 'Star'
                          ? <Star size={18} color="#fbbf24" fill="#fbbf24" />
                          : <Moon size={18} color="#a78bfa" fill="#a78bfa" />}
                      </div>
                    )}
                  </td>

                  {/* Special */}
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                    {hideDetails ? (
                      <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        {demon.gauntlet && (
                          <>
                            <Target size={18} color="#22d3ee" title="Gauntlet" />
                            {demonTrophies.get(`${demon.id}-gauntlet`) && <Trophy size={14} color="#eab308" fill="#eab308" />}
                          </>
                        )}
                        {demon.weekly && (
                          <>
                            <Calendar size={18} color="#3b82f6" title="Weekly" />
                            {demonTrophies.get(`${demon.id}-weekly`) && <Trophy size={14} color="#eab308" fill="#eab308" />}
                          </>
                        )}
                        {demon.event && (
                          <>
                            <Zap size={18} color="#eab308" title="Event" />
                            {demonTrophies.get(`${demon.id}-event`) && <Trophy size={14} color="#eab308" fill="#eab308" />}
                          </>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Attempts */}
                  <td style={{ padding: '1rem 1.25rem' }}>
                    {hideDetails ? (
                      <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                    ) : (
                      demon.attempts !== undefined ? (
                        <span style={{
                          color: demon.difficulty === 'Extreme' ? '#fbbf24' : 'var(--text-secondary)',
                          fontWeight: demon.difficulty === 'Extreme' ? '600' : '400',
                        }}>
                          {demon.attempts.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>—</span>
                      )
                    )}
                  </td>

                  {/* GDDL */}
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                    {hideDetails ? (
                      <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                    ) : (
                      <GddlInline demon={demon} />
                    )}
                  </td>

                  {/* Admin Actions */}
                  {isUnlocked && (
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button onClick={() => onEdit(demon.id)} className="edit-btn" style={actionBtnStyle} title="Edit">
                          <Edit size={16} color="#84cc16" />
                        </button>
                        <button onClick={() => onDelete(demon.id)} className="delete-btn" style={actionBtnStyle} title="Delete">
                          <Trash2 size={16} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '1rem 1.25rem',
  color: 'var(--text-secondary)',
  fontSize: '0.8rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const actionBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '0.35rem',
  borderRadius: '4px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};
