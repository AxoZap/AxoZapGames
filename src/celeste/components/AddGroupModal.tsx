import { useState } from 'react';
import { LevelGroup } from '../App';
import { Layers, X, Calendar } from 'lucide-react';
import { getTodayDateEST } from '../dateUtils';

interface AddGroupModalProps {
  onAdd: (group: Omit<LevelGroup, 'id'>) => void;
  onCancel: () => void;
}

export function AddGroupModal({ onAdd, onCancel }: AddGroupModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    url: '',
    attempts: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) {
      errs.name = 'Group name is required (e.g. Farewell, SJ Intermediate)';
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

      onAdd({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        date: formData.date.trim() || null,
        url: formData.url.trim() || null,
        attempts: attemptsNum,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={22} color="var(--accent)" />
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Create New Group</h2>
          </div>
          <button
            onClick={onCancel}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="form-group">
            <label className="form-label">Group Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
              placeholder="e.g. Farewell, Strawberry Jam, SJ Advanced"
              autoFocus
            />
            {errors.name && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-input"
              placeholder="Brief description or notes about this level group / colab..."
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-row">
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

            {/* Attempts */}
            <div className="form-group">
              <label className="form-label">Group Attempts (Optional)</label>
              <input
                type="number"
                min="0"
                max="9999999"
                value={formData.attempts}
                onChange={(e) => setFormData({ ...formData, attempts: e.target.value })}
                className="form-input"
                placeholder="Total attempts (e.g. 5000)"
              />
              {errors.attempts && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.attempts}</p>}
            </div>
          </div>

          {/* Group URL */}
          <div className="form-group">
            <label className="form-label">Group URL / Video / Sheet URL (Optional)</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="form-input"
              placeholder="https://youtu.be/... or playlist / spreadsheet link"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
