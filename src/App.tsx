import { useState, useEffect, useMemo } from 'react';
import { DemonList } from './components/DemonList';
import { AddDemonForm } from './components/AddDemonForm';
import { EditDemonForm } from './components/EditDemonForm';
import { DemonFilters } from './components/DemonFilters';
import { Flame, Loader2 } from 'lucide-react';

export interface Demon {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane' | 'Extreme';
  rating: 'Star' | 'Moon';
  gauntlet: boolean;
  weekly: boolean;
  event: boolean;
  hidden?: boolean; // Secret / Hidden demon
  attempts?: number; // Optional now - only for Extreme demons
  placement?: number;
  videoUrl?: string;
  levelId?: string; // GD Level ID for GDDL lookups
}

// Updated to point directly to your Cloudflare Worker backend
const API_URL = "https://axozap-backend.peteystillwell.workers.dev/make-server-7e6e6986";

export default function App() {
  // Check if current URL path is /Admin or /admin
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.toLowerCase().startsWith('/admin');

  const [demons, setDemons] = useState<Demon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDemon, setEditingDemon] = useState<Demon | null>(null);
  const [filters, setFilters] = useState({
    difficulty: 'All',
    rating: 'All',
    gauntlet: false,
    weekly: false,
    event: false,
    nonSpecial: false,
    unique: false,
    searchQuery: '',
  });
  const [sortBy, setSortBy] = useState<'name' | 'attempts' | 'difficulty' | 'order'>('order');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilteredRanks, setShowFilteredRanks] = useState(false);

  // Load demons from database on mount
  useEffect(() => {
    loadDemons();
  }, []);

  const loadDemons = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/demons`);

      if (response.ok) {
        const data = await response.json();
        setDemons(data);
      } else {
        console.error('Failed to load demons:', await response.text());
      }
    } catch (error) {
      console.error('Error loading demons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDemon = async (demon: Omit<Demon, 'id'>) => {
    try {
      const response = await fetch(`${API_URL}/demons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Request': 'true',
        },
        body: JSON.stringify({ demon }),
      });

      if (response.ok) {
        const newDemon = await response.json();
        setDemons([...demons, newDemon]);
        setShowAddForm(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add demon');
      }
    } catch (error) {
      console.error('Error adding demon:', error);
      alert('Failed to add demon. Please try again.');
    }
  };

  const handleDeleteDemon = async (id: string) => {
    if (!isAdmin) {
      alert('You must be in Admin mode to delete demons!');
      return;
    }

    if (!confirm('Are you sure you want to delete this demon?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/demons/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Request': 'true',
        },
      });

      if (response.ok) {
        setDemons(demons.filter(d => d.id !== id));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete demon');
      }
    } catch (error) {
      console.error('Error deleting demon:', error);
      alert('Failed to delete demon. Please try again.');
    }
  };

  const handleEditDemon = (id: string) => {
    const demon = demons.find(d => d.id === id);
    if (demon) {
      setEditingDemon(demon);
    }
  };

  const handleSaveEdit = async (updatedDemon: Demon) => {
    try {
      const response = await fetch(`${API_URL}/demons/${updatedDemon.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Request': 'true',
        },
        body: JSON.stringify({ demon: updatedDemon }),
      });

      if (response.ok) {
        const savedDemon = await response.json();
        setDemons(demons.map(d => d.id === savedDemon.id ? savedDemon : d));
        setEditingDemon(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update demon');
      }
    } catch (error) {
      console.error('Error updating demon:', error);
      alert('Failed to update demon. Please try again.');
    }
  };

  // Pre-calculate placements (1-based index when sorted by insertion order/ID)
  const placementMap = useMemo(() => {
    const sorted = [...demons].sort((a, b) => parseInt(a.id) - parseInt(b.id));
    return new Map(sorted.map((d, i) => [d.id, i + 1]));
  }, [demons]);

  // Pre-calculate duplicates to hide for "Unique" filter
  const duplicatesToHide = useMemo(() => {
    const toHide = new Set<string>();
    if (filters.unique) {
      const nameGroups = new Map<string, Demon[]>();
      demons.forEach(d => {
        const baseName = d.name.toLowerCase()
          .replace(/\s*-\s*gauntlet/i, '')
          .replace(/\s*-\s*weekly/i, '')
          .replace(/\s*-\s*event/i, '')
          .trim();
        if (!nameGroups.has(baseName)) nameGroups.set(baseName, []);
        nameGroups.get(baseName)!.push(d);
      });

      nameGroups.forEach(group => {
        if (group.length > 1) {
          const normal = group.find(d => !d.gauntlet && !d.weekly && !d.event);
          if (normal) {
            group.forEach(d => {
              if (d !== normal) toHide.add(d.id);
            });
          } else {
            const sortedGroup = [...group].sort((a, b) => parseInt(a.id) - parseInt(b.id));
            for (let i = 1; i < sortedGroup.length; i++) {
              toHide.add(sortedGroup[i].id);
            }
          }
        }
      });
    }
    return toHide;
  }, [demons, filters.unique]);

  const filteredAndSortedDemons = demons
    .map(demon => ({ ...demon, placement: placementMap.get(demon.id) }))
    .filter((demon) => {
      if (filters.unique && duplicatesToHide.has(demon.id)) return false;
      if (filters.difficulty !== 'All' && demon.difficulty !== filters.difficulty) return false;
      if (filters.rating !== 'All' && demon.rating !== filters.rating) return false;
      if (filters.searchQuery && !demon.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;

      const hasSpecialFilter = filters.gauntlet || filters.weekly || filters.event || filters.nonSpecial;
      if (hasSpecialFilter) {
        const isNonSpecial = !demon.gauntlet && !demon.weekly && !demon.event;
        let matchesSpecial = false;
        if (filters.gauntlet && demon.gauntlet) matchesSpecial = true;
        if (filters.weekly && demon.weekly) matchesSpecial = true;
        if (filters.event && demon.event) matchesSpecial = true;
        if (filters.nonSpecial && isNonSpecial) matchesSpecial = true;
        if (!matchesSpecial) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'order') {
        comparison = parseInt(a.id) - parseInt(b.id);
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'attempts') {
        comparison = (a.attempts || 0) - (b.attempts || 0);
      } else if (sortBy === 'difficulty') {
        const difficultyOrder = { Easy: 1, Medium: 2, Hard: 3, Insane: 4, Extreme: 5 };
        comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (loading) {
    return (
      <div className="loading">
        <Loader2 size={48} />
        <p>Loading demons...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <Flame className="logo" size={32} />
          <h1>AxoZap's Demons</h1>
          {isAdmin && (
            <span style={{
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              color: '#fff',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
              marginLeft: '0.5rem',
            }}>
              Admin
            </span>
          )}
        </div>
        <p className="subtitle">Geometry Dash</p>
      </header>

      <main className="container">
        {isAdmin && (
          <div className="admin-controls">
            <button onClick={() => setShowAddForm(!showAddForm)} className="btn">
              {showAddForm ? 'Close Add Form' : 'Add Demon'}
            </button>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && isAdmin && (
          <div style={{ marginBottom: '2rem' }}>
            <AddDemonForm onAdd={handleAddDemon} onCancel={() => setShowAddForm(false)} />
          </div>
        )}

        {/* Edit Form Modal */}
        {editingDemon && (
          <EditDemonForm
            demon={editingDemon}
            onSave={handleSaveEdit}
            onCancel={() => setEditingDemon(null)}
          />
        )}

        {/* Filters */}
        <DemonFilters
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={setSortBy}
          onSortOrderChange={setSortOrder}
        />

        {/* Demon List */}
        <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Showing {filteredAndSortedDemons.length} demon{filteredAndSortedDemons.length !== 1 ? 's' : ''}
        </div>
        <DemonList
          demons={filteredAndSortedDemons}
          allDemons={demons}
          onDelete={handleDeleteDemon}
          onEdit={handleEditDemon}
          isUnlocked={isAdmin}
          showFilteredRanks={showFilteredRanks}
          onToggleRanks={() => setShowFilteredRanks(r => !r)}
        />
      </main>
    </div>
  );
}
