import React from 'react';
import { X, ExternalLink } from 'lucide-react';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1eC0hB9FAvEzlDMQoRKoJnzuzaRKX6vIJ/edit?gid=586959354#gid=586959354';

export default function SheetsSync({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg-secondary border border-bg-border rounded-2xl w-full max-w-md p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-sm">
              📊
            </div>
            <h2 className="font-bold text-text-primary">Official PS Station Sheet</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-2"><X size={14} /></button>
        </div>

        <p className="text-sm text-text-muted mb-5 leading-relaxed">
          Link of the actual Google Sheet provided by PSMS for cross reference of data.
        </p>

        <a
          href={SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all"
        >
          <ExternalLink size={14} />
          Open Google Sheet
        </a>
      </div>
    </div>
  );
}
