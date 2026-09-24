import { useState, useEffect, useMemo } from 'react';
import { GoldList } from './components/GoldList';
import { GoldFilters, FilterState } from './components/GoldFilters';
import { AddGoldModal } from './components/AddGoldModal';
import { EditGoldModal } from './components/EditGoldModal';
import { AddGroupModal } from './components/AddGroupModal';
import { EditGroupModal } from './components/EditGroupModal';
import { adminHeaders, getCFAccessToken } from '../adminAuth';
import { CELESTE_API_URL as API_URL } from '../api';
import { Sparkles, Plus, Layers, Unlock, Loader2 } from 'lucide-react';

export interface Gold {
  id?: number | string;
  placement?: number;
  name: string;
  difficulty: string;
  date: string;
  attempts?: number | null;
  clip?: string | null;
  hidden?: boolean;
  group_name?: string | null;
  completed?: boolean;
  created_at?: string;
}

export interface LevelGroup {
  id?: number | string;
  placement?: number;
  name: string;
  description?: string | null;
  date?: string | null;
  url?: string | null;
  attempts?: number | null;
  created_at?: string;
}



export default function App() {
  // Check if current URL path is /admin or /Admin (protected by Cloudflare Zero Trust)
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.toLowerCase().startsWith('/celeste/admin');

  const [golds, setGolds] = useState<Gold[]>([]);
  const [groups, setGroups] = useState<LevelGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetGroupForAdd, setTargetGroupForAdd] = useState<string>('');
  const [editingGold, setEditingGold] = useState<Gold | null>(null);

  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LevelGroup | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    difficulties: [],
    groupFilter: 'All',
    statusFilter: 'All',
    hasClip: false,
    searchQuery: '',
  });

  const [sortBy, setSortBy] = useState<'custom' | 'name' | 'date' | 'difficulty' | 'attempts'>('custom');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (isAdmin) {
        const token = getCFAccessToken();
        if (token) headers['cf-access-jwt-assertion'] = token;
      }

      const [goldsRes, groupsRes] = await Promise.all([
        fetch(`${API_URL}/golds`, { headers }),
        fetch(`${API_URL}/groups`, { headers }),
      ]);

      if (goldsRes.ok) {
        const goldsData = await goldsRes.json();
        setGolds(goldsData);
      } else {
        console.error('Failed to load golds:', await goldsRes.text());
      }

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData);
      } else {
        console.error('Failed to load groups:', await groupsRes.text());
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reordering persist handler
  const handleReorder = async (
    newGolds: Gold[],
    newGroups: LevelGroup[]
  ) => {
    // Update local state immediately for responsive drag feedback
    setGolds(newGolds);
    setGroups(newGroups);

    if (!isAdmin) return;

    try {
      const goldOrders = newGolds.map((g, idx) => ({ id: g.id!, placement: idx + 1 }));
      const groupOrders = newGroups.map((grp, idx) => ({ id: grp.id!, placement: idx + 1 }));

      await fetch(`${API_URL}/reorder`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ goldOrders, groupOrders }),
      });
    } catch (err) {
      console.error('Failed to persist reorder to server:', err);
    }
  };

  // Level Handlers
  const handleAddGold = async (gold: Omit<Gold, 'id'>) => {
    try {
      const response = await fetch(`${API_URL}/golds`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ gold }),
      });

      if (response.ok) {
        const newGold = await response.json();
        setGolds((prev) => [...prev, newGold]);
        setShowAddModal(false);
        setTargetGroupForAdd('');
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to add golden strawberry.');
      }
    } catch (error) {
      console.error('Error adding gold:', error);
      alert('Failed to add golden strawberry. Please try again.');
    }
  };

  const handleSaveEditGold = async (updatedGold: Gold) => {
    try {
      const response = await fetch(`${API_URL}/golds/${updatedGold.id}`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ gold: updatedGold }),
      });

      if (response.ok) {
        const saved = await response.json();
        setGolds((prev) => prev.map((g) => (g.id === saved.id ? saved : g)));
        setEditingGold(null);
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to update gold.');
      }
    } catch (error) {
      console.error('Error updating gold:', error);
      alert('Failed to update gold.');
    }
  };

  const handleDeleteGold = async (id: string | number) => {
    if (!isAdmin) {
      alert('You must be in Admin mode to delete.');
      return;
    }

    if (!confirm('Are you sure you want to delete this level?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/golds/${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });

      if (response.ok) {
        setGolds((prev) => prev.filter((g) => g.id !== id));
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to delete gold.');
      }
    } catch (error) {
      console.error('Error deleting gold:', error);
      alert('Failed to delete gold.');
    }
  };

  // Group Handlers
  const handleAddGroup = async (group: Omit<LevelGroup, 'id'>) => {
    try {
      const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ group }),
      });

      if (response.ok) {
        const newGroup = await response.json();
        setGroups((prev) => [...prev, newGroup]);
        setShowAddGroupModal(false);
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to create group.');
      }
    } catch (error) {
      console.error('Error adding group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  const handleSaveEditGroup = async (updatedGroup: LevelGroup) => {
    try {
      const response = await fetch(`${API_URL}/groups/${updatedGroup.id}`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ group: updatedGroup }),
      });

      if (response.ok) {
        const saved: LevelGroup = await response.json();
        const oldGroup = groups.find((g) => g.id === saved.id);

        setGroups((prev) => prev.map((g) => (g.id === saved.id ? saved : g)));
        if (oldGroup && oldGroup.name !== saved.name) {
          // Sync group_name locally on levels
          setGolds((prev) =>
            prev.map((g) => (g.group_name === oldGroup.name ? { ...g, group_name: saved.name } : g))
          );
        }
        setEditingGroup(null);
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to update group.');
      }
    } catch (error) {
      console.error('Error updating group:', error);
      alert('Failed to update group.');
    }
  };

  const handleDeleteGroup = async (group: LevelGroup) => {
    if (!isAdmin) {
      alert('You must be in Admin mode to delete.');
      return;
    }

    if (!confirm(`Are you sure you want to delete group "${group.name}"? Levels inside will be ungrouped.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/groups/${group.id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });

      if (response.ok) {
        setGroups((prev) => prev.filter((g) => g.id !== group.id));
        setGolds((prev) =>
          prev.map((g) => (g.group_name === group.name ? { ...g, group_name: null } : g))
        );
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to delete group.');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group.');
    }
  };

  // Open Add Level specifically for a group
  const handleAddLevelToGroup = (groupName: string) => {
    setTargetGroupForAdd(groupName);
    setShowAddModal(true);
  };

  // Filter and Sort Logic
  const filteredGolds = useMemo(() => {
    // Determine which groups are fully completed (every member has completed !== false)
    const groupMemberMap = new Map<string, Gold[]>();
    for (const g of golds) {
      const gn = (g.group_name || '').trim().toLowerCase();
      if (gn) {
        if (!groupMemberMap.has(gn)) groupMemberMap.set(gn, []);
        groupMemberMap.get(gn)!.push(g);
      }
    }

    const completedGroupNames = new Set<string>();
    for (const [gn, members] of groupMemberMap.entries()) {
      if (members.length > 0 && members.every((m) => m.completed !== false)) {
        completedGroupNames.add(gn);
      }
    }

    const list = golds.filter((gold) => {
      // 1. Difficulty filter (Multiselect)
      const selDiffs = filters.difficulties || [];
      if (selDiffs.length > 0) {
        const matchesAny = selDiffs.some((d) => {
          if (d === 'GM (All)') {
            return gold.difficulty.toUpperCase().startsWith('GM');
          }
          return gold.difficulty.toLowerCase() === d.toLowerCase();
        });
        if (!matchesAny) return false;
      }

      // 2. Group filter: All, Groups, Single
      if (filters.groupFilter === 'Groups') {
        if (!gold.group_name || !gold.group_name.trim()) return false;
      } else if (filters.groupFilter === 'Single') {
        if (gold.group_name && gold.group_name.trim()) return false;
      }

      // 3. Status filter: All, Uncompleted, Completed, Completed Groups
      if (filters.statusFilter === 'Uncompleted') {
        if (gold.completed !== false) return false;
      } else if (filters.statusFilter === 'Completed') {
        if (gold.completed === false) return false;
      } else if (filters.statusFilter === 'Completed Groups') {
        const gn = (gold.group_name || '').trim().toLowerCase();
        if (!gn || !completedGroupNames.has(gn)) return false;
      }

      // 4. Clip filter
      if (filters.hasClip && !gold.clip) {
        return false;
      }

      // 5. Search query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesName = gold.name.toLowerCase().includes(q);
        const matchesGroup = (gold.group_name || '').toLowerCase().includes(q);
        const matchesDate = gold.date.toLowerCase().includes(q);
        const matchesDiff = gold.difficulty.toLowerCase().includes(q);
        if (!matchesName && !matchesGroup && !matchesDate && !matchesDiff) {
          return false;
        }
      }

      return true;
    });

    if (sortBy === 'custom') {
      return sortOrder === 'asc' ? list : [...list].reverse();
    }

    return [...list].sort((a, b) => {
      let diff = 0;
      if (sortBy === 'name') {
        diff = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortBy === 'date') {
        if (!a.date && b.date) return 1;
        if (a.date && !b.date) return -1;
        if (a.date.toLowerCase() === 'initial' && b.date.toLowerCase() !== 'initial') return -1;
        if (b.date.toLowerCase() === 'initial' && a.date.toLowerCase() !== 'initial') return 1;
        diff = a.date.localeCompare(b.date);
      } else if (sortBy === 'attempts') {
        diff = (a.attempts || 0) - (b.attempts || 0);
      } else if (sortBy === 'difficulty') {
        const getDiffScore = (raw: string) => {
          const s = (raw || '').trim().toLowerCase();
          if (s.startsWith('beg')) return 10;
          if (s.startsWith('int')) return 20;
          if (s.startsWith('adv')) return 30;
          if (s.startsWith('exp')) return 40;
          if (s.startsWith('gm')) {
            const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
            return 50 + (isNaN(num) ? 0 : num);
          }
          return 0;
        };
        diff = getDiffScore(a.difficulty) - getDiffScore(b.difficulty);
      }

      return sortOrder === 'asc' ? diff : -diff;
    });
  }, [golds, filters, sortBy, sortOrder]);

  const existingGroupNames = useMemo(() => {
    const fromGolds = golds.map((g) => g.group_name?.trim()).filter(Boolean) as string[];
    const fromGroups = groups.map((g) => g.name.trim()).filter(Boolean);
    return Array.from(new Set([...fromGroups, ...fromGolds]));
  }, [golds, groups]);

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <Sparkles size={36} className="logo-icon" />
          <h1>AxoZap's Golds</h1>
          {isAdmin && (
            <span className="admin-pill">
              <Unlock size={12} /> Admin
            </span>
          )}
        </div>
        <p className="subtitle">Celeste Golden Strawberries</p>
      </header>

      {/* Admin Action Bar (only shown on /admin) */}
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setTargetGroupForAdd('');
              setShowAddModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={18} />
            Add Golden
          </button>
          <button
            onClick={() => setShowAddGroupModal(true)}
            className="btn btn-secondary"
            style={{ borderColor: 'var(--accent)', color: '#fff' }}
          >
            <Layers size={18} color="var(--accent)" />
            Add Group
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddGoldModal
          onAdd={handleAddGold}
          onCancel={() => {
            setShowAddModal(false);
            setTargetGroupForAdd('');
          }}
          existingGroups={existingGroupNames}
          defaultGroupName={targetGroupForAdd}
        />
      )}

      {editingGold && (
        <EditGoldModal
          gold={editingGold}
          onSave={handleSaveEditGold}
          onCancel={() => setEditingGold(null)}
          existingGroups={existingGroupNames}
        />
      )}

      {showAddGroupModal && (
        <AddGroupModal
          onAdd={handleAddGroup}
          onCancel={() => setShowAddGroupModal(false)}
        />
      )}

      {editingGroup && (
        <EditGroupModal
          group={editingGroup}
          onSave={handleSaveEditGroup}
          onCancel={() => setEditingGroup(null)}
        />
      )}

      {/* Filters and Sorting */}
      <GoldFilters
        filters={filters}
        onFiltersChange={setFilters}
        sortBy={sortBy}
        onSortChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      {/* Counter */}
      {(() => {
        // Collect unique group names appearing in the filtered list
        const activeGroupNames = new Set(
          filteredGolds.map((g) => g.group_name?.trim()).filter(Boolean) as string[]
        );
        const hasLevelSpecificFilter =
          Boolean(filters.hasClip) ||
          (filters.difficulties?.length ?? 0) > 0 ||
          filters.statusFilter !== 'All';

        if (filters.groupFilter !== 'Single' && !hasLevelSpecificFilter) {
          const search = filters.searchQuery.trim().toLowerCase();
          for (const grp of groups) {
            const lowerGrp = grp.name.trim().toLowerCase();
            if (!activeGroupNames.has(grp.name.trim())) {
              if (!search || lowerGrp.includes(search)) {
                activeGroupNames.add(grp.name.trim());
              }
            }
          }
        }

        const groupCount = activeGroupNames.size;
        const standaloneCount = filteredGolds.filter((g) => !g.group_name || !g.group_name.trim()).length;
        const totalStrawberries = filteredGolds.length;

        return (
          <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>
            Showing {groupCount} group{groupCount === 1 ? '' : 's'} and {standaloneCount} golden{standaloneCount === 1 ? '' : 's'} totaling {totalStrawberries} strawberr{totalStrawberries === 1 ? 'y' : 'ies'}
          </div>
        );
      })()}

      {/* Main Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
          <Loader2 size={40} className="loading-spinner" style={{ margin: '0 auto 1rem', color: 'var(--accent)' }} />
          <p style={{ fontWeight: 600 }}>Loading golden strawberries...</p>
        </div>
      ) : (
        <GoldList
          golds={filteredGolds}
          allGolds={golds}
          groups={groups}
          filters={filters}
          groupFilter={filters.groupFilter}
          statusFilter={filters.statusFilter}
          onDelete={handleDeleteGold}
          onEdit={(gold) => setEditingGold(gold)}
          onEditGroup={(group) => setEditingGroup(group)}
          onDeleteGroup={handleDeleteGroup}
          onAddLevelToGroup={handleAddLevelToGroup}
          onReorder={handleReorder}
          isCustomOrder={sortBy === 'custom'}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
