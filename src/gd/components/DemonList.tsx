import { Demon } from '../App';
import { Trophy, Zap, Calendar, Target, Trash2, Star, Moon, Edit, Youtube, Hash, EyeOff } from 'lucide-react';
import { useMemo } from 'react';


interface DemonListProps {
  demons: Demon[];
  allDemons: Demon[];          // Full unfiltered list — for trophy computation
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  isUnlocked: boolean;
  showFilteredRanks: boolean;
  onToggleRanks: () => void;
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
    <div className="card" style={{ overflow: 'hidden', borderRadius: '12px', background: 'var(--bg-card)' }}>
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
              <th style={{ ...thStyle, textAlign: 'center' }}>My tier</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>My enjoyment</th>
              {isUnlocked && <th className="demon-actions-cell" style={{ ...thStyle, textAlign: 'center' }}>Actions</th>}
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
                            <Target size={18} color="#22d3ee" role="img" aria-label="Gauntlet" />
                            {demonTrophies.get(`${demon.id}-gauntlet`) && <Trophy size={14} color="#eab308" fill="#eab308" />}
                          </>
                        )}
                        {demon.weekly && (
                          <>
                            <Calendar size={18} color="#3b82f6" role="img" aria-label="Weekly" />
                            {demonTrophies.get(`${demon.id}-weekly`) && <Trophy size={14} color="#eab308" fill="#eab308" />}
                          </>
                        )}
                        {demon.event && (
                          <>
                            <Zap size={18} color="#eab308" role="img" aria-label="Event" />
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

                  <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 700 }}>{hideDetails ? '—' : demon.tier ?? '—'}</td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'center', color: '#f59e0b', whiteSpace: 'nowrap' }}>{!hideDetails && demon.enjoyment != null ? `${demon.enjoyment}/10` : '—'}</td>
                  {/* Admin Actions */}
                  {isUnlocked && (
                    <td className="demon-actions-cell" style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button onClick={() => onEdit(demon.id)} className="edit-btn" style={actionBtnStyle} title="Edit" aria-label={`Edit ${demon.name}`}>
                          <Edit size={16} color="#84cc16" /> Edit
                        </button>
                        <button onClick={() => onDelete(demon.id)} className="delete-btn" style={actionBtnStyle} title="Delete" aria-label={`Delete ${demon.name}`}>
                          <Trash2 size={16} color="#ef4444" /> Delete
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
  gap: '0.3rem',
  color: 'var(--text-primary)',
  fontSize: '0.78rem',
};
