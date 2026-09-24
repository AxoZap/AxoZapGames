import { useState } from 'react';
import { Gold } from '../App';
import { Edit3, X, Calendar } from 'lucide-react';
import { getTodayDateEST } from '../dateUtils';

interface EditGoldModalProps {
  gold: Gold;
  onSave: (gold: Gold) => void;
  onCancel: () => void;
  existingGroups?: string[];
}

export function EditGoldModal({ gold, onSave, onCancel, existingGroups = [] }: EditGoldModalProps) {
  // Parse initial difficulty
  const initialDiff = gold.difficulty || 'Beginner';
  let initialBase = initialDiff;
  let initialMod = '';

  if (initialDiff.toUpperCase().startsWith('GM')) {
    initialBase = 'GM';
    const rest = initialDiff.slice(2).trim();
    if (rest) {
      initialMod = rest.startsWith('+') ? rest : `+${rest}`;
    }
  }

  const initialDate = gold.date && gold.date !== 'Initial' ? gold.date : '';

  const [formData, setFormData] = useState({
    name: gold.name,
    group_name: gold.group_name || '',
    completed: gold.completed !== false,
    baseDifficulty: initialBase,
    gmModifier: initialMod,
    date: initialDate,
    attempts: gold.attempts != null ? String(gold.attempts) : '',
    clip: gold.clip || '',
    hidden: Boolean(gold.hidden),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) {
      errs.name = 'Name is required';
    }
    if (formData.attempts && (isNaN(Number(formData.attempts)) || Number(formData.attempts) < 0)) {
      errs.attempts = 'Attempts must be a non-negative number';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const attemptsNum =
        formData.attempts.trim() === '' ? null : Number(formData.attempts);

      let finalDifficulty = formData.baseDifficulty;
      if (formData.baseDifficulty === 'GM' && formData.gmModifier.trim()) {
        const mod = formData.gmModifier.trim();
        finalDifficulty = mod.startsWith('+') ? `GM${mod}` : `GM+${mod}`;
      }

      onSave({
        ...gold,
        name: formData.name.trim(),
        group_name: formData.group_name.trim() || null,
        completed: formData.completed,
        difficulty: finalDifficulty,
        date: formData.date.trim(),
        attempts: attemptsNum,
        clip: formData.clip.trim() || null,
        hidden: formData.hidden,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit3 size={20} color="var(--accent)" />
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Edit Golden: {gold.name}</h2>
          </div>
          <button
            onClick={onCancel}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            {/* Name */}
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
              />
              {errors.name && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.name}</p>}
            </div>

            {/* Group Name */}
            <div className="form-group">
              <label className="form-label">Group Name (Optional)</label>
              <input
                type="text"
                list="edit-existing-groups-list"
                value={formData.group_name}
                onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                className="form-input"
                placeholder="e.g. Farewell, Strawberry Jam, SJ Intermediate"
              />
              <datalist id="edit-existing-groups-list">
                {existingGroups.map((grp) => (
                  <option key={grp} value={grp} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="form-row">
            {/* Difficulty */}
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select
                value={formData.baseDifficulty}
                onChange={(e) => setFormData({ ...formData, baseDifficulty: e.target.value })}
                className="form-select"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
                <option value="GM">GM (Grandmaster)</option>
              </select>
            </div>

            {/* Date */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Date (Optional)</label>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, date: getTodayDateEST() }))}
                  className="btn btn-secondary btn-sm"
                  style={{
                    padding: '0.15rem 0.55rem',
                    fontSize: '0.75rem',
                    borderRadius: '5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    lineHeight: '1.3',
                  }}
                  title="Fill with today's date in EST"
                >
                  <Calendar size={12} />
                  Date Today
                </button>
              </div>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          {/* Optional GM Modifier */}
          {formData.baseDifficulty === 'GM' && (
            <div className="form-group">
              <label className="form-label">GM Modifier (+1, +2, +3... Optional)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={formData.gmModifier}
                  onChange={(e) => setFormData({ ...formData, gmModifier: e.target.value })}
                  className="form-select"
                  style={{ flex: 1 }}
                >
                  <option value="">None (Standard GM)</option>
                  <option value="+1">+1</option>
                  <option value="+2">+2</option>
                  <option value="+3">+3</option>
                  <option value="+4">+4</option>
                  <option value="+5">+5</option>
                </select>
                <input
                  type="text"
                  placeholder="Or custom (e.g. +1)"
                  value={formData.gmModifier}
                  onChange={(e) => setFormData({ ...formData, gmModifier: e.target.value })}
                  className="form-input"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          )}

          <div className="form-row">
            {/* Attempts */}
            <div className="form-group">
              <label className="form-label">Attempts (can be blank)</label>
              <input
                type="number"
                min="0"
                max="9999999"
                value={formData.attempts}
                onChange={(e) => setFormData({ ...formData, attempts: e.target.value })}
                className="form-input"
                placeholder="e.g. 1250"
              />
              {errors.attempts && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.attempts}</p>}
            </div>

            {/* Clip */}
            <div className="form-group">
              <label className="form-label">YouTube Clip URL</label>
              <input
                type="url"
                value={formData.clip}
                onChange={(e) => setFormData({ ...formData, clip: e.target.value })}
                className="form-input"
                placeholder="https://youtu.be/..."
              />
            </div>
          </div>

          <div className="form-row" style={{ marginTop: '0.5rem' }}>
            {/* Completed */}
            <div className="form-group">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={formData.completed}
                  onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
                />
                <span style={{ color: formData.completed ? 'var(--green)' : 'var(--text-secondary)', fontWeight: 600 }}>
                  Completed ({formData.completed ? 'Yes' : 'In Progress'})
                </span>
              </label>
            </div>

            {/* Hidden */}
            <div className="form-group">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={formData.hidden}
                  onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                />
                <span style={{ color: formData.hidden ? 'var(--red)' : 'var(--text-primary)', fontWeight: 600 }}>
                  Hidden (only visible to admin)
                </span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
