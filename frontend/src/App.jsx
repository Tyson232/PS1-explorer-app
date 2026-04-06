import React, { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { Building2, SlidersHorizontal, X } from 'lucide-react';

import { useCompanies } from './hooks/useCompanies.js';
import { refreshData } from './api/client.js';
import SearchBar from './components/SearchBar.jsx';
import FilterSidebar from './components/FilterSidebar.jsx';
import CompanyCard from './components/CompanyCard.jsx';
import CompanyModal from './components/CompanyModal.jsx';
import UploadZone from './components/UploadZone.jsx';
import SheetsSync from './components/SheetsSync.jsx';
import StatusBar from './components/StatusBar.jsx';
import { SkeletonCard } from './components/SkeletonCard.jsx';

// Cache enrichments in memory so cards show badges without re-fetching
const enrichmentCache = {};

export default function App() {
  const {
    companies,
    domains,
    subdomainMap,
    meta,
    loading,
    error,
    filters,
    updateFilter,
    toggleDomain,
    toggleSubdomain,
    clearFilters,
    refresh,
    loadMeta
  } = useCompanies();

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showSheets, setShowSheets] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cardEnrichments, setCardEnrichments] = useState({});

  // SSE connection status
  useEffect(() => {
    const evtSource = new EventSource('/api/events');
    evtSource.onopen = () => setConnected(true);
    evtSource.onerror = () => setConnected(false);
    evtSource.addEventListener('data-updated', () => {
      toast.success('Company data refreshed!', { icon: '🔄' });
      refresh();
    });
    return () => evtSource.close();
  }, [refresh]);

  // Pre-fetch enrichments for visible cards (lazy, queue-based)
  useEffect(() => {
    let cancelled = false;
    const fetchBatch = async () => {
      for (const company of companies.slice(0, 20)) {
        if (cancelled) break;
        if (enrichmentCache[company.name]) {
          setCardEnrichments(prev => ({ ...prev, [company.name]: enrichmentCache[company.name] }));
          continue;
        }
        try {
          const res = await fetch(`/api/companies/${encodeURIComponent(company.name)}/enrich`);
          if (!res.ok) continue;
          const data = await res.json();
          if (data.enrichment) {
            enrichmentCache[company.name] = data.enrichment;
            if (!cancelled) {
              setCardEnrichments(prev => ({ ...prev, [company.name]: data.enrichment }));
            }
          }
          await new Promise(r => setTimeout(r, 400)); // throttle
        } catch {}
      }
    };
    if (companies.length > 0) fetchBatch();
    return () => { cancelled = true; };
  }, [companies]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await refreshData();
      toast.success(data.message || 'Data refreshed!');
      refresh();
      loadMeta();
    } catch (err) {
      const msg = err.response?.data?.error || 'No file to refresh. Please upload first.';
      toast.error(msg);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, loadMeta]);

  const hasFilters = filters.domains.length > 0 || filters.subdomains.length > 0;

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
          {/* Brand + Search row */}
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
                onRefresh={handleRefresh}
                onUploadClick={() => setShowUpload(true)}
                onSheetsClick={() => setShowSheets(true)}
                refreshing={refreshing}
                totalCount={companies.length}
              />
            </div>
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
              onClear={clearFilters}
            />
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="absolute inset-y-0 left-0 w-64 bg-bg-secondary border-r border-bg-border p-4 overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
              <FilterSidebar
                domains={domains}
                subdomainMap={subdomainMap}
                selectedDomains={filters.domains}
                selectedSubdomains={filters.subdomains}
                onToggleDomain={(d) => { toggleDomain(d); setSidebarOpen(false); }}
                onToggleSubdomain={(s) => { toggleSubdomain(s); setSidebarOpen(false); }}
                onClear={clearFilters}
              />
            </div>
          </div>
        )}

        {/* Company grid */}
        <main className="flex-1 min-w-0">
          {/* Active filter banner */}
          {hasFilters && !loading && (
            <div className="flex items-center gap-2 mb-4 text-sm text-text-secondary">
              <span>Filtered by:</span>
              {filters.domains.map(d => (
                <span key={d} className="tag-chip text-accent-purple border-accent-purple/30">
                  {d}
                </span>
              ))}
              {filters.subdomains.map(s => (
                <span key={s} className="tag-chip text-accent-teal border-accent-teal/30">
                  {s}
                </span>
              ))}
              <button
                onClick={clearFilters}
                className="text-xs text-text-muted hover:text-accent-purple transition-colors ml-1"
              >
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
          {!loading && !error && companies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-bg-card border border-bg-border flex items-center justify-center text-3xl">
                📂
              </div>
              <div>
                <h3 className="text-text-primary font-semibold mb-1">No companies yet</h3>
                <p className="text-sm text-text-muted max-w-xs">
                  {filters.q || hasFilters
                    ? 'No companies match your search. Try adjusting your filters.'
                    : 'Upload an Excel or CSV file to get started. See the README for the expected format.'}
                </p>
              </div>
              {!filters.q && !hasFilters && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="btn-primary flex items-center gap-2 mt-2"
                >
                  Upload Data
                </button>
              )}
              {(filters.q || hasFilters) && (
                <button onClick={clearFilters} className="btn-ghost">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {loading
              ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
              : companies.map(company => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onClick={() => setSelectedCompany(company)}
                  searchQuery={filters.q}
                  enrichment={cardEnrichments[company.name]}
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
        />
      )}

      {/* Sheets sync modal */}
      {showSheets && (
        <SheetsSync
          onClose={() => setShowSheets(false)}
          onSynced={() => { refresh(); loadMeta(); }}
        />
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadZone
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            refresh();
            loadMeta();
          }}
        />
      )}
    </div>
  );
}
