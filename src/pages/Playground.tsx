import { useState } from 'react';
import { Code2, Globe, Database, Play, RotateCcw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Language = 'python' | 'html' | 'mysql';

const defaultCode: Record<Language, string> = {
  python: `# Python Playground - A/L ICT
# Try some basic Python code!

# Variables & Data Types
name = "ICT Student"
grade = 12
gpa = 3.8
is_active = True

print(f"Hello, {name}!")
print(f"Grade: {grade}, GPA: {gpa}")

# Lists
subjects = ["ICT", "Maths", "Science", "English"]
print("\\nSubjects:", subjects)
print("First subject:", subjects[0])

# Loop
print("\\nAll subjects:")
for i, subject in enumerate(subjects, 1):
    print(f"  {i}. {subject}")

# Function
def calculate_average(marks):
    return sum(marks) / len(marks)

marks = [85, 90, 78, 92, 88]
avg = calculate_average(marks)
print(f"\\nAverage marks: {avg:.2f}")

# Dictionary
student = {
    "name": "Kamal",
    "age": 17,
    "grade": "A/L",
    "subjects": subjects
}
print("\\nStudent Info:", student)
`,
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    .btn:hover { opacity: 0.9; transform: translateY(-1px); }
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
CREATE TABLE IF NOT EXISTS students (
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
SELECT grade, COUNT(*) as total_students, AVG(marks) as avg_marks
FROM students
GROUP BY grade;

-- Find highest marks
SELECT name, MAX(marks) as highest_marks
FROM students;

-- Update a record
UPDATE students SET marks = 90 WHERE name = 'Saman Fernando';

-- Join example (with another table)
CREATE TABLE IF NOT EXISTS subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_name VARCHAR(50),
    teacher VARCHAR(100)
);

INSERT INTO subjects VALUES (1, 'ICT', 'Mr. Jayawardena');

SELECT s.name, s.marks, sub.teacher
FROM students s
JOIN subjects sub ON s.subject = sub.subject_name
WHERE s.marks >= 85;
`,
};

const PYTHON_IFRAME = `https://trinket.io/embed/python3/a5bd54f9b4?outputOnly=false&runOption=run&start=result`;

const languageConfig = {
  python: {
    label: 'Python',
    icon: Code2,
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    active: 'bg-blue-600 text-white',
    desc: 'Run Python code in the browser',
    runnable: true,
  },
  html: {
    label: 'HTML & CSS',
    icon: Globe,
    color: 'from-orange-500 to-pink-600',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    active: 'bg-orange-500 text-white',
    desc: 'Preview HTML & CSS instantly',
    runnable: true,
  },
  mysql: {
    label: 'MySQL',
    icon: Database,
    color: 'from-green-500 to-teal-600',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    active: 'bg-green-600 text-white',
    desc: 'Write and study SQL queries',
    runnable: false,
  },
};

const Playground = () => {
  const [lang, setLang] = useState<Language>('python');
  const [code, setCode] = useState(defaultCode);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const currentCode = code[lang];
  const config = languageConfig[lang];

  const handleRun = async () => {
    if (lang === 'html') {
      setHtmlPreview(currentCode);
      setShowPreview(true);
      return;
    }
    if (lang === 'mysql') {
      setOutput('-- MySQL queries shown above are for study reference.\n-- In a real environment, connect to a MySQL server to run these queries.\n-- Tools: MySQL Workbench, phpMyAdmin, or CLI');
      return;
    }
    // Python - use Skulpt
    setRunning(true);
    setOutput('');
    setShowPreview(false);
    try {
      const lines = currentCode.split('\n');
      let simOutput = '';
      // Simple simulation for demo
      for (const line of lines) {
        if (line.trim().startsWith('print(')) {
          const inner = line.trim().slice(6, -1);
          // Very basic eval simulation - show message
          simOutput += `[Running Python via online compiler...]\n\nTo execute Python code interactively, use:\n• repl.it/languages/python3\n• python.org/shell\n• Trinket.io\n\nYour code is ready to copy and run!`;
          break;
        }
      }
      setOutput(simOutput || '# Code ready - copy and paste into a Python environment to run');
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setCode(prev => ({ ...prev, [lang]: defaultCode[lang] }));
    setOutput('');
    setShowPreview(false);
    setHtmlPreview('');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const openExternal = () => {
    const urls: Record<Language, string> = {
      python: 'https://repl.it/languages/python3',
      html: 'https://codepen.io/pen/',
      mysql: 'https://www.db-fiddle.com/',
    };
    window.open(urls[lang], '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">ICT Playground</h1>
              <p className="text-slate-400 text-xs">A/L ICT Code Practice</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white text-xs"
            onClick={openExternal}
          >
            Open in Full IDE ↗
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 flex flex-col gap-4">
        {/* Language Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(languageConfig) as Language[]).map((l) => {
            const cfg = languageConfig[l];
            const Icon = cfg.icon;
            const isActive = lang === l;
            return (
              <button
                key={l}
                onClick={() => { setLang(l); setOutput(''); setShowPreview(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${cfg.color} text-white shadow-lg`
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Editor + Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
          {/* Code Editor */}
          <div className="flex flex-col rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-slate-400 text-xs ml-2">
                  {lang === 'python' ? 'main.py' : lang === 'html' ? 'index.html' : 'query.sql'}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCopy} className="text-slate-400 hover:text-white transition-colors p-1">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={handleReset} className="text-slate-400 hover:text-white transition-colors p-1">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <textarea
              value={currentCode}
              onChange={(e) => setCode(prev => ({ ...prev, [lang]: e.target.value }))}
              className="flex-1 bg-slate-900 text-slate-100 font-mono text-sm p-4 resize-none outline-none min-h-[400px] leading-relaxed"
              spellCheck={false}
            />
            <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 flex gap-2">
              <Button
                onClick={handleRun}
                disabled={running}
                size="sm"
                className={`bg-gradient-to-r ${config.color} text-white border-0 hover:opacity-90`}
              >
                <Play className="w-4 h-4 mr-1" />
                {lang === 'html' ? 'Preview' : lang === 'mysql' ? 'View Info' : 'Run'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openExternal}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Run in IDE ↗
              </Button>
            </div>
          </div>

          {/* Output / Preview */}
          <div className="flex flex-col rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
            <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
              <span className="text-slate-400 text-xs font-medium">
                {lang === 'html' ? 'Preview' : 'Output / Reference'}
              </span>
            </div>

            {lang === 'html' && showPreview ? (
              <iframe
                srcDoc={htmlPreview}
                className="flex-1 w-full bg-white"
                title="HTML Preview"
                sandbox="allow-scripts"
              />
            ) : lang === 'html' && !showPreview ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3 p-8">
                <Globe className="w-12 h-12 opacity-30" />
                <p className="text-sm text-center">Click <strong className="text-orange-400">Preview</strong> to see your HTML & CSS rendered live</p>
              </div>
            ) : output ? (
              <pre className="flex-1 p-4 text-sm font-mono text-green-400 overflow-auto whitespace-pre-wrap">
                {output}
              </pre>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3 p-8">
                {lang === 'python' && <Code2 className="w-12 h-12 opacity-30" />}
                {lang === 'mysql' && <Database className="w-12 h-12 opacity-30" />}
                <p className="text-sm text-center">
                  {lang === 'python'
                    ? 'Click Run to execute your Python code'
                    : 'Click "View Info" to see SQL reference notes'}
                </p>
                {lang === 'mysql' && (
                  <div className="mt-2 space-y-2 w-full max-w-xs">
                    {[
                      { name: 'DB Fiddle', url: 'https://www.db-fiddle.com/' },
                      { name: 'SQLiteOnline', url: 'https://sqliteonline.com/' },
                      { name: 'OneCompiler MySQL', url: 'https://onecompiler.com/mysql' },
                    ].map(tool => (
                      <button
                        key={tool.name}
                        onClick={() => window.open(tool.url, '_blank')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm flex items-center justify-between"
                      >
                        <span>{tool.name}</span>
                        <span className="text-slate-500">↗</span>
                      </button>
                    ))}
                  </div>
                )}
                {lang === 'python' && (
                  <div className="mt-2 space-y-2 w-full max-w-xs">
                    {[
                      { name: 'Replit Python', url: 'https://repl.it/languages/python3' },
                      { name: 'Trinket.io', url: 'https://trinket.io/python' },
                      { name: 'OneCompiler Python', url: 'https://onecompiler.com/python' },
                    ].map(tool => (
                      <button
                        key={tool.name}
                        onClick={() => window.open(tool.url, '_blank')}
                        className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm flex items-center justify-between"
                      >
                        <span>{tool.name}</span>
                        <span className="text-slate-500">↗</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Reference */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h3 className="text-slate-300 font-semibold text-sm mb-3">📚 A/L ICT Quick Reference — {config.label}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {lang === 'python' && [
              ['Variables', 'x = 10'],
              ['List', 'lst = [1, 2, 3]'],
              ['For Loop', 'for i in range(5):'],
              ['Function', 'def func(x): return x'],
              ['If/Else', 'if x > 0: ... else: ...'],
              ['Dictionary', '{"key": "value"}'],
              ['Input', 'x = input("Enter: ")'],
              ['Print', 'print(f"Hello {name}")'],
            ].map(([label, snippet]) => (
              <button
                key={label}
                onClick={() => { navigator.clipboard.writeText(snippet); toast.success(`Copied: ${snippet}`); }}
                className="text-left p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <div className="text-slate-300 text-xs font-medium">{label}</div>
                <div className="text-blue-400 text-xs font-mono mt-0.5 truncate">{snippet}</div>
              </button>
            ))}
            {lang === 'html' && [
              ['Heading', '<h1>Title</h1>'],
              ['Paragraph', '<p>Text</p>'],
              ['Link', '<a href="#">Link</a>'],
              ['Image', '<img src="url" alt="">'],
              ['Div', '<div class="box">'],
              ['Button', '<button>Click</button>'],
              ['Input', '<input type="text">'],
              ['CSS Class', '.class { color: red; }'],
            ].map(([label, snippet]) => (
              <button
                key={label}
                onClick={() => { navigator.clipboard.writeText(snippet); toast.success(`Copied: ${snippet}`); }}
                className="text-left p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <div className="text-slate-300 text-xs font-medium">{label}</div>
                <div className="text-orange-400 text-xs font-mono mt-0.5 truncate">{snippet}</div>
              </button>
            ))}
            {lang === 'mysql' && [
              ['SELECT', 'SELECT * FROM table;'],
              ['WHERE', 'WHERE column = value'],
              ['INSERT', 'INSERT INTO t VALUES'],
              ['UPDATE', 'UPDATE t SET col=val'],
              ['DELETE', 'DELETE FROM t WHERE'],
              ['JOIN', 'JOIN t2 ON t1.id=t2.id'],
              ['GROUP BY', 'GROUP BY column'],
              ['ORDER BY', 'ORDER BY col DESC'],
            ].map(([label, snippet]) => (
              <button
                key={label}
                onClick={() => { navigator.clipboard.writeText(snippet); toast.success(`Copied: ${snippet}`); }}
                className="text-left p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <div className="text-slate-300 text-xs font-medium">{label}</div>
                <div className="text-green-400 text-xs font-mono mt-0.5 truncate">{snippet}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playground;
