import { useEffect, useState } from 'react';

const API_URL = 'https://axozap-backend.peteystillwell.workers.dev/make-server-7e6e6986';

interface Bar {
  num: number;
  fill: number; // already transformed server-side, 0-100
}

export default function Project55Page() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/project55`)
      .then((r) => r.json())
      .then((data: Bar[]) => setBars(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p55-page">
      <header className="p55-header">
        <h1 className="p55-title">Project 55</h1>
      </header>

      <main className="p55-container">
        {loading ? (
          <div className="p55-loading">Loading…</div>
        ) : (
          <div className="p55-bars">
            {bars.map((bar) => (
              <div key={bar.num} className="p55-bar-row">
                <span className="p55-bar-label">#{bar.num}</span>
                <div className="p55-track">
                  <div
                    className="p55-fill"
                    style={{ width: `${bar.fill}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
