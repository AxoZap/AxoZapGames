import { Filter, ArrowUpDown, Target, Calendar, Zap, Star, Moon, Search } from 'lucide-react';

interface DemonFiltersProps {
  filters: {
    difficulty: string;
    rating: string;
    gauntlet: boolean;
    weekly: boolean;
    event: boolean;
    nonSpecial: boolean;
    unique: boolean;
    searchQuery: string;
  };
  onFiltersChange: (filters: any) => void;
  sortBy: 'name' | 'attempts' | 'difficulty' | 'order';
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: 'name' | 'attempts' | 'difficulty' | 'order') => void;
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void;
}

export function DemonFilters({
  filters,
  onFiltersChange,
  sortBy,
  sortOrder,
  onSortChange,
  onSortOrderChange,
}: DemonFiltersProps) {
  return (
    <div className="filters">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Filter size={20} color="var(--accent)" />
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Filters & Sorting</h3>
      </div>

      <div className="filters-grid">
        {/* Difficulty Filter */}
        <div className="form-group">
          <label className="form-label">Difficulty</label>
          <select
            value={filters.difficulty}
            onChange={(e) => onFiltersChange({ ...filters, difficulty: e.target.value })}
            className="form-select"
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
            <option value="Insane">Insane</option>
            <option value="Extreme">Extreme</option>
          </select>
        </div>

        {/* Rating Filter */}
        <div className="form-group">
          <label className="form-label">Rating</label>
          <select
            value={filters.rating}
            onChange={(e) => onFiltersChange({ ...filters, rating: e.target.value })}
            className="form-select"
          >
            <option value="All">All Ratings</option>
            <option value="Star">⭐ Star</option>
            <option value="Moon">🌙 Moon</option>
          </select>
        </div>

        {/* Sort By */}
        <div className="form-group">
          <label className="form-label">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="form-select"
          >
            <option value="name">Name</option>
            <option value="difficulty">Difficulty</option>
            <option value="attempts">Attempts</option>
            <option value="order">Order</option>
          </select>
        </div>

        {/* Sort Order */}
        <div className="form-group">
          <label className="form-label">Order</label>
          <button
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <ArrowUpDown size={16} />
            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search demons..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            className="form-input"
            style={{ paddingLeft: '2.75rem', width: '100%' }}
          />
        </div>
      </div>

      {/* Checkbox Filters */}
      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="form-label">Show only:</p>
            <div className="filter-checkboxes">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={filters.gauntlet}
                  onChange={(e) => onFiltersChange({ ...filters, gauntlet: e.target.checked })}
                />
                <span>Gauntlet</span>
              </label>

              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={filters.weekly}
                  onChange={(e) => onFiltersChange({ ...filters, weekly: e.target.checked })}
                />
                <span>Weekly</span>
              </label>

              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={filters.event}
                  onChange={(e) => onFiltersChange({ ...filters, event: e.target.checked })}
                />
                <span>Event</span>
              </label>

              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={filters.nonSpecial}
                  onChange={(e) => onFiltersChange({ ...filters, nonSpecial: e.target.checked })}
                />
                <span>Non-Special</span>
              </label>

              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={filters.unique}
                  onChange={(e) => onFiltersChange({ ...filters, unique: e.target.checked })}
                />
                <span>Unique</span>
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Target size={14} color="#22d3ee" />
              <span>Gauntlet</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={14} color="#3b82f6" />
              <span>Weekly</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Zap size={14} color="#eab308" />
              <span>Event</span>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', height: '14px', margin: '0 0.25rem' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Star size={14} color="#fbbf24" fill="#fbbf24" />
              <span>Star</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Moon size={14} color="#a78bfa" fill="#a78bfa" />
              <span>Moon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}