import React from 'react';
import { MapPin, Plus, Check } from 'lucide-react';

const DOMAIN_COLORS = {
  CSIS: 'text-accent-purple border-accent-purple/40 bg-accent-purple/10',
  'Electrical & Electronics': 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
  Mechanical: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  Chemical: 'text-green-400 border-green-500/40 bg-green-500/10',
  Finance: 'text-accent-teal border-accent-teal/40 bg-accent-teal/10',
  Consulting: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
  Biotech: 'text-pink-400 border-pink-500/40 bg-pink-500/10',
  Civil: 'text-stone-400 border-stone-500/40 bg-stone-500/10',
  Design: 'text-fuchsia-400 border-fuchsia-500/40 bg-fuchsia-500/10',
  Management: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10',
  'Health Care': 'text-rose-400 border-rose-500/40 bg-rose-500/10',
};

function getDomainStyle(domain) {
  return DOMAIN_COLORS[domain] || 'text-text-secondary border-bg-border bg-bg-hover';
}

function highlightText(text, query) {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part
  );
}

const SCALE_COLORS = {
  '🌱 Early Startup': 'text-green-400 border-green-500/30 bg-green-500/10',
  '🚀 Growth Stage': 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  '🏢 Mid-size': 'text-accent-amber border-accent-amber/30 bg-accent-amber/10',
  '🌐 Enterprise': 'text-accent-purple border-accent-purple/30 bg-accent-purple/10',
};

export default function CompanyCard({ company, onClick, searchQuery, enrichment, isPriority, onTogglePriority }) {
  const teaser = company.project_details?.slice(0, 80);
  const hasTruncation = (company.project_details?.length || 0) > 80;

  const scaleStyle = enrichment?.scale_badge
    ? SCALE_COLORS[enrichment.scale_badge] || 'text-text-secondary border-bg-border bg-bg-hover'
    : null;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="
        glass-card p-4 flex flex-col gap-3 text-left w-full relative
        hover:border-accent-purple/40 hover:bg-bg-hover
        active:scale-[0.99] transition-all duration-200
        group animate-fade-in cursor-pointer
      "
    >
      {/* Bookmark button — absolute top-right */}
      <button
        onClick={(e) => { e.stopPropagation(); onTogglePriority?.(company); }}
        className={`
          absolute top-3 right-3 p-1.5 rounded-md transition-all duration-200
          ${isPriority
            ? 'text-accent-amber bg-accent-amber/15 border border-accent-amber/30'
            : 'text-text-muted hover:text-accent-amber hover:bg-accent-amber/10 border border-transparent'
          }
        `}
        title={isPriority ? 'Remove from priority list' : 'Save to priority list'}
      >
        {isPriority ? <Check size={13} /> : <Plus size={13} />}
      </button>

      {/* Header — give right padding so title doesn't overlap bookmark */}
      <div className="flex items-start gap-2 pr-8">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary text-sm leading-snug group-hover:text-accent-purple transition-colors line-clamp-1">
            {highlightText(company.name, searchQuery)}
          </h3>
          <div className="flex items-center gap-1 mt-0.5">
            {company.city && (
              <span className="flex items-center gap-0.5 text-xs text-text-muted">
                <MapPin size={10} />
                {highlightText(company.city, searchQuery)}
              </span>
            )}
          </div>
        </div>

        {/* Scale badge */}
        {enrichment?.scale_badge && (
          <span className={`badge text-xs whitespace-nowrap flex-shrink-0 ${scaleStyle}`}>
            {enrichment.scale_badge}
          </span>
        )}
      </div>

      {/* Domain + Subdomain chips */}
      <div className="flex flex-wrap gap-1.5">
        {company.normalized_domain && (
          <span className={`badge ${getDomainStyle(company.normalized_domain)}`}>
            {highlightText(company.normalized_domain, searchQuery)}
          </span>
        )}
        {enrichment?.company_type && (
          <span className={`badge text-xs ${
            enrichment.company_type === 'Government'
              ? 'text-orange-400 border-orange-500/30 bg-orange-500/10'
              : 'text-accent-purple border-accent-purple/30 bg-accent-purple/10'
          }`}>
            {enrichment.company_type === 'Government' ? '🏛 Govt' : '🏢 Private'}
          </span>
        )}
        {enrichment?.accommodation && (
          <span className="badge text-xs text-accent-teal border-accent-teal/30 bg-accent-teal/10">
            🏠 Accommodation
          </span>
        )}
        {company.subdomains?.slice(0, 2).map(sub => (
          <span key={sub} className="tag-chip">
            {sub}
          </span>
        ))}
        {company.subdomains?.length > 2 && (
          <span className="tag-chip text-text-muted">
            +{company.subdomains.length - 2}
          </span>
        )}
      </div>

      {/* Project teaser */}
      {teaser && (
        <p className="text-xs text-text-muted leading-relaxed line-clamp-1">
          {highlightText(teaser, searchQuery)}
          {hasTruncation && '…'}
        </p>
      )}

      {/* Tech stack preview */}
      {enrichment?.tech_stack?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {enrichment.tech_stack.slice(0, 4).map(t => (
            <span key={t} className="font-mono text-xs text-accent-teal/70 border border-accent-teal/20 rounded px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
