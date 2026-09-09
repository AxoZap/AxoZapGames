import { useEffect, useState } from 'react';
import { adminHeaders, getCFAccessToken } from '../adminAuth';

const API_URL = 'https://axozap-backend.peteystillwell.workers.dev/make-server-7e6e6986';

interface RawBar {
  num: number;
  Percent: number;
}

export default function Project55Admin() {
  const [bars, setBars] = useState<RawBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  useEffect(() => {
    const token = getCFAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['cf-access-jwt-assertion'] = token;

    fetch(`${API_URL}/project55/raw`, { headers })
      .then((r) => r.json())
      .then((data: RawBar[]) => setBars(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (num: number, value: number) => {
    setBars((prev) =>
      prev.map((b) => (b.num === num ? { ...b, Percent: value } : b))
    );
    setSaved((prev) => {
      const next = new Set(prev);
      next.delete(num);
      return next;
    });
  };

  const handleSave = async (num: number, percent: number) => {
    setSaving(num);
    try {
      await fetch(`${API_URL}/project55/${num}`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ percent }),
      });
      setSaved((prev) => new Set(prev).add(num));
    } catch (e) {
      console.error(e);
      alert(`Failed to save bar #${num}`);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p55-loading">Loading bars…</div>;

  return (
    <div className="p55-admin">
      <h2 className="p55-admin-title">Project 55 — Admin</h2>
      <div className="p55-admin-bars">
        {bars.map((bar) => (
          <div key={bar.num} className="p55-admin-row">
            <span className="p55-admin-label">Bar #{bar.num}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={bar.Percent}
              onChange={(e) => handleChange(bar.num, parseInt(e.target.value, 10))}
              className="p55-admin-slider"
            />
            <span className="p55-admin-value">{bar.Percent}%</span>
            <button
              className={`p55-admin-save-btn${saved.has(bar.num) ? ' saved' : ''}`}
              onClick={() => handleSave(bar.num, bar.Percent)}
              disabled={saving === bar.num}
            >
              {saving === bar.num ? 'Saving…' : saved.has(bar.num) ? '✓ Saved' : 'Save'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
