import React, { useEffect, useState, useRef } from 'react';
import {
  X, MapPin, Globe, Calendar, Users, TrendingUp,
  Code, ExternalLink, Linkedin, Building2, Briefcase,
  GraduationCap, Mail, Wifi, Sparkles, RotateCcw, Loader2, Plus, Check
} from 'lucide-react';
import { fetchEnrichment } from '../api/client.js';
import { SkeletonEnrichment } from './SkeletonCard.jsx';

const COLOR_OPTIONS = [
  { id: 'grey',   bg: 'bg-slate-500',  label: 'Unsorted'    },
  { id: 'green',  bg: 'bg-green-400',  label: 'Top pick'    },
  { id: 'yellow', bg: 'bg-yellow-400', label: 'Maybe'       },
  { id: 'red',    bg: 'bg-red-400',    label: 'Last resort' },
];

function getStoredColor(id) {
  try { return localStorage.getItem(`color-${id}`) || 'grey'; } catch { return 'grey'; }
}
function setStoredColor(id, color) {
  try { localStorage.setItem(`color-${id}`, color); } catch {}
}

const DOMAIN_COLORS = {
  CSIS: 'text-accent-purple border-accent-purple/40 bg-accent-purple/10',
  Electrical: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
  Mechanical: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  Chemical: 'text-green-400 border-green-500/40 bg-green-500/10',
  Finance: 'text-accent-teal border-accent-teal/40 bg-accent-teal/10',
  Consulting: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
  Biotech: 'text-pink-400 border-pink-500/40 bg-pink-500/10',
  'Health Care': 'text-rose-400 border-rose-500/40 bg-rose-500/10',
};

const SCALE_COLORS = {
  '🌱 Early Startup': 'text-green-400 border-green-500/30 bg-green-500/10',
  '🚀 Growth Stage': 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  '🏢 Mid-size': 'text-accent-amber border-accent-amber/30 bg-accent-amber/10',
  '🌐 Enterprise': 'text-accent-purple border-accent-purple/30 bg-accent-purple/10',
};

const WORK_MODE_COLORS = {
  Onsite: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  Online: 'text-accent-teal border-accent-teal/30 bg-accent-teal/10',
};

function InfoChip({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-muted flex items-center gap-1">
        <Icon size={10} />
        {label}
      </span>
      <span className="text-sm text-text-primary font-medium">{value}</span>
    </div>
  );
}

const HOME_KEY = 'ps1_home_address';

function CityMapLink({ company, enrichment }) {
  const [homeAddress, setHomeAddress] = useState(() => {
    try { return localStorage.getItem(HOME_KEY) || ''; } catch { return ''; }
  });
  const [showPrompt, setShowPrompt] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (showPrompt) {
      setDraft(homeAddress);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showPrompt]);

  function saveHome(e) {
    e.preventDefault();
    const val = draft.trim();
    if (!val) return;
    setHomeAddress(val);
    try { localStorage.setItem(HOME_KEY, val); } catch {}
    setShowPrompt(false);
    // Open directions immediately after saving
    const dest = buildDest(company);
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(val)}&destination=${encodeURIComponent(dest)}`, '_blank');
  }

  function buildDest(c) {
    const cleanName = c.name
      .replace(/^PS-I\s+Entrepreneurship\s+track\s*-\s*/i, '')
      .replace(/\s*-\s*(Non\s+)?Tech\s*$/i, '')
      .trim();
    // Use original (pre-normalization) city from Excel for accurate Maps query
    // e.g. "Navi Mumbai" not "Mumbai", "New Delhi" not "Delhi"
    const rawCity = (
      c.raw_row?.['Location (Centre)'] ||
      c.raw_row?.['Centre (Location)'] ||
      c.raw_row?.['Location'] ||
      c.raw_row?.['City'] ||
      c.city
    ).trim();
    return `${cleanName} in ${rawCity}`;
  }

  if (!enrichment) {
    return (
      <p className="text-sm text-text-muted flex items-center gap-1 mt-1">
        <MapPin size={12} />{company.city}
      </p>
    );
  }

  const dest = buildDest(company);

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2 flex-wrap">
        {/* City + maps link */}
        {homeAddress ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-text-muted flex items-center gap-1">
              <MapPin size={12} />{company.city}
            </span>
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(homeAddress)}&destination=${encodeURIComponent(dest)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-accent-teal/10 text-accent-teal border border-accent-teal/30 hover:bg-accent-teal/20 transition-all"
              title={`Directions from your home to ${dest}`}
            >
              <MapPin size={11} /> Directions ↗
            </a>
          </div>
        ) : (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-text-muted flex items-center gap-1 hover:text-accent-purple transition-colors group/map"
            title={`Search ${dest} on Google Maps`}
          >
            <MapPin size={12} className="group-hover/map:text-accent-purple transition-colors" />
            {company.city}
            <span className="text-xs text-text-muted/50 group-hover/map:text-accent-purple/70 transition-colors">↗</span>
          </a>
        )}

        {/* Set/change home */}
        <button
          onClick={() => setShowPrompt(v => !v)}
          className="text-xs text-text-muted hover:text-accent-teal transition-colors"
          title={homeAddress ? 'Change home address' : 'Set home address for directions'}
        >
          {homeAddress ? '✏ Change home' : '+ Set home for directions'}
        </button>
      </div>

      {/* Inline address prompt */}
      {showPrompt && (
        <form onSubmit={saveHome} className="mt-2 flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="e.g. Connaught Place, Delhi"
            className="flex-1 bg-bg-card border border-bg-border rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal/30"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-teal/10 text-accent-teal border border-accent-teal/30 hover:bg-accent-teal/20 transition-all disabled:opacity-40"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setShowPrompt(false)}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}

export default function CompanyModal({ company, onClose, onEnriched, isPriority, onTogglePriority }) {
  const [enrichment, setEnrichment] = useState(null);
  const [loadingEnrich, setLoadingEnrich] = useState(true);

  // Priority + color state
  const [color, setColor] = useState('grey');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef(null);

  // Sync color from localStorage when company changes
  useEffect(() => {
    if (company) setColor(getStoredColor(company.id));
  }, [company]);

  // Close color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return;
    function onDown(e) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) setShowColorPicker(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showColorPicker]);

  function handleColorSelect(optId) {
    const next = optId === color ? 'grey' : optId;
    setColor(next);
    setStoredColor(company.id, next);
    setShowColorPicker(false);
  }

  // Simplify state
  const [simplified, setSimplified] = useState(null);
  const [simplifying, setSimplifying] = useState(false);
  const [simplifyError, setSimplifyError] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (!company) return;
    setLoadingEnrich(true);
    setEnrichment(null);
    setSimplified(null);
    setShowOriginal(false);
    setSimplifyError(null);

    fetchEnrichment(company.name)
      .then(data => {
        setEnrichment(data.enrichment);
        if (data.enrichment?.fetch_status === 'done') {
          onEnriched?.(company.name, data.enrichment);
        }
      })
      .catch(() => setEnrichment(null))
      .finally(() => setLoadingEnrich(false));
  }, [company]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSimplify() {
    if (!company.project_details) return;
    setSimplifying(true);
    setSimplifyError(null);
    try {
      const res = await fetch('/api/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: company.project_details }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed');
      setSimplified(data.simplified);
      setShowOriginal(false);
    } catch {
      setSimplifyError("Couldn't simplify right now, try again!");
    } finally {
      setSimplifying(false);
    }
  }

  if (!company) return null;

  const domainStyle = DOMAIN_COLORS[company.normalized_domain] || 'text-text-secondary border-bg-border bg-bg-hover';
  const scaleStyle = enrichment?.scale_badge
    ? SCALE_COLORS[enrichment.scale_badge] || ''
    : '';

  // Raw extra columns from the spreadsheet
  const rawRow = company.raw_row || {};
  const extraCols = Object.entries(rawRow).filter(([k]) =>
    !['company name', 'company', 'name', 'domain', 'city', 'project details', 'project', 'description'].includes(k.toLowerCase())
  );

  // PS data fields
  const minCG = company.min_cg != null ? String(company.min_cg) : 'Pata Chalega';
  const workMode = company.work_mode || null;
  const contactEmails = company.contact_emails || [];

  const displayedProjectDetails = simplified && !showOriginal ? simplified : company.project_details;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="
          bg-bg-secondary border border-bg-border rounded-2xl
          w-full max-w-2xl max-h-[90vh] flex flex-col
          animate-slide-up shadow-2xl
        "
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-bg-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`badge ${domainStyle}`}>{company.normalized_domain}</span>
              {enrichment?.scale_badge && (
                <span className={`badge ${scaleStyle}`}>{enrichment.scale_badge}</span>
              )}
              {workMode && (
                <span className={`badge ${WORK_MODE_COLORS[workMode] || 'text-text-secondary border-bg-border bg-bg-hover'}`}>
                  {workMode === 'Onsite' ? '🏢' : '💻'} {workMode}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-text-primary leading-tight">{company.name}</h2>
            {company.city && (
              <CityMapLink company={company} enrichment={enrichment} />
            )}
          </div>

          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {enrichment?.linkedin_url && (
              <a href={enrichment.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2" title="LinkedIn">
                <Linkedin size={14} />
              </a>
            )}
            {enrichment?.website && (
              <a href={enrichment.website.startsWith('http') ? enrichment.website : `https://${enrichment.website}`} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2" title="Website">
                <ExternalLink size={14} />
              </a>
            )}

            {/* Add to list + color picker */}
            <div className="flex items-center gap-1">
              {/* Color dot — only visible when in list */}
              {isPriority && (
                <div ref={colorPickerRef} className="relative">
                  <button
                    onClick={() => setShowColorPicker(v => !v)}
                    className={`w-4 h-4 rounded-full ring-1 ring-white/20 hover:scale-110 transition-transform ${COLOR_OPTIONS.find(c => c.id === color)?.bg || 'bg-slate-500'}`}
                    title="Set color label"
                  />
                  {showColorPicker && (
                    <div className="absolute top-6 right-0 flex gap-1.5 p-1.5 rounded-lg bg-bg-secondary border border-bg-border shadow-xl z-10">
                      {COLOR_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => handleColorSelect(opt.id)}
                          title={opt.label}
                          className={`w-4 h-4 rounded-full ${opt.bg} hover:scale-110 transition-transform ${color === opt.id ? 'ring-2 ring-white/70 scale-110' : 'ring-1 ring-white/20'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Add / Remove button */}
              <button
                onClick={() => onTogglePriority?.(company)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isPriority
                    ? 'bg-accent-amber/15 text-accent-amber border-accent-amber/30 hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/30'
                    : 'bg-accent-amber/10 text-accent-amber border-accent-amber/30 hover:bg-accent-amber/20'
                }`}
                title={isPriority ? 'Remove from My List' : 'Add to My List'}
              >
                {isPriority ? <Check size={11} /> : <Plus size={11} />}
                {isPriority ? 'In List' : 'Add to List'}
              </button>
            </div>

            <button onClick={onClose} className="btn-ghost p-2">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Modal Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

          {/* PS Data row: Min CG + Work Mode */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-bg-card border border-bg-border">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-text-muted flex items-center gap-1">
                <GraduationCap size={10} /> Min CG
              </span>
              <span className={`text-sm font-semibold ${company.min_cg != null ? 'text-accent-amber' : 'text-text-muted italic'}`}>
                {minCG}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Wifi size={10} /> Work Mode
              </span>
              {workMode ? (
                <span className={`text-sm font-semibold ${workMode === 'Onsite' ? 'text-orange-400' : workMode === 'Online' ? 'text-accent-teal' : 'text-accent-purple'}`}>
                  {workMode === 'Onsite' ? '🏢' : '💻'} {workMode}
                </span>
              ) : (
                <span className="text-sm text-text-muted italic">Not Available</span>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Mail size={10} /> Past Intern Contacts
              </span>
              {contactEmails.length > 0 ? (
                <span className="text-xs text-accent-teal font-medium">{contactEmails.length} available</span>
              ) : (
                <span className="text-sm text-text-muted italic">Not Available</span>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="-mt-4 px-1 py-2 rounded-lg bg-accent-amber/10 border border-accent-amber/30">
            <p className="text-xs text-accent-amber font-semibold">⚠ NOT OFFICIAL</p>
            <p className="text-xs text-accent-amber/80 mt-0.5 leading-relaxed">
              Min CG, Work Mode, and contact emails are based on <span className="font-semibold">last year's student responses</span> — for reference only. Official data will be updated when available.
            </p>
          </div>

          {/* Subdomain chips */}
          {company.subdomains?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {company.subdomains.map(sub => (
                <span key={sub} className="tag-chip">{sub}</span>
              ))}
            </div>
          )}

          {/* Branch codes + Accommodation */}
          {(company.branch_codes?.length > 0 || enrichment?.accommodation) && (
            <div className="flex flex-wrap gap-2 items-center">
              {company.branch_codes?.length > 0 && (
                <>
                  <span className="text-xs text-text-muted">Branches:</span>
                  {company.branch_codes.map(code => (
                    <span key={code} className="font-mono text-xs text-accent-purple/80 border border-accent-purple/20 rounded px-1.5 py-0.5 bg-accent-purple/5">
                      {code}
                    </span>
                  ))}
                </>
              )}
              {enrichment?.accommodation && (
                <span className="badge text-xs text-accent-teal border-accent-teal/30 bg-accent-teal/10">
                  🏠 Accommodation provided
                </span>
              )}
            </div>
          )}

          {/* Project Details */}
          {company.project_details && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Briefcase size={12} />
                  Project Details
                </h3>
                <div className="flex items-center gap-2">
                  {simplified && (
                    <button
                      onClick={() => setShowOriginal(v => !v)}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
                    >
                      <RotateCcw size={11} />
                      {showOriginal ? 'Show Simplified' : 'Show Original'}
                    </button>
                  )}
                  {!simplified && (
                    <button
                      onClick={handleSimplify}
                      disabled={simplifying}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-accent-purple/10 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/20 transition-all disabled:opacity-50"
                    >
                      {simplifying
                        ? <><Loader2 size={11} className="animate-spin" /> Simplifying…</>
                        : <><Sparkles size={11} /> Simplify</>
                      }
                    </button>
                  )}
                </div>
              </div>

              {simplifyError && (
                <p className="text-xs text-red-400 mb-2">{simplifyError}</p>
              )}

              <div className="relative">
                {simplified && !showOriginal && (
                  <div className="absolute -top-0.5 -left-0.5 right-0 h-0.5 rounded bg-gradient-to-r from-accent-purple/60 to-transparent" />
                )}
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {displayedProjectDetails}
                </p>
                {simplified && !showOriginal && (
                  <p className="text-xs text-accent-purple/60 mt-1.5 flex items-center gap-1">
                    <Sparkles size={9} /> AI simplified · <button onClick={() => setShowOriginal(true)} className="underline hover:text-accent-purple">show original</button>
                  </p>
                )}
              </div>

              {/* Show simplify button again after simplified (in case they want to re-simplify) */}
              {simplified && showOriginal && (
                <button
                  onClick={handleSimplify}
                  disabled={simplifying}
                  className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-accent-purple/10 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/20 transition-all disabled:opacity-50"
                >
                  {simplifying
                    ? <><Loader2 size={11} className="animate-spin" /> Simplifying…</>
                    : <><Sparkles size={11} /> Re-simplify</>
                  }
                </button>
              )}
            </section>
          )}

          {/* Enriched Company Info */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5 mb-3">
              <Building2 size={12} />
              Company Info
              {loadingEnrich && (
                <span className="text-xs text-accent-purple font-mono animate-pulse">fetching…</span>
              )}
            </h3>

            {loadingEnrich ? (
              <SkeletonEnrichment />
            ) : enrichment ? (
              <div className="flex flex-col gap-4">
                {/* Description */}
                {enrichment.description && (
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {enrichment.description}
                  </p>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <InfoChip icon={Calendar} label="Founded" value={enrichment.founding_year} />
                  <InfoChip icon={MapPin} label="HQ" value={enrichment.hq} />
                  <InfoChip icon={Users} label="Employees" value={enrichment.employee_count} />
                  <InfoChip icon={TrendingUp} label="Funding" value={enrichment.funding_stage} />
                </div>

                {/* Investors */}
                {enrichment.investors?.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-1.5">Backed by</p>
                    <div className="flex flex-wrap gap-1.5">
                      {enrichment.investors.map(inv => (
                        <span key={inv} className="tag-chip text-accent-teal border-accent-teal/20">
                          {inv}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tech Stack */}
                {enrichment.tech_stack?.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted flex items-center gap-1 mb-1.5">
                      <Code size={10} /> Tech Stack
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {enrichment.tech_stack.map(t => (
                        <span key={t} className="font-mono text-xs text-accent-teal border border-accent-teal/30 rounded px-2 py-0.5 bg-accent-teal/5">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Culture snippet */}
                {enrichment.culture_snippet && (
                  <div className="bg-bg-card border border-bg-border rounded-lg p-3">
                    <p className="text-xs text-text-muted mb-1">Culture</p>
                    <p className="text-sm text-text-secondary italic">"{enrichment.culture_snippet}"</p>
                  </div>
                )}

                {/* Website */}
                {enrichment.website && (
                  <a
                    href={enrichment.website.startsWith('http') ? enrichment.website : `https://${enrichment.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-accent-purple hover:underline"
                  >
                    <Globe size={12} />
                    {enrichment.website}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted italic">
                Could not fetch company information.
              </p>
            )}
          </section>

          {/* Extra columns from spreadsheet */}
          {extraCols.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Additional Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {extraCols.map(([k, v]) => (
                  v ? (
                    <div key={k} className="flex flex-col gap-0.5">
                      <span className="text-xs text-text-muted capitalize">{k}</span>
                      <span className="text-sm text-text-secondary">{v}</span>
                    </div>
                  ) : null
                ))}
              </div>
            </section>
          )}

          {/* Contact emails — at the end */}
          {contactEmails.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5 mb-2">
                <Mail size={12} /> Past Intern Contacts
              </h3>
              <div className="flex flex-col gap-1">
                {contactEmails.map(email => (
                  <a
                    key={email}
                    href={`mailto:${email}`}
                    className="text-xs text-accent-teal hover:underline font-mono"
                  >
                    {email}
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
