import { useState } from 'react';
import { Demon } from '../App';

interface AddDemonFormProps {
  onAdd: (demon: Omit<Demon, 'id'>) => void;
  onCancel: () => void;
}

export function AddDemonForm({ onAdd, onCancel }: AddDemonFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    difficulty: 'Medium' as Demon['difficulty'],
    rating: 'Star' as Demon['rating'],
    gauntlet: false,
    weekly: false,
    event: false,
    hidden: false,
    attempts: 0,
    videoUrl: '',
    levelId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.difficulty === 'Extreme' && formData.attempts < 0) {
      newErrors.attempts = 'Attempts cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Only include attempts if it's an Extreme demon
      const demonData: any = {
        name: formData.name,
        difficulty: formData.difficulty,
        rating: formData.rating,
        gauntlet: formData.gauntlet,
        weekly: formData.weekly,
        event: formData.event,
        hidden: formData.hidden,
      };
      
      if (formData.difficulty === 'Extreme') {
        demonData.attempts = formData.attempts;
      }
      
      if (formData.videoUrl.trim()) {
        demonData.videoUrl = formData.videoUrl.trim();
      }
      
      if (formData.levelId.trim()) {
        demonData.levelId = formData.levelId.trim();
      }
      
      onAdd(demonData);
      setFormData({
        name: '',
        difficulty: 'Medium',
        rating: 'Star',
        gauntlet: false,
        weekly: false,
        event: false,
        hidden: false,
        attempts: 0,
        videoUrl: '',
        levelId: '',
      });
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1.5rem' }}>Add New Demon</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          {/* Name */}
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
              placeholder="Enter demon name"
            />
            {errors.name && <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--red)' }}>{errors.name}</p>}
          </div>

          {/* Difficulty */}
          <div className="form-group">
            <label htmlFor="difficulty" className="form-label">
              Difficulty
            </label>
            <select
              id="difficulty"
              value={formData.difficulty}
              onChange={(e) =>
                setFormData({ ...formData, difficulty: e.target.value as Demon['difficulty'] })
              }
              className="form-select"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
              <option value="Insane">Insane</option>
              <option value="Extreme">Extreme</option>
            </select>
          </div>

          {/* Rating */}
          <div className="form-group">
            <label htmlFor="rating" className="form-label">
              Rating
            </label>
            <select
              id="rating"
              value={formData.rating}
              onChange={(e) =>
                setFormData({ ...formData, rating: e.target.value as Demon['rating'] })
              }
              className="form-select"
            >
              <option value="Star">⭐ Star</option>
              <option value="Moon">🌙 Moon</option>
            </select>
          </div>
        </div>

        {/* Attempts - Only show for Extreme demons */}
        {formData.difficulty === 'Extreme' && (
          <div className="form-group">
            <label htmlFor="attempts" className="form-label">
              Attempts *
            </label>
            <input
              type="number"
              id="attempts"
              min="0"
              value={formData.attempts}
              onChange={(e) => setFormData({ ...formData, attempts: parseInt(e.target.value) || 0 })}
              className="form-input"
            />
            {errors.attempts && <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--red)' }}>{errors.attempts}</p>}
          </div>
        )}

        {/* Video URL */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="videoUrl" className="form-label">
            YouTube Video URL (Optional)
          </label>
          <input
            type="url"
            id="videoUrl"
            value={formData.videoUrl}
            onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
            className="form-input"
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>

        {/* GD Level ID */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="levelId" className="form-label">
            GD Level ID (Optional, for GDDL)
          </label>
          <input
            type="text"
            id="levelId"
            value={formData.levelId}
            onChange={(e) => setFormData({ ...formData, levelId: e.target.value })}
            className="form-input"
            placeholder="e.g. 12345678"
          />
        </div>

        {/* Checkboxes */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="form-checkbox" style={{ marginBottom: 0 }}>
            <input
              type="checkbox"
              checked={formData.gauntlet}
              onChange={(e) => setFormData({ ...formData, gauntlet: e.target.checked })}
            />
            <span>Gauntlet</span>
          </label>

          <label className="form-checkbox" style={{ marginBottom: 0 }}>
            <input
              type="checkbox"
              checked={formData.weekly}
              onChange={(e) => setFormData({ ...formData, weekly: e.target.checked })}
            />
            <span>Weekly</span>
          </label>

          <label className="form-checkbox" style={{ marginBottom: 0 }}>
            <input
              type="checkbox"
              checked={formData.event}
              onChange={(e) => setFormData({ ...formData, event: e.target.checked })}
            />
            <span>Event</span>
          </label>

          <label className="form-checkbox" style={{ marginBottom: 0 }}>
            <input
              type="checkbox"
              checked={formData.hidden}
              onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
            />
            <span style={{ color: formData.hidden ? '#ef4444' : undefined, fontWeight: formData.hidden ? 600 : undefined }}>
              Hidden
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary">
            Add Demon
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}