import React, { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { Building2, SlidersHorizontal, X, Star } from 'lucide-react';

import { useCompanies } from './hooks/useCompanies.js';
import { fetchEnrichment, getEnrichmentCache } from './api/client.js';
import SearchBar from './components/SearchBar.jsx';
import FilterSidebar from './components/FilterSidebar.jsx';
import CompanyCard from './components/CompanyCard.jsx';
import CompanyModal from './components/CompanyModal.jsx';
import PriorityList from './components/PriorityList.jsx';
import SheetsSync from './components/SheetsSync.jsx';
import StatusBar from './components/StatusBar.jsx';
import { SkeletonCard } from './components/SkeletonCard.jsx';


const PRIORITY_KEY = 'ps1_priority_list';

function loadPriority() {
  try { return JSON.parse(localStorage.getItem(PRIORITY_KEY) || '[]'); }
  catch { return []; }
}

export default function App() {
  const {
    companies,
    domains,
    subdomainMap,
    allCities,
    meta,
    loading,
    error,
    filters,
    updateFilter,
    toggleDomain,
    toggleSubdomain,
    toggleCity,
    toggleWorkMode,
    clearFilters,
    refresh,
    loadMeta
  } = useCompanies();

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showSheets, setShowSheets] = useState(false);
  const [connected, setConnected] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cardEnrichments, setCardEnrichments] = useState({});

  // Scale filter (post-filter on top of useCompanies results)
  const [selectedScales, setSelectedScales] = useState([]);
  const toggleScale = useCallback((scale) => {
    setSelectedScales(prev =>
      prev.includes(scale) ? prev.filter(s => s !== scale) : [...prev, scale]
    );
  }, []);

  // Priority list — persisted to localStorage
  const [priorityList, setPriorityList] = useState(loadPriority);
  const [showPriorityList, setShowPriorityList] = useState(false);

  useEffect(() => {
    localStorage.setItem(PRIORITY_KEY, JSON.stringify(priorityList));
  }, [priorityList]);

  const togglePriority = useCallback((company) => {
    setPriorityList(prev =>
      prev.some(c => c.id === company.id)
        ? prev.filter(c => c.id !== company.id)
        : [...prev, company]
    );
  }, []);

  const removePriority = useCallback((id) => {
    setPriorityList(prev => prev.filter(c => c.id !== id));
  }, []);

  const reorderPriority = useCallback((newList) => {
    setPriorityList(newList);
  }, []);

  // Clear all filters including scale
  const clearAllFilters = useCallback(() => {
    clearFilters();
    setSelectedScales([]);
  }, [clearFilters]);

  // Poll health endpoint
  useEffect(() => {
    const check = () => {
      fetch('/api/health')
        .then(r => r.ok ? setConnected(true) : setConnected(false))
        .catch(() => setConnected(false));
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // Seed card enrichments instantly from localStorage cache, then background-fetch the rest
  useEffect(() => {
    if (companies.length === 0) return;

    // Pass 1: instantly populate from localStorage (no API call)
    const cache = getEnrichmentCache();
    const instant = {};
    companies.forEach(c => {
      if (cache[c.name]) instant[c.name] = cache[c.name];
    });
    if (Object.keys(instant).length > 0) {
      setCardEnrichments(prev => ({ ...prev, ...instant }));
    }

    // Pass 2: background-fetch uncached companies (all of them, throttled)
    let cancelled = false;
    const uncached = companies.filter(c => !cache[c.name]);
    (async () => {
      for (const company of uncached) {
        if (cancelled) break;
        try {
          const data = await fetchEnrichment(company.name);
          if (data.enrichment?.fetch_status === 'done' && !cancelled) {
            setCardEnrichments(prev => ({ ...prev, [company.name]: data.enrichment }));
          }
        } catch {}
        // 1s between API calls to stay within rate limits
        await new Promise(r => setTimeout(r, 1000));
      }
    })();

    return () => { cancelled = true; };
  }, [companies]);

  // Callback from modal: update card enrichment state
  const handleEnriched = useCallback((name, enrichment) => {
    setCardEnrichments(prev => ({ ...prev, [name]: enrichment }));
  }, []);

  // Apply scale post-filter
  const visibleCompanies = selectedScales.length === 0
    ? companies
    : companies.filter(c => {
        const e = cardEnrichments[c.name];
        return e?.scale_badge && selectedScales.includes(e.scale_badge);
      });

  const hasFilters = filters.domains.length > 0 || filters.subdomains.length > 0
    || filters.cities.length > 0 || selectedScales.length > 0 || filters.workModes.length > 0;

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col font-sans">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#1a1a2e', color: '#e8e8f0', border: '1px solid #1e1e32', fontSize: '13px' }
        }}
      />

      {/* Top Header */}
      <header className="border-b border-bg-border bg-bg-secondary/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-4">
            {/* Mobile sidebar toggle */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={18} /> : <SlidersHorizontal size={18} />}
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 rounded-lg bg-accent-purple/20 border border-accent-purple/30 flex items-center justify-center">
                <Building2 size={14} className="text-accent-purple" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-text-primary text-sm">PS1 Explorer</span>
              </div>
            </div>

            {/* Search bar */}
            <div className="flex-1">
              <SearchBar
                query={filters.q}
                onChange={(v) => updateFilter('q', v)}
                onSheetsClick={() => setShowSheets(true)}
                totalCount={hasFilters ? undefined : visibleCompanies.length}
              />
            </div>

            {/* Priority List button */}
            <button
              onClick={() => setShowPriorityList(true)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium
                transition-all duration-200 whitespace-nowrap
                ${priorityList.length > 0
                  ? 'bg-accent-amber/10 border-accent-amber/40 text-accent-amber hover:bg-accent-amber/20'
                  : 'btn-ghost'
                }
              `}
              title="My Priority List"
            >
              <Star size={14} className={priorityList.length > 0 ? 'fill-current' : ''} />
              <span className="hidden sm:inline">My List</span>
              {priorityList.length > 0 && (
                <span className="font-mono text-xs bg-accent-amber/20 rounded px-1">
                  {priorityList.length}
                </span>
              )}
            </button>
          </div>

          {/* Status bar */}
          <StatusBar meta={meta} connected={connected} />
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6 flex gap-6">

        {/* Sidebar — desktop */}
        <div className="hidden lg:block flex-shrink-0">
          <div className="sticky top-24">
            <FilterSidebar
              domains={domains}
              subdomainMap={subdomainMap}
              selectedDomains={filters.domains}
              selectedSubdomains={filters.subdomains}
              onToggleDomain={toggleDomain}
              onToggleSubdomain={toggleSubdomain}
              allCities={allCities}
              selectedCities={filters.cities}
              onToggleCity={toggleCity}
              selectedScales={selectedScales}
              onToggleScale={toggleScale}
              selectedWorkModes={filters.workModes}
              onToggleWorkMode={toggleWorkMode}
              onClearAll={clearAllFilters}
            />
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div
              className="absolute inset-y-0 left-0 w-64 bg-bg-secondary border-r border-bg-border p-4 overflow-y-auto animate-slide-up"
              onClick={e => e.stopPropagation()}
            >
              <FilterSidebar
                domains={domains}
                subdomainMap={subdomainMap}
                selectedDomains={filters.domains}
                selectedSubdomains={filters.subdomains}
                onToggleDomain={(d) => { toggleDomain(d); setSidebarOpen(false); }}
                onToggleSubdomain={(s) => { toggleSubdomain(s); setSidebarOpen(false); }}
                allCities={allCities}
                selectedCities={filters.cities}
                onToggleCity={(c) => { toggleCity(c); setSidebarOpen(false); }}
                selectedScales={selectedScales}
                onToggleScale={(s) => { toggleScale(s); setSidebarOpen(false); }}
                selectedWorkModes={filters.workModes}
                onToggleWorkMode={(m) => { toggleWorkMode(m); setSidebarOpen(false); }}
                onClearAll={() => { clearAllFilters(); setSidebarOpen(false); }}
              />
            </div>
          </div>
        )}

        {/* Company grid */}
        <main className="flex-1 min-w-0">
          {/* Active filter summary bar */}
          {hasFilters && !loading && (
            <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
              <span className="text-text-muted text-xs">Filtered by:</span>
              <span className="font-mono text-xs text-text-primary bg-bg-card border border-bg-border rounded px-1.5 py-0.5">{visibleCompanies.length}</span>
              {filters.domains.map(d => (
                <button key={d} onClick={() => toggleDomain(d)}
                  className="tag-chip flex items-center gap-1 text-accent-purple border-accent-purple/30 hover:border-accent-purple transition-colors">
                  {d} <X size={9} />
                </button>
              ))}
              {filters.subdomains.map(s => (
                <button key={s} onClick={() => toggleSubdomain(s)}
                  className="tag-chip flex items-center gap-1 text-accent-teal border-accent-teal/30 hover:border-accent-teal transition-colors">
                  {s} <X size={9} />
                </button>
              ))}
              {filters.cities.map(c => (
                <button key={c} onClick={() => toggleCity(c)}
                  className="tag-chip flex items-center gap-1 text-accent-teal border-accent-teal/30 hover:border-accent-teal transition-colors">
                  <span>📍</span>{c} <X size={9} />
                </button>
              ))}
              {selectedScales.map(s => (
                <button key={s} onClick={() => toggleScale(s)}
                  className="tag-chip flex items-center gap-1 text-accent-amber border-accent-amber/30 hover:border-accent-amber transition-colors">
                  {s} <X size={9} />
                </button>
              ))}
              {filters.workModes.map(m => (
                <button key={m} onClick={() => toggleWorkMode(m)}
                  className="tag-chip flex items-center gap-1 text-orange-400 border-orange-500/30 hover:border-orange-500 transition-colors">
                  {m} <X size={9} />
                </button>
              ))}
              <button onClick={clearAllFilters}
                className="text-xs text-text-muted hover:text-accent-purple transition-colors ml-1">
                Clear all
              </button>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && visibleCompanies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-bg-card border border-bg-border flex items-center justify-center text-3xl">
                📂
              </div>
              <div>
                <h3 className="text-text-primary font-semibold mb-1">No companies found</h3>
                <p className="text-sm text-text-muted max-w-xs">
                  {hasFilters || filters.q
                    ? 'No companies match your current filters.'
                    : 'No data available.'}
                </p>
              </div>
              {(hasFilters || filters.q) && (
                <button onClick={clearAllFilters} className="btn-ghost">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {loading
              ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
              : visibleCompanies.map(company => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onClick={() => setSelectedCompany(company)}
                  searchQuery={filters.q}
                  enrichment={cardEnrichments[company.name]}
                  isPriority={priorityList.some(c => c.id === company.id)}
                  onTogglePriority={togglePriority}
                />
              ))
            }
          </div>
        </main>
      </div>

      {/* Company detail modal */}
      {selectedCompany && (
        <CompanyModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onEnriched={handleEnriched}
        />
      )}

      {/* Priority list drawer */}
      {showPriorityList && (
        <PriorityList
          list={priorityList}
          onClose={() => setShowPriorityList(false)}
          onReorder={reorderPriority}
          onRemove={removePriority}
          onOpenCompany={(company) => {
            setShowPriorityList(false);
            setSelectedCompany(company);
          }}
        />
      )}

      {/* Sheets sync modal */}
      {showSheets && (
        <SheetsSync
          onClose={() => setShowSheets(false)}
          onSynced={() => { refresh(); loadMeta(); }}
        />
      )}
    </div>
  );
}
