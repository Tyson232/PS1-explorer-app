import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X, Layers, MapPin, BarChart2, Wifi } from 'lucide-react';

const DOMAIN_COLORS = {
  CSIS: { bg: 'bg-accent-purple/10', text: 'text-accent-purple', border: 'border-accent-purple/30' },
  Electrical: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  'Electrical & Electronics': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  Mechanical: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  Chemical: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  Finance: { bg: 'bg-accent-teal/10', text: 'text-accent-teal', border: 'border-accent-teal/30' },
  Consulting: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  Biotech: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  Civil: { bg: 'bg-stone-500/10', text: 'text-stone-400', border: 'border-stone-500/30' },
  Design: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30' },
  Management: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
};

const SCALE_OPTIONS = [
  { value: '🌱 Early Startup', color: 'text-green-400 border-green-500/30 bg-green-500/10' },
  { value: '🚀 Growth Stage', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { value: '🏢 Mid-size',     color: 'text-accent-amber border-accent-amber/30 bg-accent-amber/10' },
  { value: '🌐 Enterprise',   color: 'text-accent-purple border-accent-purple/30 bg-accent-purple/10' },
];

const WORK_MODE_OPTIONS = [
  { value: 'Onsite',  label: '🏢 Onsite',  color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
  { value: 'Online',  label: '💻 Online',  color: 'text-accent-teal border-accent-teal/30 bg-accent-teal/10' },
  { value: 'Hybrid',  label: '🔀 Hybrid',  color: 'text-accent-purple border-accent-purple/30 bg-accent-purple/10' },
];

function getDomainColor(domain) {
  return DOMAIN_COLORS[domain] || { bg: 'bg-text-muted/10', text: 'text-text-secondary', border: 'border-bg-border' };
}

function SectionHeader({ icon: Icon, label, count, expanded, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors py-1"
    >
      <span className="flex items-center gap-1.5">
        <Icon size={12} />
        {label}
        {count > 0 && (
          <span className="font-mono bg-accent-purple/20 text-accent-purple rounded px-1">{count}</span>
        )}
      </span>
      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
    </button>
  );
}

function DomainSection({ domain, count, subdomains, isSelected, selectedSubdomains, onToggleDomain, onToggleSubdomain }) {
  const [expanded, setExpanded] = useState(isSelected);
  const colors = getDomainColor(domain);
  const hasSubdomains = subdomains && subdomains.length > 0;

  return (
    <div className="mb-1">
      <div className="flex items-center gap-1">
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
          <span className={`font-mono text-xs ${isSelected ? colors.text : 'text-text-muted'}`}>{count}</span>
        </button>
      </div>

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
                  ${isSub ? `${colors.bg} ${colors.text} font-medium` : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'}
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

export default function FilterSidebar({
  domains, subdomainMap, selectedDomains, selectedSubdomains, onToggleDomain, onToggleSubdomain,
  allCities, selectedCities, onToggleCity,
  selectedScales, onToggleScale,
  selectedWorkModes, onToggleWorkMode,
  onClearAll
}) {
  const [domainsOpen, setDomainsOpen] = useState(true);
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [workModeOpen, setWorkModeOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const hasFilters = selectedDomains.length > 0 || selectedSubdomains.length > 0
    || selectedCities.length > 0 || selectedScales.length > 0 || selectedWorkModes.length > 0;

  const filteredCities = citySearch
    ? allCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
    : allCities;

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col gap-3">

      {/* ── Domains ── */}
      <div>
        <SectionHeader
          icon={Layers}
          label="Domains"
          count={selectedDomains.length + selectedSubdomains.length}
          expanded={domainsOpen}
          onToggle={() => setDomainsOpen(v => !v)}
        />
        {domainsOpen && (
          <div className="mt-1 flex flex-col">
            {domains.length === 0 ? (
              <p className="text-xs text-text-muted italic">No data loaded</p>
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
        )}
      </div>

      <div className="border-t border-bg-border" />

      {/* ── City ── */}
      <div>
        <SectionHeader
          icon={MapPin}
          label="City"
          count={selectedCities.length}
          expanded={citiesOpen}
          onToggle={() => setCitiesOpen(v => !v)}
        />
        {citiesOpen && (
          <div className="mt-1 flex flex-col gap-1">
            <input
              type="text"
              value={citySearch}
              onChange={e => setCitySearch(e.target.value)}
              placeholder="Search cities…"
              className="w-full bg-bg-card border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-purple/50"
            />
            <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5 mt-0.5">
              {filteredCities.map(city => {
                const sel = selectedCities.includes(city);
                return (
                  <button
                    key={city}
                    onClick={() => onToggleCity(city)}
                    className={`text-left text-xs px-2 py-1 rounded-md transition-all duration-150 ${
                      sel
                        ? 'bg-accent-teal/10 text-accent-teal font-medium'
                        : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-bg-border" />

      {/* ── Company Scale ── */}
      <div>
        <SectionHeader
          icon={BarChart2}
          label="Scale"
          count={selectedScales.length}
          expanded={scaleOpen}
          onToggle={() => setScaleOpen(v => !v)}
        />
        {scaleOpen && (
          <div className="mt-1 flex flex-col gap-0.5">
            {SCALE_OPTIONS.map(({ value, color }) => {
              const sel = selectedScales.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => onToggleScale(value)}
                  className={`text-left text-xs px-2 py-1.5 rounded-md border transition-all duration-150 ${
                    sel ? color : 'text-text-muted border-transparent hover:bg-bg-hover hover:text-text-secondary'
                  }`}
                >
                  {value}
                </button>
              );
            })}
            <p className="text-xs text-text-muted/60 mt-1 px-1 leading-relaxed">
              Only shows enriched companies
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-bg-border" />

      {/* ── Work Mode ── */}
      <div>
        <SectionHeader
          icon={Wifi}
          label="Work Mode"
          count={selectedWorkModes.length}
          expanded={workModeOpen}
          onToggle={() => setWorkModeOpen(v => !v)}
        />
        {workModeOpen && (
          <div className="mt-1 flex flex-col gap-0.5">
            {WORK_MODE_OPTIONS.map(({ value, label, color }) => {
              const sel = selectedWorkModes.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => onToggleWorkMode(value)}
                  className={`text-left text-xs px-2 py-1.5 rounded-md border transition-all duration-150 ${
                    sel ? color : 'text-text-muted border-transparent hover:bg-bg-hover hover:text-text-secondary'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Active filter chips ── */}
      {hasFilters && (
        <div className="border-t border-bg-border pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-text-muted uppercase tracking-wider">Active</p>
            <button
              onClick={onClearAll}
              className="text-xs text-text-muted hover:text-accent-purple transition-colors flex items-center gap-1"
            >
              <X size={10} /> Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedDomains.map(d => (
              <button key={d} onClick={() => onToggleDomain(d)}
                className="tag-chip flex items-center gap-1 hover:border-accent-purple/50 transition-colors">
                {d} <X size={9} />
              </button>
            ))}
            {selectedSubdomains.map(s => (
              <button key={s} onClick={() => onToggleSubdomain(s)}
                className="tag-chip flex items-center gap-1 text-accent-purple border-accent-purple/30 hover:border-accent-purple transition-colors">
                {s} <X size={9} />
              </button>
            ))}
            {selectedCities.map(c => (
              <button key={c} onClick={() => onToggleCity(c)}
                className="tag-chip flex items-center gap-1 text-accent-teal border-accent-teal/30 hover:border-accent-teal transition-colors">
                {c} <X size={9} />
              </button>
            ))}
            {selectedScales.map(s => (
              <button key={s} onClick={() => onToggleScale(s)}
                className="tag-chip flex items-center gap-1 text-accent-amber border-accent-amber/30 hover:border-accent-amber transition-colors">
                {s} <X size={9} />
              </button>
            ))}
            {selectedWorkModes.map(m => (
              <button key={m} onClick={() => onToggleWorkMode(m)}
                className="tag-chip flex items-center gap-1 text-orange-400 border-orange-500/30 hover:border-orange-500 transition-colors">
                {m} <X size={9} />
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
