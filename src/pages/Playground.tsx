import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, RotateCcw, Copy, Check, Loader2, Terminal, FilePlus, Trash2,
  Save, Cloud, CloudOff, AlertCircle, Code2, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlayFile { id: string; name: string; code: string; sortOrder: number; }
type Language = 'python' | 'html' | 'css' | 'sql' | 'javascript' | 'text';

const extToLang = (name: string): Language => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'py') return 'python';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'sql') return 'sql';
  if (['js','ts','jsx','tsx'].includes(ext)) return 'javascript';
  return 'text';
};

const langMeta: Record<Language, { label: string; color: string; bg: string; emoji: string }> = {
  python:     { label: 'Python',     color: '#3b82f6', bg: '#3b82f620', emoji: '🐍' },
  html:       { label: 'HTML',       color: '#f97316', bg: '#f9731620', emoji: '🌐' },
  css:        { label: 'CSS',        color: '#a855f7', bg: '#a855f720', emoji: '🎨' },
  sql:        { label: 'SQL',        color: '#22c55e', bg: '#22c55e20', emoji: '🗄️' },
  javascript: { label: 'JavaScript', color: '#eab308', bg: '#eab30820', emoji: '⚡' },
  text:       { label: 'Text',       color: '#6b7280', bg: '#6b728020', emoji: '📄' },
};

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

const MAX_BYTES = 10 * 1024 * 1024;
const totalBytes = (files: PlayFile[]) => files.reduce((a, f) => a + new Blob([f.code]).size, 0);
const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(2)} MB`;
const SESSION_KEY = 'ict_playground_files';
const makeId = () => crypto.randomUUID();

// Skulpt-based SQL engine (simple in-browser)
const runSqlInBrowser = (sql: string): string => {
  try {
    // Very basic CREATE TABLE + INSERT + SELECT simulation
    const tables: Record<string, { cols: string[]; rows: Record<string, any>[] }> = {};
    const lines = sql.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'));
    const fullSql = lines.join(' ');
    const stmts = fullSql.split(';').map(s => s.trim()).filter(Boolean);
    const output: string[] = [];

    for (const stmt of stmts) {
      const upper = stmt.toUpperCase();

      // CREATE TABLE
      if (upper.startsWith('CREATE TABLE')) {
        const m = stmt.match(/CREATE\s+TABLE\s+(\w+)\s*\((.+)\)/is);
        if (m) {
          const tname = m[1].toLowerCase();
          const colDefs = m[2].split(',').map(c => {
            const parts = c.trim().split(/\s+/);
            return parts[0].toLowerCase();
          }).filter(c => !['primary','unique','key','index','constraint'].includes(c));
          tables[tname] = { cols: colDefs, rows: [] };
          output.push(`✓ Table '${m[1]}' created (${colDefs.join(', ')})`);
        }
        continue;
      }

      // INSERT INTO
      if (upper.startsWith('INSERT INTO')) {
        const m = stmt.match(/INSERT\s+INTO\s+(\w+)\s*(?:\(([^)]+)\))?\s*VALUES\s*(.+)/is);
        if (m) {
          const tname = m[1].toLowerCase();
          if (!tables[tname]) { output.push(`✗ Table '${m[1]}' not found`); continue; }
          const cols = m[2] ? m[2].split(',').map(c => c.trim().toLowerCase()) : tables[tname].cols;
          const valBlock = m[3].trim();
          const rowMatches = [...valBlock.matchAll(/\(([^)]+)\)/g)];
          let count = 0;
          for (const rm of rowMatches) {
            const vals = rm[1].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
            const row: Record<string, any> = {};
            cols.forEach((c, i) => { row[c] = vals[i] ?? null; });
            tables[tname].rows.push(row);
            count++;
          }
          output.push(`✓ ${count} row(s) inserted into '${m[1]}'`);
        }
        continue;
      }

      // SELECT
      if (upper.startsWith('SELECT')) {
        const fromMatch = stmt.match(/FROM\s+(\w+)/i);
        if (!fromMatch) { output.push('✗ SELECT: missing FROM clause'); continue; }
        const tname = fromMatch[1].toLowerCase();
        if (!tables[tname]) { output.push(`✗ Table '${fromMatch[1]}' not found`); continue; }

        let rows = [...tables[tname].rows];

        // WHERE
        const whereMatch = stmt.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|$)/i);
        if (whereMatch) {
          const cond = whereMatch[1].trim();
          const condM = cond.match(/(\w+)\s*(>|<|>=|<=|=|!=|<>)\s*(.+)/);
          if (condM) {
            const [, col, op, val] = condM;
            const v = val.replace(/^['"]|['"]$/g, '');
            rows = rows.filter(r => {
              const rv = r[col.toLowerCase()];
              const numRv = Number(rv), numV = Number(v);
              const cmp = !isNaN(numRv) && !isNaN(numV) ? [numRv, numV] : [String(rv), String(v)];
              if (op === '>') return cmp[0] > cmp[1];
              if (op === '<') return cmp[0] < cmp[1];
              if (op === '>=') return cmp[0] >= cmp[1];
              if (op === '<=') return cmp[0] <= cmp[1];
              if (op === '=' || op === '==') return cmp[0] == cmp[1];
              if (op === '!=' || op === '<>') return cmp[0] != cmp[1];
              return true;
            });
          }
        }

        // ORDER BY
        const orderMatch = stmt.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
        if (orderMatch) {
          const col = orderMatch[1].toLowerCase();
          const dir = (orderMatch[2] || 'ASC').toUpperCase();
          rows.sort((a, b) => {
            const av = a[col], bv = b[col];
            const n = (Number(av) - Number(bv));
            const r = isNaN(n) ? String(av).localeCompare(String(bv)) : n;
            return dir === 'DESC' ? -r : r;
          });
        }

        // SELECT columns
        const selColsMatch = stmt.match(/SELECT\s+(.+?)\s+FROM/i);
        const selCols = selColsMatch ? selColsMatch[1].trim() : '*';

        if (rows.length === 0) { output.push(`(0 rows from '${fromMatch[1]}')`); continue; }

        const displayCols = selCols === '*' ? Object.keys(rows[0]) :
          selCols.split(',').map(c => c.trim().toLowerCase().replace(/.*\s+as\s+/i, '').split(/\s+/).pop() || c.trim().toLowerCase());

        // Render table
        const widths = displayCols.map(c => Math.max(c.length, ...rows.map(r => String(r[c] ?? '').length)));
        const header = '| ' + displayCols.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
        const divider = '+-' + widths.map(w => '-'.repeat(w)).join('-+-') + '-+';
        output.push(divider, header, divider);
        for (const r of rows) output.push('| ' + displayCols.map((c, i) => String(r[c] ?? '').padEnd(widths[i])).join(' | ') + ' |');
        output.push(divider);
        output.push(`(${rows.length} row${rows.length !== 1 ? 's' : ''})`);
        continue;
      }

      output.push(`-- Statement skipped (not supported): ${stmt.substring(0, 60)}`);
    }

    return output.join('\n') || '(no output)';
  } catch (e: any) {
    return `Error: ${e.message}`;
  }
};

const Playground = () => {
  const initFiles = (): PlayFile[] => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const p: PlayFile[] = JSON.parse(raw);
        // Validate all IDs are proper UUIDs
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (p.length > 0 && p.every(f => uuidRe.test(f.id))) return p;
      }
    } catch { /* ignore */ }
    return DEFAULT_FILES.map(f => ({ ...f, id: makeId() }));
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

  const activeFile = files.find(f => f.id === activeId) ?? files[0];
  const usedBytes = totalBytes(files);
  const usedPct = Math.min(100, (usedBytes / MAX_BYTES) * 100);
  const lang = activeFile ? extToLang(activeFile.name) : 'text';
  const meta = langMeta[lang];
  const runLabel = lang === 'html' ? 'Preview' : lang === 'sql' ? 'Run SQL' : 'Run';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUserId(s?.user.id ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Load files from DB whenever userId becomes available (or changes)
  useEffect(() => {
    if (!userId) return;
    // Always reload from DB when userId is set - don't use a ref guard so re-logins work
    supabase.from('playground_files' as any).select('*').eq('user_id', userId).order('sort_order')
      .then(({ data, error }: any) => {
        if (!error && data && data.length > 0) {
          const mapped: PlayFile[] = data.map((r: any) => ({
            id: r.id,
            name: r.name,
            code: r.code,
            sortOrder: r.sort_order,
          }));
          setFiles(mapped);
          setActiveId(mapped[0].id);
          setOutput('');
          setHasRun(false);
          setShowPreview(false);
        }
        // If no DB files found, keep whatever is in state (default files)
      });
  }, [userId]);

  useEffect(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight; }, [output]);

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

  const addFile = async () => {
    if (!userId) { toast.error('Log in to create new files'); setAddingFile(false); return; }
    const raw = newFileName.trim();
    if (!raw) { setAddingFile(false); return; }
    const name = raw.includes('.') ? raw : `${raw}.py`;
    if (files.find(f => f.name === name)) { toast.error('File already exists'); return; }
    const nf: PlayFile = { id: makeId(), name, code: `# ${name}\n\n`, sortOrder: files.length };
    const { error } = await (supabase.from as any)('playground_files').insert({ id: nf.id, user_id: userId, name: nf.name, code: nf.code, sort_order: nf.sortOrder });
    if (error) { toast.error('Could not create file'); return; }
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

  const handleRun = async () => {
    if (!activeFile) return;
    setHasRun(true); setShowPreview(false);
    const code = activeFile.code;
    if (lang === 'html') { setHtmlPreview(code); setShowPreview(true); setOutput(''); return; }
    if (lang === 'css') { setOutput(`/* CSS info - paste into HTML <style> tag */\n\n${code}`); return; }
    if (lang === 'sql') {
      setRunning(true);
      setOutput('');
      try {
        const result = runSqlInBrowser(code);
        setOutput(result);
      } catch (e: any) {
        setOutput(`Error: ${e.message}`);
      } finally {
        setRunning(false);
      }
      return;
    }
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

  return (
    <StudentLayout>
      {/* Page Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <Code2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">ICT Playground</h1>
            <p className="text-sm text-muted-foreground">A/L ICT Code Practice</p>
          </div>
        </div>

        {/* Storage + save status */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${usedPct}%`, background: usedPct > 80 ? '#ef4444' : usedPct > 60 ? '#eab308' : '#22c55e' }} />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtBytes(usedBytes)} / 10 MB</span>
            {usedPct > 80 && <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />}
          </div>

          {userId ? (
            <Button variant="outline" size="sm" onClick={manualSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save'}
            </Button>
          ) : (
            <Link to="/login">
              <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
                <CloudOff className="w-3.5 h-3.5" />
                Log in to save
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Guest banner */}
      {!userId && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5">
          <Cloud className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-sm text-foreground">
            <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
            {' '}to save your workspace, create new files, and sync across devices. Guest files are lost when you close the browser.
          </p>
        </div>
      )}

      {/* 3 Cards Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_1fr] gap-4">

        {/* ── Card 1: File Explorer ── */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col" style={{ minHeight: 480 }}>
          <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/30">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explorer</span>
            <button
              title={userId ? 'New file' : 'Log in to create files'}
              onClick={() => { if (!userId) { toast.error('Log in to create new files'); return; } setAddingFile(true); }}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              style={{ opacity: userId ? 1 : 0.4 }}
            >
              <FilePlus className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {files.map(file => {
              const m = langMeta[extToLang(file.name)];
              const isActive = file.id === activeId;
              return (
                <div key={file.id} className="group relative">
                  {renamingId === file.id ? (
                    <input autoFocus value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onBlur={() => renameFile(file.id)}
                      onKeyDown={e => { if (e.key === 'Enter') renameFile(file.id); if (e.key === 'Escape') setRenamingId(null); }}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-muted outline-none text-foreground"
                    />
                  ) : (
                    <button
                      onClick={() => { setActiveId(file.id); setOutput(''); setHasRun(false); setShowPreview(false); }}
                      onDoubleClick={() => { setRenamingId(file.id); setRenameVal(file.name.includes('.') ? file.name.slice(0, file.name.lastIndexOf('.')) : file.name); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                      style={{
                        background: isActive ? m.bg : 'transparent',
                        borderLeft: `2px solid ${isActive ? m.color : 'transparent'}`,
                      }}>
                      <span className="text-base leading-none">{m.emoji}</span>
                      <span className="truncate flex-1 font-mono text-foreground">{file.name}</span>
                    </button>
                  )}
                  {renamingId !== file.id && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {userId && (
                        <button onClick={() => { setRenamingId(file.id); setRenameVal(file.name.includes('.') ? file.name.slice(0, file.name.lastIndexOf('.')) : file.name); }}
                          className="p-1 rounded hover:bg-muted" title="Rename">
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                      <button onClick={() => deleteFile(file.id)}
                        className="p-1 rounded hover:bg-destructive/10" title="Delete">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {addingFile && userId && (
              <div className="px-2 py-2">
                <input autoFocus placeholder="filename.py" value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addFile(); if (e.key === 'Escape') { setAddingFile(false); setNewFileName(''); } }}
                  onBlur={addFile}
                  className="w-full px-2 py-1.5 text-xs font-mono rounded-md border bg-background text-foreground outline-none focus:border-primary"
                />
                <p className="text-xs mt-1 text-muted-foreground">.py .html .css .sql .js</p>
              </div>
            )}
          </div>

          {/* Language tabs at bottom of explorer */}
          <div className="border-t p-2 flex flex-wrap gap-1">
            {(['python','html','sql','javascript'] as Language[]).map(l => {
              const m = langMeta[l];
              const isActive = lang === l || (l === 'html' && lang === 'css');
              return (
                <button key={l}
                  onClick={() => {
                    const ext = l === 'html' ? ['html','htm','css'] : l === 'sql' ? ['sql'] : l === 'python' ? ['py'] : ['js','ts'];
                    const match = files.find(f => ext.includes(f.name.split('.').pop() ?? ''));
                    if (match) { setActiveId(match.id); setOutput(''); setHasRun(false); setShowPreview(false); }
                  }}
                  className="text-xs px-2 py-0.5 rounded-full transition-all"
                  style={{
                    background: isActive ? m.bg : 'transparent',
                    color: isActive ? m.color : 'var(--muted-foreground)',
                    border: `1px solid ${isActive ? m.color + '60' : 'transparent'}`,
                  }}>
                  {m.emoji}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Card 2: Code Editor ── */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col" style={{ minHeight: 480 }}>
          {/* Title bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-medium text-foreground">{activeFile?.name ?? '—'}</span>
              {activeFile && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: meta.bg, color: meta.color }}>
                  {lang.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Copy code">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              <button onClick={handleReset} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Clear output">
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Editor */}
          <textarea
            value={activeFile?.code ?? ''}
            onChange={e => updateCode(e.target.value)}
            className="flex-1 font-mono text-sm p-4 resize-none outline-none leading-relaxed bg-[#0d1117] text-[#e6edf3] caret-blue-400"
            style={{ tabSize: 4, minHeight: 380 }}
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
          <div className="flex items-center gap-3 px-4 py-2.5 border-t bg-muted/30">
            <Button onClick={handleRun} disabled={running} size="sm" className="gap-2"
              style={{ background: meta.color, color: '#fff', border: 'none' }}>
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {running ? 'Running…' : runLabel}
            </Button>
            <span className="text-xs text-muted-foreground">{meta.emoji} {meta.label}</span>
            {saving && (
              <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
              </div>
            )}
            {!saving && userId && (
              <div className="ml-auto flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Cloud className="w-3 h-3" /> Auto-saved
              </div>
            )}
          </div>
        </div>

        {/* ── Card 3: Output / Preview ── */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col" style={{ minHeight: 480 }}>
          <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
            <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {lang === 'html' && showPreview ? 'Preview' : lang === 'sql' ? 'SQL Output' : 'Output'}
            </span>
            {running && <Loader2 className="w-3 h-3 animate-spin text-primary ml-auto" />}
          </div>

          {lang === 'html' && showPreview ? (
            <iframe srcDoc={htmlPreview} className="flex-1 w-full bg-white" title="HTML Preview" sandbox="allow-scripts" />
          ) : (
            <div ref={outputRef} className="flex-1 overflow-auto p-4 bg-[#0d1117]" style={{ minHeight: 380 }}>
              {!hasRun ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 select-none opacity-30">
                  <span className="text-4xl font-mono font-bold text-gray-500">&lt;/&gt;</span>
                  <p className="text-xs text-center text-gray-500">
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
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…
                </div>
              ) : (
                <p className="text-xs italic text-gray-500">No output produced.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </StudentLayout>
  );
};

export default Playground;
