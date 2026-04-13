import React, { useState } from 'react';
import { X, Send, CheckCircle, HelpCircle } from 'lucide-react';

export default function QueryBox() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, suggestion: query, type: 'query' }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setQuery('');
      setName('');
      setTimeout(() => { setOpen(false); setStatus('idle'); }, 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-accent-teal/90 hover:bg-accent-teal text-white text-sm font-medium shadow-lg transition-all duration-200 hover:scale-105"
        title="Ask PS coordi's"
      >
        <HelpCircle size={16} />
        <span className="hidden sm:inline">Ask PS Coordi</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-bg-secondary border border-bg-border rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-bg-border">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Send your queries directly to PS coordi's</h2>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">Queries go directly to a sheet monitored by the PS coordinators — they'll address them collectively on the Imp. Info group.</p>
              </div>
              <button onClick={() => { setOpen(false); setStatus('idle'); }} className="btn-ghost p-2">
                <X size={14} />
              </button>
            </div>

            {status === 'success' ? (
              <div className="p-8 flex flex-col items-center gap-3 text-center">
                <CheckCircle size={32} className="text-green-400" />
                <p className="text-sm font-medium text-text-primary">Query sent!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-text-muted">Your name (optional)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Anonymous"
                    className="w-full bg-bg-card border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-teal/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-text-muted">Your query *</label>
                  <textarea
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="What would you like to ask?"
                    rows={4}
                    required
                    className="w-full bg-bg-card border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-teal/50 resize-none"
                  />
                </div>
                {status === 'error' && (
                  <p className="text-xs text-red-400">Something went wrong. Please try again.</p>
                )}
                <button
                  type="submit"
                  disabled={status === 'loading' || !query.trim()}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-teal/90 hover:bg-accent-teal text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={13} />
                  {status === 'loading' ? 'Sending…' : 'Send Query'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
