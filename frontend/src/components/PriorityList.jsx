import React from 'react';
import { X, GripVertical, Star, Trash2, MapPin } from 'lucide-react';
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

function SortableItem({ company, index, onRemove, onOpen }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(company.id) });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const domainStyle = DOMAIN_COLORS[company.normalized_domain] || 'text-text-secondary border-bg-border bg-bg-hover';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-3 rounded-xl border bg-bg-card
        transition-all duration-150
        ${isDragging
          ? 'opacity-60 shadow-2xl border-accent-purple/50 z-50'
          : 'border-bg-border hover:border-accent-purple/30'
        }
      `}
    >
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
          {company.name}
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

export default function PriorityList({ list, onClose, onReorder, onRemove, onOpenCompany }) {
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
          <button onClick={onClose} className="btn-ghost p-2">
            <X size={14} />
          </button>
        </div>

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
                  Click the bookmark icon on any company card to add it here.
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
          <div className="px-5 py-3 border-t border-bg-border flex-shrink-0">
            <p className="text-xs text-text-muted text-center">
              Drag to reorder · Click a company to view details · Saved locally
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
