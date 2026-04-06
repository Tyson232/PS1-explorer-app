import React, { useEffect, useState } from 'react';
import {
  X, MapPin, Globe, Calendar, Users, TrendingUp,
  Code, ExternalLink, Linkedin, Building2, Briefcase
} from 'lucide-react';
import { fetchEnrichment } from '../api/client.js';
import { SkeletonEnrichment } from './SkeletonCard.jsx';

const DOMAIN_COLORS = {
  CSIS: 'text-accent-purple border-accent-purple/40 bg-accent-purple/10',
  Electrical: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
  Mechanical: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  Chemical: 'text-green-400 border-green-500/40 bg-green-500/10',
  Finance: 'text-accent-teal border-accent-teal/40 bg-accent-teal/10',
  Consulting: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
  Biotech: 'text-pink-400 border-pink-500/40 bg-pink-500/10',
};

const SCALE_COLORS = {
  '🌱 Early Startup': 'text-green-400 border-green-500/30 bg-green-500/10',
  '🚀 Growth Stage': 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  '🏢 Mid-size': 'text-accent-amber border-accent-amber/30 bg-accent-amber/10',
  '🌐 Enterprise': 'text-accent-purple border-accent-purple/30 bg-accent-purple/10',
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

export default function CompanyModal({ company, onClose }) {
  const [enrichment, setEnrichment] = useState(null);
  const [loadingEnrich, setLoadingEnrich] = useState(true);

  useEffect(() => {
    if (!company) return;
    setLoadingEnrich(true);
    setEnrichment(null);

    fetchEnrichment(company.name)
      .then(data => setEnrichment(data.enrichment))
      .catch(() => setEnrichment(null))
      .finally(() => setLoadingEnrich(false));
  }, [company]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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
            </div>
            <h2 className="text-xl font-bold text-text-primary leading-tight">{company.name}</h2>
            {company.city && (
              <p className="text-sm text-text-muted flex items-center gap-1 mt-1">
                <MapPin size={12} />
                {company.city}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {enrichment?.linkedin_url && (
              <a
                href={enrichment.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost p-2"
                title="LinkedIn"
              >
                <Linkedin size={14} />
              </a>
            )}
            {enrichment?.website && (
              <a
                href={enrichment.website.startsWith('http') ? enrichment.website : `https://${enrichment.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost p-2"
                title="Website"
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button onClick={onClose} className="btn-ghost p-2">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Modal Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

          {/* Subdomain chips */}
          {company.subdomains?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {company.subdomains.map(sub => (
                <span key={sub} className="tag-chip">{sub}</span>
              ))}
            </div>
          )}

          {/* Project Details */}
          {company.project_details && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5 mb-2">
                <Briefcase size={12} />
                Project Details
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {company.project_details}
              </p>
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
        </div>
      </div>
    </div>
  );
}
