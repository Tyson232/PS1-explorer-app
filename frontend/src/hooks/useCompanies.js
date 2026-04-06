import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCompanies, fetchDomains, fetchMeta } from '../api/client.js';

export function useCompanies() {
  const [companies, setCompanies] = useState([]);
  const [domains, setDomains] = useState([]);
  const [subdomainMap, setSubdomainMap] = useState({});
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ q: '', domains: [], subdomains: [] });

  const abortRef = useRef(null);

  const loadCompanies = useCallback(async (currentFilters) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (currentFilters.q) params.q = currentFilters.q;
      if (currentFilters.domains.length > 0) params.domains = currentFilters.domains.join(',');
      if (currentFilters.subdomains.length > 0) params.subdomains = currentFilters.subdomains.join(',');

      const data = await fetchCompanies(params);
      setCompanies(data.companies || []);
    } catch (err) {
      if (err.name !== 'CanceledError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMeta = useCallback(async () => {
    try {
      const data = await fetchMeta();
      setMeta(data);
    } catch {}
  }, []);

  const loadDomains = useCallback(async () => {
    try {
      const data = await fetchDomains();
      setDomains(data.domains || []);
      setSubdomainMap(data.subdomainMap || {});
    } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    loadDomains();
    loadMeta();
  }, [loadDomains, loadMeta]);

  // Load companies when filters change (with debounce for search)
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const delay = filters.q ? 300 : 0;
    debounceRef.current = setTimeout(() => {
      loadCompanies(filters);
    }, delay);
    return () => clearTimeout(debounceRef.current);
  }, [filters, loadCompanies]);

  // SSE for live updates
  useEffect(() => {
    const evtSource = new EventSource('/api/events');
    evtSource.addEventListener('data-updated', () => {
      loadCompanies(filters);
      loadDomains();
      loadMeta();
    });
    evtSource.onerror = () => evtSource.close();
    return () => evtSource.close();
  }, [filters, loadCompanies, loadDomains, loadMeta]);

  const refresh = useCallback(() => {
    loadCompanies(filters);
    loadDomains();
    loadMeta();
  }, [filters, loadCompanies, loadDomains, loadMeta]);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleDomain = useCallback((domain) => {
    setFilters(prev => {
      const next = prev.domains.includes(domain)
        ? prev.domains.filter(d => d !== domain)
        : [...prev.domains, domain];
      return { ...prev, domains: next, subdomains: [] };
    });
  }, []);

  const toggleSubdomain = useCallback((subdomain) => {
    setFilters(prev => ({
      ...prev,
      subdomains: prev.subdomains.includes(subdomain)
        ? prev.subdomains.filter(s => s !== subdomain)
        : [...prev.subdomains, subdomain]
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ q: '', domains: [], subdomains: [] });
  }, []);

  return {
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
  };
}
