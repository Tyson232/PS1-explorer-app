import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { parseFile } from './parser.js';
import { setMeta } from './db.js';

let watcher = null;
let lastParsed = null;

export function startWatcher(filePath, onUpdate) {
  if (!filePath) {
    console.log('[Watcher] No watch path configured, skipping file watcher');
    return;
  }

  const absPath = path.resolve(filePath);

  if (!fs.existsSync(absPath)) {
    console.log(`[Watcher] Watch path does not exist yet: ${absPath}`);
    // Watch the directory instead, waiting for the file
    const dir = path.dirname(absPath);
    const filename = path.basename(absPath);

    fs.mkdirSync(dir, { recursive: true });

    watcher = chokidar.watch(dir, { ignoreInitial: false, persistent: true });
    watcher.on('add', (changedPath) => {
      if (path.basename(changedPath) === filename) {
        handleFileChange(changedPath, onUpdate);
      }
    });
    return;
  }

  watcher = chokidar.watch(absPath, {
    ignoreInitial: false,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 800,
      pollInterval: 100
    }
  });

  watcher.on('add', (p) => handleFileChange(p, onUpdate));
  watcher.on('change', (p) => handleFileChange(p, onUpdate));

  console.log(`[Watcher] Watching: ${absPath}`);
}

function handleFileChange(filePath, onUpdate) {
  const now = Date.now();
  if (lastParsed && now - lastParsed < 2000) return; // debounce
  lastParsed = now;

  console.log(`[Watcher] File changed: ${filePath}`);
  try {
    const count = parseFile(filePath);
    setMeta('watch_file_path', filePath);
    if (onUpdate) onUpdate(count, filePath);
  } catch (err) {
    console.error('[Watcher] Parse error:', err.message);
  }
}

export function stopWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}
