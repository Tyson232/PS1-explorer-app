import React, { useState, useEffect } from 'react';
import { RefreshCw, Link2, CheckCircle, AlertCircle, X, Clock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const HARDCODED_URL = 'https://docs.google.com/spreadsheets/d/1wG4aI1b4ObhUq7EZWWztuy9WSpjuQxrx/edit?gid=1410770251#gid=1410770251';

function timeAgo(iso) {
  if (!iso) return null;
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function SheetsSync({ onSynced, onClose }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [url, setUrl] = useState(HARDCODED_URL);

  useEffect(() => {
    axios.get('/api/sheets/status').then(r => {
      setStatus(r.data);
      if (r.data.url) setUrl(r.data.url);
    }).catch(() => {});
  }, []);

  async function handleConfigure() {
    setLoading(true);
    try {
      const res = await axios.post('/api/sheets/configure', { url });
      toast.success(res.data.message);
      setStatus({ configured: true, url, lastSync: new Date().toISOString() });
      onSynced?.();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    try {
      const res = await axios.post('/api/sheets/sync');
      toast.success(`Synced ${res.data.count} companies`);
      setStatus(prev => ({ ...prev, lastSync: res.data.lastSync }));
      onSynced?.();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg-secondary border border-bg-border rounded-2xl w-full max-w-lg p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-sm">
              📊
            </div>
            <div>
              <h2 className="font-bold text-text-primary">Google Sheets Sync</h2>
              <p className="text-xs text-text-muted">Auto-updates every 5 min until Apr 15</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2"><X size={14} /></button>
        </div>

        {/* Status */}
        {status?.configured && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-green-400 font-medium">Live sync active</p>
              {status.lastSync && (
                <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                  <Clock size={10} /> Last synced {timeAgo(status.lastSync)}
                </p>
              )}
            </div>
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors border border-green-500/30 rounded-md px-2 py-1"
            >
              <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        )}

        {/* URL input */}
        <div className="flex flex-col gap-2 mb-4">
          <label className="text-xs text-text-muted font-medium flex items-center gap-1">
            <Link2 size={11} /> Google Sheets URL
          </label>
          <textarea
            value={url}
            onChange={e => setUrl(e.target.value)}
            rows={3}
            className="
              w-full bg-bg-card border border-bg-border rounded-lg
              px-3 py-2 text-xs text-text-primary font-mono
              focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/30
              resize-none
            "
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </div>

        {/* Warning */}
        <div className="flex gap-2 p-3 bg-accent-amber/10 border border-accent-amber/20 rounded-lg mb-4">
          <AlertCircle size={14} className="text-accent-amber flex-shrink-0 mt-0.5" />
          <p className="text-xs text-accent-amber/90 leading-relaxed">
            The sheet must be set to <strong>"Anyone with the link → Viewer"</strong>.
            In Google Sheets: <em>Share → Change to anyone with the link</em>.
          </p>
        </div>

        {/* Action */}
        <button
          onClick={handleConfigure}
          disabled={loading || !url}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Connecting…' : status?.configured ? 'Update & Re-sync' : 'Connect & Sync Now'}
        </button>
      </div>
    </div>
  );
}
