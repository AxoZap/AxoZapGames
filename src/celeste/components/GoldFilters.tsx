import React, { useState, useRef, useEffect } from 'react';
import { Filter, ArrowUpDown, Search, ChevronDown, Check } from 'lucide-react';

export interface FilterState {
  difficulties: string[];
  groupFilter: 'All' | 'Groups' | 'Single';
  statusFilter: 'All' | 'Uncompleted' | 'Completed' | 'Completed Groups';
  hasClip: boolean;
  searchQuery: string;
}

interface GoldFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sortBy: 'custom' | 'name' | 'date' | 'difficulty' | 'attempts';
  onSortChange: (sortBy: 'custom' | 'name' | 'date' | 'difficulty' | 'attempts') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
}

const DIFFICULTY_OPTIONS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
  'GM (All)',
  'GM',
  'GM+1',
  'GM+2',
  'GM+3',
];

export function GoldFilters({
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
}: GoldFiltersProps) {
  const [diffDropdownOpen, setDiffDropdownOpen] = useState(false);
  const diffRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (diffRef.current && !diffRef.current.contains(event.target as Node)) {
        setDiffDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDifficulty = (val: string) => {
    const current = filters.difficulties || [];
    let updated: string[];
    if (current.includes(val)) {
      updated = current.filter((d) => d !== val);
    } else {
      updated = [...current, val];
    }
    onFiltersChange({ ...filters, difficulties: updated });
  };

  const clearDifficulties = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFiltersChange({ ...filters, difficulties: [] });
  };

  const diffLabel = () => {
    const d = filters.difficulties || [];
    if (d.length === 0) return 'All Difficulties';
    if (d.length === 1) return d[0];
    return `${d.length} Selected`;
  };

  return (
    <div className="filters">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Filter size={18} color="var(--accent)" />
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.02em' }}>Filters & Sorting</h3>
      </div>

      <div className="filters-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        {/* 1. Difficulty (Multiselect) */}
        <div className="form-group" style={{ marginBottom: 0, position: 'relative' }} ref={diffRef}>
          <label className="form-label">Difficulty</label>
          <div
            onClick={() => setDiffDropdownOpen(!diffDropdownOpen)}
            className="form-select"
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none',
              padding: '0.75rem 0.9rem',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
              {diffLabel()}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {(filters.difficulties || []).length > 0 && (
                <button
                  type="button"
                  onClick={clearDifficulties}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.35rem',
                    cursor: 'pointer',
                  }}
                  title="Clear selection"
                >
                  Clear
                </button>
              )}
              <ChevronDown size={16} style={{ color: 'var(--text-secondary)', transform: diffDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </div>
          </div>

          {/* Multiselect Popover */}
          {diffDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 50,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                padding: '0.5rem 0',
                maxHeight: '260px',
                overflowY: 'auto',
              }}
            >
              <div
                onClick={() => onFiltersChange({ ...filters, difficulties: [] })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.45rem 0.9rem',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  background: (filters.difficulties || []).length === 0 ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                  color: (filters.difficulties || []).length === 0 ? 'var(--accent)' : '#fff',
                  fontWeight: (filters.difficulties || []).length === 0 ? 700 : 500,
                  borderBottom: '1px solid var(--border)',
                  marginBottom: '0.25rem',
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: (filters.difficulties || []).length === 0 ? 'var(--accent)' : 'transparent',
                  }}
                >
                  {(filters.difficulties || []).length === 0 && <Check size={12} color="#000" />}
                </div>
                All Difficulties
              </div>

              {DIFFICULTY_OPTIONS.map((opt) => {
                const isChecked = (filters.difficulties || []).includes(opt);
                return (
                  <div
                    key={opt}
                    onClick={() => toggleDifficulty(opt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.45rem 0.9rem',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      background: isChecked ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                      color: isChecked ? 'var(--accent)' : 'var(--text-primary)',
                      fontWeight: isChecked ? 600 : 400,
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isChecked ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isChecked ? 'rgba(245, 158, 11, 0.08)' : 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: isChecked ? '1px solid var(--accent)' : '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isChecked ? 'var(--accent)' : 'transparent',
                        flexShrink: 0,
                      }}
                    >
                      {isChecked && <Check size={12} color="#000" />}
                    </div>
                    {opt}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Group Filter: All, Groups, Single */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Grouping</label>
          <select
            value={filters.groupFilter}
            onChange={(e) => onFiltersChange({ ...filters, groupFilter: e.target.value as any })}
            className="form-select"
          >
            <option value="All">All</option>
            <option value="Groups">Groups</option>
            <option value="Single">Single</option>
          </select>
        </div>

        {/* 3. Status Filter: Uncompleted, Completed, Completed Groups */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Status</label>
          <select
            value={filters.statusFilter || 'All'}
            onChange={(e) => onFiltersChange({ ...filters, statusFilter: e.target.value as any })}
            className="form-select"
          >
            <option value="All">All Statuses</option>
            <option value="Uncompleted">Uncompleted</option>
            <option value="Completed">Completed</option>
            <option value="Completed Groups">Completed Groups</option>
          </select>
        </div>

        {/* 4. Sort By */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="form-select"
          >
            <option value="custom">Default</option>
            <option value="name">Name</option>
            <option value="difficulty">Difficulty</option>
            <option value="attempts">Attempts</option>
            <option value="date">Date</option>
          </select>
        </div>

        {/* 5. Sort Direction */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Direction</label>
          <button
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', height: '42px' }}
          >
            <ArrowUpDown size={15} />
            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </button>
        </div>
      </div>

      {/* Search and Checkboxes */}
      <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.9rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
            }}
          />
          <input
            type="text"
            placeholder="Search goldens (e.g. 7a, 1c)..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <label className="form-checkbox" style={{ marginBottom: 0 }}>
          <input
            type="checkbox"
            checked={filters.hasClip}
            onChange={(e) => onFiltersChange({ ...filters, hasClip: e.target.checked })}
          />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Has Video Clip</span>
        </label>
      </div>
    </div>
  );
}
