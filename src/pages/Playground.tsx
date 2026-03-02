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
  if (ext === 'py') return 'python';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'sql') return 'sql';
  if (['js','ts','jsx','tsx'].includes(ext)) return 'javascript';
  return 'text';
};

const langMeta: Record<Language, { label: string; color: string; dot: string }> = {
  python:     { label: 'Python',     color: '#3b82f6', dot: '🐍' },
  html:       { label: 'HTML',       color: '#f97316', dot: '🌐' },
  css:        { label: 'CSS',        color: '#a855f7', dot: '🎨' },
  sql:        { label: 'SQL',        color: '#22c55e', dot: '🗄️' },
  javascript: { label: 'JavaScript', color: '#eab308', dot: '⚡' },
  text:       { label: 'Text',       color: '#6b7280', dot: '📄' },
};

const fileBadge = (name: string) => langMeta[extToLang(name)].color;

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

SELECT * FROM students;

SELECT name, marks FROM students
WHERE marks > 85
ORDER BY marks DESC;

SELECT grade, COUNT(*) AS total, AVG(marks) AS avg_marks
FROM students GROUP BY grade;` },
];

// ─── Skulpt loader ────────────────────────────────────────────────────────────
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

// ─── Storage helpers ──────────────────────────────────────────────────────────
const MAX_BYTES = 10 * 1024 * 1024;
const totalBytes = (files: PlayFile[]) => files.reduce((a, f) => a + new Blob([f.code]).size, 0);
const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(2)} MB`;
const SESSION_KEY = 'ict_playground_files';
const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ─── Component ────────────────────────────────────────────────────────────────
const Playground = () => {
  const initFiles = (): PlayFile[] => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) { const p: PlayFile[] = JSON.parse(raw); if (p.length > 0) return p; }
    } catch { /* ignore */ }
    return DEFAULT_FILES.map((f, i) => ({ ...f, id: makeId() + i }));
  };

  const [files, setFiles] = useState<PlayFile[]>(initFiles);
  const [activeId, setActiveId] = useState(() => initFiles()[0]?.id ?? '');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [addingFile, setAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didCloudLoad = useRef(false);

  const activeFile = files.find(f => f.id === activeId) ?? files[0];
  const usedBytes = totalBytes(files);
  const usedPct = Math.min(100, (usedBytes / MAX_BYTES) * 100);
  const lang = activeFile ? extToLang(activeFile.name) : 'text';
  const runLabel = lang === 'html' ? 'Preview' : lang === 'sql' ? 'Reference' : 'Run';

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUserId(s?.user.id ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Cloud load on login
  useEffect(() => {
    if (!userId || didCloudLoad.current) return;
    didCloudLoad.current = true;
    (supabase.from as any)('playground_files').select('*').eq('user_id', userId).order('sort_order')
      .then(({ data, error }: any) => {
        if (!error && data?.length > 0) {
          const mapped: PlayFile[] = data.map((r: any) => ({ id: r.id, name: r.name, code: r.code, sortOrder: r.sort_order }));
          setFiles(mapped); setActiveId(mapped[0].id);
          setOutput(''); setHasRun(false); setShowPreview(false);
        }
      });
  }, [userId]);

  // Guest session storage
  useEffect(() => {
    if (!userId && files.length > 0) sessionStorage.setItem(SESSION_KEY, JSON.stringify(files));
  }, [files, userId]);

  // Scroll output
  useEffect(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight; }, [output]);

  // Save to DB
  const saveToDb = useCallback(async (filesToSave: PlayFile[]) => {
    if (!userId) return;
    setSaving(true);
    try {
      const upsertData = filesToSave.map(f => ({ id: f.id, user_id: userId, name: f.name, code: f.code, sort_order: f.sortOrder }));
      const { error } = await (supabase.from as any)('playground_files').upsert(upsertData, { onConflict: 'id' });
      if (error) throw error;
    } catch (e: any) { toast.error('Save failed: ' + e.message); }
    finally { setSaving(false); }
  }, [userId]);

  const scheduleSave = (nf: PlayFile[]) => {
    if (!userId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveToDb(nf), 1500);
  };

  const updateFiles = (nf: PlayFile[]) => { setFiles(nf); scheduleSave(nf); };

  // File CRUD
  const addFile = async () => {
    const raw = newFileName.trim();
    if (!raw) { setAddingFile(false); return; }
    const name = raw.includes('.') ? raw : `${raw}.py`;
    if (files.find(f => f.name === name)) { toast.error('File already exists'); return; }
    const nf: PlayFile = { id: makeId(), name, code: `# ${name}\n\n`, sortOrder: files.length };
    if (userId) {
      const { error } = await (supabase.from as any)('playground_files').insert({ id: nf.id, user_id: userId, name: nf.name, code: nf.code, sort_order: nf.sortOrder });
      if (error) { toast.error('Could not create file'); return; }
    }
    setFiles(p => [...p, nf]); setActiveId(nf.id);
    setNewFileName(''); setAddingFile(false); setOutput(''); setHasRun(false); setShowPreview(false);
  };

  const deleteFile = async (id: string) => {
    if (files.length === 1) { toast.error("Can't delete the last file"); return; }
    const next = files.find(f => f.id !== id);
    if (userId) await (supabase.from as any)('playground_files').delete().eq('id', id);
    setFiles(p => p.filter(f => f.id !== id));
    if (activeId === id && next) { setActiveId(next.id); setOutput(''); setHasRun(false); setShowPreview(false); }
  };

  const renameFile = async (id: string) => {
    const raw = renameVal.trim(); if (!raw) { setRenamingId(null); return; }
    const name = raw.includes('.') ? raw : `${raw}.py`;
    if (userId) await (supabase.from as any)('playground_files').update({ name }).eq('id', id);
    setFiles(p => p.map(f => f.id === id ? { ...f, name } : f));
    setRenamingId(null); setOutput(''); setHasRun(false); setShowPreview(false);
  };

  const updateCode = (val: string) => {
    const newSize = new Blob([val]).size;
    const otherSize = files.filter(f => f.id !== activeId).reduce((a, f) => a + new Blob([f.code]).size, 0);
    if (otherSize + newSize > MAX_BYTES) { toast.error('Storage limit reached (10 MB max)'); return; }
    updateFiles(files.map(f => f.id === activeId ? { ...f, code: val } : f));
  };

  // Run
  const handleRun = async () => {
    if (!activeFile) return;
    setHasRun(true); setShowPreview(false);
    const code = activeFile.code;
    if (lang === 'html') { setHtmlPreview(code); setShowPreview(true); setOutput(''); return; }
    if (lang === 'css') { setOutput(`/* CSS info - paste into HTML <style> tag */\n\n${code}`); return; }
    if (lang === 'sql') { setOutput('-- SQL Reference Mode\n-- Run live at:\n--  https://www.db-fiddle.com/\n--  https://sqliteonline.com/\n--  https://onecompiler.com/mysql'); return; }
    if (lang === 'javascript') {
      setRunning(true);
      const lines: string[] = [];
      try {
        const orig = console.log;
        console.log = (...a: any[]) => lines.push(a.map(String).join(' ') + '\n');
        // eslint-disable-next-line no-new-func
        new Function(code)();
        console.log = orig;
      } catch (e: any) { lines.push(`Error: ${e.message}\n`); }
      setOutput(lines.join('') || '(no output)'); setRunning(false); return;
    }
    if (lang === 'python') {
      setRunning(true); setOutput('');
      const col: string[] = [];
      try {
        await loadSkulpt();
        await new Promise<void>((res, rej) => {
          window.Sk.configure({
            output: (t: string) => col.push(t),
            read: (x: string) => { if (!window.Sk.builtinFiles?.files[x]) throw new Error(`File not found: '${x}'`); return window.Sk.builtinFiles.files[x]; },
            __future__: window.Sk.python3,
          });
          window.Sk.misceval.asyncToPromise(() => window.Sk.importMainWithBody('<stdin>', false, code, true)).then(res).catch((e: any) => rej(new Error(e.toString())));
        });
      } catch (err: any) { col.push(`\nError: ${err.message}`); }
      finally { setOutput(col.join('') || '(no output)'); setRunning(false); }
      return;
    }
    setOutput(code);
  };

  const handleReset = () => { setOutput(''); setShowPreview(false); setHtmlPreview(''); setHasRun(false); };
  const handleCopy = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.code);
    setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000);
  };
  const manualSave = async () => {
    if (!userId) { toast.error('Login to save workspace'); return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await saveToDb(files); toast.success('Workspace saved!');
  };

  // Language tab groups
  const langGroups = [
    { id: 'python' as Language,     label: 'Python',     exts: ['py'],             emoji: '🐍', color: '#3b82f6' },
    { id: 'html'   as Language,     label: 'HTML & CSS', exts: ['html','htm','css'],emoji: '🌐', color: '#f97316' },
    { id: 'sql'    as Language,     label: 'MySQL',      exts: ['sql'],             emoji: '🗄️', color: '#22c55e' },
    { id: 'javascript' as Language, label: 'JavaScript', exts: ['js','ts'],         emoji: '⚡', color: '#eab308' },
  ];
  const activeGroup = langGroups.find(g => g.exts.includes(activeFile?.name.split('.').pop() ?? ''));

  // ─── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0f1117' }}>

      {/* ── HEADER ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 h-11"
        style={{ background: '#0d1117', borderBottom: '1px solid #1e2433' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <Terminal className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">ICT Playground</p>
            <p className="text-xs leading-none mt-0.5" style={{ color: '#6b7280' }}>A/L ICT Code Practice</p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Storage bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2433' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${usedPct}%`, background: usedPct > 80 ? '#ef4444' : usedPct > 60 ? '#eab308' : '#22c55e' }} />
            </div>
            <span className="text-xs" style={{ color: '#6b7280' }}>{fmtBytes(usedBytes)} / 10 MB</span>
            {usedPct > 80 && <AlertCircle className="w-3 h-3 text-yellow-400" />}
          </div>

          {userId ? (
            <>
              {!saving && <div className="hidden sm:flex items-center gap-1 text-xs" style={{ color: '#22c55e' }}><Cloud className="w-3 h-3" /> Auto-saved</div>}
              <button onClick={manualSave} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: '#161b27', border: '1px solid #1e2433', color: saving ? '#58a6ff' : '#8b949e' }}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: '#161b27', border: '1px solid #1e2433', color: '#6b7280' }}>
              <CloudOff className="w-3 h-3" /> Session only
            </div>
          )}
        </div>
      </header>

      {/* ── LANGUAGE TABS ── */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-4 h-10"
        style={{ background: '#0d1117', borderBottom: '1px solid #1e2433' }}>
        {langGroups.map(g => {
          const isActive = activeGroup?.id === g.id;
          return (
            <button key={g.id}
              onClick={() => {
                const match = files.find(f => g.exts.includes(f.name.split('.').pop() ?? ''));
                if (match) { setActiveId(match.id); setOutput(''); setHasRun(false); setShowPreview(false); }
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium transition-all"
              style={{
                background: isActive ? g.color + '20' : 'transparent',
                color: isActive ? g.color : '#6b7280',
                border: isActive ? `1px solid ${g.color}40` : '1px solid transparent',
              }}>
              <span style={{ fontSize: 13 }}>{g.emoji}</span>
              <span className="hidden sm:inline">{g.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── MAIN 3-PANEL ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* FILE EXPLORER */}
        <div className="w-44 flex-shrink-0 flex flex-col" style={{ background: '#0d1117', borderRight: '1px solid #1e2433' }}>
          <div className="flex items-center justify-between px-3 py-2"
            style={{ background: '#161b27', borderBottom: '1px solid #1e2433' }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>Explorer</span>
            <button onClick={() => setAddingFile(true)} className="p-1 rounded hover:bg-white/10 transition-colors" title="New file">
              <FilePlus className="w-3.5 h-3.5" style={{ color: '#6b7280' }} />
            </button>
          </div>

          {!userId && (
            <div className="mx-2 mt-1.5 px-2 py-1 rounded text-xs leading-snug"
              style={{ background: '#1c1a10', border: '1px solid #3d3010', color: '#d97706' }}>
              ⚠️ Login to save files
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
                      <span className="flex-shrink-0 w-5 h-4 rounded flex items-center justify-center font-bold"
                        style={{ background: color + '22', color, fontSize: 8 }}>
                        {file.name.split('.').pop()?.toUpperCase()?.slice(0, 2) ?? '??'}
                      </span>
                      <span className="truncate flex-1">{file.name}</span>
                    </button>
                  )}
                  {renamingId !== file.id && (
                    <button onClick={() => deleteFile(file.id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20">
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  )}
                </div>
              );
            })}
            {addingFile && (
              <div className="px-2 py-1.5">
                <input autoFocus placeholder="filename.py" value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addFile(); if (e.key === 'Escape') { setAddingFile(false); setNewFileName(''); } }}
                  onBlur={addFile}
                  className="w-full px-2 py-1 text-xs font-mono rounded outline-none"
                  style={{ background: '#1c2333', color: '#e6edf3', border: `1px solid ${fileBadge(newFileName || 'f.py')}` }}
                />
                <p className="text-xs mt-1" style={{ color: '#4b5563' }}>.py .html .css .sql .js</p>
              </div>
            )}
          </div>
        </div>

        {/* CODE EDITOR */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ borderRight: '1px solid #1e2433' }}>
          {/* Title bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2"
            style={{ background: '#161b27', borderBottom: '1px solid #1e2433' }}>
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
              </div>
              <ChevronRight className="w-3 h-3" style={{ color: '#4b5563' }} />
              <span className="text-xs font-mono" style={{ color: '#8b949e' }}>{activeFile?.name ?? '—'}</span>
              {activeFile && (
                <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                  style={{ background: fileBadge(activeFile.name) + '22', color: fileBadge(activeFile.name), fontSize: 9 }}>
                  {extToLang(activeFile.name).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <button onClick={handleCopy} className="p-1.5 rounded hover:bg-white/10 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
              </button>
              <button onClick={handleReset} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Clear output">
                <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Editor textarea */}
          <textarea
            value={activeFile?.code ?? ''}
            onChange={e => updateCode(e.target.value)}
            className="flex-1 font-mono text-sm p-4 resize-none outline-none leading-relaxed overflow-auto"
            style={{ background: '#0d1117', color: '#e6edf3', caretColor: '#58a6ff', tabSize: 4 }}
            spellCheck={false}
            onKeyDown={e => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const el = e.currentTarget;
                const s = el.selectionStart, en = el.selectionEnd;
                const nv = el.value.substring(0, s) + '    ' + el.value.substring(en);
                updateCode(nv);
                requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 4; });
              }
            }}
          />

          {/* Run bar */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5"
            style={{ background: '#161b27', borderTop: '1px solid #1e2433' }}>
            <button onClick={handleRun} disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${fileBadge(activeFile?.name ?? 'f.py')}, ${fileBadge(activeFile?.name ?? 'f.py')}99)` }}>
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? 'Running…' : runLabel}
            </button>
            <span className="text-xs" style={{ color: '#4b5563' }}>
              {langMeta[lang].dot} {langMeta[lang].label}
            </span>
          </div>
        </div>

        {/* OUTPUT PANEL */}
        <div className="w-5/12 flex flex-col overflow-hidden" style={{ minWidth: 260 }}>
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2"
            style={{ background: '#161b27', borderBottom: '1px solid #1e2433' }}>
            <Terminal className="w-3.5 h-3.5" style={{ color: '#6b7280' }} />
            <span className="text-xs font-medium" style={{ color: '#6b7280' }}>
              {lang === 'html' && showPreview ? 'Preview' : 'Output'}
            </span>
            {running && <Loader2 className="w-3 h-3 animate-spin text-blue-400 ml-auto" />}
          </div>

          {lang === 'html' && showPreview ? (
            <iframe srcDoc={htmlPreview} className="flex-1 w-full bg-white" title="HTML Preview" sandbox="allow-scripts" />
          ) : (
            <div ref={outputRef} className="flex-1 overflow-auto p-4">
              {!hasRun ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 select-none" style={{ opacity: 0.35 }}>
                  <span className="text-3xl font-mono font-bold" style={{ color: '#6b7280' }}>&lt;/&gt;</span>
                  <p className="text-xs text-center" style={{ color: '#6b7280' }}>
                    {lang === 'html' ? 'Click Preview to render HTML'
                      : lang === 'sql' ? 'Click Reference for SQL links'
                      : lang === 'css' ? 'Click Run to view CSS'
                      : 'Click Run to execute code'}
                  </p>
                </div>
              ) : output ? (
                <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap break-words"
                  style={{ color: output.includes('Error:') ? '#f85149' : '#3fb950' }}>
                  {output}
                </pre>
              ) : running ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: '#6b7280' }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: '#6b7280' }}>No output produced.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Playground;
