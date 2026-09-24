import React, { useState } from 'react';
import { Gold, LevelGroup } from '../App';
import { FilterState } from './GoldFilters';
import {
  Calendar,
  Youtube,
  Edit3,
  Trash2,
  EyeOff,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Layers,
  Plus,
  ExternalLink,
  Info,
  GripVertical,
} from 'lucide-react';

interface GoldListProps {
  golds: Gold[];
  allGolds: Gold[];
  groups: LevelGroup[];
  filters?: FilterState;
  groupFilter?: 'All' | 'Groups' | 'Single';
  statusFilter?: 'All' | 'Uncompleted' | 'Completed' | 'Completed Groups';
  onDelete: (id: string | number) => void;
  onEdit: (gold: Gold) => void;
  onEditGroup: (group: LevelGroup) => void;
  onDeleteGroup: (group: LevelGroup) => void;
  onAddLevelToGroup: (groupName: string) => void;
  onReorder?: (newGolds: Gold[], newGroups: LevelGroup[]) => void;
  isCustomOrder?: boolean;
  isAdmin: boolean;
}

type ListItem =
  | { type: 'standalone'; gold: Gold }
  | { type: 'group'; groupName: string; golds: Gold[]; metadata?: LevelGroup };

export function GoldList({
  golds,
  allGolds,
  groups,
  filters,
  groupFilter = 'All',
  statusFilter = 'All',
  onDelete,
  onEdit,
  onEditGroup,
  onDeleteGroup,
  onAddLevelToGroup,
  onReorder,
  isCustomOrder,
  isAdmin,
}: GoldListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [draggedTopIndex, setDraggedTopIndex] = useState<number | null>(null);
  const [dragOverTopIndex, setDragOverTopIndex] = useState<number | null>(null);
  const [draggedInnerIndex, setDraggedInnerIndex] = useState<number | null>(null);
  const [dragOverInnerIndex, setDragOverInnerIndex] = useState<number | null>(null);
  const [activeGroupDrag, setActiveGroupDrag] = useState<string | null>(null);

  const canDrag = Boolean(isAdmin && isCustomOrder);

  // Top-level drag drop handlers
  const handleTopDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'TOP_LEVEL', fromIndex: index }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTopIndex(index);
  };

  const handleTopDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTopIndex !== index) {
      setDragOverTopIndex(index);
    }
  };

  const handleTopDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setDragOverTopIndex(null);
    setDraggedTopIndex(null);

    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.type !== 'TOP_LEVEL') return;
      const fromIndex = Number(data.fromIndex);
      if (fromIndex === toIndex || isNaN(fromIndex)) return;

      const newDisplayItems = [...displayItems];
      const [movedItem] = newDisplayItems.splice(fromIndex, 1);
      newDisplayItems.splice(toIndex, 0, movedItem);

      // Reconstruct full golds and groups ordering based on newDisplayItems
      const reorderedGolds: Gold[] = [];
      const reorderedGroups: LevelGroup[] = [];
      const seenGroupNames = new Set<string>();

      for (const item of newDisplayItems) {
        if (item.type === 'standalone') {
          reorderedGolds.push(item.gold);
        } else {
          for (const g of item.golds) {
            reorderedGolds.push(g);
          }
          if (item.metadata) {
            reorderedGroups.push(item.metadata);
            seenGroupNames.add(item.metadata.name.trim().toLowerCase());
          }
        }
      }

      // Preserve any golds or groups that might have been excluded by active filters
      const currentGoldIds = new Set(reorderedGolds.map((g) => g.id));
      for (const g of allGolds) {
        if (!currentGoldIds.has(g.id)) {
          reorderedGolds.push(g);
        }
      }

      for (const grp of groups) {
        if (!seenGroupNames.has(grp.name.trim().toLowerCase())) {
          reorderedGroups.push(grp);
        }
      }

      if (onReorder) {
        onReorder(reorderedGolds, reorderedGroups);
      }
    } catch (err) {
      console.error('Error parsing drop data:', err);
    }
  };

  // Inner level drag drop handlers within a group
  const handleInnerDragStart = (e: React.DragEvent, groupName: string, index: number) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'INNER_LEVEL', groupName, fromIndex: index }));
    e.dataTransfer.effectAllowed = 'move';
    setActiveGroupDrag(groupName);
    setDraggedInnerIndex(index);
  };

  const handleInnerDragOver = (e: React.DragEvent, groupName: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeGroupDrag === groupName && dragOverInnerIndex !== index) {
      setDragOverInnerIndex(index);
    }
  };

  const handleInnerDrop = (e: React.DragEvent, groupName: string, toIndex: number, groupGolds: Gold[]) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveGroupDrag(null);
    setDraggedInnerIndex(null);
    setDragOverInnerIndex(null);

    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.type !== 'INNER_LEVEL' || data.groupName !== groupName) return;
      const fromIndex = Number(data.fromIndex);
      if (fromIndex === toIndex || isNaN(fromIndex)) return;

      const newGroupGolds = [...groupGolds];
      const [movedGold] = newGroupGolds.splice(fromIndex, 1);
      newGroupGolds.splice(toIndex, 0, movedGold);

      // Splice back into full golds array
      const remainingGolds = allGolds.filter(
        (g) => (g.group_name || '').trim().toLowerCase() !== groupName.trim().toLowerCase()
      );

      // Find original insertion position
      const firstOrigIdx = allGolds.findIndex(
        (g) => (g.group_name || '').trim().toLowerCase() === groupName.trim().toLowerCase()
      );

      const targetIdx = firstOrigIdx >= 0 ? firstOrigIdx : remainingGolds.length;
      const finalGolds = [...remainingGolds];
      finalGolds.splice(targetIdx, 0, ...newGroupGolds);

      if (onReorder) {
        onReorder(finalGolds, groups);
      }
    } catch (err) {
      console.error('Error parsing inner drop data:', err);
    }
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Build a lookup map of group metadata by name (case-insensitive)
  const groupMetaMap = new Map<string, LevelGroup>();
  for (const grp of groups) {
    groupMetaMap.set(grp.name.trim().toLowerCase(), grp);
  }

  // Construct items preserving list order
  const displayItems: ListItem[] = [];
  const processedGroups = new Set<string>();

  for (const gold of golds) {
    const grpName = gold.group_name?.trim();
    if (!grpName) {
      displayItems.push({ type: 'standalone', gold });
    } else {
      const lowerGrp = grpName.toLowerCase();
      if (!processedGroups.has(lowerGrp)) {
        processedGroups.add(lowerGrp);
        const groupMembers = golds.filter(
          (g) => (g.group_name || '').trim().toLowerCase() === lowerGrp
        );
        const metadata = groupMetaMap.get(lowerGrp);
        displayItems.push({
          type: 'group',
          groupName: metadata?.name || grpName,
          golds: groupMembers,
          metadata,
        });
      }
    }
  }

  // Also show defined groups from level_groups that currently have 0 matching levels
  // A group with 0 matching levels should hide if:
  // - Filtering by Single only (groupFilter === 'Single')
  // - Level-specific filters are active (hasClip, difficulties, statusFilter !== 'All')
  // - Or search query is active and doesn't match the group's name
  const effectiveStatusFilter = filters?.statusFilter || statusFilter;
  const effectiveGroupFilter = filters?.groupFilter || groupFilter;
  const hasLevelSpecificFilter =
    Boolean(filters?.hasClip) ||
    (filters?.difficulties?.length ?? 0) > 0 ||
    effectiveStatusFilter !== 'All';

  if (effectiveGroupFilter !== 'Single' && !hasLevelSpecificFilter) {
    const search = (filters?.searchQuery || '').trim().toLowerCase();
    for (const grp of groups) {
      const lowerGrp = grp.name.trim().toLowerCase();
      if (!processedGroups.has(lowerGrp)) {
        if (!search || lowerGrp.includes(search)) {
          displayItems.push({
            type: 'group',
            groupName: grp.name,
            golds: [],
            metadata: grp,
          });
        }
      }
    }
  }

  if (displayItems.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
        <p style={{ fontSize: '1.1rem' }}>No golden strawberries found matching your filters.</p>
      </div>
    );
  }

  const thStyle: React.CSSProperties = {
    padding: '0.9rem 1.15rem',
    color: 'var(--text-secondary)',
    fontSize: '0.78rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const renderStatusBadge = (completed: boolean | undefined) => {
    const isDone = completed !== false;
    return isDone ? (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          color: '#10b981',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '0.15rem 0.5rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}
      >
        <CheckCircle2 size={13} />
        Done
      </span>
    ) : (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          color: 'var(--text-secondary)',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border)',
          padding: '0.15rem 0.5rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        <Circle size={13} />
        In Progress
      </span>
    );
  };

  const getDiffShort = (raw: string): string => {
    const s = (raw || '').trim().toLowerCase();
    if (s.startsWith('beg')) return 'B';
    if (s.startsWith('int')) return 'I';
    if (s.startsWith('adv')) return 'A';
    if (s.startsWith('exp')) return 'E';
    if (s.startsWith('gm')) {
      const rest = s.slice(2).trim();
      return rest ? `GM${rest}` : 'GM';
    }
    return raw.slice(0, 2).toUpperCase();
  };

  const getDiffRank = (raw: string): number => {
    const s = (raw || '').trim().toLowerCase();
    if (s.startsWith('beg')) return 1;
    if (s.startsWith('int')) return 2;
    if (s.startsWith('adv')) return 3;
    if (s.startsWith('exp')) return 4;
    if (s.startsWith('gm')) return 5;
    return 0;
  };

  const renderGroupDifficultySummary = (levels: Gold[]) => {
    if (levels.length === 0) {
      return <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>;
    }

    const uniqueDiffs = Array.from(
      new Set(levels.map((l) => (l.difficulty || '').trim()).filter(Boolean))
    ).sort((a, b) => getDiffRank(a) - getDiffRank(b));

    if (uniqueDiffs.length === 0) {
      return <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>;
    }

    const shortLabel =
      uniqueDiffs.length === 1
        ? getDiffShort(uniqueDiffs[0])
        : `${getDiffShort(uniqueDiffs[0])}-${getDiffShort(uniqueDiffs[uniqueDiffs.length - 1])}`;

    // Use tag style from highest difficulty in the group
    const highest = uniqueDiffs[uniqueDiffs.length - 1].toLowerCase();
    let tagStyleClass = 'tag-beginner';
    if (highest.startsWith('gm')) tagStyleClass = 'tag-gm';
    else if (highest.startsWith('exp')) tagStyleClass = 'tag-expert';
    else if (highest.startsWith('adv')) tagStyleClass = 'tag-advanced';
    else if (highest.startsWith('int')) tagStyleClass = 'tag-intermediate';

    return (
      <span
        className={`tag ${tagStyleClass}`}
        title={`Difficulties: ${uniqueDiffs.join(', ')}`}
        style={{ letterSpacing: '0.04em', fontWeight: 800, padding: '0.15rem 0.6rem' }}
      >
        {shortLabel}
      </span>
    );
  };

  const renderDifficultyBadge = (difficulty: string) => {
    const d = (difficulty || 'beginner').trim().toLowerCase();
    let diffClass = 'tag-beginner';
    if (d.startsWith('gm')) diffClass = 'tag-gm';
    else if (d.startsWith('beg')) diffClass = 'tag-beginner';
    else if (d.startsWith('int')) diffClass = 'tag-intermediate';
    else if (d.startsWith('adv')) diffClass = 'tag-advanced';
    else if (d.startsWith('exp')) diffClass = 'tag-expert';

    return <span className={`tag ${diffClass}`}>{difficulty}</span>;
  };

  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              {/* Name */}
              <th style={thStyle}>Level / Group</th>

              {/* Status */}
              <th style={{ ...thStyle, textAlign: 'center', width: '120px' }}>Status</th>

              {/* Difficulty */}
              <th style={thStyle}>Difficulty</th>

              {/* Date */}
              <th style={thStyle}>Date</th>

              {/* Attempts */}
              <th style={{ ...thStyle, textAlign: 'center', width: '110px' }}>Attempts</th>

              {/* Clip / Group URL */}
              <th style={{ ...thStyle, textAlign: 'center', width: '90px' }}>Clip / URL</th>

              {/* Actions */}
              {isAdmin && <th style={{ ...thStyle, textAlign: 'center', width: '130px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item, topIndex) => {
              if (item.type === 'standalone') {
                const gold = item.gold;
                const isHidden = Boolean(gold.hidden);
                const isBeingDragged = draggedTopIndex === topIndex;
                const isDragOver = dragOverTopIndex === topIndex;

                return (
                  <tr
                    key={gold.id}
                    draggable={canDrag}
                    onDragStart={(e) => handleTopDragStart(e, topIndex)}
                    onDragOver={(e) => handleTopDragOver(e, topIndex)}
                    onDrop={(e) => handleTopDrop(e, topIndex)}
                    onDragEnd={() => {
                      setDraggedTopIndex(null);
                      setDragOverTopIndex(null);
                    }}
                    style={{
                      borderBottom: isDragOver ? '2px solid var(--accent)' : '1px solid var(--border)',
                      opacity: isBeingDragged ? 0.4 : 1,
                      transition: 'background 0.15s ease',
                      background: isDragOver
                        ? 'rgba(245, 158, 11, 0.12)'
                        : isHidden && isAdmin
                        ? 'rgba(239, 68, 68, 0.05)'
                        : undefined,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        isHidden && isAdmin ? 'rgba(239, 68, 68, 0.09)' : 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        isHidden && isAdmin ? 'rgba(239, 68, 68, 0.05)' : 'transparent';
                    }}
                  >
                    {/* Name */}
                    <td style={{ padding: '0.9rem 1.15rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {canDrag && (
                          <span
                            title="Drag to reorder"
                            style={{
                              color: 'var(--text-secondary)',
                              cursor: 'grab',
                              display: 'inline-flex',
                              alignItems: 'center',
                              opacity: 0.6,
                            }}
                          >
                            <GripVertical size={16} />
                          </span>
                        )}
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.02em' }}>
                          {gold.name}
                        </span>
                        {isHidden && isAdmin && (
                          <span
                            style={{
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <EyeOff size={11} /> Hidden
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.9rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {renderStatusBadge(gold.completed)}
                    </td>

                    {/* Difficulty */}
                    <td style={{ padding: '0.9rem 1.15rem', whiteSpace: 'nowrap' }}>
                      {renderDifficultyBadge(gold.difficulty)}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '0.9rem 1.15rem', whiteSpace: 'nowrap' }}>
                      {gold.date && gold.date.trim() && gold.date.toLowerCase() !== 'initial' ? (
                        <span className="date-badge">
                          <Calendar size={13} />
                          {gold.date}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                      )}
                    </td>

                    {/* Attempts */}
                    <td style={{ padding: '0.9rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {gold.attempts != null && gold.attempts !== undefined ? (
                        <span
                          style={{
                            display: 'inline-block',
                            minWidth: '3.6rem',
                            maxWidth: '5.2rem',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border)',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            color: '#fff',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '0.85rem',
                            textAlign: 'center',
                          }}
                        >
                          {gold.attempts.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                      )}
                    </td>

                    {/* Clip */}
                    <td style={{ padding: '0.9rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {gold.clip ? (
                        <a
                          href={gold.clip}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="clip-icon-link"
                          title="Watch Video"
                        >
                          <Youtube size={19} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    {isAdmin && (
                      <td style={{ padding: '0.9rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            onClick={() => onEdit(gold)}
                            className="action-btn"
                            style={{ color: '#84cc16' }}
                            title="Edit Level"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => onDelete(gold.id!)}
                            className="action-btn"
                            style={{ color: '#ef4444' }}
                            title="Delete Level"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              }

              // Group Row
              const isExpanded = Boolean(expandedGroups[item.groupName]);
              const groupLevels = item.golds;
              const meta = item.metadata;

              // Find all actual members in the entire database for this group
              const allGroupMembers = allGolds.filter(
                (g) => (g.group_name || '').trim().toLowerCase() === item.groupName.trim().toLowerCase()
              );
              // Total levels in this group from database (or matching filtered levels if allGolds not available)
              const totalGroupLevelsCount = allGroupMembers.length > 0 ? allGroupMembers.length : groupLevels.length;
              const totalCompletedCount = allGroupMembers.length > 0
                ? allGroupMembers.filter((g) => g.completed !== false).length
                : groupLevels.filter((g) => g.completed !== false).length;

              // When statusFilter is active ('Completed', 'Completed Groups', 'Uncompleted'):
              // User requested: "The status should stay the same, not go to 1/1"
              // When sorting/filtering by anything but status (e.g. difficulty, clip, search, or no filter):
              // User requested: "When sorting by anything but status, like difficutly, the 'Status' like 1/8 can change"
              const isFilteringByStatus = effectiveStatusFilter !== 'All';

              const displayCompletedCount = isFilteringByStatus
                ? totalCompletedCount
                : groupLevels.filter((g) => g.completed !== false).length;

              const displayTotalCount = isFilteringByStatus
                ? totalGroupLevelsCount
                : groupLevels.length;

              const isGroupCompleted = displayTotalCount > 0 && displayCompletedCount === displayTotalCount;

              // Total attempts: group.attempts override if provided, otherwise sum of member levels
              const memberAttemptsSum = groupLevels.reduce((sum, g) => sum + (g.attempts || 0), 0);
              const groupAttempts = meta?.attempts != null ? meta.attempts : (groupLevels.some((g) => g.attempts != null) ? memberAttemptsSum : null);

              // Date: only show if explicitly configured on the group/pack (no auto date from inner levels)
              const displayDate =
                meta?.date && meta.date.trim() && meta.date.toLowerCase() !== 'initial'
                  ? meta.date.trim()
                  : '';

              // Group URL or video
              const groupUrl = meta?.url;
              const isBeingDragged = draggedTopIndex === topIndex;
              const isDragOver = dragOverTopIndex === topIndex;

              return (
                <React.Fragment key={`group-${item.groupName}`}>
                  <tr
                    draggable={canDrag}
                    onDragStart={(e) => handleTopDragStart(e, topIndex)}
                    onDragOver={(e) => handleTopDragOver(e, topIndex)}
                    onDrop={(e) => handleTopDrop(e, topIndex)}
                    onDragEnd={() => {
                      setDraggedTopIndex(null);
                      setDragOverTopIndex(null);
                    }}
                    onClick={() => toggleGroup(item.groupName)}
                    style={{
                      borderBottom: isDragOver ? '2px solid var(--accent)' : '1px solid var(--border)',
                      opacity: isBeingDragged ? 0.4 : 1,
                      background: isDragOver
                        ? 'rgba(245, 158, 11, 0.16)'
                        : isExpanded
                        ? 'rgba(245, 158, 11, 0.08)'
                        : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isExpanded
                        ? 'rgba(245, 158, 11, 0.12)'
                        : 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isExpanded
                        ? 'rgba(245, 158, 11, 0.08)'
                        : 'rgba(255, 255, 255, 0.02)';
                    }}
                  >
                    {/* Group Name Header */}
                    <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {canDrag && (
                          <span
                            title="Drag to reorder"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: 'var(--text-secondary)',
                              cursor: 'grab',
                              display: 'inline-flex',
                              alignItems: 'center',
                              opacity: 0.6,
                            }}
                          >
                            <GripVertical size={16} />
                          </span>
                        )}
                        <button
                          type="button"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                        <Layers size={18} color="var(--accent)" />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.08rem', letterSpacing: '0.01em' }}>
                              {item.groupName}
                            </span>
                            <span
                              style={{
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: 'var(--accent)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '0.1rem 0.5rem',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}
                            >
                              {displayTotalCount} {displayTotalCount === 1 ? 'level' : 'levels'}
                            </span>
                          </div>
                          {meta?.description && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {meta.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Completion Status */}
                    <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {displayTotalCount > 0 ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: isGroupCompleted ? '#10b981' : '#f59e0b',
                            background: isGroupCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            border: `1px solid ${isGroupCompleted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {isGroupCompleted ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                          {displayCompletedCount}/{displayTotalCount}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', opacity: 0.5, fontSize: '0.8rem' }}>
                          Empty
                        </span>
                      )}
                    </td>

                    {/* Group Difficulty summary */}
                    <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                      {renderGroupDifficultySummary(groupLevels)}
                    </td>

                    {/* Group Date */}
                    <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                      {displayDate && displayDate.trim() && displayDate.toLowerCase() !== 'initial' ? (
                        <span className="date-badge">
                          <Calendar size={13} />
                          {displayDate}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                      )}
                    </td>

                    {/* Group Attempts */}
                    <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {groupAttempts != null ? (
                        <span
                          style={{
                            display: 'inline-block',
                            minWidth: '3.6rem',
                            maxWidth: '5.6rem',
                            background: 'rgba(245, 158, 11, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            color: 'var(--accent)',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '0.85rem',
                            textAlign: 'center',
                          }}
                        >
                          {groupAttempts.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                      )}
                    </td>

                    {/* Group URL / Video Link */}
                    <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {groupUrl ? (
                        <a
                          href={groupUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="clip-icon-link"
                          title="Open Group URL / Video"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {groupUrl.includes('youtu') ? <Youtube size={19} /> : <ExternalLink size={17} />}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                      )}
                    </td>

                    {/* Actions (Admin only) */}
                    {isAdmin && (
                      <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Add level to this group */}
                          <button
                            onClick={() => onAddLevelToGroup(item.groupName)}
                            className="action-btn"
                            style={{ color: 'var(--accent)' }}
                            title={`Add level to ${item.groupName}`}
                          >
                            <Plus size={16} />
                          </button>

                          {/* Edit group */}
                          <button
                            onClick={() => {
                              if (meta) {
                                onEditGroup(meta);
                              } else {
                                // synthesize group object if not yet persisted in level_groups
                                onEditGroup({
                                  name: item.groupName,
                                  description: '',
                                  date: '',
                                  url: '',
                                  attempts: null,
                                });
                              }
                            }}
                            className="action-btn"
                            style={{ color: '#84cc16' }}
                            title="Edit Group Details"
                          >
                            <Edit3 size={16} />
                          </button>

                          {/* Delete group */}
                          {meta && (
                            <button
                              onClick={() => onDeleteGroup(meta)}
                              className="action-btn"
                              style={{ color: '#ef4444' }}
                              title="Delete Group"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>

                  {/* Expanded group rows */}
                  {isExpanded &&
                    (groupLevels.length > 0 ? (
                      groupLevels.map((gold, innerIndex) => {
                        const isHidden = Boolean(gold.hidden);
                        const isInnerDragged = activeGroupDrag === item.groupName && draggedInnerIndex === innerIndex;
                        const isInnerOver = activeGroupDrag === item.groupName && dragOverInnerIndex === innerIndex;

                        return (
                          <tr
                            key={gold.id}
                            draggable={canDrag}
                            onDragStart={(e) => handleInnerDragStart(e, item.groupName, innerIndex)}
                            onDragOver={(e) => handleInnerDragOver(e, item.groupName, innerIndex)}
                            onDrop={(e) => handleInnerDrop(e, item.groupName, innerIndex, groupLevels)}
                            onDragEnd={() => {
                              setActiveGroupDrag(null);
                              setDraggedInnerIndex(null);
                              setDragOverInnerIndex(null);
                            }}
                            style={{
                              borderBottom: isInnerOver
                                ? '2px solid var(--accent)'
                                : '1px solid rgba(255, 255, 255, 0.04)',
                              opacity: isInnerDragged ? 0.35 : 1,
                              background: isInnerOver
                                ? 'rgba(245, 158, 11, 0.15)'
                                : isHidden && isAdmin
                                ? 'rgba(239, 68, 68, 0.06)'
                                : 'rgba(0, 0, 0, 0.25)',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = isHidden && isAdmin
                                ? 'rgba(239, 68, 68, 0.1)'
                                : 'rgba(255, 255, 255, 0.04)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isHidden && isAdmin
                                ? 'rgba(239, 68, 68, 0.06)'
                                : 'rgba(0, 0, 0, 0.25)';
                            }}
                          >
                            {/* Level Name */}
                            <td style={{ padding: '0.75rem 1.15rem 0.75rem 2.2rem', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                {canDrag && (
                                  <span
                                    title="Drag to reorder inside group"
                                    style={{
                                      color: 'var(--text-secondary)',
                                      cursor: 'grab',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      opacity: 0.5,
                                    }}
                                  >
                                    <GripVertical size={14} />
                                  </span>
                                )}
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>↳</span>
                                <span style={{ color: '#f3f4f6', fontWeight: 600, fontSize: '0.98rem' }}>
                                  {gold.name}
                                </span>
                                {isHidden && isAdmin && (
                                  <span
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.2)',
                                      color: '#ef4444',
                                      border: '1px solid rgba(239, 68, 68, 0.4)',
                                      padding: '0.05rem 0.4rem',
                                      borderRadius: '4px',
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.2rem',
                                    }}
                                  >
                                    <EyeOff size={10} /> Hidden
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '0.75rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {renderStatusBadge(gold.completed)}
                            </td>

                            {/* Difficulty */}
                            <td style={{ padding: '0.75rem 1.15rem', whiteSpace: 'nowrap' }}>
                              {renderDifficultyBadge(gold.difficulty)}
                            </td>

                            {/* Date */}
                            <td style={{ padding: '0.75rem 1.15rem', whiteSpace: 'nowrap' }}>
                              {gold.date && gold.date.trim() && gold.date.toLowerCase() !== 'initial' ? (
                                <span className="date-badge">
                                  <Calendar size={13} />
                                  {gold.date}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                              )}
                            </td>

                            {/* Attempts */}
                            <td style={{ padding: '0.75rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {gold.attempts != null && gold.attempts !== undefined ? (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    minWidth: '3.6rem',
                                    maxWidth: '5.2rem',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid var(--border)',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    color: '#fff',
                                    fontVariantNumeric: 'tabular-nums',
                                    fontSize: '0.82rem',
                                    textAlign: 'center',
                                  }}
                                >
                                  {gold.attempts.toLocaleString()}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                              )}
                            </td>

                            {/* Clip */}
                            <td style={{ padding: '0.75rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {gold.clip ? (
                                <a
                                  href={gold.clip}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="clip-icon-link"
                                  title="Watch Video"
                                >
                                  <Youtube size={18} />
                                </a>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>—</span>
                              )}
                            </td>

                            {/* Actions */}
                            {isAdmin && (
                              <td style={{ padding: '0.75rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEdit(gold);
                                    }}
                                    className="action-btn"
                                    style={{ color: '#84cc16' }}
                                    title="Edit Level"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDelete(gold.id!);
                                    }}
                                    className="action-btn"
                                    style={{ color: '#ef4444' }}
                                    title="Delete Level"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={isAdmin ? 7 : 6}
                          style={{
                            padding: '1rem 3rem',
                            color: 'var(--text-secondary)',
                            fontSize: '0.85rem',
                            fontStyle: 'italic',
                            background: 'rgba(0, 0, 0, 0.2)',
                          }}
                        >
                          No levels in this group yet.{' '}
                          {isAdmin && (
                            <button
                              onClick={() => onAddLevelToGroup(item.groupName)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--accent)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                textDecoration: 'underline',
                                marginLeft: '0.25rem',
                              }}
                            >
                              Add a level now
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
