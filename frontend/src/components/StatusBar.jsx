import React from 'react';
import { Clock, Database, Wifi, WifiOff } from 'lucide-react';

function timeAgo(isoString) {
  if (!isoString) return null;
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(isoString).toLocaleDateString();
}

export default function StatusBar({ meta, connected }) {
  const ago = meta?.lastUpdated ? timeAgo(meta.lastUpdated) : null;

  return (
    <div className="flex items-center gap-4 text-xs text-text-muted font-mono">
      {/* Connection indicator */}
      <span className={`flex items-center gap-1 ${connected ? 'text-accent-teal' : 'text-red-400'}`}>
        {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
        {connected ? 'live' : 'offline'}
      </span>

      {/* Company count */}
      {meta?.companyCount && (
        <span className="flex items-center gap-1">
          <Database size={11} />
          {meta.companyCount} stations
        </span>
      )}

      {/* Last updated */}
      {ago && (
        <span className="flex items-center gap-1">
          <Clock size={11} />
          Updated {ago}
        </span>
      )}

      {/* Deadline note */}
      <span className="ml-auto text-text-muted/60 hidden sm:inline">
        Data deadline: Apr 19
      </span>
    </div>
  );
}
