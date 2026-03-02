import { useState, useRef, useEffect } from 'react';
import { Code2, Globe, Database, Play, RotateCcw, Copy, Check, Loader2, Terminal, FilePlus, Trash2, FileCode2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface PyFile { id: string; name: string; code: string; }
type Language = 'python' | 'html' | 'mysql';

const defaultCode: Record<Language, string> = {
  python: `# Python Playground - A/L ICT
name = "ICT Student"
grade = 12
marks = [85, 90, 78, 92, 88]

print(f"Hello, {name}!")
print(f"Grade: {grade}")

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
`,
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HTML & CSS Playground</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    h1 { color: #333; margin-bottom: 8px; font-size: 28px; }
    p { color: #666; margin-bottom: 24px; }
    .badge { display: inline-block; background: #667eea; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; margin: 4px; }
    .btn { display: block; width: 100%; margin-top: 20px; padding: 12px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 10px; border: 1px solid #eee; text-align: left; font-size: 14px; }
    th { background: #f5f5f5; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎓 ICT Student</h1>
    <p>A/L ICT - HTML & CSS Demo</p>
    <span class="badge">HTML</span>
    <span class="badge">CSS</span>
    <span class="badge">Web Dev</span>
    <table>
      <tr><th>Topic</th><th>Score</th></tr>
      <tr><td>HTML Basics</td><td>95%</td></tr>
      <tr><td>CSS Styling</td><td>88%</td></tr>
      <tr><td>Responsive Design</td><td>82%</td></tr>
    </table>
    <button class="btn" onclick="this.textContent='Clicked! 🎉'">Click Me!</button>
  </div>
</body>
</html>`,
  mysql: `-- MySQL Playground - A/L ICT
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    grade INT, subject VARCHAR(50), marks INT
);

INSERT INTO students (name, grade, subject, marks) VALUES
('Kamal Perera', 12, 'ICT', 85),
('Nimal Silva', 12, 'ICT', 92),
('Saman Fernando', 13, 'ICT', 78),
('Dilani Rathnayake', 12, 'ICT', 96),
('Sunil Bandara', 13, 'ICT', 88);

SELECT * FROM students;

SELECT name, marks FROM students
WHERE marks > 85 ORDER BY marks DESC;

SELECT grade, COUNT(*) as total, AVG(marks) as avg_marks
FROM students GROUP BY grade;
`,
};

const DEFAULT_PY_FILES: PyFile[] = [
  { id: '1', name: 'main.py', code: defaultCode.python },
  { id: '2', name: 'variables.py', code: `# Variables & Data Types - A/L ICT
age = 17
gpa = 3.85
name = "Kamal"
is_student = True

print(f"Name: {name}")
print(f"Age: {age}")
print(f"GPA: {gpa}")
print(f"Is Student: {is_student}")
print(f"Type of age: {type(age)}")
print(f"Type of name: {type(name)}")
` },
  { id: '3', name: 'loops.py', code: `# Loops - A/L ICT
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

print("\\n3x3 Table:")
for r in range(1, 4):
    for c in range(1, 4):
        print(f"{r*c:3}", end="")
    print()
` },
  { id: '4', name: 'functions.py', code: `# Functions - A/L ICT
def greet(name):
    return f"Hello, {name}!"

def add(a, b):
    return a + b

def is_even(n):
    return n % 2 == 0

def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)

print(greet("ICT Student"))
print(f"5 + 3 = {add(5, 3)}")
print(f"4 is even: {is_even(4)}")
print(f"7 is even: {is_even(7)}")
print(f"5! = {factorial(5)}")
` },
  { id: '5', name: 'lists.py', code: `# Lists - A/L ICT
marks = [78, 92, 85, 60, 95, 72]

print("Original:", marks)
print("Length:", len(marks))
print("Max:", max(marks))
print("Min:", min(marks))
print("Average:", sum(marks)/len(marks))

marks.sort()
print("\\nSorted:", marks)

passed = [m for m in marks if m >= 50]
print("\\nPassed marks:", passed)

matrix = [[1,2,3],[4,5,6],[7,8,9]]
print("\\nMatrix:")
for row in matrix:
    print(" ", row)
` },
];

const languageConfig = {
  python: { label: 'Python', icon: Code2, gradient: 'from-blue-500 to-indigo-600', filename: 'main.py', runLabel: 'Run' },
  html: { label: 'HTML & CSS', icon: Globe, gradient: 'from-orange-500 to-pink-600', filename: 'index.html', runLabel: 'Preview' },
  mysql: { label: 'MySQL', icon: Database, gradient: 'from-green-500 to-teal-600', filename: 'query.sql', runLabel: 'Reference' },
};

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

const runPython = async (code: string, onOutput: (t: string) => void): Promise<void> => {
  await loadSkulpt();
  return new Promise((resolve, reject) => {
    window.Sk.configure({
      output: onOutput,
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
};

const Playground = () => {
  const [lang, setLang] = useState<Language>('python');
  const [nonPyCode, setNonPyCode] = useState({ html: defaultCode.html, mysql: defaultCode.mysql });
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const [pyFiles, setPyFiles] = useState<PyFile[]>(DEFAULT_PY_FILES);
  const [activeFileId, setActiveFileId] = useState('1');
  const [newFileName, setNewFileName] = useState('');
  const [addingFile, setAddingFile] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  const activeFile = pyFiles.find(f => f.id === activeFileId) || pyFiles[0];

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const currentCode = lang === 'python' ? activeFile.code : nonPyCode[lang as 'html' | 'mysql'];
  const config = languageConfig[lang];

  const updateCode = (val: string) => {
    if (lang === 'python') {
      setPyFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, code: val } : f));
    } else {
      setNonPyCode(prev => ({ ...prev, [lang]: val }));
    }
  };

  const addFile = () => {
    const n = newFileName.trim();
    if (!n) { setAddingFile(false); return; }
    const name = n.endsWith('.py') ? n : `${n}.py`;
    if (pyFiles.find(f => f.name === name)) { toast.error('File already exists'); return; }
    const nf: PyFile = { id: Date.now().toString(), name, code: `# ${name}\n\n` };
    setPyFiles(prev => [...prev, nf]);
    setActiveFileId(nf.id);
    setNewFileName(''); setAddingFile(false);
    setOutput([]); setHasRun(false);
  };

  const deleteFile = (id: string) => {
    if (pyFiles.length === 1) { toast.error("Can't delete the last file"); return; }
    const next = pyFiles.find(f => f.id !== id);
    setPyFiles(prev => prev.filter(f => f.id !== id));
    if (activeFileId === id && next) { setActiveFileId(next.id); setOutput([]); setHasRun(false); }
  };

  const renameFile = (id: string) => {
    const n = renameVal.trim();
    if (!n) { setRenamingId(null); return; }
    const name = n.endsWith('.py') ? n : `${n}.py`;
    setPyFiles(prev => prev.map(f => f.id === id ? { ...f, name } : f));
    setRenamingId(null);
  };

  const handleRun = async () => {
    setHasRun(true);
    if (lang === 'html') {
      setHtmlPreview(currentCode); setShowPreview(true); setOutput([]); return;
    }
    if (lang === 'mysql') {
      setOutput(['-- MySQL reference mode\n', '-- Use the links below to run SQL live.\n', '\n',
        '--  • DB Fiddle: https://www.db-fiddle.com/\n',
        '--  • SQLiteOnline: https://sqliteonline.com/\n',
        '--  • OneCompiler: https://onecompiler.com/mysql\n']);
      setShowPreview(false); return;
    }
    setRunning(true); setOutput([]); setShowPreview(false);
    const lines: string[] = [];
    try {
      await runPython(currentCode, (t) => { lines.push(t); setOutput([...lines]); });
    } catch (err: any) {
      lines.push(`\nTraceback (most recent call last):\n  ${err.message}`);
      setOutput([...lines]);
    } finally { setRunning(false); }
  };

  const handleReset = () => {
    if (lang === 'python' && activeFileId === '1') {
      setPyFiles(prev => prev.map(f => f.id === '1' ? { ...f, code: defaultCode.python } : f));
    } else if (lang !== 'python') {
      setNonPyCode(prev => ({ ...prev, [lang]: defaultCode[lang] }));
    }
    setOutput([]); setShowPreview(false); setHtmlPreview(''); setHasRun(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCode);
    setCopied(true); toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const openExternal = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  const externalLinks: Record<Language, { name: string; url: string }[]> = {
    python: [
      { name: 'Replit Python', url: 'https://repl.it/languages/python3' },
      { name: 'Trinket.io', url: 'https://trinket.io/python' },
      { name: 'OneCompiler Python', url: 'https://onecompiler.com/python' },
    ],
    html: [
      { name: 'CodePen', url: 'https://codepen.io/pen/' },
      { name: 'JSFiddle', url: 'https://jsfiddle.net/' },
      { name: 'OneCompiler HTML', url: 'https://onecompiler.com/html' },
    ],
    mysql: [
      { name: 'DB Fiddle', url: 'https://www.db-fiddle.com/' },
      { name: 'SQLiteOnline', url: 'https://sqliteonline.com/' },
      { name: 'OneCompiler MySQL', url: 'https://onecompiler.com/mysql' },
    ],
  };

  const quickRef: Record<Language, [string, string][]> = {
    python: [['Variables','x = 10'],['List','lst = [1,2,3]'],['For Loop','for i in range(5):'],['Function','def func(x): return x'],['If/Else','if x > 0:\n  pass'],['Dict','d = {"k":"v"}'],['Input','x = input("Enter: ")'],['f-string','print(f"Hello {name}")']],
    html: [['Heading','<h1>Title</h1>'],['Paragraph','<p>Text</p>'],['Link','<a href="#">Link</a>'],['Image','<img src="url" alt="">'],['Div','<div class="box">'],['Button','<button>Click</button>'],['CSS color','color: #333;'],['Flexbox','display: flex;']],
    mysql: [['SELECT','SELECT * FROM table;'],['WHERE','WHERE col = val'],['INSERT','INSERT INTO t VALUES (...)'],['UPDATE','UPDATE t SET col=val'],['DELETE','DELETE FROM t WHERE id=1'],['JOIN','JOIN t2 ON t1.id=t2.id'],['GROUP BY','GROUP BY col'],['ORDER BY','ORDER BY col DESC']],
  };

  const accentColor = lang === 'python' ? 'text-blue-400' : lang === 'html' ? 'text-orange-400' : 'text-green-400';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f1117' }}>
      {/* Header */}
      <header className="border-b px-4 py-3" style={{ borderColor: '#1e2433', background: '#0d1117' }}>
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">ICT Playground</h1>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>A/L ICT Code Practice</p>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-4 flex flex-col gap-3">
        {/* Language Tabs */}
        <div className="flex gap-2">
          {(Object.keys(languageConfig) as Language[]).map((l) => {
            const cfg = languageConfig[l];
            const Icon = cfg.icon;
            const isActive = lang === l;
            return (
              <button key={l}
                onClick={() => { setLang(l); setOutput([]); setShowPreview(false); setHasRun(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? `bg-gradient-to-r ${cfg.gradient} text-white shadow-lg` : 'text-gray-400 hover:text-white'}`}
                style={!isActive ? { background: '#1a1f2e' } : {}}
              >
                <Icon className="w-4 h-4" />{cfg.label}
              </button>
            );
          })}
        </div>

        {/* Main area */}
        <div className="flex gap-3 flex-1">

          {/* FILE EXPLORER — Python only */}
          {lang === 'python' && (
            <div className="w-44 flex-shrink-0 flex flex-col rounded-xl overflow-hidden" style={{ border: '1px solid #1e2433', background: '#0d1117' }}>
              <div className="flex items-center justify-between px-3 py-2.5" style={{ background: '#161b27', borderBottom: '1px solid #1e2433' }}>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Explorer</span>
                <button onClick={() => setAddingFile(true)} className="p-1 rounded hover:bg-white/10 transition-colors" title="New file">
                  <FilePlus className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {pyFiles.map(file => (
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
                        onClick={() => { setActiveFileId(file.id); setOutput([]); setHasRun(false); }}
                        onDoubleClick={() => { setRenamingId(file.id); setRenameVal(file.name.replace('.py', '')); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors"
                        style={{
                          background: activeFileId === file.id ? '#1c2333' : 'transparent',
                          color: activeFileId === file.id ? '#58a6ff' : '#8b949e',
                          borderLeft: activeFileId === file.id ? '2px solid #58a6ff' : '2px solid transparent',
                        }}
                      >
                        <FileCode2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f0883e' }} />
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
                ))}
                {addingFile && (
                  <div className="px-2 py-1">
                    <input autoFocus placeholder="filename.py" value={newFileName}
                      onChange={e => setNewFileName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addFile(); if (e.key === 'Escape') { setAddingFile(false); setNewFileName(''); } }}
                      onBlur={addFile}
                      className="w-full px-2 py-1 text-xs font-mono rounded outline-none"
                      style={{ background: '#1c2333', color: '#e6edf3', border: '1px solid #58a6ff' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Editor + Output */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0">
            {/* Code Editor */}
            <div className="flex flex-col rounded-xl overflow-hidden" style={{ border: '1px solid #1e2433', background: '#0d1117' }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#161b27', borderBottom: '1px solid #1e2433' }}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                  </div>
                  <div className="flex items-center gap-1">
                    {lang === 'python' && <ChevronRight className="w-3 h-3 text-gray-600" />}
                    <span className="text-xs font-mono" style={{ color: '#8b949e' }}>
                      {lang === 'python' ? activeFile.name : config.filename}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={handleCopy} className="p-1.5 rounded hover:bg-white/10 transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-500" />}
                  </button>
                  <button onClick={handleReset} className="p-1.5 rounded hover:bg-white/10 transition-colors">
                    <RotateCcw className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <textarea
                value={currentCode}
                onChange={e => updateCode(e.target.value)}
                className="flex-1 font-mono text-sm p-4 resize-none outline-none leading-relaxed min-h-[360px]"
                style={{ background: '#0d1117', color: '#e6edf3', caretColor: '#58a6ff' }}
                spellCheck={false}
              />
              <div className="flex gap-2 px-4 py-2.5" style={{ background: '#161b27', borderTop: '1px solid #1e2433' }}>
                <button onClick={handleRun} disabled={running}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r ${config.gradient} hover:opacity-90 disabled:opacity-60 transition-all`}>
                  {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {running ? 'Running...' : config.runLabel}
                </button>
              </div>
            </div>

            {/* Output Panel */}
            <div className="flex flex-col rounded-xl overflow-hidden" style={{ border: '1px solid #1e2433', background: '#0d1117' }}>
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#161b27', borderBottom: '1px solid #1e2433' }}>
                <Terminal className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium" style={{ color: '#6b7280' }}>Output / Reference</span>
                {running && <Loader2 className="w-3 h-3 animate-spin text-blue-400 ml-auto" />}
              </div>
              {lang === 'html' && showPreview ? (
                <iframe srcDoc={htmlPreview} className="flex-1 w-full bg-white" title="HTML Preview" sandbox="allow-scripts" style={{ minHeight: 360 }} />
              ) : (
                <div ref={outputRef} className="flex-1 overflow-auto p-4" style={{ minHeight: 360 }}>
                  {!hasRun ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                      <div className="flex flex-col items-center gap-2 opacity-40">
                        <span className="text-3xl font-mono font-bold" style={{ color: '#6b7280' }}>&lt;/&gt;</span>
                        <p className="text-sm text-center" style={{ color: '#6b7280' }}>
                          {lang === 'python' ? 'Click Run to execute your Python code'
                            : lang === 'html' ? 'Click Preview to render HTML & CSS'
                            : 'Click Reference to view SQL info'}
                        </p>
                      </div>
                      <div className="w-full max-w-xs space-y-2 mt-2">
                        {externalLinks[lang].map(link => (
                          <button key={link.name} onClick={() => openExternal(link.url)}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                            style={{ background: '#161b27', border: '1px solid #1e2433', color: '#c9d1d9' }}>
                            <span>{link.name}</span>
                            <span style={{ color: '#6b7280' }}>↗</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : output.length > 0 ? (
                    <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap" style={{ color: '#3fb950' }}>
                      {output.join('')}
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

        {/* Quick Reference */}
        <div className="rounded-xl p-3" style={{ border: '1px solid #1e2433', background: '#0d1117' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>📚 Quick Reference — click to copy snippet</p>
          <div className="flex flex-wrap gap-2">
            {quickRef[lang].map(([label, snippet]) => (
              <button key={label}
                onClick={() => { navigator.clipboard.writeText(snippet); toast.success(`Copied: ${label}`); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ background: '#161b27', border: '1px solid #1e2433', color: '#c9d1d9' }}>
                <span className={`font-mono ${accentColor}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playground;
