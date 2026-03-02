import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, RotateCcw, Copy, Check, Loader2, Terminal, FilePlus, Trash2,
  ChevronRight, Save, Cloud, CloudOff, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlayFile { id: string; name: string; code: string; sortOrder: number; }
type Language = 'python' | 'html' | 'css' | 'sql' | 'javascript' | 'text';

// ─── File type helpers ────────────────────────────────────────────────────────
const extToLang = (name: string): Language => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['py'].includes(ext)) return 'python';
  if (['html', 'htm'].includes(ext)) return 'html';
  if (['css'].includes(ext)) return 'css';
  if (['sql'].includes(ext)) return 'sql';
  if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) return 'javascript';
  return 'text';
};

const langMeta: Record<Language, { label: string; color: string; dot: string; }> = {
  python:     { label: 'Python',     color: '#3b82f6', dot: '🐍' },
  html:       { label: 'HTML',       color: '#f97316', dot: '🌐' },
  css:        { label: 'CSS',        color: '#a855f7', dot: '🎨' },
  sql:        { label: 'SQL',        color: '#22c55e', dot: '🗄️' },
  javascript: { label: 'JavaScript', color: '#eab308', dot: '⚡' },
  text:       { label: 'Text',       color: '#6b7280', dot: '📄' },
};

// Badge colors for file icons
const fileBadge = (name: string) => {
  const lang = extToLang(name);
  return langMeta[lang].color;
};

// ─── Default starter files ────────────────────────────────────────────────────
const DEFAULT_FILES: Omit<PlayFile, 'id'>[] = [
  { name: 'main.py', sortOrder: 0, code: `# Python Playground - A/L ICT
name = "ICT Student"
marks = [85, 90, 78, 92, 88]

print(f"Hello, {name}!")
avg = sum(marks) / len(marks)
print(f"Average marks: {avg:.2f}")

subjects = ["ICT", "Maths", "Science"]
print("\\nSubjects:")
for i, subject in enumerate(subjects, 1):
    print(f"  {i}. {subject}")

def is_pass(score):
    return "Pass" if score >= 50 else "Fail"

print("\\nResults:")
for m in marks:
    print(f"  {m} -> {is_pass(m)}")
` },
  { name: 'loops.py', sortOrder: 1, code: `# Loops - A/L ICT
print("For loop:")
for i in range(1, 6):
    print(f"  i = {i}")

print("\\nWhile loop:")
count = 0
while count < 5:
    print(f"  count = {count}")
    count += 1

fruits = ["Apple", "Mango", "Banana"]
print("\\nFruits:")
for fruit in fruits:
    print(f"  - {fruit}")
` },
  { name: 'index.html', sortOrder: 2, code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ICT Page</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f0f4ff; padding: 20px; }
    h1 { color: #3b82f6; }
    .card { background: white; border-radius: 12px; padding: 24px; max-width: 400px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .badge { display: inline-block; background: #3b82f6; color: white;
             padding: 4px 12px; border-radius: 20px; font-size: 13px; margin: 2px; }
    button { margin-top: 16px; padding: 10px 20px; background: #3b82f6;
             color: white; border: none; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎓 Hello, ICT!</h1>
    <p>Edit this HTML and click <strong>Preview</strong></p>
    <span class="badge">HTML</span>
    <span class="badge">CSS</span>
    <button onclick="this.textContent='Clicked! 🎉'">Click Me</button>
  </div>
</body>
</html>` },
  { name: 'styles.css', sortOrder: 3, code: `/* CSS Reference - A/L ICT */

/* Box Model */
.box {
  width: 200px;
  padding: 16px;
  margin: 8px;
  border: 2px solid #3b82f6;
  border-radius: 8px;
}

/* Flexbox */
.flex-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

/* Colors & Typography */
body {
  font-family: Arial, sans-serif;
  color: #333;
  background: #f9f9f9;
}

h1 { color: #3b82f6; font-size: 28px; }
p  { color: #666; line-height: 1.6; }` },
  { name: 'query.sql', sortOrder: 4, code: `-- MySQL / SQL Reference - A/L ICT

CREATE TABLE students (
  id   INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  grade INT,
  marks INT
);

INSERT INTO students (name, grade, marks) VALUES
  ('Kamal Perera',     12, 85),
  ('Nimal Silva',      12, 92),
  ('Dilani Rathnayake',13, 96),
  ('Sunil Bandara',    13, 78);

-- Select all
SELECT * FROM students;

-- Filter
SELECT name, marks FROM students
WHERE marks > 85
ORDER BY marks DESC;

-- Aggregate
SELECT grade, COUNT(*) AS total, AVG(marks) AS avg_marks
FROM students
GROUP BY grade;` },
];

// ─── Skulpt Python runner ─────────────────────────────────────────────────────
declare global { interface Window { Sk: any; } }

const loadSkulpt = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.Sk) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://skulpt.org/js/skulpt.min.js';
    s.onload = () => {
      const lib = document.createElement('script');
      lib.src = 'https://skulpt.org/js/skulpt-stdlib.js';
      lib.onload = () => resolve();
      lib.onerror = reject;
      document.head.appendChild(lib);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });

// ─── Size helpers ─────────────────────────────────────────────────────────────
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const totalBytes = (files: PlayFile[]) =>
  files.reduce((acc, f) => acc + new Blob([f.code]).size, 0);
const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(2)} MB`;

// ─── Session storage key ──────────────────────────────────────────────────────
const SESSION_KEY = 'ict_playground_files';

const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ─── Component ────────────────────────────────────────────────────────────────
const Playground = () => {
  const [files, setFiles] = useState<PlayFile[]>([]);
  const [activeId, setActiveId] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [addingFile, setAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFile = files.find(f => f.id === activeId) ?? files[0];
  const usedBytes = totalBytes(files);
  const usedPct = Math.min(100, (usedBytes / MAX_BYTES) * 100);
  const lang = activeFile ? extToLang(activeFile.name) : 'text';

  // ── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load files ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingFiles(true);
      if (userId) {
        // Load from DB
        const { data, error } = await supabase
          .from('playground_files')
          .select('*')
          .eq('user_id', userId)
          .order('sort_order');
        if (!error && data && data.length > 0) {
          const mapped: PlayFile[] = data.map(r => ({
            id: r.id, name: r.name, code: r.code, sortOrder: r.sort_order,
          }));
          setFiles(mapped);
          setActiveId(mapped[0].id);
          setLoadingFiles(false);
          return;
        }
      } else {
        // Load from sessionStorage for guests
        try {
          const raw = sessionStorage.getItem(SESSION_KEY);
          if (raw) {
            const parsed: PlayFile[] = JSON.parse(raw);
            if (parsed.length > 0) {
              setFiles(parsed);
              setActiveId(parsed[0].id);
              setLoadingFiles(false);
              return;
            }
          }
        } catch { /* ignore */ }
      }
      // Default starter files
      const defaults: PlayFile[] = DEFAULT_FILES.map((f, i) => ({
        ...f, id: makeId() + i, sortOrder: i,
      }));
      setFiles(defaults);
      setActiveId(defaults[0].id);
      setLoadingFiles(false);
    };
    load();
  }, [userId]);

  // ── Auto-save for guests (sessionStorage) ─────────────────────────────────
  useEffect(() => {
    if (!userId && files.length > 0) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(files));
    }
  }, [files, userId]);

  // ── Scroll output ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  // ── Save to DB (debounced) ─────────────────────────────────────────────────
  const saveToDb = useCallback(async (filesToSave: PlayFile[]) => {
    if (!userId) return;
    setSaving(true);
    try {
      // Upsert all files
      const upsertData = filesToSave.map(f => ({
        id: f.id,
        user_id: userId,
        name: f.name,
        code: f.code,
        sort_order: f.sortOrder,
      }));
      const { error } = await supabase.from('playground_files').upsert(upsertData, { onConflict: 'id' });
      if (error) throw error;
    } catch (e: any) {
      toast.error('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }, [userId]);

  const scheduleSave = (newFiles: PlayFile[]) => {
    if (!userId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveToDb(newFiles), 1500);
  };

  const updateFiles = (newFiles: PlayFile[]) => {
    setFiles(newFiles);
    scheduleSave(newFiles);
  };

  // ── File CRUD ──────────────────────────────────────────────────────────────
  const addFile = async () => {
    const raw = newFileName.trim();
    if (!raw) { setAddingFile(false); return; }
    // ensure extension
    const name = raw.includes('.') ? raw : `${raw}.py`;
    if (files.find(f => f.name === name)) { toast.error('File already exists'); return; }
    const newFile: PlayFile = { id: makeId(), name, code: `# ${name}\n\n`, sortOrder: files.length };
    const updated = [...files, newFile];

    if (userId) {
      // Insert to DB first
      const { error } = await supabase.from('playground_files').insert({
        id: newFile.id, user_id: userId, name: newFile.name,
        code: newFile.code, sort_order: newFile.sortOrder,
      });
      if (error) { toast.error('Could not create file'); return; }
    }
    setFiles(updated);
    setActiveId(newFile.id);
    setNewFileName(''); setAddingFile(false);
    setOutput(''); setHasRun(false); setShowPreview(false);
  };

  const deleteFile = async (id: string) => {
    if (files.length === 1) { toast.error("Can't delete the last file"); return; }
    const next = files.find(f => f.id !== id);
    if (userId) {
      await supabase.from('playground_files').delete().eq('id', id);
    }
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    if (activeId === id && next) { setActiveId(next.id); setOutput(''); setHasRun(false); setShowPreview(false); }
  };

  const renameFile = async (id: string) => {
    const raw = renameVal.trim();
    if (!raw) { setRenamingId(null); return; }
    const name = raw.includes('.') ? raw : `${raw}.py`;
    const updated = files.map(f => f.id === id ? { ...f, name } : f);
    if (userId) {
      await supabase.from('playground_files').update({ name }).eq('id', id);
    }
    setFiles(updated);
    setRenamingId(null);
    setOutput(''); setHasRun(false); setShowPreview(false);
  };

  const updateCode = (val: string) => {
    const newSize = new Blob([val]).size;
    const otherSize = files.filter(f => f.id !== activeId).reduce((a, f) => a + new Blob([f.code]).size, 0);
    if (otherSize + newSize > MAX_BYTES) {
      toast.error('Storage limit reached (10 MB max)');
      return;
    }
    const updated = files.map(f => f.id === activeId ? { ...f, code: val } : f);
    updateFiles(updated);
  };

  // ── Run ────────────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!activeFile) return;
    setHasRun(true);
    setShowPreview(false);
    const code = activeFile.code;

    if (lang === 'html') {
      setHtmlPreview(code); setShowPreview(true); setOutput(''); return;
    }
    if (lang === 'css') {
      setOutput(`/* CSS Preview */\n/* Paste this into an HTML file's <style> tag */\n\n${code.slice(0, 300)}...`);
      return;
    }
    if (lang === 'sql') {
      setOutput('-- SQL Reference Mode\n-- Run SQL live at:\n--   https://www.db-fiddle.com/\n--   https://sqliteonline.com/\n--   https://onecompiler.com/mysql\n\n-- Your SQL is ready to copy above ↑');
      return;
    }
    if (lang === 'javascript') {
      // Run JS via Function constructor
      setRunning(true);
      const lines: string[] = [];
      try {
        const origLog = console.log;
        console.log = (...args: any[]) => lines.push(args.map(String).join(' ') + '\n');
        // eslint-disable-next-line no-new-func
        new Function(code)();
        console.log = origLog;
      } catch (e: any) {
        lines.push(`Error: ${e.message}\n`);
      }
      setOutput(lines.join('') || '(no output)');
      setRunning(false);
      return;
    }
    if (lang === 'python') {
      setRunning(true); setOutput('');
      const collected: string[] = [];
      try {
        await loadSkulpt();
        await new Promise<void>((resolve, reject) => {
          window.Sk.configure({
            output: (t: string) => collected.push(t),
            read: (x: string) => {
              if (!window.Sk.builtinFiles?.files[x]) throw new Error(`File not found: '${x}'`);
              return window.Sk.builtinFiles.files[x];
            },
            __future__: window.Sk.python3,
          });
          window.Sk.misceval.asyncToPromise(() =>
            window.Sk.importMainWithBody('<stdin>', false, code, true)
          ).then(resolve).catch((e: any) => reject(new Error(e.toString())));
        });
      } catch (err: any) {
        collected.push(`\nError: ${err.message}`);
      } finally {
        setOutput(collected.join('') || '(no output)');
        setRunning(false);
      }
      return;
    }
    setOutput(code);
  };

  const handleReset = () => {
    setOutput(''); setShowPreview(false); setHtmlPreview(''); setHasRun(false);
  };

  const handleCopy = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.code);
    setCopied(true); toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const manualSave = async () => {
    if (!userId) { toast.error('Login to save your workspace'); return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await saveToDb(files);
    toast.success('Workspace saved!');
  };

  // ── Run button label ───────────────────────────────────────────────────────
  const runLabel = lang === 'html' ? 'Preview' : lang === 'sql' ? 'Reference' : 'Run';

  if (loadingFiles) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f1117' }}>
      {/* ── Header ── */}
      <header className="border-b px-4 py-3 flex items-center justify-between"
        style={{ borderColor: '#1e2433', background: '#0d1117' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">ICT Playground</h1>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>A/L ICT Code Practice</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Storage meter */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: '#6b7280' }}>
                {fmtBytes(usedBytes)} / 10 MB
              </span>
              {usedPct > 80 && <AlertCircle className="w-3 h-3 text-yellow-400" />}
            </div>
            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2433' }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${usedPct}%`,
                  background: usedPct > 80 ? '#ef4444' : usedPct > 60 ? '#eab308' : '#22c55e',
                }} />
            </div>
          </div>

          {/* Save indicator */}
          {userId ? (
            <button onClick={manualSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: '#161b27', border: '1px solid #1e2433', color: '#8b949e' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: '#161b27', border: '1px solid #1e2433', color: '#6b7280' }}>
              <CloudOff className="w-3.5 h-3.5" />
              <span>Session only</span>
            </div>
          )}
          {userId && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#22c55e' }}>
              <Cloud className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Auto-saved</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex gap-0" style={{ minHeight: 0 }}>
        {/* ── File Explorer ── */}
        <div className="w-48 flex-shrink-0 flex flex-col" style={{ background: '#0d1117', borderRight: '1px solid #1e2433' }}>
          <div className="flex items-center justify-between px-3 py-2.5" style={{ background: '#161b27', borderBottom: '1px solid #1e2433' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Explorer</span>
            <button onClick={() => setAddingFile(true)}
              className="p-1 rounded hover:bg-white/10 transition-colors" title="New file">
              <FilePlus className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Guest notice */}
          {!userId && (
            <div className="mx-2 mt-2 px-2 py-1.5 rounded text-xs" style={{ background: '#1c1a10', border: '1px solid #3d3010', color: '#d97706' }}>
              ⚠️ Files lost on close. Login to save.
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-1">
            {files.map(file => {
              const color = fileBadge(file.name);
              const isActive = file.id === activeId;
              return (
                <div key={file.id} className="group relative">
                  {renamingId === file.id ? (
                    <input autoFocus value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onBlur={() => renameFile(file.id)}
                      onKeyDown={e => { if (e.key === 'Enter') renameFile(file.id); if (e.key === 'Escape') setRenamingId(null); }}
                      className="w-full px-3 py-1.5 text-xs font-mono outline-none"
                      style={{ background: '#1c2333', color: '#e6edf3', border: 'none' }}
                    />
                  ) : (
                    <button
                      onClick={() => { setActiveId(file.id); setOutput(''); setHasRun(false); setShowPreview(false); }}
                      onDoubleClick={() => { setRenamingId(file.id); setRenameVal(file.name.includes('.') ? file.name.slice(0, file.name.lastIndexOf('.')) : file.name); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors"
                      style={{
                        background: isActive ? '#1c2333' : 'transparent',
                        color: isActive ? '#e6edf3' : '#8b949e',
                        borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
                      }}>
                      {/* File type dot */}
                      <span className="flex-shrink-0 w-4 h-4 rounded text-center leading-4 text-xs font-bold"
                        style={{ background: color + '22', color, fontSize: 9 }}>
                        {file.name.split('.').pop()?.toUpperCase()?.slice(0, 2) ?? '??'}
                      </span>
                      <span className="truncate flex-1">{file.name}</span>
                    </button>
                  )}
                  {renamingId !== file.id && (
                    <button onClick={() => deleteFile(file.id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                      title="Delete">
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  )}
                </div>
              );
            })}

            {addingFile && (
              <div className="px-2 py-1">
                <input autoFocus placeholder="filename.py" value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addFile(); if (e.key === 'Escape') { setAddingFile(false); setNewFileName(''); } }}
                  onBlur={addFile}
                  className="w-full px-2 py-1 text-xs font-mono rounded outline-none"
                  style={{ background: '#1c2333', color: '#e6edf3', border: `1px solid ${fileBadge(newFileName || 'file.py')}` }}
                />
                <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                  .py .html .css .sql .js .txt
                </p>
              </div>
            )}
          </div>

          {/* Storage bar (mobile) */}
          <div className="px-3 py-2.5 sm:hidden" style={{ borderTop: '1px solid #1e2433' }}>
            <div className="flex justify-between text-xs mb-1" style={{ color: '#6b7280' }}>
              <span>{fmtBytes(usedBytes)}</span><span>10 MB</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2433' }}>
              <div className="h-full rounded-full" style={{ width: `${usedPct}%`, background: usedPct > 80 ? '#ef4444' : '#22c55e' }} />
            </div>
          </div>
        </div>

        {/* ── Editor + Output ── */}
        <div className="flex-1 flex flex-col lg:flex-row min-w-0">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col min-w-0" style={{ borderRight: '1px solid #1e2433' }}>
            <div className="flex items-center justify-between px-4 py-2"
              style={{ background: '#161b27', borderBottom: '1px solid #1e2433' }}>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3" style={{ color: '#4b5563' }} />
                  <span className="text-xs font-mono" style={{ color: '#8b949e' }}>
                    {activeFile?.name ?? '—'}
                  </span>
                  {activeFile && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                      style={{ background: fileBadge(activeFile.name) + '22', color: fileBadge(activeFile.name), fontSize: 9 }}>
                      {extToLang(activeFile.name).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={handleCopy} className="p-1.5 rounded hover:bg-white/10 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
                <button onClick={handleReset} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Clear output">
                  <RotateCcw className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            <textarea
              value={activeFile?.code ?? ''}
              onChange={e => updateCode(e.target.value)}
              className="flex-1 font-mono text-sm p-4 resize-none outline-none leading-relaxed"
              style={{ background: '#0d1117', color: '#e6edf3', caretColor: '#58a6ff', minHeight: 400, tabSize: 4 }}
              spellCheck={false}
              onKeyDown={e => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const el = e.currentTarget;
                  const start = el.selectionStart;
                  const end = el.selectionEnd;
                  const newVal = el.value.substring(0, start) + '    ' + el.value.substring(end);
                  updateCode(newVal);
                  requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 4; });
                }
              }}
            />

            <div className="flex gap-2 px-4 py-2.5" style={{ background: '#161b27', borderTop: '1px solid #1e2433' }}>
              <button onClick={handleRun} disabled={running}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${fileBadge(activeFile?.name ?? 'file.py')}, ${fileBadge(activeFile?.name ?? 'file.py')}99)` }}>
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {running ? 'Running...' : runLabel}
              </button>
              <span className="flex items-center text-xs" style={{ color: '#4b5563' }}>
                {langMeta[lang].dot} {langMeta[lang].label}
              </span>
            </div>
          </div>

          {/* Output Panel */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-2 px-4 py-2"
              style={{ background: '#161b27', borderBottom: '1px solid #1e2433' }}>
              <Terminal className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium" style={{ color: '#6b7280' }}>Output</span>
              {running && <Loader2 className="w-3 h-3 animate-spin text-blue-400 ml-auto" />}
            </div>

            {lang === 'html' && showPreview ? (
              <iframe srcDoc={htmlPreview} className="flex-1 w-full bg-white" title="HTML Preview"
                sandbox="allow-scripts" style={{ minHeight: 400 }} />
            ) : (
              <div ref={outputRef} className="flex-1 overflow-auto p-4" style={{ minHeight: 400 }}>
                {!hasRun ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 opacity-40">
                    <span className="text-4xl font-mono font-bold" style={{ color: '#6b7280' }}>&lt;/&gt;</span>
                    <p className="text-sm text-center" style={{ color: '#6b7280' }}>
                      {lang === 'html' ? 'Click Preview to render HTML'
                        : lang === 'sql' ? 'Click Reference for SQL links'
                        : lang === 'css' ? 'Click Run to see CSS info'
                        : 'Click Run to execute code'}
                    </p>
                  </div>
                ) : output ? (
                  <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap"
                    style={{ color: output.startsWith('\nError') || output.startsWith('Error') ? '#f85149' : '#3fb950' }}>
                    {output}
                  </pre>
                ) : running ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#6b7280' }}>
                    <Loader2 className="w-4 h-4 animate-spin" /> Running...
                  </div>
                ) : (
                  <p className="text-sm italic" style={{ color: '#6b7280' }}>No output produced.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playground;
