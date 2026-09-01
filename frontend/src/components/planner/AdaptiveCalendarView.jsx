import React, { useState, useCallback, useRef } from 'react';

// ─── Cognitive load colour palette ──────────────────────────────────────────
const LOAD_COLORS = {
  light:    { bg: '#dcfce7', border: '#22c55e', text: '#15803d', label: 'Light'    },
  balanced: { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8', label: 'Balanced' },
  heavy:    { bg: '#fef3c7', border: '#f59e0b', text: '#b45309', label: 'Heavy'    },
  overload: { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c', label: 'Overload' },
  buffer:   { bg: '#f3e8ff', border: '#a855f7', text: '#7e22ce', label: 'Rest Day' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const toDateStr = (d) => d.toISOString().split('T')[0];
const today = new Date();

// ─── Utility: build calendar grid for a given month ─────────────────────────
const buildMonthGrid = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const LoadLegend = () => (
  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>Cognitive Load:</span>
    {Object.entries(LOAD_COLORS).map(([key, val]) => (
      <span key={key} style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        fontSize: '0.72rem', fontWeight: 500,
      }}>
        <span style={{
          width: 10, height: 10, borderRadius: 2,
          background: val.bg, border: `2px solid ${val.border}`, display: 'inline-block',
        }} />
        {val.label}
      </span>
    ))}
  </div>
);

const SlotChip = ({ slot, onDragStart }) => {
  const isBuffer = slot.metadata?.type === 'buffer';
  const colors = isBuffer ? LOAD_COLORS.buffer : {};
  return (
    <div
      draggable={!isBuffer}
      onDragStart={!isBuffer ? (e) => onDragStart(e, slot) : undefined}
      title={slot.title}
      style={{
        fontSize: '0.65rem',
        padding: '1px 4px',
        borderRadius: 3,
        marginBottom: 2,
        cursor: isBuffer ? 'default' : 'grab',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        background: isBuffer ? colors.bg : '#e0f2fe',
        color: isBuffer ? colors.text : '#0369a1',
        border: `1px solid ${isBuffer ? colors.border : '#38bdf8'}`,
        userSelect: 'none',
      }}
    >
      {isBuffer ? '🧘' : '📖'} {slot.title}
    </div>
  );
};

const DayCell = ({ date, slots, loadEntry, onDrop, onDragOver, onDragStart }) => {
  if (!date) return <div style={{ background: 'transparent' }} />;

  const dateStr = toDateStr(date);
  const isToday = dateStr === toDateStr(today);
  const colors = loadEntry
    ? (LOAD_COLORS[loadEntry.label] || LOAD_COLORS.balanced)
    : null;

  return (
    <div
      onDrop={(e) => onDrop(e, dateStr)}
      onDragOver={onDragOver}
      style={{
        minHeight: 90,
        padding: '4px',
        borderRadius: 6,
        border: isToday
          ? '2px solid #6366f1'
          : `1px solid ${colors ? colors.border : '#e5e7eb'}`,
        background: colors ? colors.bg : '#f9fafb',
        transition: 'box-shadow 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Day number */}
      <div style={{
        fontSize: '0.75rem',
        fontWeight: isToday ? 700 : 500,
        color: isToday ? '#4f46e5' : '#374151',
        marginBottom: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>{date.getDate()}</span>
        {loadEntry && (
          <span style={{
            fontSize: '0.6rem',
            background: colors.border,
            color: '#fff',
            borderRadius: 9,
            padding: '0 4px',
          }}>
            {Math.round(loadEntry.loadScore * 100)}%
          </span>
        )}
      </div>

      {/* Slot chips */}
      {slots.map((s) => (
        <SlotChip key={s.id || s.scheduledDate + s.title} slot={s} onDragStart={onDragStart} />
      ))}

      {loadEntry && loadEntry.totalMinutes > 0 && (
        <div style={{
          position: 'absolute', bottom: 2, right: 4,
          fontSize: '0.6rem', color: colors.text, opacity: 0.8,
        }}>
          {loadEntry.totalMinutes}min
        </div>
      )}
    </div>
  );
};

// ─── Rebalance diff modal ─────────────────────────────────────────────────────
const RebalanceModal = ({ diff, onClose, onApply, loading }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{
      background: '#fff', borderRadius: 12, padding: '1.5rem',
      maxWidth: 520, width: '90%', maxHeight: '80vh', overflow: 'auto',
      boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    }}>
      <h3 style={{ margin: '0 0 0.75rem', color: '#1e1b4b', fontSize: '1rem' }}>
        📅 Rebalance Preview
      </h3>
      <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '1rem' }}>
        {diff.length} slot{diff.length !== 1 ? 's' : ''} will be rescheduled:
      </p>
      {diff.length === 0 && (
        <p style={{ color: '#22c55e', fontWeight: 600, fontSize: '0.85rem' }}>
          ✅ Schedule is already balanced!
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {diff.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.78rem', background: '#f8fafc',
            padding: '0.35rem 0.6rem', borderRadius: 6,
          }}>
            <span style={{ flex: 1, fontWeight: 500, color: '#334155' }}>{item.title}</span>
            <span style={{ color: '#ef4444', textDecoration: 'line-through' }}>{item.from}</span>
            <span style={{ color: '#6b7280' }}>→</span>
            <span style={{ color: '#22c55e', fontWeight: 600 }}>{item.to}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{
          padding: '0.4rem 1rem', borderRadius: 6, border: '1px solid #d1d5db',
          background: '#f9fafb', cursor: 'pointer', fontSize: '0.82rem',
        }}>Cancel</button>
        <button onClick={onApply} disabled={loading} style={{
          padding: '0.4rem 1.25rem', borderRadius: 6, border: 'none',
          background: loading ? '#a5b4fc' : '#4f46e5', color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 600,
        }}>
          {loading ? 'Applying…' : 'Apply Rebalance'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * AdaptiveCalendarView
 *
 * Props:
 *   scheduleId   {string}    UUID of the user's RevisionSchedule
 *   slots        {Array}     RevisionSlot rows from the API
 *   cognitiveLoad {Array}    [{ date, loadScore, label, totalMinutes }]
 *   onRebalance  {Function}  (missedDates[]) => Promise<{ diffPreview, cognitiveLoad }>
 *   onSlotMove   {Function}  (slotId, newDate) => Promise<void>
 */
const AdaptiveCalendarView = ({
  scheduleId,
  slots = [],
  cognitiveLoad = [],
  onRebalance,
  onSlotMove,
}) => {
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState('month'); // 'month' | 'week' | 'day'
  const [rebalanceDiff, setRebalanceDiff] = useState(null);
  const [rebalanceLoading, setRebalanceLoading] = useState(false);
  const [localSlots, setLocalSlots] = useState(slots);
  const [localLoad, setLocalLoad] = useState(cognitiveLoad);
  const dragSlotRef = useRef(null);

  // Build lookup maps
  const loadByDate = Object.fromEntries(localLoad.map((l) => [l.date, l]));
  const slotsByDate = localSlots.reduce((acc, s) => {
    (acc[s.scheduledDate] = acc[s.scheduledDate] || []).push(s);
    return acc;
  }, {});

  // ── Navigation ─────────────────────────────────────────────────────────────
  const navigate = (dir) => {
    setViewDate((prev) => {
      const d = new Date(prev);
      if (view === 'month') d.setMonth(d.getMonth() + dir);
      else if (view === 'week') d.setDate(d.getDate() + dir * 7);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, slot) => {
    dragSlotRef.current = slot;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (e, dateStr) => {
    e.preventDefault();
    const slot = dragSlotRef.current;
    if (!slot || slot.scheduledDate === dateStr) return;
    dragSlotRef.current = null;

    // Optimistic update
    setLocalSlots((prev) =>
      prev.map((s) => s.id === slot.id ? { ...s, scheduledDate: dateStr } : s)
    );

    try {
      if (onSlotMove) await onSlotMove(slot.id, dateStr);
    } catch {
      // Rollback on failure
      setLocalSlots((prev) =>
        prev.map((s) => s.id === slot.id ? { ...s, scheduledDate: slot.scheduledDate } : s)
      );
    }
  }, [onSlotMove]);

  // ── Rebalance ──────────────────────────────────────────────────────────────
  const handleRebalanceClick = async () => {
    setRebalanceLoading(true);
    try {
      const result = await onRebalance([]);
      setRebalanceDiff(result.diffPreview || []);
    } catch (err) {
      console.error('Rebalance fetch failed:', err);
    } finally {
      setRebalanceLoading(false);
    }
  };

  const handleRebalanceApply = async () => {
    setRebalanceLoading(true);
    try {
      const result = await onRebalance([], true /* apply */);
      if (result.cognitiveLoad) setLocalLoad(result.cognitiveLoad);
      // Refresh slots with new dates from diff
      if (rebalanceDiff) {
        const moved = Object.fromEntries(rebalanceDiff.map((d) => [d.slotId, d.to]));
        setLocalSlots((prev) =>
          prev.map((s) => moved[s.id] ? { ...s, scheduledDate: moved[s.id] } : s)
        );
      }
      setRebalanceDiff(null);
    } catch (err) {
      console.error('Rebalance apply failed:', err);
    } finally {
      setRebalanceLoading(false);
    }
  };

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const monthGrid = buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth());

  const headerTitle = view === 'month'
    ? `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`
    : view === 'week'
    ? `Week of ${toDateStr(viewDate)}`
    : toDateStr(viewDate);

  // ── Summary bar ────────────────────────────────────────────────────────────
  const overloadCount = localLoad.filter((l) => l.label === 'overload').length;
  const bufferCount = localLoad.filter((l) => l.label === 'buffer' || l.totalMinutes === 0).length;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 960, margin: '0 auto', padding: '1rem' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => navigate(-1)} style={navBtnStyle}>‹</button>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e1b4b', minWidth: 200, textAlign: 'center' }}>
            {headerTitle}
          </h2>
          <button onClick={() => navigate(1)} style={navBtnStyle}>›</button>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {['month', 'week', 'day'].map((v) => (
            <button key={v} onClick={() => setView(v)} style={{
              ...viewBtnStyle,
              background: view === v ? '#4f46e5' : '#f1f5f9',
              color: view === v ? '#fff' : '#334155',
            }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          <button
            onClick={handleRebalanceClick}
            disabled={rebalanceLoading}
            style={{
              ...viewBtnStyle,
              background: rebalanceLoading ? '#a5b4fc' : '#4f46e5',
              color: '#fff', fontWeight: 600, padding: '0.35rem 0.9rem',
              cursor: rebalanceLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {rebalanceLoading ? '⏳ Rebalancing…' : '⚖️ Rebalance Schedule'}
          </button>
        </div>
      </div>

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap',
        background: '#f8fafc', borderRadius: 8, padding: '0.5rem 0.8rem',
      }}>
        <Stat label="Total Sessions" value={localSlots.filter((s) => s.metadata?.type !== 'buffer').length} />
        <Stat label="Buffer Days" value={bufferCount} color="#7e22ce" />
        <Stat label="Overload Days" value={overloadCount} color="#b91c1c" />
        <Stat label="Pending" value={localSlots.filter((s) => s.status === 'pending').length} />
        <Stat label="Completed" value={localSlots.filter((s) => s.status === 'completed').length} color="#15803d" />
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <LoadLegend />

      {/* ── Month grid ─────────────────────────────────────────────────────── */}
      {view === 'month' && (
        <>
          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DAYS.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {monthGrid.map((date, i) => {
              const dateStr = date ? toDateStr(date) : null;
              return (
                <DayCell
                  key={i}
                  date={date}
                  slots={dateStr ? (slotsByDate[dateStr] || []) : []}
                  loadEntry={dateStr ? loadByDate[dateStr] : null}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragStart={handleDragStart}
                />
              );
            })}
          </div>
        </>
      )}

      {/* ── Week / Day list fallback ────────────────────────────────────────── */}
      {(view === 'week' || view === 'day') && (
        <WeekDayList
          viewDate={viewDate}
          view={view}
          slotsByDate={slotsByDate}
          loadByDate={loadByDate}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
        />
      )}

      {/* ── Rebalance Modal ─────────────────────────────────────────────────── */}
      {rebalanceDiff && (
        <RebalanceModal
          diff={rebalanceDiff}
          loading={rebalanceLoading}
          onClose={() => setRebalanceDiff(null)}
          onApply={handleRebalanceApply}
        />
      )}
    </div>
  );
};

// ─── Week/Day list view ───────────────────────────────────────────────────────
const WeekDayList = ({ viewDate, view, slotsByDate, loadByDate, onDrop, onDragOver, onDragStart }) => {
  const dates = [];
  if (view === 'day') {
    dates.push(new Date(viewDate));
  } else {
    // Start from Sunday of the current week
    const start = new Date(viewDate);
    start.setDate(start.getDate() - start.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {dates.map((date) => {
        const dateStr = toDateStr(date);
        const daySlots = slotsByDate[dateStr] || [];
        const loadEntry = loadByDate[dateStr];
        const colors = loadEntry ? (LOAD_COLORS[loadEntry.label] || LOAD_COLORS.balanced) : null;
        const isToday = dateStr === toDateStr(today);

        return (
          <div
            key={dateStr}
            onDrop={(e) => onDrop(e, dateStr)}
            onDragOver={onDragOver}
            style={{
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              background: colors ? colors.bg : '#f9fafb',
              border: `1px solid ${colors ? colors.border : '#e5e7eb'}`,
              borderRadius: 8, padding: '0.6rem 0.8rem',
              ...(isToday ? { outline: '2px solid #6366f1' } : {}),
            }}
          >
            <div style={{ width: 52, flexShrink: 0, textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>{DAYS[date.getDay()]}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: isToday ? '#4f46e5' : '#1e293b' }}>
                {date.getDate()}
              </div>
              {loadEntry && (
                <div style={{ fontSize: '0.6rem', color: colors?.text, fontWeight: 600 }}>
                  {Math.round(loadEntry.loadScore * 100)}%
                </div>
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {daySlots.length === 0
                ? <span style={{ fontSize: '0.75rem', color: '#9ca3af', alignSelf: 'center' }}>No sessions</span>
                : daySlots.map((s) => <SlotChip key={s.id} slot={s} onDragStart={onDragStart} />)
              }
            </div>
            {loadEntry && loadEntry.totalMinutes > 0 && (
              <div style={{ fontSize: '0.7rem', color: colors?.text, whiteSpace: 'nowrap', alignSelf: 'center' }}>
                {loadEntry.totalMinutes}min
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Tiny stat badge ─────────────────────────────────────────────────────────
const Stat = ({ label, value, color = '#334155' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <span style={{ fontSize: '1rem', fontWeight: 700, color }}>{value}</span>
    <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>{label}</span>
  </div>
);

// ─── Button style constants ───────────────────────────────────────────────────
const navBtnStyle = {
  width: 28, height: 28, borderRadius: 6,
  border: '1px solid #d1d5db', background: '#f1f5f9',
  cursor: 'pointer', fontSize: '1rem', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  color: '#374151', lineHeight: 1,
};

const viewBtnStyle = {
  padding: '0.3rem 0.65rem', borderRadius: 6, border: 'none',
  fontSize: '0.78rem', cursor: 'pointer', transition: 'background 0.15s',
  fontWeight: 500,
};

export default AdaptiveCalendarView;
