import React, { useState, useEffect } from 'react';

const NEW_SITE = 'https://ps-1-explorer-app.vercel.app';
const PRIORITY_KEY = 'ps1_priority_list';

export default function MigrationPage() {
  const [list, setList] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PRIORITY_KEY) || '[]');
      setList(saved);
    } catch {
      setList([]);
    }
  }, []);

  function goToNewSite() {
    if (list.length > 0) {
      const ids = list.map(c => c.id).join(',');
      window.location.href = `${NEW_SITE}/?list=${ids}`;
    } else {
      window.location.href = NEW_SITE;
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-accent-teal/15 border border-accent-teal/30 flex items-center justify-center text-3xl">
          🚀
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-text-primary">PS1 Explorer has moved</h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            We've shifted to a new address. Everything is the same — just a new URL.
          </p>
        </div>

        {/* List status */}
        {list.length > 0 ? (
          <div className="w-full rounded-xl border border-accent-amber/30 bg-accent-amber/8 p-4 flex flex-col gap-1">
            <p className="text-sm font-semibold text-accent-amber">
              {list.length} station{list.length !== 1 ? 's' : ''} in your current list
            </p>
            <p className="text-xs text-text-secondary">
              Clicking below will carry your list over to the new site automatically.
            </p>
          </div>
        ) : (
          <div className="w-full rounded-xl border border-bg-border bg-bg-card p-4">
            <p className="text-xs text-text-muted">Your priority list is empty — nothing to carry over.</p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={goToNewSite}
          className="w-full py-3 px-6 rounded-xl bg-accent-teal text-bg-primary font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          {list.length > 0 ? `Go to new site & restore my list →` : `Go to new site →`}
        </button>

        {/* New URL hint */}
        <p className="text-xs text-text-muted">
          New site: <span className="text-text-secondary font-mono">ps-1-explorer-app.vercel.app</span>
        </p>

      </div>
    </div>
  );
}
