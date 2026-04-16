import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { Building2, SlidersHorizontal, X, Plus, MessageSquarePlus, Info } from 'lucide-react';

import { useCompanies } from './hooks/useCompanies.js';
import { fetchEnrichment, getEnrichmentCache, getAllCompanies } from './api/client.js';
import SearchBar from './components/SearchBar.jsx';
import FilterSidebar from './components/FilterSidebar.jsx';
import CompanyCard from './components/CompanyCard.jsx';
import CompanyModal from './components/CompanyModal.jsx';
import PriorityList from './components/PriorityList.jsx';
import SuggestionBox from './components/SuggestionBox.jsx';
import QueryBox from './components/QueryBox.jsx';
import SheetsSync from './components/SheetsSync.jsx';
import StatusBar from './components/StatusBar.jsx';
import { SkeletonCard } from './components/SkeletonCard.jsx';


const PRIORITY_KEY = 'ps1_priority_list';

function AllotmentInfoModal({ onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg-secondary border border-bg-border rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-bg-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-purple/20 border border-accent-purple/30 flex items-center justify-center">
              <Info size={14} className="text-accent-purple" />
            </div>
            <h2 className="text-base font-bold text-text-primary">How does allotment work?</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-2"><X size={14} /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 flex flex-col gap-4">
          {/* Intro */}
          <p className="text-sm text-text-secondary leading-relaxed">
            Students are sorted by CGPA (highest first). The system goes one by one and tries to allot each student their highest available preference.
          </p>

          {/* Key points */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Key Points</p>
            {[
              { icon: '🏆', text: 'Higher CGPA = processed first.' },
              { icon: '🔁', text: "If your pref 1 isn't available, system tries pref 2, then 3, and so on." },
              { icon: '🏠', text: "Accommodation matters — if you don't have it and neither does the org, you likely won't get that station." },
              { icon: '⚖️', text: 'Same CGPA? Whoever ranked that station higher wins. Still tied? Branch/domain match decides.' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-3 p-3 rounded-lg bg-bg-card border border-bg-border">
                <span className="text-base flex-shrink-0">{icon}</span>
                <p className="text-sm text-text-secondary leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          {/* Example */}
          <div className="rounded-lg border border-accent-purple/25 bg-accent-purple/5 p-4">
            <p className="text-xs font-semibold text-accent-purple uppercase tracking-wider mb-2">Example</p>
            <p className="text-sm text-text-secondary leading-relaxed">
              Student A (<span className="font-semibold text-text-primary">9.2 CGPA</span>) has a station as pref 5.
              Student B (<span className="font-semibold text-text-primary">8.5 CGPA</span>) has the same station as pref 1.
              If A's first 4 preferences don't work out, A still gets this station over B —{' '}
              <span className="font-semibold text-accent-purple">CGPA always wins regardless of preference order.</span>
            </p>
          </div>

          {/* Source */}
          <p className="text-xs text-text-muted text-center pt-1">
            Taken from the official FAQs posted by PSD
          </p>
        </div>
      </div>
    </div>
  );
}

function loadPriority() {
  try { return JSON.parse(localStorage.getItem(PRIORITY_KEY) || '[]'); }
  catch { return []; }
}

function OnlineNotice({ groups, enrichments, onOpenGroup, onTogglePriority, priorityList, searchQuery }) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="rounded-xl border border-accent-teal/35 bg-accent-teal/8 p-4 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">🎉</span>
        <div>
          <p className="text-sm font-bold text-accent-teal">Finally!! Online stations are here!</p>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            {groups.length} online station{groups.length !== 1 ? 's' : ''} have been officially listed.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {groups.map(group => (
          <CompanyCard
            key={group[0].id}
            group={group}
            onClick={() => onOpenGroup(group)}
            searchQuery={searchQuery}
            enrichment={enrichments[group[0].name]}
            isPriority={priorityList.some(c => c.id === group[0].id)}
            onTogglePriority={onTogglePriority}
          />
        ))}
      </div>
    </div>
  );
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
    toggleBranch,
    clearFilters,
  } = useCompanies();

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showAllotmentInfo, setShowAllotmentInfo] = useState(false);
  const [showSheets, setShowSheets] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  // Company type filter
  const [selectedTypes, setSelectedTypes] = useState([]);
  const toggleType = useCallback((type) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  // Accommodation filter
  const [accomOnly, setAccomOnly] = useState(false);

  // Priority list — persisted to localStorage
  const [priorityList, setPriorityList] = useState(loadPriority);
  const [showPriorityList, setShowPriorityList] = useState(false);

  useEffect(() => {
    localStorage.setItem(PRIORITY_KEY, JSON.stringify(priorityList));
  }, [priorityList]);

  // On mount: if ?list= param is present, load shared list
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const listParam = params.get('list');
    if (!listParam) return;
    const ids = listParam.split(',').map(Number).filter(Boolean);
    if (ids.length === 0) return;
    const all = getAllCompanies();
    const loaded = ids.map(id => all.find(c => c.id === id)).filter(Boolean);
    if (loaded.length === 0) return;
    setPriorityList(loaded);
    setShowPriorityList(true);
    toast.success(`Loaded shared list of ${loaded.length} station${loaded.length > 1 ? 's' : ''}`);
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

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

  // Clear all filters including scale, type, accom
  const clearAllFilters = useCallback(() => {
    clearFilters();
    setSelectedScales([]);
    setSelectedTypes([]);
    setAccomOnly(false);
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
    const uncached = companies.filter(c => !cache[c.name] || cache[c.name].fetch_status === 'type_only');
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

  // Apply scale + type + accommodation post-filters
  const visibleCompanies = companies.filter(c => {
    const e = cardEnrichments[c.name];
    if (selectedScales.length > 0 && !(e?.scale_badge && selectedScales.includes(e.scale_badge))) return false;
    if (selectedTypes.length > 0 && !(e?.company_type && selectedTypes.includes(e.company_type))) return false;
    if (accomOnly && !e?.accommodation) return false;
    return true;
  });

  // Group visible companies by station name → one card per unique station
  const groupedCompanies = useMemo(() => {
    const groups = {};
    visibleCompanies.forEach(c => {
      if (!groups[c.name]) groups[c.name] = [];
      groups[c.name].push(c);
    });
    return Object.values(groups);
  }, [visibleCompanies]);

  const hasFilters = filters.domains.length > 0 || filters.subdomains.length > 0
    || filters.cities.length > 0 || selectedScales.length > 0 || filters.workModes.length > 0
    || filters.branches.length > 0 || selectedTypes.length > 0 || accomOnly;

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
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-accent-purple/20 border border-accent-purple/30 flex items-center justify-center">
                <Building2 size={15} className="text-accent-purple" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-text-primary leading-none" style={{ fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
                  <span className="font-mono text-accent-purple">PS1</span>
                  <span className="text-text-primary"> Explorer</span>
                </span>
              </div>
            </div>

            {/* Search bar */}
            <div className="flex-1">
              <SearchBar
                query={filters.q}
                onChange={(v) => updateFilter('q', v)}
                onSheetsClick={() => setShowSheets(true)}
                totalCount={hasFilters ? undefined : groupedCompanies.length}
              />
            </div>

            {/* Suggest button — icon-only on mobile */}
            <button
              onClick={() => setShowSuggestions(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border text-sm font-medium bg-accent-purple/10 border-accent-purple/30 text-accent-purple hover:bg-accent-purple/20 transition-all duration-200 whitespace-nowrap"
              title="Send a suggestion"
            >
              <MessageSquarePlus size={14} />
              <span className="hidden sm:inline">Suggest</span>
            </button>

            {/* Priority List button — icon + count on mobile */}
            <button
              onClick={() => setShowPriorityList(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border text-sm font-medium bg-accent-amber/10 border-accent-amber/30 text-accent-amber hover:bg-accent-amber/20 transition-all duration-200 whitespace-nowrap"
              title="My Priority List"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">My List</span>
              {priorityList.length > 0 && (
                <span className="font-mono text-xs bg-accent-amber/20 rounded px-1">
                  {priorityList.length}
                </span>
              )}
            </button>

            {/* Allotment info — desktop only */}
            <button
              onClick={() => setShowAllotmentInfo(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium bg-bg-card border-bg-border text-text-muted hover:text-accent-purple hover:border-accent-purple/40 hover:bg-accent-purple/5 transition-all duration-200 whitespace-nowrap"
              title="How does allotment work?"
            >
              <Info size={14} />
              <span>How allotment works?</span>
            </button>
          </div>

          {/* Status bar */}
          <StatusBar meta={meta} connected={connected} />
        </div>
      </header>

      {/* Disclaimer banner */}
      <div className="max-w-screen-xl mx-auto w-full px-4 pt-4 flex flex-col sm:flex-row gap-2">
        <div className="flex-1 rounded-xl border border-accent-purple/20 bg-accent-purple/5 px-4 py-3 text-xs text-text-secondary leading-relaxed">
          <span className="font-semibold text-text-primary">Heads up:</span> Some stations on PSMS have more projects than what's listed here — this site only shows data from the official PS1 Excel sheet. If a company shows fewer projects than expected, the remaining ones exist only on the PSMS portal and weren't included in the sheet. <span className="font-medium text-text-primary">Always cross-check on PSMS before finalising your preferences.</span>
        </div>
        {/* Allotment info — mobile only (desktop has it in header) */}
        <button
          onClick={() => setShowAllotmentInfo(true)}
          className="sm:hidden flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-bg-border bg-bg-card text-sm font-medium text-text-muted hover:text-accent-purple hover:border-accent-purple/40 transition-all"
        >
          <Info size={15} />
          How does allotment work?
        </button>
      </div>

      {/* Main layout */}
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-4 flex gap-6">

        {/* Sidebar — desktop */}
        <div className="hidden lg:block flex-shrink-0">
          <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain pr-1">
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
              selectedTypes={selectedTypes}
              onToggleType={toggleType}
              accomOnly={accomOnly}
              onToggleAccom={() => setAccomOnly(v => !v)}
              selectedWorkModes={filters.workModes}
              onToggleWorkMode={toggleWorkMode}
              selectedBranches={filters.branches}
              onToggleBranch={toggleBranch}
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
                selectedTypes={selectedTypes}
                onToggleType={(t) => { toggleType(t); setSidebarOpen(false); }}
                accomOnly={accomOnly}
                onToggleAccom={() => { setAccomOnly(v => !v); setSidebarOpen(false); }}
                selectedWorkModes={filters.workModes}
                onToggleWorkMode={(m) => { toggleWorkMode(m); setSidebarOpen(false); }}
                selectedBranches={filters.branches}
                onToggleBranch={(b) => { toggleBranch(b); setSidebarOpen(false); }}
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
              <span className="font-mono text-xs text-text-primary bg-bg-card border border-bg-border rounded px-1.5 py-0.5">{groupedCompanies.length}</span>
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
              {selectedTypes.map(t => (
                <button key={t} onClick={() => toggleType(t)}
                  className="tag-chip flex items-center gap-1 text-orange-400 border-orange-500/30 hover:border-orange-500 transition-colors">
                  {t} <X size={9} />
                </button>
              ))}
              {accomOnly && (
                <button onClick={() => setAccomOnly(false)}
                  className="tag-chip flex items-center gap-1 text-accent-teal border-accent-teal/30 hover:border-accent-teal transition-colors">
                  🏠 Accommodation <X size={9} />
                </button>
              )}
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

          {/* Online filter notice */}
          {filters.workModes.includes('Online') && <OnlineNotice
            groups={groupedCompanies}
            enrichments={cardEnrichments}
            onOpenGroup={setSelectedGroup}
            onTogglePriority={togglePriority}
            priorityList={priorityList}
            searchQuery={filters.q}
          />}

          {/* Error state */}
          {error && !loading && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && groupedCompanies.length === 0 && !(filters.workModes.length === 1 && filters.workModes[0] === 'Online') && (
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

          {/* Cards grid — hidden when Online-only filter active (OnlineNotice handles display) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 ${filters.workModes.length === 1 && filters.workModes[0] === 'Online' ? 'hidden' : ''}`}>
            {loading
              ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
              : groupedCompanies.map(group => (
                <CompanyCard
                  key={group[0].id}
                  group={group}
                  onClick={() => setSelectedGroup(group)}
                  searchQuery={filters.q}
                  enrichment={cardEnrichments[group[0].name]}
                  isPriority={priorityList.some(c => c.id === group[0].id)}
                  onTogglePriority={togglePriority}
                />
              ))
            }
          </div>
        </main>
      </div>

      {/* Company detail modal */}
      {selectedGroup && (
        <CompanyModal
          projects={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onEnriched={handleEnriched}
          isPriority={priorityList.some(c => c.id === selectedGroup[0].id)}
          onTogglePriority={togglePriority}
        />
      )}

      {/* Priority list drawer */}
      {showPriorityList && (
        <PriorityList
          list={priorityList}
          onClose={() => setShowPriorityList(false)}
          onReorder={reorderPriority}
          onRemove={removePriority}
          onClearAll={() => setPriorityList([])}
          onOpenCompany={(company) => {
            setShowPriorityList(false);
            // Find all projects for this station
            const all = getAllCompanies();
            const group = all.filter(c => c.name === company.name);
            setSelectedGroup(group.length > 0 ? group : [company]);
          }}
        />
      )}

      {/* Allotment info modal */}
      {showAllotmentInfo && <AllotmentInfoModal onClose={() => setShowAllotmentInfo(false)} />}

      {/* Sheets reference modal */}
      {showSheets && (
        <SheetsSync
          onClose={() => setShowSheets(false)}
        />
      )}

      <QueryBox />
      <SuggestionBox open={showSuggestions} onClose={() => setShowSuggestions(false)} />

      {/* Credits */}
      <div className="fixed bottom-4 left-4 z-30 text-left pointer-events-none select-none">
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(148,163,184,0.35)', fontFamily: 'Inter, sans-serif' }}>
          Made by Aarush Goyal · 2024A7PS1401G<br />
          Ammar Abdul Azeez · 2024B3A41070G
        </p>
      </div>
    </div>
  );
}
