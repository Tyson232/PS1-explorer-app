import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react';
import { uploadFile } from '../api/client.js';
import toast from 'react-hot-toast';

export default function UploadZone({ onSuccess, onClose }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error('Only Excel (.xlsx, .xls) and CSV files supported');
      return;
    }

    setUploading(true);
    setProgress(0);
    setResult(null);

    try {
      const data = await uploadFile(file, setProgress);
      setResult({ success: true, message: data.message, count: data.count });
      toast.success(`Loaded ${data.count} companies!`);
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg-secondary border border-bg-border rounded-2xl w-full max-w-md p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-text-primary">Upload Company Data</h2>
            <p className="text-xs text-text-muted mt-0.5">Excel (.xlsx, .xls) or CSV</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <X size={14} />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200 flex flex-col items-center gap-3
            ${dragging
              ? 'border-accent-purple bg-accent-purple/10'
              : 'border-bg-border hover:border-accent-purple/50 hover:bg-bg-hover'
            }
          `}
        >
          <FileSpreadsheet
            size={36}
            className={dragging ? 'text-accent-purple' : 'text-text-muted'}
          />
          <div>
            <p className="text-sm text-text-primary font-medium">
              {dragging ? 'Drop it!' : 'Drop file here or click to browse'}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Columns needed: Company Name, Domain, City, Project Details
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {/* Progress */}
        {uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span className="flex items-center gap-1.5">
                <Upload size={12} className="animate-bounce" />
                Uploading…
              </span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-purple rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Result */}
        {result && !uploading && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            result.success
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {result.success
              ? <CheckCircle size={16} />
              : <AlertCircle size={16} />
            }
            {result.message}
          </div>
        )}

        {/* Template hint */}
        <p className="text-xs text-text-muted mt-4 text-center">
          See <code className="font-mono text-accent-purple">sample_data.xlsx</code> in the project root for a template.
        </p>
      </div>
    </div>
  );
}
