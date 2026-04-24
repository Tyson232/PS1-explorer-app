import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCompanies, fetchDomains, fetchMeta, fetchCities } from '../api/client.js';

export function useCompanies() {
  const [companies, setCompanies] = useState([]);
  const [domains, setDomains] = useState([]);
  const [subdomainMap, setSubdomainMap] = useState({});
  const [allCities, setAllCities] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ q: '', domains: [], subdomains: [], cities: [], workModes: [], branches: [], newlyAdded: null });

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
      if (currentFilters.cities.length > 0) params.cities = currentFilters.cities.join(',');
      if (currentFilters.workModes.length > 0) params.workModes = currentFilters.workModes.join(',');
      if (currentFilters.branches.length > 0) params.branches = currentFilters.branches.join(',');
      if (currentFilters.newlyAdded) params.newlyAdded = currentFilters.newlyAdded;

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

  const loadCities = useCallback(async () => {
    try {
      const data = await fetchCities();
      setAllCities(data.cities || []);
    } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    loadDomains();
    loadMeta();
    loadCities();
  }, [loadDomains, loadMeta, loadCities]);

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

  // No SSE on Vercel — noop
  useEffect(() => {
    return () => {};
  }, [filters, loadCompanies, loadDomains, loadMeta]);

  const refresh = useCallback(() => {
    loadCompanies(filters);
    loadDomains();
    loadMeta();
    loadCities();
  }, [filters, loadCompanies, loadDomains, loadMeta, loadCities]);

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

  const toggleCity = useCallback((city) => {
    setFilters(prev => ({
      ...prev,
      cities: prev.cities.includes(city)
        ? prev.cities.filter(c => c !== city)
        : [...prev.cities, city]
    }));
  }, []);

  const toggleWorkMode = useCallback((mode) => {
    setFilters(prev => ({
      ...prev,
      workModes: prev.workModes.includes(mode)
        ? prev.workModes.filter(m => m !== mode)
        : [...prev.workModes, mode]
    }));
  }, []);

  const toggleBranch = useCallback((branch) => {
    setFilters(prev => ({
      ...prev,
      branches: prev.branches.includes(branch)
        ? prev.branches.filter(b => b !== branch)
        : [...prev.branches, branch]
    }));
  }, []);

  const toggleNewlyAdded = useCallback((mode) => {
    setFilters(prev => ({ ...prev, newlyAdded: prev.newlyAdded === mode ? null : mode }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ q: '', domains: [], subdomains: [], cities: [], workModes: [], branches: [], newlyAdded: null });
  }, []);

  return {
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
    toggleNewlyAdded,
    clearFilters,
    refresh,
    loadMeta
  };
}
