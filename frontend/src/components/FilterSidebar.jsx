import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X, Layers } from 'lucide-react';

const DOMAIN_COLORS = {
  CSIS: { bg: 'bg-accent-purple/10', text: 'text-accent-purple', border: 'border-accent-purple/30' },
  Electrical: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  Mechanical: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  Chemical: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  Finance: { bg: 'bg-accent-teal/10', text: 'text-accent-teal', border: 'border-accent-teal/30' },
  Consulting: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  Biotech: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  Civil: { bg: 'bg-stone-500/10', text: 'text-stone-400', border: 'border-stone-500/30' },
  Design: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30' },
  Management: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
};

function getDomainColor(domain) {
  return DOMAIN_COLORS[domain] || {
    bg: 'bg-text-muted/10',
    text: 'text-text-secondary',
    border: 'border-bg-border'
  };
}

function DomainSection({ domain, count, subdomains, isSelected, selectedSubdomains, onToggleDomain, onToggleSubdomain }) {
  const [expanded, setExpanded] = useState(isSelected);
  const colors = getDomainColor(domain);
  const hasSubdomains = subdomains && subdomains.length > 0;

  return (
    <div className="mb-1">
      <div className="flex items-center gap-1">
        {/* Expand/collapse subdomain list */}
        {hasSubdomains ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-text-muted hover:text-text-secondary transition-colors"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Domain toggle */}
        <button
          onClick={() => {
            onToggleDomain(domain);
            if (!isSelected && hasSubdomains) setExpanded(true);
          }}
          className={`
            flex-1 flex items-center justify-between text-left px-2 py-1.5 rounded-lg
            text-xs font-medium transition-all duration-150
            ${isSelected
              ? `${colors.bg} ${colors.text} border ${colors.border}`
              : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }
          `}
        >
          <span>{domain}</span>
          <span className={`font-mono text-xs ${isSelected ? colors.text : 'text-text-muted'}`}>
            {count}
          </span>
        </button>
      </div>

      {/* Subdomain chips */}
      {expanded && hasSubdomains && (
        <div className="ml-5 mt-1 flex flex-col gap-0.5">
          {subdomains.sort().map(sub => {
            const isSub = selectedSubdomains.includes(sub);
            return (
              <button
                key={sub}
                onClick={() => onToggleSubdomain(sub)}
                className={`
                  text-left text-xs px-2 py-1 rounded-md transition-all duration-150
                  ${isSub
                    ? `${colors.bg} ${colors.text} font-medium`
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                  }
                `}
              >
                {sub}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FilterSidebar({ domains, subdomainMap, selectedDomains, selectedSubdomains, onToggleDomain, onToggleSubdomain, onClear }) {
  const hasFilters = selectedDomains.length > 0 || selectedSubdomains.length > 0;

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-secondary">
          <Layers size={14} />
          <span className="text-xs font-semibold uppercase tracking-wider">Domains</span>
        </div>
        {hasFilters && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-purple transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Domain list */}
      <div className="flex flex-col">
        {domains.length === 0 ? (
          <p className="text-xs text-text-muted italic">No data loaded yet</p>
        ) : (
          domains.map(({ domain, count }) => (
            <DomainSection
              key={domain}
              domain={domain}
              count={count}
              subdomains={subdomainMap[domain] || []}
              isSelected={selectedDomains.includes(domain)}
              selectedSubdomains={selectedSubdomains}
              onToggleDomain={onToggleDomain}
              onToggleSubdomain={onToggleSubdomain}
            />
          ))
        )}
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="border-t border-bg-border pt-3">
          <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">Active Filters</p>
          <div className="flex flex-wrap gap-1">
            {selectedDomains.map(d => (
              <button
                key={d}
                onClick={() => onToggleDomain(d)}
                className="tag-chip flex items-center gap-1 hover:border-accent-purple/50 transition-colors"
              >
                {d} <X size={10} />
              </button>
            ))}
            {selectedSubdomains.map(s => (
              <button
                key={s}
                onClick={() => onToggleSubdomain(s)}
                className="tag-chip flex items-center gap-1 text-accent-purple border-accent-purple/30 hover:border-accent-purple transition-colors"
              >
                {s} <X size={10} />
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
