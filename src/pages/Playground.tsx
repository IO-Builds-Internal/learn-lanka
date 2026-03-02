import { useState, useRef, useEffect } from 'react';
import { Code2, Globe, Database, Play, RotateCcw, Copy, Check, Loader2, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Language = 'python' | 'html' | 'mysql';

const defaultCode: Record<Language, string> = {
  python: `# Python Playground - A/L ICT
# Try some basic Python code!

name = "ICT Student"
grade = 12
marks = [85, 90, 78, 92, 88]

print(f"Hello, {name}!")
print(f"Grade: {grade}")

# Calculate average
avg = sum(marks) / len(marks)
print(f"Average marks: {avg:.2f}")

# Loop example
subjects = ["ICT", "Maths", "Science"]
print("\\nSubjects:")
for i, subject in enumerate(subjects, 1):
    print(f"  {i}. {subject}")

# Function
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
    .badge {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      margin: 4px;
    }
    .btn {
      display: block;
      width: 100%;
      margin-top: 20px;
      padding: 12px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      font-weight: bold;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 10px; border: 1px solid #eee; text-align: left; font-size: 14px; }
    th { background: #f5f5f5; font-weight: bold; color: #333; }
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
    <button class="btn" onclick="this.textContent='Clicked! 🎉'">
      Click Me!
    </button>
  </div>
</body>
</html>`,
  mysql: `-- MySQL Playground - A/L ICT
-- Practice SQL queries here!

-- Create a students table
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    grade INT,
    subject VARCHAR(50),
    marks INT
);

-- Insert sample data
INSERT INTO students (name, grade, subject, marks) VALUES
('Kamal Perera', 12, 'ICT', 85),
('Nimal Silva', 12, 'ICT', 92),
('Saman Fernando', 13, 'ICT', 78),
('Dilani Rathnayake', 12, 'ICT', 96),
('Sunil Bandara', 13, 'ICT', 88);

-- Select all students
SELECT * FROM students;

-- Filter students with marks > 85
SELECT name, marks 
FROM students 
WHERE marks > 85
ORDER BY marks DESC;

-- Count students per grade
SELECT grade, COUNT(*) as total, AVG(marks) as avg_marks
FROM students
GROUP BY grade;
`,
};

const languageConfig = {
  python: {
    label: 'Python',
    icon: Code2,
    gradient: 'from-blue-500 to-indigo-600',
    activeTab: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg',
    filename: 'main.py',
    runLabel: 'Run',
  },
  html: {
    label: 'HTML & CSS',
    icon: Globe,
    gradient: 'from-orange-500 to-pink-600',
    activeTab: 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg',
    filename: 'index.html',
    runLabel: 'Preview',
  },
  mysql: {
    label: 'MySQL',
    icon: Database,
    gradient: 'from-green-500 to-teal-600',
    activeTab: 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg',
    filename: 'query.sql',
    runLabel: 'Reference',
  },
};

// Skulpt-based Python runner
declare global {
  interface Window {
    Sk: any;
  }
}

const loadSkulpt = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Sk) { resolve(); return; }
    const skulpt = document.createElement('script');
    skulpt.src = 'https://skulpt.org/js/skulpt.min.js';
    skulpt.onload = () => {
      const stdlib = document.createElement('script');
      stdlib.src = 'https://skulpt.org/js/skulpt-stdlib.js';
      stdlib.onload = () => resolve();
      stdlib.onerror = reject;
      document.head.appendChild(stdlib);
    };
    skulpt.onerror = reject;
    document.head.appendChild(skulpt);
  });
};

const runPython = async (code: string, onOutput: (line: string) => void): Promise<void> => {
  await loadSkulpt();
  return new Promise((resolve, reject) => {
    window.Sk.configure({
      output: (text: string) => onOutput(text),
      read: (x: string) => {
        if (window.Sk.builtinFiles?.files[x] === undefined) throw new Error(`File not found: '${x}'`);
        return window.Sk.builtinFiles.files[x];
      },
      __future__: window.Sk.python3,
    });
    window.Sk.misceval.asyncToPromise(() =>
      window.Sk.importMainWithBody('<stdin>', false, code, true)
    ).then(resolve).catch((err: any) => reject(new Error(err.toString())));
  });
};

const Playground = () => {
  const [lang, setLang] = useState<Language>('python');
  const [code, setCode] = useState(defaultCode);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const currentCode = code[lang];
  const config = languageConfig[lang];

  const handleRun = async () => {
    setHasRun(true);
    if (lang === 'html') {
      setHtmlPreview(currentCode);
      setShowPreview(true);
      setOutput([]);
      return;
    }
    if (lang === 'mysql') {
      setOutput([
        '-- MySQL reference mode',
        '-- Use the links below to run SQL in a live environment.',
        '',
        '-- Tools that support MySQL online:',
        '--  • DB Fiddle: https://www.db-fiddle.com/',
        '--  • SQLite Online: https://sqliteonline.com/',
        '--  • OneCompiler: https://onecompiler.com/mysql',
      ]);
      setShowPreview(false);
      return;
    }

    // Python via Skulpt
    setRunning(true);
    setOutput([]);
    setShowPreview(false);
    const lines: string[] = [];
    try {
      await runPython(currentCode, (text) => {
        lines.push(text);
        setOutput([...lines]);
      });
    } catch (err: any) {
      lines.push(`\nTraceback (most recent call last):\n  ${err.message}`);
      setOutput([...lines]);
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setCode(prev => ({ ...prev, [lang]: defaultCode[lang] }));
    setOutput([]);
    setShowPreview(false);
    setHtmlPreview('');
    setHasRun(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    toast.success('Code copied!');
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
    python: [
      ['Variables', 'x = 10'],
      ['List', 'lst = [1, 2, 3]'],
      ['For Loop', 'for i in range(5):'],
      ['Function', 'def func(x): return x'],
      ['If/Else', 'if x > 0:\n  ...\nelse:\n  ...'],
      ['Dictionary', 'd = {"key": "val"}'],
      ['Input', 'x = input("Enter: ")'],
      ['f-string', 'print(f"Hello {name}")'],
    ],
    html: [
      ['Heading', '<h1>Title</h1>'],
      ['Paragraph', '<p>Text</p>'],
      ['Link', '<a href="#">Link</a>'],
      ['Image', '<img src="url" alt="">'],
      ['Div', '<div class="box">'],
      ['Button', '<button>Click</button>'],
      ['CSS color', 'color: #333;'],
      ['Flexbox', 'display: flex;'],
    ],
    mysql: [
      ['SELECT', 'SELECT * FROM table;'],
      ['WHERE', 'WHERE column = value'],
      ['INSERT', 'INSERT INTO t VALUES (...)'],
      ['UPDATE', 'UPDATE t SET col=val'],
      ['DELETE', 'DELETE FROM t WHERE id=1'],
      ['JOIN', 'JOIN t2 ON t1.id=t2.id'],
      ['GROUP BY', 'GROUP BY column'],
      ['ORDER BY', 'ORDER BY col DESC'],
    ],
  };

  const accentColor = lang === 'python' ? 'text-blue-400' : lang === 'html' ? 'text-orange-400' : 'text-green-400';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f1117' }}>
      {/* Header */}
      <header className="border-b px-4 py-3" style={{ borderColor: '#1e2433', background: '#0d1117' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none">ICT Playground</h1>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>A/L ICT Code Practice</p>
            </div>
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
              <button
                key={l}
                onClick={() => { setLang(l); setOutput([]); setShowPreview(false); setHasRun(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${cfg.gradient} text-white shadow-lg`
                    : 'text-gray-400 hover:text-white'
                }`}
                style={!isActive ? { background: '#1a1f2e' } : {}}
              >
                <Icon className="w-4 h-4" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Main Editor + Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1">
          {/* Code Editor */}
          <div className="flex flex-col rounded-xl overflow-hidden" style={{ border: '1px solid #1e2433', background: '#0d1117' }}>
            {/* Editor Titlebar */}
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#161b27', borderBottom: '1px solid #1e2433' }}>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                </div>
                <span className="text-xs" style={{ color: '#6b7280' }}>{config.filename}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={handleCopy} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Copy code">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
                <button onClick={handleReset} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Reset">
                  <RotateCcw className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={currentCode}
              onChange={(e) => setCode(prev => ({ ...prev, [lang]: e.target.value }))}
              className="flex-1 font-mono text-sm p-4 resize-none outline-none leading-relaxed min-h-[360px]"
              style={{ background: '#0d1117', color: '#e6edf3', caretColor: '#58a6ff' }}
              spellCheck={false}
            />

            {/* Run Bar */}
            <div className="flex gap-2 px-4 py-2.5" style={{ background: '#161b27', borderTop: '1px solid #1e2433' }}>
              <button
                onClick={handleRun}
                disabled={running}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all bg-gradient-to-r ${config.gradient} hover:opacity-90 disabled:opacity-60`}
              >
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

            {/* HTML Live Preview */}
            {lang === 'html' && showPreview ? (
              <iframe
                srcDoc={htmlPreview}
                className="flex-1 w-full bg-white"
                title="HTML Preview"
                sandbox="allow-scripts"
                style={{ minHeight: 360 }}
              />
            ) : (
              /* Output / Empty State */
              <div ref={outputRef} className="flex-1 overflow-auto p-4" style={{ minHeight: 360 }}>
                {!hasRun ? (
                  /* Empty state — show icon + links */
                  <div className="h-full flex flex-col items-center justify-center gap-4">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <span className="text-3xl font-mono font-bold" style={{ color: '#6b7280' }}>&lt;/&gt;</span>
                      <p className="text-sm text-center" style={{ color: '#6b7280' }}>
                        {lang === 'python'
                          ? 'Click Run to execute your Python code'
                          : lang === 'html'
                          ? 'Click Preview to render HTML & CSS'
                          : 'Click Reference to view SQL info'}
                      </p>
                    </div>

                    {/* External Links */}
                    <div className="w-full max-w-xs space-y-2 mt-2">
                      {externalLinks[lang].map(link => (
                        <button
                          key={link.name}
                          onClick={() => openExternal(link.url)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                          style={{ background: '#161b27', border: '1px solid #1e2433', color: '#c9d1d9' }}
                        >
                          <span>{link.name}</span>
                          <span style={{ color: '#6b7280' }}>↗</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : output.length > 0 ? (
                  /* Actual output */
                  <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap" style={{ color: '#3fb950' }}>
                    {output.join('')}
                  </pre>
                ) : running ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#6b7280' }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running...
                  </div>
                ) : (
                  <p className="text-sm italic" style={{ color: '#6b7280' }}>No output produced.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Reference Chips */}
        <div className="rounded-xl p-3" style={{ border: '1px solid #1e2433', background: '#0d1117' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>
            📚 Quick Reference — click to copy snippet
          </p>
          <div className="flex flex-wrap gap-2">
            {quickRef[lang].map(([label, snippet]) => (
              <button
                key={label}
                onClick={() => { navigator.clipboard.writeText(snippet); toast.success(`Copied: ${label}`); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ background: '#161b27', border: '1px solid #1e2433', color: '#c9d1d9' }}
              >
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
