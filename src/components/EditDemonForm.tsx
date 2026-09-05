import { useState } from 'react';
import { Demon } from '../App';
import { EyeOff } from 'lucide-react';

interface EditDemonFormProps {
  demon: Demon;
  onSave: (demon: Demon) => void;
  onCancel: () => void;
}

export function EditDemonForm({ demon, onSave, onCancel }: EditDemonFormProps) {
  const [formData, setFormData] = useState<Demon>({
    ...demon,
    hidden: demon.hidden || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedDemon: Demon = { ...formData };
    if (updatedDemon.difficulty !== 'Extreme') {
      delete updatedDemon.attempts;
    }
    if (updatedDemon.videoUrl) {
      updatedDemon.videoUrl = updatedDemon.videoUrl.trim();
    }
    if (updatedDemon.levelId) {
      updatedDemon.levelId = updatedDemon.levelId.trim();
    }
    onSave(updatedDemon);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Demon</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Difficulty</label>
            <select
              className="form-select"
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Demon['difficulty'] })}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
              <option value="Insane">Insane</option>
              <option value="Extreme">Extreme</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Rating</label>
            <select
              className="form-select"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value as Demon['rating'] })}
            >
              <option value="Star">Star</option>
              <option value="Moon">Moon</option>
            </select>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="edit-gauntlet"
                  checked={formData.gauntlet}
                  onChange={(e) => setFormData({ ...formData, gauntlet: e.target.checked })}
                />
                <label htmlFor="edit-gauntlet">Gauntlet</label>
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="edit-weekly"
                  checked={formData.weekly}
                  onChange={(e) => setFormData({ ...formData, weekly: e.target.checked })}
                />
                <label htmlFor="edit-weekly">Weekly</label>
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="edit-event"
                  checked={formData.event}
                  onChange={(e) => setFormData({ ...formData, event: e.target.checked })}
                />
                <label htmlFor="edit-event">Event</label>
              </div>

              {/* Secret / Hidden Demon Toggle */}
              <div className="form-checkbox" style={{
                background: formData.hidden ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: formData.hidden ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                transition: 'all 0.2s',
              }}>
                <input
                  type="checkbox"
                  id="edit-hidden"
                  checked={formData.hidden || false}
                  onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                />
                <label htmlFor="edit-hidden" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: formData.hidden ? '#ef4444' : 'var(--text-primary)',
                  fontWeight: formData.hidden ? 600 : 400,
                  cursor: 'pointer'
                }}>
                  <EyeOff size={15} /> Demon Hidden (Secret)
                </label>
              </div>
            </div>
          </div>

          {formData.difficulty === 'Extreme' && (
            <div className="form-group">
              <label className="form-label">Attempts</label>
              <input
                type="number"
                className="form-input"
                value={formData.attempts || ''}
                onChange={(e) => setFormData({ ...formData, attempts: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">YouTube Video URL (Optional)</label>
            <input
              type="url"
              className="form-input"
              value={formData.videoUrl || ''}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">GD Level ID (Optional, for GDDL)</label>
            <input
              type="text"
              className="form-input"
              value={formData.levelId || ''}
              onChange={(e) => setFormData({ ...formData, levelId: e.target.value })}
              placeholder="e.g. 12345678"
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn">
              Save Changes
            </button>
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
