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
type Language = 'python' | 'html' | 'css' | 'sql' | 'javascript' | 'php' | 'text';

const extToLang = (name: string): Language => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'py') return 'python';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'sql') return 'sql';
  if (['js','ts','jsx','tsx'].includes(ext)) return 'javascript';
  if (ext === 'php') return 'php';
  return 'text';
};

const langMeta: Record<Language, { label: string; color: string; bg: string; emoji: string }> = {
  python:     { label: 'Python',     color: '#3b82f6', bg: '#3b82f620', emoji: '🐍' },
  html:       { label: 'HTML',       color: '#f97316', bg: '#f9731620', emoji: '🌐' },
  css:        { label: 'CSS',        color: '#a855f7', bg: '#a855f720', emoji: '🎨' },
  sql:        { label: 'SQL',        color: '#22c55e', bg: '#22c55e20', emoji: '🗄️' },
  javascript: { label: 'JavaScript', color: '#eab308', bg: '#eab30820', emoji: '⚡' },
  php:        { label: 'PHP',        color: '#7c3aed', bg: '#7c3aed20', emoji: '🐘' },
  text:       { label: 'Text',       color: '#6b7280', bg: '#6b728020', emoji: '📄' },
};

const DEFAULT_FILES: Omit<PlayFile, 'id'>[] = [
  { name: 'python_basics.py', sortOrder: 0, code: `# Python Basics
name  = "Kamal"
grade = 13
marks = [92, 88, 76]

for i, m in enumerate(marks):
    print("Subject", i + 1, ":", m)

avg = sum(marks) / len(marks)
print("Average:", avg)

if avg >= 80:
    print("Distinction")
else:
    print("Pass")
` },
  { name: 'oop_python.py', sortOrder: 1, code: `# OOP - Class & Inheritance
class Animal:
    def __init__(self, name):
        self.name = name
    def speak(self):
        return self.name + " makes a sound."

class Dog(Animal):
    def speak(self):
        return self.name + " says: Woof!"

class Cat(Animal):
    def speak(self):
        return self.name + " says: Meow!"

print(Dog("Rex").speak())
print(Cat("Luna").speak())
` },
  { name: 'index.html', sortOrder: 2, code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Page</title>
  <style>
    body { font-family: Arial; padding: 20px; background: #f5f5f5; }
    button { padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Hello, ICT Student!</h1>
  <p id="msg">Click the button below.</p>
  <button onclick="document.getElementById('msg').textContent='Hello World!'">Click Me</button>
</body>
</html>` },
  { name: 'style.css', sortOrder: 3, code: `/* CSS Basics */
body {
  font-family: Arial;
  background: #f0f0f0;
  padding: 20px;
}

h1 { color: #4f46e5; }

.card {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

button {
  background: #4f46e5;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}` },
  { name: 'script.js', sortOrder: 4, code: `// JavaScript Basics
let name = "Kamal";
let marks = [85, 92, 78];

console.log("Name:", name);

let total = 0;
for (let m of marks) total += m;
console.log("Average:", total / marks.length);

function greet(person) {
  return "Hello, " + person + "!";
}
console.log(greet("Nimal"));
` },
  { name: 'student_form.php', sortOrder: 5, code: `<?php
$name  = "Kamal";
$marks = 85;

echo "Name  : $name\\n";
echo "Marks : $marks\\n";

if ($marks >= 75) {
    echo "Result: Distinction\\n";
} elseif ($marks >= 55) {
    echo "Result: Pass\\n";
} else {
    echo "Result: Fail\\n";
}

$students = ["Kamal", "Nimal", "Dilani"];
foreach ($students as $s) {
    echo "Student: $s\\n";
}
?>` },
  { name: 'school_db.sql', sortOrder: 6, code: `-- SQL Basics

CREATE TABLE students (
  id    INT PRIMARY KEY,
  name  VARCHAR(50),
  grade INT,
  marks INT
);

INSERT INTO students VALUES (1, 'Kamal',  13, 92);
INSERT INTO students VALUES (2, 'Nimal',  12, 78);
INSERT INTO students VALUES (3, 'Dilani', 13, 85);

SELECT * FROM students;
SELECT name, marks FROM students WHERE marks >= 80;
SELECT AVG(marks) AS average FROM students;
` },
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

// ─── Language References ───────────────────────────────────────────────────────
interface CodeRef { title: string; desc: string; code: string; }
const LANG_REFS: Record<Language, CodeRef[]> = {
  python: [
    { title: 'Variables & Types', desc: 'str, int, float, bool', code: `name = "Kamal"      # str\nage  = 17           # int\ngpa  = 3.85         # float\nactive = True       # bool\nprint(type(name))   # <class 'str'>` },
    { title: 'List & Loop', desc: 'list iteration with for', code: `marks = [92, 88, 76, 85]\nfor m in marks:\n    print(m)\nprint(sum(marks) / len(marks))  # avg` },
    { title: 'Dictionary', desc: 'key-value pairs', code: `student = {"name": "Nimal", "grade": 13}\nprint(student["name"])       # Nimal\nfor k, v in student.items():\n    print(k, ":", v)` },
    { title: 'Function', desc: 'def, parameters, return', code: `def greet(name, grade=13):\n    return f"Hello {name}, Grade {grade}"\n\nprint(greet("Amali"))\nprint(greet("Kamal", 12))` },
    { title: 'Class (OOP)', desc: 'class, __init__, method', code: `class Student:\n    def __init__(self, name, marks):\n        self.name  = name\n        self.marks = marks\n    def average(self):\n        return sum(self.marks) / len(self.marks)\n\ns = Student("Nimal", [90, 85, 78])\nprint(s.average())` },
  ],
  html: [
    { title: 'Basic Structure', desc: 'HTML5 boilerplate', code: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>` },
    { title: 'Form Elements', desc: 'input, select, button', code: `<form action="/submit" method="POST">\n  <input type="text" name="name" placeholder="Name">\n  <select name="grade">\n    <option value="12">Grade 12</option>\n    <option value="13">Grade 13</option>\n  </select>\n  <button type="submit">Submit</button>\n</form>` },
    { title: 'Table', desc: 'table, tr, th, td', code: `<table border="1">\n  <thead>\n    <tr><th>Name</th><th>Mark</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>Kamal</td><td>92</td></tr>\n    <tr><td>Nimal</td><td>88</td></tr>\n  </tbody>\n</table>` },
    { title: 'Semantic Tags', desc: 'header, main, section, footer', code: `<header><nav>Menu</nav></header>\n<main>\n  <section id="about">\n    <h2>About</h2>\n    <p>Content here...</p>\n  </section>\n</main>\n<footer>© 2024</footer>` },
  ],
  css: [
    { title: 'Selectors', desc: 'class, id, element, pseudo', code: `/* element */\np { color: blue; }\n\n/* class */\n.card { padding: 16px; }\n\n/* id */\n#header { background: #111; }\n\n/* pseudo */\na:hover { text-decoration: none; }` },
    { title: 'Flexbox', desc: 'display:flex, align, justify', code: `.container {\n  display: flex;\n  flex-direction: row;\n  justify-content: space-between;\n  align-items: center;\n  gap: 16px;\n}` },
    { title: 'CSS Grid', desc: 'grid-template-columns, gap', code: `.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 20px;\n}\n.grid-item { background: #eee; }` },
    { title: 'Box Model', desc: 'margin, padding, border, shadow', code: `.box {\n  width: 200px;\n  padding: 16px;\n  border: 2px solid #333;\n  margin: 10px auto;\n  border-radius: 8px;\n  box-shadow: 0 4px 12px rgba(0,0,0,0.1);\n}` },
  ],
  javascript: [
    { title: 'Variables & Arrow Fn', desc: 'let, const, arrow function', code: `const name = "Kamal";\nlet marks = [90, 85, 78];\n\nconst avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;\nconsole.log(avg(marks));  // 84.33` },
    { title: 'DOM Manipulation', desc: 'getElementById, addEventListener', code: `const btn = document.getElementById('myBtn');\nconst para = document.querySelector('p');\n\nbtn.addEventListener('click', () => {\n  para.textContent = 'Clicked!';\n  para.style.color = 'green';\n});` },
    { title: 'Array Methods', desc: 'map, filter, find', code: `const marks = [92, 55, 88, 40, 76];\n\nconst passed  = marks.filter(m => m >= 50);\nconst doubled = marks.map(m => m * 2);\nconst top     = marks.find(m => m > 90);\n\nconsole.log(passed);  // [92,55,88,76]` },
    { title: 'Async / Fetch', desc: 'async, await, fetch, JSON', code: `async function getData(url) {\n  const res  = await fetch(url);\n  const data = await res.json();\n  return data;\n}\n// getData('https://api.example.com/data');` },
  ],
  sql: [
    { title: 'CREATE & INSERT', desc: 'DDL + DML basics', code: `CREATE TABLE students (\n  id    INT PRIMARY KEY AUTO_INCREMENT,\n  name  VARCHAR(100) NOT NULL,\n  grade INT,\n  marks DECIMAL(5,2)\n);\n\nINSERT INTO students (name, grade, marks)\nVALUES ('Kamal', 13, 92.5),\n       ('Nimal', 12, 78.0);` },
    { title: 'SELECT & WHERE', desc: 'basic query with filter', code: `-- All rows\nSELECT * FROM students;\n\n-- With condition\nSELECT name, marks\nFROM students\nWHERE marks >= 80\nORDER BY marks DESC;` },
    { title: 'JOIN', desc: 'INNER JOIN two tables', code: `SELECT s.name, c.class_name, s.marks\nFROM students s\nINNER JOIN classes c\n  ON s.class_id = c.id\nWHERE s.marks > 70\nORDER BY s.name;` },
    { title: 'Aggregate Functions', desc: 'COUNT, AVG, MAX, MIN, GROUP BY', code: `SELECT\n  grade,\n  COUNT(*)     AS total,\n  AVG(marks)   AS average,\n  MAX(marks)   AS highest,\n  MIN(marks)   AS lowest\nFROM students\nGROUP BY grade;` },
  ],
  php: [
    { title: 'Variables & Echo', desc: '$var, echo, printf', code: `<?php\n$name  = "Kamal";\n$grade = 13;\n$gpa   = 3.85;\n\necho "Name  : $name\\n";\necho "Grade : " . $grade . "\\n";\nprintf("GPA   : %.2f\\n", $gpa);\n?>` },
    { title: 'Arrays & Foreach', desc: 'indexed + associative arrays', code: `<?php\n$marks = [92, 88, 76, 85];\n$avg   = array_sum($marks) / count($marks);\necho "Average: $avg\\n";\n\nforeach ($marks as $i => $m) {\n    echo "[$i] => $m\\n";\n}\n?>` },
    { title: 'Function', desc: 'function, params, return', code: `<?php\nfunction grade($mark) {\n    if ($mark >= 85) return "A";\n    if ($mark >= 70) return "B";\n    if ($mark >= 55) return "C";\n    return "F";\n}\necho grade(92) . "\\n";  // A\necho grade(65) . "\\n";  // C\n?>` },
    { title: 'If / Foreach', desc: 'conditions and loops', code: `<?php\n$students = ["Kamal"=>92, "Nimal"=>78, "Amali"=>55];\n\nforeach ($students as $name => $mark) {\n    if ($mark >= 80) {\n        echo "$name: Distinction\\n";\n    } else {\n        echo "$name: Pass\\n";\n    }\n}\n?>` },
  ],
  text: [
    { title: 'Tip', desc: 'Open a code file to see references', code: `// Select a .py .html .css .js .sql or .php\n// file to see code examples here.` },
  ],
};

// ─── PHP Simulator ────────────────────────────────────────────────────────────
const runPhpInBrowser = (code: string): string => {
  try {
    const output: string[] = [];

    // Remove PHP open/close tags
    let php = code.replace(/<\?php/gi, '').replace(/\?>/g, '').trim();

    // Simple line-by-line simulation
    const lines = php.split('\n');
    const vars: Record<string, any> = {};
    const constants: Record<string, any> = {};
    const functions: Record<string, { params: string[]; body: string[] }> = {};

    const resolveVal = (raw: string): any => {
      raw = raw.trim();
      // null
      if (raw.toLowerCase() === 'null') return null;
      // bool
      if (raw.toLowerCase() === 'true') return true;
      if (raw.toLowerCase() === 'false') return false;
      // quoted string
      if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
        let s = raw.slice(1, -1);
        // interpolate $vars in double-quoted strings
        if (raw.startsWith('"')) {
          s = s.replace(/\$(\w+)/g, (_, n) => String(vars['$' + n] ?? vars[n] ?? ''));
        }
        return s;
      }
      // number
      if (!isNaN(Number(raw))) return Number(raw);
      // variable
      if (raw.startsWith('$')) return vars[raw] ?? '';
      // constant
      if (constants[raw] !== undefined) return constants[raw];
      // string concatenation via .
      if (raw.includes(' . ')) {
        return raw.split(' . ').map(p => resolveVal(p.trim())).join('');
      }
      // str_repeat
      const strRepeat = raw.match(/str_repeat\s*\(\s*(.+?),\s*(\d+)\s*\)/i);
      if (strRepeat) return resolveVal(strRepeat[1]).repeat(Number(strRepeat[2]));
      // count / sizeof
      const countM = raw.match(/(?:count|sizeof)\s*\(\s*(\$\w+)\s*\)/i);
      if (countM) { const v = vars[countM[1]]; return Array.isArray(v) ? v.length : 0; }
      // array_sum
      const sumM = raw.match(/array_sum\s*\(\s*(\$\w+)\s*\)/i);
      if (sumM) { const v = vars[sumM[1]]; return Array.isArray(v) ? v.reduce((a: number, b: number) => a + Number(b), 0) : 0; }
      // max / min of array
      const maxM = raw.match(/max\s*\(\s*(\$\w+)\s*\)/i);
      if (maxM) { const v = vars[maxM[1]]; return Array.isArray(v) ? Math.max(...v.map(Number)) : 0; }
      const minM = raw.match(/min\s*\(\s*(\$\w+)\s*\)/i);
      if (minM) { const v = vars[minM[1]]; return Array.isArray(v) ? Math.min(...v.map(Number)) : 0; }
      // strtoupper / strtolower
      const upperM = raw.match(/strtoupper\s*\(\s*(.+)\s*\)/i);
      if (upperM) return String(resolveVal(upperM[1])).toUpperCase();
      const lowerM = raw.match(/strtolower\s*\(\s*(.+)\s*\)/i);
      if (lowerM) return String(resolveVal(lowerM[1])).toLowerCase();
      // trim
      const trimM = raw.match(/trim\s*\(\s*(.+)\s*\)/i);
      if (trimM) return String(resolveVal(trimM[1])).trim();
      // strlen
      const lenM = raw.match(/strlen\s*\(\s*(.+)\s*\)/i);
      if (lenM) return String(resolveVal(lenM[1])).length;
      // str_replace
      const replM = raw.match(/str_replace\s*\(\s*(.+?),\s*(.+?),\s*(.+?)\s*\)/i);
      if (replM) return String(resolveVal(replM[3])).replace(new RegExp(resolveVal(replM[1]), 'g'), resolveVal(replM[2]));
      // implode / join
      const implodeM = raw.match(/implode\s*\(\s*(.+?),\s*(\$\w+)\s*\)/i);
      if (implodeM) { const arr = vars[implodeM[2]]; return Array.isArray(arr) ? arr.join(resolveVal(implodeM[1])) : ''; }
      // explode
      const explodeM = raw.match(/explode\s*\(\s*(.+?),\s*(.+?)\s*\)/i);
      if (explodeM) return String(resolveVal(explodeM[2])).split(String(resolveVal(explodeM[1])));
      // round / floor / ceil
      const roundM = raw.match(/round\s*\(\s*(.+?)\s*(?:,\s*(\d+))?\s*\)/i);
      if (roundM) { const dp = Number(roundM[2] ?? 0); return Number(Number(resolveVal(roundM[1])).toFixed(dp)); }
      // array_merge with spread
      const mergeM = raw.match(/array_merge\s*\((.+)\)/i);
      if (mergeM) {
        return mergeM[1].split(',').flatMap(p => {
          const v = resolveVal(p.trim());
          return Array.isArray(v) ? v : [v];
        });
      }
      // function call (user-defined)
      const funcCallM = raw.match(/^(\w+)\s*\((.*)?\)$/);
      if (funcCallM && functions[funcCallM[1].toLowerCase()]) {
        const fn = functions[funcCallM[1].toLowerCase()];
        const argVals = funcCallM[2] ? funcCallM[2].split(',').map(a => resolveVal(a.trim())) : [];
        const localVars = { ...vars };
        fn.params.forEach((p, i) => { localVars[p] = argVals[i] ?? null; });
        const savedVars = { ...vars };
        Object.assign(vars, localVars);
        let ret: any = null;
        for (const bl of fn.body) {
          const retM = bl.trim().match(/^return\s+(.+);?$/i);
          if (retM) { ret = resolveVal(retM[1]); break; }
          processLine(bl, output);
        }
        Object.assign(vars, savedVars);
        return ret;
      }
      // arithmetic
      try {
        const safe = raw.replace(/\$(\w+)/g, (_, n) => {
          const v = vars['$' + n] ?? vars[n] ?? 0;
          return typeof v === 'number' ? String(v) : `"${v}"`;
        });
        // eslint-disable-next-line no-new-func
        return Function('"use strict"; return (' + safe + ')')();
      } catch { return raw; }
    };

    const processLine = (line: string, out: string[]) => {
      const t = line.trim();
      if (!t || t.startsWith('//') || t.startsWith('#')) return;

      // define('KEY', value)
      const defineM = t.match(/^define\s*\(\s*['"](\w+)['"]\s*,\s*(.+?)\s*\);?$/i);
      if (defineM) { constants[defineM[1]] = resolveVal(defineM[2]); return; }

      // echo / print
      const echoM = t.match(/^(?:echo|print)\s+(.+?);?$/i);
      if (echoM) {
        let val = echoM[1].trim();
        // handle concatenation with . and APP_NAME etc
        const parts = val.split(/\s*\.\s*/);
        const resolved = parts.map(p => {
          const pv = resolveVal(p.trim());
          return pv === null ? '' : String(pv);
        }).join('');
        out.push(resolved.replace(/\\n/g, '\n'));
        return;
      }

      // printf
      const printfM = t.match(/^printf\s*\(\s*(.+)\s*\);?$/i);
      if (printfM) {
        try {
          const args = printfM[1].split(',').map(a => resolveVal(a.trim()));
          let fmt = String(args[0]);
          let ai = 1;
          const result = fmt.replace(/%(-?\d*\.?\d*)?([sdfu])/g, (_, pad, spec) => {
            const v = args[ai++] ?? '';
            const n = Number(v);
            let s = spec === 'f' ? (isNaN(n) ? String(v) : n.toFixed(Number((pad||'').split('.')[1]) || 0))
                    : spec === 'd' ? String(Math.floor(n))
                    : String(v);
            if (pad) {
              const width = Math.abs(Number(pad.split('.')[0]));
              const leftAlign = pad.startsWith('-');
              if (width > s.length) s = leftAlign ? s.padEnd(width) : s.padStart(width);
            }
            return s;
          });
          out.push(result.replace(/\\n/g, '\n'));
        } catch { /* skip */ }
        return;
      }

      // print_r($var)
      const printRM = t.match(/^print_r\s*\(\s*(\$\w+)\s*\);?$/i);
      if (printRM) {
        const v = vars[printRM[1]];
        if (Array.isArray(v)) {
          out.push('Array\n(\n');
          v.forEach((item, i) => out.push(`    [${i}] => ${item}\n`));
          out.push(')\n');
        } else { out.push(String(v ?? '') + '\n'); }
        return;
      }

      // $var = value
      const assignM = t.match(/^(\$\w+)\s*=\s*(.+?);?$/);
      if (assignM) { vars[assignM[1]] = resolveVal(assignM[2]); return; }

      // foreach ($arr as $v) or foreach ($arr as $k => $v)
      const foreachM = t.match(/^foreach\s*\(\s*(\$\w+)\s+as\s+(?:(\$\w+)\s*=>\s*)?(\$\w+)\s*\)/i);
      if (foreachM) return; // handled in block parsing

      // if statement
      const ifM = t.match(/^if\s*\(/i);
      if (ifM) return;
    };

    // Block-level parser
    let i = 0;
    const skipBlock = () => {
      let depth = 0;
      while (i < lines.length) {
        const l = lines[i]; i++;
        depth += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
        if (depth <= 0) break;
      }
    };

    const evalCondition = (cond: string): boolean => {
      try {
        const safe = cond
          .replace(/\$(\w+)/g, (_, n) => { const v = vars['$' + n] ?? vars[n]; return JSON.stringify(v ?? null); })
          .replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||').replace(/\bnot\b/gi, '!')
          .replace(/!empty\(([^)]+)\)/g, (_, v) => { const vv = resolveVal(v.trim()); return String(!!vv && vv !== '' && vv !== 0); })
          .replace(/empty\(([^)]+)\)/g, (_, v) => { const vv = resolveVal(v.trim()); return String(!vv || vv === '' || vv === 0); })
          .replace(/is_numeric\(([^)]+)\)/g, (_, v) => String(!isNaN(Number(resolveVal(v.trim())))));
        // eslint-disable-next-line no-new-func
        return !!Function('"use strict"; return (' + safe + ')')();
      } catch { return false; }
    };

    // Collect function definitions first
    const codeLines = lines.map(l => l.trim());
    for (let fi = 0; fi < codeLines.length; fi++) {
      const funcDefM = codeLines[fi].match(/^function\s+(\w+)\s*\(([^)]*)\)\s*\{?/i);
      if (funcDefM) {
        const fname = funcDefM[1].toLowerCase();
        const params = funcDefM[2].split(',').map(p => p.trim()).filter(Boolean);
        const body: string[] = [];
        let depth = codeLines[fi].includes('{') ? 1 : 0;
        fi++;
        while (fi < codeLines.length) {
          const bl = codeLines[fi];
          depth += (bl.match(/\{/g) || []).length - (bl.match(/\}/g) || []).length;
          if (depth <= 0) break;
          body.push(bl);
          fi++;
        }
        functions[fname] = { params, body };
      }
    }

    // Main execution pass
    while (i < lines.length) {
      const raw = lines[i]; i++;
      const t = raw.trim();
      if (!t || t.startsWith('//') || t.startsWith('#') || t.startsWith('/*') || t.startsWith('*')) continue;
      if (t.startsWith('function ')) { skipBlock(); continue; } // skip function bodies
      if (t === '?>') continue;

      // foreach
      const foreachM = t.match(/^foreach\s*\(\s*(\$\w+)\s+as\s+(?:(\$\w+)\s*=>\s*)?(\$\w+)\s*\)\s*\{?/i);
      if (foreachM) {
        const arr = vars[foreachM[1]];
        const keyVar = foreachM[2] || null;
        const valVar = foreachM[3];
        const bodyLines: string[] = [];
        let depth = t.includes('{') ? 1 : 0;
        if (depth === 0) { bodyLines.push(lines[i] || ''); i++; }
        else {
          while (i < lines.length) {
            const bl = lines[i]; i++;
            depth += (bl.match(/\{/g) || []).length - (bl.match(/\}/g) || []).length;
            if (depth <= 0) break;
            bodyLines.push(bl);
          }
        }
        if (Array.isArray(arr)) {
          arr.forEach((item, idx) => {
            if (keyVar) vars[keyVar] = idx;
            vars[valVar] = item;
            for (const bl of bodyLines) processLine(bl, output);
          });
        } else if (arr && typeof arr === 'object') {
          Object.entries(arr).forEach(([k, v]) => {
            if (keyVar) vars[keyVar] = k;
            vars[valVar] = v;
            for (const bl of bodyLines) processLine(bl, output);
          });
        }
        continue;
      }

      // if / else
      const ifM = t.match(/^if\s*\((.+)\)\s*\{?/i);
      if (ifM) {
        const cond = ifM[1];
        const truePart: string[] = [];
        const falsePart: string[] = [];
        let depth = t.includes('{') ? 1 : 0;
        let inElse = false;
        if (depth === 0) { if (evalCondition(cond)) processLine(lines[i] || '', output); i++; continue; }
        while (i < lines.length) {
          const bl = lines[i]; i++;
          const blt = bl.trim();
          depth += (bl.match(/\{/g) || []).length - (bl.match(/\}/g) || []).length;
          if (depth <= 0) {
            if (blt.match(/^}\s*else\s*\{?/i)) { inElse = true; depth = blt.includes('{') ? 1 : 0; continue; }
            break;
          }
          if (inElse) falsePart.push(bl); else truePart.push(bl);
        }
        const execPart = evalCondition(cond) ? truePart : falsePart;
        for (const bl of execPart) processLine(bl, output);
        continue;
      }

      processLine(t, output);
    }

    return output.join('') || '(no output)';
  } catch (e: any) {
    return `Error: ${e.message}`;
  }
};

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
  const [showRefs, setShowRefs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
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
  const hasHtmlFile = files.some(f => ['html','htm'].includes(f.name.split('.').pop()?.toLowerCase() ?? ''));
  const isWebLang = lang === 'html' || lang === 'css' || (lang === 'javascript' && hasHtmlFile);
  const runLabel = lang === 'sql' ? 'Run SQL' : lang === 'php' ? 'Run PHP' : isWebLang ? 'Preview' : 'Run';

  useEffect(() => {
    // getSession() restores from storage first — sets auth as ready
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setUserId(s?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load files from DB only after auth is fully ready; seed defaults if none exist
  useEffect(() => {
    if (!authReady || !userId) return;
    supabase.from('playground_files' as any).select('*').eq('user_id', userId).order('sort_order')
      .then(async ({ data, error }: any) => {
        if (!error && data && data.length > 0) {
          const mapped: PlayFile[] = data.map((r: any) => ({
            id: r.id,
            name: r.name,
            code: r.code,
            sortOrder: r.sort_order,
          }));
          // Seed any missing default files (e.g. school_db.sql added later)
          const missingDefaults = DEFAULT_FILES.filter(
            df => !mapped.some(f => f.name === df.name)
          );
          if (missingDefaults.length > 0) {
            const newFiles = missingDefaults.map(f => ({ ...f, id: makeId() }));
            const insertData = newFiles.map(f => ({
              id: f.id, user_id: userId, name: f.name, code: f.code, sort_order: f.sortOrder,
            }));
            await (supabase.from as any)('playground_files').insert(insertData);
            mapped.push(...newFiles);
            mapped.sort((a, b) => a.sortOrder - b.sortOrder);
          }
          setFiles(mapped);
          setActiveId(mapped[0].id);
          setOutput('');
          setHasRun(false);
          setShowPreview(false);
        } else if (!error && (!data || data.length === 0)) {
          // No files in DB — seed defaults
          const defaults = DEFAULT_FILES.map(f => ({ ...f, id: makeId() }));
          const insertData = defaults.map(f => ({
            id: f.id,
            user_id: userId,
            name: f.name,
            code: f.code,
            sort_order: f.sortOrder,
          }));
          await (supabase.from as any)('playground_files').insert(insertData);
          setFiles(defaults);
          setActiveId(defaults[0].id);
        }
      });
  }, [authReady, userId]);

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

  // Build combined HTML preview from html + css + js files
  const buildWebPreview = () => {
    const htmlFile = files.find(f => ['html','htm'].includes(f.name.split('.').pop()?.toLowerCase() ?? ''));
    const cssFile = files.find(f => f.name.split('.').pop()?.toLowerCase() === 'css');
    const jsFile = files.find(f => ['js','ts'].includes(f.name.split('.').pop()?.toLowerCase() ?? ''));
    let html = htmlFile?.code ?? '<html><body></body></html>';
    if (cssFile?.code) {
      html = html.replace('</head>', `<style>\n${cssFile.code}\n</style>\n</head>`);
      if (!html.includes('</head>')) html = `<style>\n${cssFile.code}\n</style>\n` + html;
    }
    if (jsFile?.code) {
      html = html.replace('</body>', `<script>\n${jsFile.code}\n</script>\n</body>`);
      if (!html.includes('</body>')) html += `<script>\n${jsFile.code}\n</script>`;
    }
    return html;
  };

  const handleRun = async () => {
    if (!activeFile) return;
    setHasRun(true); setShowPreview(false);
    const code = activeFile.code;
    // HTML, CSS, JS all trigger combined web preview
    const hasHtml = files.some(f => ['html','htm'].includes(f.name.split('.').pop()?.toLowerCase() ?? ''));
    if (lang === 'html' || lang === 'css' || (lang === 'javascript' && hasHtml)) {
      setHtmlPreview(buildWebPreview()); setShowPreview(true); setOutput(''); return;
    }
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

      // Detect unsupported features in Skulpt and show helpful messages
      const unsupportedPatterns: { pattern: RegExp; hint: string }[] = [
        { pattern: /open\s*\(.*encoding\s*=/,    hint: '⚠ open() with encoding= is not supported in the browser Python engine (Skulpt). Remove the encoding keyword: open(filename, "w")' },
        { pattern: /open\s*\(/,                  hint: '⚠ File I/O (open/read/write) is not supported in the browser Python engine (Skulpt).\nThis is a browser limitation — no real filesystem exists here.\n\nTip: Use print() to display output instead.' },
        { pattern: /import\s+os\b/,              hint: '⚠ The "os" module is not supported in Skulpt (browser Python). Use print() for output.' },
        { pattern: /import\s+sys\b/,             hint: '⚠ The "sys" module has limited support in Skulpt. sys.stdin and file I/O are not available.' },
        { pattern: /import\s+json\b/,            hint: '⚠ The "json" module has limited support in Skulpt.' },
      ];

      for (const { pattern, hint } of unsupportedPatterns) {
        if (pattern.test(code)) {
          setOutput(hint);
          setRunning(false);
          return;
        }
      }
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
    if (lang === 'php') {
      setRunning(true);
      try {
        const result = runPhpInBrowser(code);
        setOutput(result);
      } catch (e: any) {
        setOutput(`Error: ${e.message}`);
      } finally {
        setRunning(false);
      }
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

          {/* Language tabs at bottom of explorer — HTML/CSS/JS shown separately */}
          <div className="border-t p-2 flex flex-wrap gap-1">
            {(['python','html','css','javascript','php','sql'] as Language[]).map(l => {
              const m = langMeta[l];
              const isActive = lang === l;
              const extMap: Record<string, string[]> = {
                html: ['html','htm'], css: ['css'], javascript: ['js','ts','jsx','tsx'],
                python: ['py'], sql: ['sql'], php: ['php'],
              };
              const match = files.find(f => (extMap[l] ?? []).includes(f.name.split('.').pop()?.toLowerCase() ?? ''));
              if (!match) return null;
              return (
                <button key={l}
                  onClick={() => { setActiveId(match.id); setOutput(''); setHasRun(false); setShowPreview(false); }}
                  title={m.label}
                  className="text-xs px-2 py-0.5 rounded-full transition-all"
                  style={{
                    background: isActive ? m.bg : 'transparent',
                    color: isActive ? m.color : 'var(--muted-foreground)',
                    border: `1px solid ${isActive ? m.color + '60' : 'transparent'}`,
                  }}>
                  {m.emoji} {m.label}
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

        {/* ── Card 3: Output / Preview / References ── */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col" style={{ minHeight: 480 }}>
          {/* Tab header */}
          <div className="flex items-center border-b bg-muted/30">
            <button
              onClick={() => setShowRefs(false)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2"
              style={{
                borderBottomColor: !showRefs ? meta.color : 'transparent',
                color: !showRefs ? meta.color : 'var(--muted-foreground)',
              }}>
              <Terminal className="w-3.5 h-3.5" />
              {isWebLang && showPreview ? '🌐 Web Preview' : lang === 'sql' ? 'SQL Output' : lang === 'php' ? 'PHP Output' : 'Output'}
            </button>
            <button
              onClick={() => setShowRefs(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2"
              style={{
                borderBottomColor: showRefs ? meta.color : 'transparent',
                color: showRefs ? meta.color : 'var(--muted-foreground)',
              }}>
              📚 References
            </button>
            {running && !showRefs && <Loader2 className="w-3 h-3 animate-spin text-primary ml-auto mr-4" />}
          </div>

          {showRefs ? (
            /* ── References Panel ── */
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-2">
              <p className="text-xs text-muted-foreground mb-1">
                {meta.emoji} <span className="font-semibold text-foreground">{meta.label}</span> quick references
              </p>
              {(LANG_REFS[lang] ?? LANG_REFS.text).map((ref, i) => (
                <div key={i} className="flex flex-col gap-1 rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                    <div>
                      <span className="text-xs font-semibold text-foreground">{ref.title}</span>
                      <span className="text-xs text-muted-foreground ml-2">{ref.desc}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        title="Copy code"
                        onClick={() => { navigator.clipboard.writeText(ref.code); toast.success('Copied!'); }}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      <button
                        title="Load into editor and run"
                        onClick={() => {
                          if (activeFile) {
                            updateCode(ref.code);
                            setShowRefs(false);
                            setTimeout(() => handleRun(), 100);
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:opacity-90 transition-colors text-white"
                        style={{ background: meta.color }}
                      >
                        <Play className="w-3 h-3" /> Run
                      </button>
                    </div>
                  </div>
                  <pre className="text-xs font-mono px-3 py-2 bg-[#0d1117] text-[#e6edf3] overflow-x-auto whitespace-pre leading-relaxed">
                    {ref.code}
                  </pre>
                </div>
              ))}
            </div>
          ) : isWebLang && showPreview ? (
            <iframe srcDoc={htmlPreview} className="flex-1 w-full bg-white" title="HTML Preview" sandbox="allow-scripts" />
          ) : (
            <div ref={outputRef} className="flex-1 overflow-auto p-4 bg-[#0d1117]" style={{ minHeight: 380 }}>
              {!hasRun ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 select-none opacity-30">
                  <span className="text-4xl font-mono font-bold text-gray-500">&lt;/&gt;</span>
                  <p className="text-xs text-center text-gray-500">
                    {lang === 'html' ? 'Click Preview to render HTML'
                      : lang === 'sql' ? 'Click Run SQL to execute'
                      : lang === 'php' ? 'Click Run PHP to execute'
                      : lang === 'css' ? 'Click Preview to view CSS'
                      : 'Click Run to execute code'}
                  </p>
                </div>
              ) : output ? (
                <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap break-words"
                  style={{ color: output.startsWith('⚠') ? '#eab308' : output.includes('Error:') ? '#f85149' : '#3fb950' }}>
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
