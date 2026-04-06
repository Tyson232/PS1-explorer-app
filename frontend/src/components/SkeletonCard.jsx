import React from 'react';

export function SkeletonCard() {
  return (
    <div className="glass-card p-4 flex flex-col gap-3 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="h-4 bg-bg-hover rounded w-3/4 shimmer" />
          <div className="h-3 bg-bg-hover rounded w-1/3 shimmer" />
        </div>
        <div className="h-6 w-20 bg-bg-hover rounded-md shimmer" />
      </div>

      {/* Chips */}
      <div className="flex gap-1.5">
        <div className="h-5 w-16 bg-bg-hover rounded-md shimmer" />
        <div className="h-5 w-24 bg-bg-hover rounded-md shimmer" />
        <div className="h-5 w-20 bg-bg-hover rounded-md shimmer" />
      </div>

      {/* Project teaser */}
      <div className="flex flex-col gap-1">
        <div className="h-3 bg-bg-hover rounded w-full shimmer" />
        <div className="h-3 bg-bg-hover rounded w-5/6 shimmer" />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-1 border-t border-bg-border">
        <div className="h-3 w-3 bg-bg-hover rounded-full shimmer" />
        <div className="h-3 w-16 bg-bg-hover rounded shimmer" />
      </div>
    </div>
  );
}

export function SkeletonEnrichment() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <div className="h-3 bg-bg-hover rounded w-full shimmer" />
        <div className="h-3 bg-bg-hover rounded w-5/6 shimmer" />
        <div className="h-3 bg-bg-hover rounded w-4/6 shimmer" />
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-3 w-12 bg-bg-hover rounded shimmer" />
            <div className="h-4 w-16 bg-bg-hover rounded shimmer" />
          </div>
        ))}
      </div>
      {/* Tech chips */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-5 w-14 bg-bg-hover rounded shimmer" />
        ))}
      </div>
    </div>
  );
}
