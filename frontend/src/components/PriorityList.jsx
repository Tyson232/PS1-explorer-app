import React, { useState, useEffect, useRef } from 'react';
import { X, GripVertical, Star, Trash2, MapPin, Link2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DOMAIN_COLORS = {
  CSIS: 'text-accent-purple border-accent-purple/40 bg-accent-purple/10',
  Electrical: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
  Mechanical: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  Chemical: 'text-green-400 border-green-500/40 bg-green-500/10',
  Finance: 'text-accent-teal border-accent-teal/40 bg-accent-teal/10',
  Consulting: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
  Biotech: 'text-pink-400 border-pink-500/40 bg-pink-500/10',
};

// ── Color coding ────────────────────────────────────────────────────────────
const COLOR_OPTIONS = [
  { id: 'grey',   bg: 'bg-slate-500',  bar: 'bg-slate-500'  },
  { id: 'green',  bg: 'bg-green-400',  bar: 'bg-green-400'  },
  { id: 'yellow', bg: 'bg-yellow-400', bar: 'bg-yellow-400' },
  { id: 'red',    bg: 'bg-red-400',    bar: 'bg-red-400'    },
];

function useItemColor(id) {
  const key = `color-${id}`;
  const [color, setColorState] = useState(() => {
    try { return localStorage.getItem(key) || 'grey'; }
    catch { return 'grey'; }
  });
  function setColor(next) {
    setColorState(next);
    try { localStorage.setItem(key, next); } catch {}
  }
  return [color, setColor];
}

// ── Sortable item ───────────────────────────────────────────────────────────
function SortableItem({ company, index, onRemove, onOpen }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: String(company.id) });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const domainStyle = DOMAIN_COLORS[company.normalized_domain] || 'text-text-secondary border-bg-border bg-bg-hover';

  const [color, setColor] = useItemColor(company.id);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    function onDown(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showPicker]);

  const currentColor = COLOR_OPTIONS.find(c => c.id === color) || COLOR_OPTIONS[0];

  function handleDotClick(e) {
    e.stopPropagation();
    setShowPicker(v => !v);
  }

  function handleColorSelect(e, optId) {
    e.stopPropagation();
    // clicking the active color resets to grey
    setColor(optId === color ? 'grey' : optId);
    setShowPicker(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative flex items-center gap-2 p-3 pl-6 rounded-xl border bg-bg-card
        transition-all duration-150 overflow-visible
        ${isDragging
          ? 'opacity-60 shadow-2xl border-accent-purple/50 z-50'
          : 'border-bg-border hover:border-accent-purple/30'
        }
      `}
    >
      {/* Color accent bar — left edge */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${currentColor.bar}`} />

      {/* Color dot + picker — top-left corner */}
      <div ref={pickerRef} className="absolute top-2 left-1.5 z-10">
        <button
          onClick={handleDotClick}
          className={`w-2.5 h-2.5 rounded-full ${currentColor.bg} ring-1 ring-white/20 hover:scale-125 transition-transform flex-shrink-0`}
          title="Set color label"
        />
        {showPicker && (
          <div className="absolute top-4 left-0 flex gap-1.5 p-1.5 rounded-lg bg-bg-secondary border border-bg-border shadow-xl">
            {COLOR_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={(e) => handleColorSelect(e, opt.id)}
                className={`
                  w-4 h-4 rounded-full ${opt.bg} transition-transform hover:scale-110
                  ${color === opt.id ? 'ring-2 ring-white/70 scale-110' : 'ring-1 ring-white/20'}
                `}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drag handle */}
      <button
        className="text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing touch-none flex-shrink-0 p-0.5"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        <GripVertical size={15} />
      </button>

      {/* Rank badge */}
      <span className="font-mono text-xs text-text-muted bg-bg-hover border border-bg-border rounded px-1.5 py-0.5 flex-shrink-0 w-7 text-center">
        {index + 1}
      </span>

      {/* Company info — clickable */}
      <button
        className="flex-1 min-w-0 text-left"
        onClick={() => onOpen(company)}
      >
        <p className="text-sm font-medium text-text-primary truncate hover:text-accent-purple transition-colors">
          {company.name.replace(/\s*-\s*(Online|Onsite)\s*$/i, '').trim()}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`font-mono text-xs px-1.5 py-0.5 rounded border ${domainStyle}`}>
            {company.normalized_domain}
          </span>
          {company.city && (
            <span className="text-xs text-text-muted flex items-center gap-0.5">
              <MapPin size={9} />{company.city}
            </span>
          )}
        </div>
      </button>

      {/* Remove button */}
      <button
        onClick={() => onRemove(company.id)}
        className="text-text-muted hover:text-red-400 transition-colors flex-shrink-0 p-1 rounded-md hover:bg-red-400/10"
        title="Remove from list"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function PriorityList({ list, onClose, onReorder, onRemove, onOpenCompany, onClearAll }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = list.findIndex(c => String(c.id) === active.id);
      const newIndex = list.findIndex(c => String(c.id) === over.id);
      onReorder(arrayMove(list, oldIndex, newIndex));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="relative w-full max-w-md bg-bg-secondary border-l border-bg-border flex flex-col h-full shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Star size={15} className="text-accent-amber fill-accent-amber" />
            <span className="font-bold text-text-primary">My Priority List</span>
            <span className="font-mono text-xs text-text-muted bg-bg-card border border-bg-border rounded px-1.5 py-0.5">
              {list.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {list.length > 0 && (
              <button
                onClick={() => { if (window.confirm('Clear all stations from your list?')) onClearAll(); }}
                className="text-xs text-text-muted hover:text-red-400 transition-colors px-2 py-1 rounded-md hover:bg-red-400/10"
                title="Clear all"
              >
                Clear all
              </button>
            )}
            <button onClick={onClose} className="btn-ghost p-2">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Color legend */}
        {list.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-2 border-b border-bg-border flex-shrink-0">
            <span className="text-xs text-text-muted">Label:</span>
            {[
              { id: 'grey',   bg: 'bg-slate-500',  label: 'Unsorted'     },
              { id: 'green',  bg: 'bg-green-400',  label: 'Top pick'     },
              { id: 'yellow', bg: 'bg-yellow-400', label: 'Maybe'        },
              { id: 'red',    bg: 'bg-red-400',    label: 'Last resort'  },
            ].map(c => (
              <span key={c.id} className="flex items-center gap-1 text-xs text-text-muted">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.bg}`} />
                {c.label}
              </span>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-bg-card border border-bg-border flex items-center justify-center text-2xl">
                ⭐
              </div>
              <div>
                <p className="text-text-primary font-medium">No companies saved yet</p>
                <p className="text-sm text-text-muted mt-1 max-w-xs">
                  Click the + icon on any company card to add it here.
                </p>
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={list.map(c => String(c.id))}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {list.map((company, index) => (
                    <SortableItem
                      key={company.id}
                      company={company}
                      index={index}
                      onRemove={onRemove}
                      onOpen={(c) => { onClose(); onOpenCompany(c); }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        {list.length > 0 && (
          <div className="px-4 py-3 border-t border-bg-border flex-shrink-0 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const ids = list.map(c => c.id).join(',');
                  const url = `${window.location.origin}/?list=${ids}`;
                  navigator.clipboard.writeText(url)
                    .then(() => toast.success('Share link copied!'))
                    .catch(() => toast.error('Could not copy link'));
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-accent-purple/10 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/20 transition-all"
              >
                <Link2 size={12} /> Share Link
              </button>
              <button
                onClick={() => {
                  const lines = [
                    `📋 My PS1 Shortlist (${list.length} station${list.length > 1 ? 's' : ''})`,
                    '',
                    ...list.map((c, i) => {
                      const parts = [`${i + 1}. ${c.name}`];
                      const meta = [c.city, c.normalized_domain].filter(Boolean).join(' · ');
                      if (meta) parts.push(`   ${meta}`);
                      const extra = [
                        c.min_cg != null ? `CG: ${c.min_cg}` : null,
                        c.work_mode ? `Mode: ${c.work_mode}` : null,
                      ].filter(Boolean).join(' | ');
                      if (extra) parts.push(`   ${extra}`);
                      return parts.join('\n');
                    }),
                    '',
                    'via ps1-explorer.vercel.app',
                  ];
                  navigator.clipboard.writeText(lines.join('\n'))
                    .then(() => toast.success('List copied to clipboard!'))
                    .catch(() => toast.error('Could not copy'));
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-bg-hover text-text-secondary border border-bg-border hover:text-text-primary transition-all"
              >
                <Copy size={12} /> Copy Text
              </button>
            </div>
            <p className="text-xs text-text-muted text-center">
              Drag to reorder · Click dot to label · Click company to view
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
