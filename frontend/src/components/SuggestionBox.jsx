import React, { useState } from 'react';
import { X, Send, CheckCircle } from 'lucide-react';

export default function SuggestionBox({ open, onClose }) {
  const [name, setName] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  function handleClose() {
    onClose();
    setStatus('idle');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!suggestion.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, suggestion }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setSuggestion('');
      setName('');
      setTimeout(() => { onClose(); setStatus('idle'); }, 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-bg-secondary border border-bg-border rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-bg-border">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Send a Suggestion</h2>
            <p className="text-xs text-text-muted mt-0.5">Your feedback helps improve this tool</p>
          </div>
          <button onClick={handleClose} className="btn-ghost p-2">
            <X size={14} />
          </button>
        </div>

        {status === 'success' ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle size={32} className="text-green-400" />
            <p className="text-sm font-medium text-text-primary">Thanks for the suggestion!</p>
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
                className="w-full bg-bg-card border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-purple/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-text-muted">Suggestion *</label>
              <textarea
                value={suggestion}
                onChange={e => setSuggestion(e.target.value)}
                placeholder="What would make this better?"
                rows={4}
                required
                className="w-full bg-bg-card border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-purple/50 resize-none"
              />
            </div>
            {status === 'error' && (
              <p className="text-xs text-red-400">Something went wrong. Please try again.</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading' || !suggestion.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-purple/90 hover:bg-accent-purple text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={13} />
              {status === 'loading' ? 'Sending…' : 'Send Suggestion'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
