import React from 'react';
import { Search, X, Sheet } from 'lucide-react';

export default function SearchBar({ query, onChange, onSheetsClick, totalCount }) {
  return (
    <div className="flex items-center gap-3">
      {/* Search input */}
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={e => onChange(e.target.value)}
          placeholder="Search companies, domains, cities, projects…"
          className="
            w-full bg-bg-card border border-bg-border rounded-lg
            pl-9 pr-9 py-2.5 text-sm text-text-primary placeholder-text-muted
            focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/30
            transition-all duration-200
          "
        />
        {query && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Result count */}
      {totalCount !== undefined && (
        <span className="font-mono text-xs text-text-muted whitespace-nowrap">
          {totalCount} companies
        </span>
      )}

      {/* Google Sheets sync button */}
      <button
        onClick={onSheetsClick}
        className="btn-ghost flex items-center gap-1.5 whitespace-nowrap text-green-400 border-green-500/30 hover:border-green-500/60"
        title="Sync from Google Sheets"
      >
        <Sheet size={14} />
        <span className="hidden sm:inline">Sheets</span>
      </button>
    </div>
  );
}
