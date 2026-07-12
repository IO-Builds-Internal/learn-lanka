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
  <h1>Hello, A/L Student!</h1>
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
// Simulated form handling for A/L Students
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $name = $_POST["student_name"] ?? "Anonymous";
    $marks = intval($_POST["marks"] ?? 0);
    
    echo "--- Student Form Submission ---\\n";
    echo "Name: $name\\n";
    echo "Marks: $marks\\n";
    
    if ($marks >= 75) {
        echo "Grade: A (Distinction)\\n";
    } elseif ($marks >= 65) {
        echo "Grade: B\\n";
    } elseif ($marks >= 55) {
        echo "Grade: C\\n";
    } else {
        echo "Grade: F\\n";
    }
    
    // Connect to simulated DB
    $conn = mysqli_connect("localhost", "root", "", "school");
    if ($conn) {
        // Insert submitted student info into our database
        $randId = rand(10, 99);
        mysqli_query($conn, "INSERT INTO students VALUES ($randId, '$name', 13, $marks)");
        echo "Successfully registered student $name in virtual database!\\n";
        
        // Print all registered students in database
        echo "\\n--- Updated Student Database Table ---\\n";
        $result = mysqli_query($conn, "SELECT * FROM students");
        while ($row = mysqli_fetch_assoc($result)) {
            echo "ID: " . $row['id'] . " | Name: " . $row['name'] . " | Marks: " . $row['marks'] . "\\n";
        }
    }
} else {
    echo "Please submit the form using POST method from the 'Form Inputs' tab to see form submission in action!";
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
    { title: 'CREATE & INSERT', desc: 'DDL + DML basics', code: `CREATE TABLE students (\n  id    INT PRIMARY KEY,\n  name  VARCHAR(100) NOT NULL,\n  grade INT,\n  marks DECIMAL(5,2)\n);\n\nINSERT INTO students (name, grade, marks)\nVALUES ('Kamal', 13, 92.5),\n       ('Nimal', 12, 78.0);` },
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

// ─── Shared Virtual Database & SQL Engine ─────────────────────────────────────
type DbTable = {
  columns: string[];
  rows: Record<string, any>[];
};
type VirtualDb = Record<string, DbTable>;

interface SqlResult {
  success: boolean;
  rows?: any[];
  error?: string;
  outputString: string;
  updatedDb: VirtualDb;
}

const executeSql = (code: string, currentDb: VirtualDb): SqlResult => {
  const db: VirtualDb = JSON.parse(JSON.stringify(currentDb));
  const output: string[] = [];
  let lastRows: any[] | undefined = undefined;

  try {
    const stmts: string[] = [];
    let curr = '', depth = 0, inStr = false, strChar = '';
    for (const ch of code) {
      if (!inStr && (ch === "'" || ch === '"')) { inStr = true; strChar = ch; }
      else if (inStr && ch === strChar) { inStr = false; }
      if (!inStr && ch === '(') depth++;
      if (!inStr && ch === ')') depth--;
      if (!inStr && ch === ';' && depth === 0) { if (curr.trim()) stmts.push(curr.trim()); curr = ''; }
      else curr += ch;
    }
    if (curr.trim()) stmts.push(curr.trim());

    for (const rawStmt of stmts) {
      const stmt = rawStmt.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!stmt) continue;

      // CREATE TABLE
      const createM = stmt.match(/CREATE\s+TABLE\s+(\w+)\s*\((.+)\)/is);
      if (createM) {
        const tName = createM[1].toLowerCase();
        const colDefs = createM[2].split(',').map(s => s.trim());
        const columns: string[] = [];
        for (const def of colDefs) {
          const cName = def.match(/^(\w+)/)?.[1];
          if (cName && !['primary','unique','foreign','check','index','key'].includes(cName.toLowerCase())) {
            columns.push(cName.toLowerCase());
          }
        }
        db[tName] = { columns, rows: [] };
        output.push(`Table '${createM[1]}' created.`);
        continue;
      }

      // INSERT INTO
      const insertM = stmt.match(/INSERT\s+INTO\s+(\w+)\s*(?:\(([^)]+)\))?\s*VALUES\s*(.+)/is);
      if (insertM) {
        const tName = insertM[1].toLowerCase();
        const table = db[tName];
        if (!table) { output.push(`Error: Table '${insertM[1]}' not found.`); continue; }
        const colNames = insertM[2] ? insertM[2].split(',').map(s => s.trim().toLowerCase()) : table.columns;
        const valsPart = insertM[3];
        const rowMatches = [...valsPart.matchAll(/\(([^)]+)\)/g)];
        for (const rm of rowMatches) {
          const vals = rm[1].split(',').map(s => {
            const v = s.trim();
            if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) return v.slice(1, -1);
            if (!isNaN(Number(v))) return Number(v);
            return v;
          });
          const row: Record<string, any> = {};
          colNames.forEach((c, i) => { row[c] = vals[i] ?? null; });
          table.rows.push(row);
        }
        output.push(`${rowMatches.length} row(s) inserted into '${insertM[1]}'.`);
        continue;
      }

      // UPDATE
      const updateM = stmt.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/is);
      if (updateM) {
        const tName = updateM[1].toLowerCase();
        const table = db[tName];
        if (!table) { output.push(`Error: Table '${updateM[1]}' not found.`); continue; }
        const setAssigns = updateM[2].split(',').map(s => s.trim());
        const whereStr = updateM[3];
        let count = 0;
        table.rows.forEach(row => {
          if (whereStr) {
            const condM = whereStr.match(/(\w+)\s*(=|!=|<>|>=|<=|>|<)\s*(.+)/);
            if (condM) {
              const rv = condM[3].replace(/^['"]|['"]$/g, '');
              const lv = String(row[condM[1].toLowerCase()]);
              const op = condM[2];
              const pass = op === '=' ? lv === rv : op === '!=' || op === '<>' ? lv !== rv : false;
              if (!pass) return;
            }
          }
          setAssigns.forEach(a => {
            const [col, val] = a.split('=').map(s => s.trim());
            const v = val.replace(/^['"]|['"]$/g, '');
            row[col.toLowerCase()] = isNaN(Number(v)) ? v : Number(v);
          });
          count++;
        });
        output.push(`${count} row(s) updated in '${updateM[1]}'.`);
        continue;
      }

      // DELETE
      const deleteM = stmt.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/is);
      if (deleteM) {
        const tName = deleteM[1].toLowerCase();
        const table = db[tName];
        if (!table) { output.push(`Error: Table '${deleteM[1]}' not found.`); continue; }
        const before = table.rows.length;
        if (deleteM[2]) {
          const condM = deleteM[2].match(/(\w+)\s*(=|!=|<>|>=|<=|>|<)\s*(.+)/);
          if (condM) {
            const col = condM[1].toLowerCase(), op = condM[2], val = condM[3].replace(/^['"]|['"]$/g, '');
            table.rows = table.rows.filter(r => {
              const rv = String(r[col]);
              if (op === '=') return rv !== val;
              if (op === '!=' || op === '<>') return rv === val;
              return true;
            });
          }
        } else {
          table.rows = [];
        }
        output.push(`${before - table.rows.length} row(s) deleted from '${deleteM[1]}'.`);
        continue;
      }

      // SELECT with aggregate
      const aggM = stmt.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+GROUP\s+BY\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?)(?:\s+(ASC|DESC))?)?$/is);
      if (aggM && /\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.test(aggM[1])) {
        const tName = aggM[2].toLowerCase();
        const table = db[tName];
        if (!table) { output.push(`Error: Table '${aggM[2]}' not found.`); continue; }
        let rows = [...table.rows];
        if (aggM[3]) {
          const condM = aggM[3].match(/(\w+)\s*(>|<|>=|<=|=|!=|<>)\s*(.+)/);
          if (condM) {
            const col = condM[1].toLowerCase(), op = condM[2], val = condM[3].replace(/^['"]|['"]$/g, '');
            rows = rows.filter(r => {
              const rv = r[col], nrv = Number(rv), nv = Number(val);
              if (op === '>') return !isNaN(nrv) ? nrv > nv : String(rv) > val;
              if (op === '<') return !isNaN(nrv) ? nrv < nv : String(rv) < val;
              if (op === '>=') return !isNaN(nrv) ? nrv >= nv : String(rv) >= val;
              if (op === '<=') return !isNaN(nrv) ? nrv <= nv : String(rv) <= val;
              if (op === '=' || op === '==') return String(rv) == val;
              if (op === '!=' || op === '<>') return String(rv) != val;
              return true;
            });
          }
        }
        const groupBy = aggM[4]?.trim().toLowerCase();
        const groups: Record<string, typeof rows> = {};
        if (groupBy) {
          rows.forEach(r => { const k = String(r[groupBy] ?? ''); (groups[k] = groups[k] || []).push(r); });
        } else {
          groups['__all__'] = rows;
        }

        const selParts = aggM[1].split(',').map(s => s.trim());
        const resultRows: Record<string, any>[] = [];
        Object.entries(groups).forEach(([gk, gr]) => {
          const res: Record<string, any> = {};
          if (groupBy) res[groupBy] = gr[0]?.[groupBy];
          selParts.forEach(part => {
            const aggFnM = part.match(/(\w+)\s*\(\s*(\*|\w+)\s*\)(?:\s+(?:AS\s+)?(\w+))?/i);
            if (aggFnM) {
              const fn = aggFnM[1].toUpperCase(), col = aggFnM[2].toLowerCase(), alias = aggFnM[3]?.toLowerCase() ?? fn.toLowerCase();
              const nums = gr.map(r => Number(r[col])).filter(n => !isNaN(n));
              if (fn === 'COUNT') res[alias] = gr.length;
              else if (fn === 'SUM') res[alias] = nums.reduce((a, b) => a + b, 0);
              else if (fn === 'AVG') res[alias] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
              else if (fn === 'MAX') res[alias] = Math.max(...nums);
              else if (fn === 'MIN') res[alias] = Math.min(...nums);
            } else if (!groupBy || part.toLowerCase() !== groupBy) {
              const alias = part.match(/\s+(?:AS\s+)?(\w+)$/i)?.[1]?.toLowerCase() ?? part.toLowerCase();
              res[alias] = gr[0]?.[part.toLowerCase()] ?? part;
            }
          });
          res[alias] = res[alias] ?? null;
          resultRows.push(res);
        });

        lastRows = resultRows;
        if (resultRows.length === 0) { output.push(`(0 rows)`); continue; }
        const displayCols = Object.keys(resultRows[0]);
        const widths = displayCols.map(c => Math.max(c.length, ...resultRows.map(r => String(r[c] ?? '').length)));
        const header = '| ' + displayCols.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
        const divider = '+-' + widths.map(w => '-'.repeat(w)).join('-+-') + '-+';
        output.push(divider, header, divider);
        resultRows.forEach(r => output.push('| ' + displayCols.map((c, i) => String(r[c] ?? '').padEnd(widths[i])).join(' | ') + ' |'));
        output.push(divider);
        output.push(`(${resultRows.length} row${resultRows.length !== 1 ? 's' : ''})`);
        continue;
      }

      // Regular SELECT
      if (/^\s*SELECT\b/i.test(stmt)) {
        const fromMatch = stmt.match(/\bFROM\s+(\w+)/i);
        if (!fromMatch) { output.push('-- SELECT without FROM not supported'); continue; }
        const tName = fromMatch[1].toLowerCase();
        const table = db[tName];
        if (!table) { output.push(`Error: Table '${fromMatch[1]}' not found.`); continue; }
        let rows = [...table.rows];

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

        const selColsMatch = stmt.match(/SELECT\s+(.+?)\s+FROM/i);
        const selCols = selColsMatch ? selColsMatch[1].trim() : '*';

        if (rows.length === 0) { output.push(`(0 rows from '${fromMatch[1]}')`); continue; }

        const displayCols = selCols === '*' ? Object.keys(rows[0]) :
          selCols.split(',').map(c => c.trim().toLowerCase().replace(/.*\s+as\s+/i, '').split(/\s+/).pop() || c.trim().toLowerCase());

        lastRows = rows.map(r => {
          const res: Record<string, any> = {};
          displayCols.forEach(col => { res[col] = r[col] ?? null; });
          return res;
        });

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

    return {
      success: true,
      rows: lastRows,
      outputString: output.join('\n') || '(no output)',
      updatedDb: db
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message,
      outputString: `Error: ${e.message}`,
      updatedDb: currentDb
    };
  }
};

// ─── AST PHP Parser & Interpreter ─────────────────────────────────────────────
interface Stmt {
  type: 'simple' | 'if' | 'while' | 'for' | 'foreach' | 'function';
  raw: string;
  condition?: string;
  body?: Stmt[];
  elseifs?: { condition: string; body: Stmt[] }[];
  elseBody?: Stmt[];
  funcName?: string;
  funcParams?: string[];
  loopInit?: string;
  loopCond?: string;
  loopStep?: string;
  foreachArr?: string;
  foreachKey?: string;
  foreachVal?: string;
}

function startsWithWord(code: string, index: number, word: string): boolean {
  if (!code.startsWith(word, index)) return false;
  const nextChar = code[index + word.length];
  return !nextChar || !/[a-zA-Z0-9_]/.test(nextChar);
}

function parseParentheses(code: string, index: number): { cond: string; nextIndex: number } {
  while (index < code.length && code[index] !== '(') index++;
  index++;
  let depth = 1;
  let cond = '';
  let inStr = false;
  let strChar = '';
  while (index < code.length && depth > 0) {
    const char = code[index];
    if (inStr) {
      cond += char;
      if (char === '\\' && index + 1 < code.length) {
        cond += code[index + 1];
        index += 2;
        continue;
      }
      if (char === strChar) inStr = false;
      index++;
    } else {
      if (char === '"' || char === "'") {
        inStr = true;
        strChar = char;
        cond += char;
        index++;
      } else if (char === '(') {
        depth++;
        cond += char;
        index++;
      } else if (char === ')') {
        depth--;
        if (depth > 0) cond += char;
        index++;
      } else {
        cond += char;
        index++;
      }
    }
  }
  return { cond: cond.trim(), nextIndex: index };
}

function parseBraces(code: string, index: number): { bodyCode: string; nextIndex: number } {
  while (index < code.length && code[index] !== '{') index++;
  index++;
  let depth = 1;
  let bodyCode = '';
  let inStr = false;
  let strChar = '';
  while (index < code.length && depth > 0) {
    const char = code[index];
    if (inStr) {
      bodyCode += char;
      if (char === '\\' && index + 1 < code.length) {
        bodyCode += code[index + 1];
        index += 2;
        continue;
      }
      if (char === strChar) inStr = false;
      index++;
    } else {
      if (char === '"' || char === "'") {
        inStr = true;
        strChar = char;
        bodyCode += char;
        index++;
      } else if (char === '{') {
        depth++;
        bodyCode += char;
        index++;
      } else if (char === '}') {
        depth--;
        if (depth > 0) bodyCode += char;
        index++;
      } else {
        bodyCode += char;
        index++;
      }
    }
  }
  return { bodyCode: bodyCode.trim(), nextIndex: index };
}

function parseBlock(code: string): Stmt[] {
  const stmts: Stmt[] = [];
  let i = 0;
  while (i < code.length) {
    while (i < code.length && /\s/.test(code[i])) i++;
    if (i >= code.length) break;

    if (startsWithWord(code, i, 'if')) {
      i += 2;
      const { cond, nextIndex } = parseParentheses(code, i);
      i = nextIndex;
      const { bodyCode, nextIndex: bodyEnd } = parseBraces(code, i);
      i = bodyEnd;
      const body = parseBlock(bodyCode);

      const elseifs: { condition: string; body: Stmt[] }[] = [];
      let elseBody: Stmt[] | undefined = undefined;

      while (true) {
        let tempI = i;
        while (tempI < code.length && /\s/.test(code[tempI])) tempI++;
        if (startsWithWord(code, tempI, 'elseif')) {
          i = tempI + 6;
          const { cond: eiCond, nextIndex: eiNext } = parseParentheses(code, i);
          i = eiNext;
          const { bodyCode: eiBodyCode, nextIndex: eiBodyEnd } = parseBraces(code, i);
          i = eiBodyEnd;
          elseifs.push({ condition: eiCond, body: parseBlock(eiBodyCode) });
        } else if (startsWithWord(code, tempI, 'else')) {
          i = tempI + 4;
          const { bodyCode: eBodyCode, nextIndex: eBodyEnd } = parseBraces(code, i);
          i = eBodyEnd;
          elseBody = parseBlock(eBodyCode);
          break;
        } else {
          break;
        }
      }

      stmts.push({ type: 'if', raw: '', condition: cond, body, elseifs, elseBody });
    } else if (startsWithWord(code, i, 'while')) {
      i += 5;
      const { cond, nextIndex } = parseParentheses(code, i);
      i = nextIndex;
      const { bodyCode, nextIndex: bodyEnd } = parseBraces(code, i);
      i = bodyEnd;
      stmts.push({ type: 'while', raw: '', condition: cond, body: parseBlock(bodyCode) });
    } else if (startsWithWord(code, i, 'for')) {
      i += 3;
      const { cond: loopHeader, nextIndex } = parseParentheses(code, i);
      i = nextIndex;
      const { bodyCode, nextIndex: bodyEnd } = parseBraces(code, i);
      i = bodyEnd;

      const parts = loopHeader.split(';');
      stmts.push({
        type: 'for',
        raw: '',
        loopInit: parts[0]?.trim(),
        loopCond: parts[1]?.trim(),
        loopStep: parts[2]?.trim(),
        body: parseBlock(bodyCode)
      });
    } else if (startsWithWord(code, i, 'foreach')) {
      i += 7;
      const { cond: loopHeader, nextIndex } = parseParentheses(code, i);
      i = nextIndex;
      const { bodyCode, nextIndex: bodyEnd } = parseBraces(code, i);
      i = bodyEnd;

      const m = loopHeader.match(/^([^\s]+)\s+as\s+(?:([^\s]+)\s*=>\s*)?([^\s]+)$/i);
      if (m) {
        stmts.push({
          type: 'foreach',
          raw: '',
          foreachArr: m[1],
          foreachKey: m[2],
          foreachVal: m[3],
          body: parseBlock(bodyCode)
        });
      }
    } else if (startsWithWord(code, i, 'function')) {
      i += 8;
      while (i < code.length && /\s/.test(code[i])) i++;
      let funcName = '';
      while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
        funcName += code[i];
        i++;
      }
      const { cond: paramsStr, nextIndex } = parseParentheses(code, i);
      i = nextIndex;
      const { bodyCode, nextIndex: bodyEnd } = parseBraces(code, i);
      i = bodyEnd;
      const funcParams = paramsStr.split(',').map(s => s.trim()).filter(Boolean);
      stmts.push({
        type: 'function',
        raw: '',
        funcName,
        funcParams,
        body: parseBlock(bodyCode)
      });
    } else {
      let raw = '';
      let inStr = false;
      let strChar = '';
      while (i < code.length) {
        const char = code[i];
        raw += char;
        i++;
        if (inStr) {
          if (char === '\\' && i < code.length) {
            raw += code[i];
            i++;
          } else if (char === strChar) {
            inStr = false;
          }
        } else {
          if (char === '"' || char === "'") {
            inStr = true;
            strChar = char;
          } else if (char === ';') {
            break;
          }
        }
      }
      raw = raw.trim();
      if (raw) {
        stmts.push({ type: 'simple', raw });
      }
    }
  }
  return stmts;
}

function resolveValue(
  expr: string,
  vars: Record<string, any>,
  constants: Record<string, any>,
  dbState: VirtualDb,
  setDbState?: (db: VirtualDb) => void
): any {
  expr = expr.trim();
  if (!expr) return null;

  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
    let s = expr.slice(1, -1);
    if (expr.startsWith('"')) {
      s = s.replace(/\{?\$(\w+)\}?/g, (_, n) => {
        const key = '$' + n;
        return String(vars[key] !== undefined ? vars[key] : (vars[n] !== undefined ? vars[n] : ''));
      });
    }
    return s;
  }

  const lower = expr.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (lower === 'null') return null;
  if (!isNaN(Number(expr))) return Number(expr);

  if (expr.startsWith('[') && expr.endsWith(']')) {
    const inner = expr.slice(1, -1).trim();
    return parseArrayItems(inner, vars, constants, dbState);
  }
  const arrayM = expr.match(/^array\s*\((.*)\)$/is);
  if (arrayM) {
    return parseArrayItems(arrayM[1].trim(), vars, constants, dbState);
  }

  const funcCallM = expr.match(/^(\w+)\s*\((.*)\)$/is);
  if (funcCallM) {
    const fName = funcCallM[1].toLowerCase();
    const argsStr = funcCallM[2].trim();
    const argExprs: string[] = [];
    let curr = '', pDepth = 0, inStr = false, strChar = '';
    for (let c = 0; c < argsStr.length; c++) {
      const ch = argsStr[c];
      if (!inStr && (ch === "'" || ch === '"')) { inStr = true; strChar = ch; }
      else if (inStr && ch === strChar) { inStr = false; }
      if (!inStr && ch === '(') pDepth++;
      if (!inStr && ch === ')') pDepth--;
      if (!inStr && ch === ',' && pDepth === 0) {
        argExprs.push(curr.trim());
        curr = '';
      } else {
        curr += ch;
      }
    }
    if (curr.trim()) argExprs.push(curr.trim());
    const argVals = argExprs.map(a => resolveValue(a, vars, constants, dbState, setDbState));

    if (fName === 'mysqli_connect') {
      return { __type: 'connection', dbName: String(argVals[3] ?? '') };
    }
    if (fName === 'mysqli_query') {
      const sql = String(argVals[1] ?? '');
      const res = executeSql(sql, dbState);
      if (setDbState && res.success) {
        setDbState(res.updatedDb);
      }
      return { __type: 'result', rows: res.rows || [], pointer: 0, error: res.error };
    }
    if (fName === 'mysqli_fetch_assoc') {
      const resObj = argVals[0];
      if (resObj && resObj.__type === 'result') {
        const row = resObj.rows[resObj.pointer];
        if (row !== undefined) {
          resObj.pointer++;
          return row;
        }
      }
      return null;
    }
    if (fName === 'mysqli_num_rows') {
      const resObj = argVals[0];
      return resObj && resObj.__type === 'result' ? resObj.rows.length : 0;
    }
    if (fName === 'mysqli_error') {
      return '';
    }

    if (fName === 'count' || fName === 'sizeof') {
      const arr = argVals[0];
      return Array.isArray(arr) ? arr.length : (arr && typeof arr === 'object' ? Object.keys(arr).length : 0);
    }
    if (fName === 'array_sum') {
      const arr = argVals[0];
      return Array.isArray(arr) ? arr.reduce((a, b) => Number(a) + Number(b), 0) : 0;
    }
    if (fName === 'max') {
      const val = argVals.length === 1 && Array.isArray(argVals[0]) ? argVals[0] : argVals;
      return Math.max(...val.map(Number));
    }
    if (fName === 'min') {
      const val = argVals.length === 1 && Array.isArray(argVals[0]) ? argVals[0] : argVals;
      return Math.min(...val.map(Number));
    }
    if (fName === 'strtoupper') return String(argVals[0] ?? '').toUpperCase();
    if (fName === 'strtolower') return String(argVals[0] ?? '').toLowerCase();
    if (fName === 'strlen') return String(argVals[0] ?? '').length;
    if (fName === 'trim') return String(argVals[0] ?? '').trim();
    if (fName === 'str_repeat') return String(argVals[0] ?? '').repeat(Number(argVals[1] ?? 0));
    if (fName === 'implode') return Array.isArray(argVals[1]) ? argVals[1].join(String(argVals[0])) : '';
    if (fName === 'explode') return String(argVals[1] ?? '').split(String(argVals[0] ?? ''));
    if (fName === 'round') return Number(Number(argVals[0] ?? 0).toFixed(Number(argVals[1] ?? 0)));
    if (fName === 'intval') return parseInt(argVals[0] ?? 0) || 0;
    if (fName === 'floatval') return parseFloat(argVals[0] ?? 0) || 0.0;
    if (fName === 'rand') return Math.floor(Math.random() * (Number(argVals[1] ?? 100) - Number(argVals[0] ?? 0) + 1)) + Number(argVals[0] ?? 0);
  }

  if (expr.startsWith('$')) {
    const bracketIndex = expr.indexOf('[');
    if (bracketIndex !== -1 && expr.endsWith(']')) {
      const varName = expr.substring(0, bracketIndex).trim();
      const innerIndex = expr.substring(bracketIndex + 1, expr.length - 1).trim();
      const resolvedIndex = resolveValue(innerIndex, vars, constants, dbState, setDbState);
      const arr = vars[varName];
      return arr ? arr[resolvedIndex] : null;
    }
    return vars[expr] !== undefined ? vars[expr] : (vars[expr.substring(1)] !== undefined ? vars[expr.substring(1)] : null);
  }

  const ops = [
    { op: '||', fn: (a: any, b: any) => !!a || !!b },
    { op: '&&', fn: (a: any, b: any) => !!a && !!b },
    { op: '===', fn: (a: any, b: any) => a === b },
    { op: '==', fn: (a: any, b: any) => a == b },
    { op: '!==', fn: (a: any, b: any) => a !== b },
    { op: '!=', fn: (a: any, b: any) => a != b },
    { op: '<=', fn: (a: any, b: any) => Number(a) <= Number(b) },
    { op: '>=', fn: (a: any, b: any) => Number(a) >= Number(b) },
    { op: '<', fn: (a: any, b: any) => Number(a) < Number(b) },
    { op: '>', fn: (a: any, b: any) => Number(a) > Number(b) },
    { op: '.', fn: (a: any, b: any) => String(a) + String(b) },
    { op: '+', fn: (a: any, b: any) => Number(a) + Number(b) },
    { op: '-', fn: (a: any, b: any) => Number(a) - Number(b) },
    { op: '*', fn: (a: any, b: any) => Number(a) * Number(b) },
    { op: '/', fn: (a: any, b: any) => Number(a) / Number(b) },
  ];

  for (const { op, fn } of ops) {
    let pDepth = 0, inStr = false, strChar = '';
    for (let c = expr.length - 1; c >= 0; c--) {
      const ch = expr[c];
      if (!inStr && (ch === "'" || ch === '"')) { inStr = true; strChar = ch; }
      else if (inStr && ch === strChar) { inStr = false; }
      if (!inStr && ch === ')') pDepth++;
      if (!inStr && ch === '(') pDepth--;
      if (!inStr && pDepth === 0) {
        if (expr.startsWith(op, c)) {
          if (op === '=' && (expr[c - 1] === '=' || expr[c + 1] === '=')) continue;
          if (op === '<' && expr[c + 1] === '=') continue;
          if (op === '>' && expr[c + 1] === '=') continue;
          if (op === '!' && expr[c + 1] === '=') continue;

          if (op === '.' && !isNaN(Number(expr[c - 1])) && !isNaN(Number(expr[c + 1]))) {
            continue;
          }

          const left = expr.substring(0, c).trim();
          const right = expr.substring(c + op.length).trim();
          return fn(
            resolveValue(left, vars, constants, dbState, setDbState),
            resolveValue(right, vars, constants, dbState, setDbState)
          );
        }
      }
    }
  }

  if (expr.startsWith('!')) {
    return !resolveValue(expr.substring(1), vars, constants, dbState, setDbState);
  }

  if (expr.startsWith('(') && expr.endsWith(')')) {
    return resolveValue(expr.slice(1, -1), vars, constants, dbState, setDbState);
  }

  return expr;
}

function parseArrayItems(
  inner: string,
  vars: Record<string, any>,
  constants: Record<string, any>,
  dbState: VirtualDb
): any {
  if (!inner) return [];
  const items: string[] = [];
  let curr = '', pDepth = 0, inStr = false, strChar = '';
  for (let c = 0; c < inner.length; c++) {
    const ch = inner[c];
    if (!inStr && (ch === "'" || ch === '"')) { inStr = true; strChar = ch; }
    else if (inStr && ch === strChar) { inStr = false; }
    if (!inStr && ch === '(') pDepth++;
    if (!inStr && ch === ')') pDepth--;
    if (!inStr && ch === ',' && pDepth === 0) {
      items.push(curr.trim());
      curr = '';
    } else {
      curr += ch;
    }
  }
  if (curr.trim()) items.push(curr.trim());

  if (items.some(it => it.includes('=>'))) {
    const obj: Record<string, any> = {};
    items.forEach(it => {
      const idx = it.indexOf('=>');
      if (idx !== -1) {
        const k = it.substring(0, idx).trim();
        const v = it.substring(idx + 2).trim();
        obj[resolveValue(k, vars, constants, dbState)] = resolveValue(v, vars, constants, dbState);
      }
    });
    return obj;
  } else {
    return items.map(it => resolveValue(it, vars, constants, dbState));
  }
}

interface EvalContext {
  vars: Record<string, any>;
  constants: Record<string, any>;
  functions: Record<string, Stmt>;
  output: string[];
  dbState: VirtualDb;
  setDbState?: (db: VirtualDb) => void;
  hasReturned?: boolean;
  returnValue?: any;
}

function evaluatePhpBlock(stmts: Stmt[], ctx: EvalContext): void {
  for (const stmt of stmts) {
    if (ctx.hasReturned) return;

    if (stmt.type === 'function') {
      if (stmt.funcName) {
        ctx.functions[stmt.funcName.toLowerCase()] = stmt;
      }
      continue;
    }

    if (stmt.type === 'simple') {
      const raw = stmt.raw;
      
      const retM = raw.match(/^return\s+(.+)$/i);
      if (retM) {
        ctx.returnValue = resolveValue(retM[1], ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState);
        ctx.hasReturned = true;
        return;
      }
      if (raw === 'return') {
        ctx.returnValue = null;
        ctx.hasReturned = true;
        return;
      }

      const defineM = raw.match(/^define\s*\(\s*['"](\w+)['"]\s*,\s*(.+?)\s*\)$/i);
      if (defineM) {
        ctx.constants[defineM[1]] = resolveValue(defineM[2], ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState);
        continue;
      }

      const echoM = raw.match(/^(echo|print)\s+(.+)$/i);
      if (echoM) {
        const partsExpr = echoM[2].trim();
        const parts: string[] = [];
        let curr = '', pDepth = 0, inStr = false, strChar = '';
        for (let c = 0; c < partsExpr.length; c++) {
          const ch = partsExpr[c];
          if (!inStr && (ch === "'" || ch === '"')) { inStr = true; strChar = ch; }
          else if (inStr && ch === strChar) { inStr = false; }
          if (!inStr && ch === '(') pDepth++;
          if (!inStr && ch === ')') pDepth--;
          if (!inStr && ch === ',' && pDepth === 0) {
            parts.push(curr.trim());
            curr = '';
          } else {
            curr += ch;
          }
        }
        if (curr.trim()) parts.push(curr.trim());

        const result = parts.map(p => {
          const val = resolveValue(p, ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState);
          return val === null ? '' : String(val);
        }).join('');
        ctx.output.push(result.replace(/\\n/g, '\n').replace(/\\t/g, '\t'));
        continue;
      }

      const printfM = raw.match(/^printf\s*\(\s*(.+)\s*\)$/i);
      if (printfM) {
        const argsExpr = printfM[1].trim();
        const parts: string[] = [];
        let curr = '', pDepth = 0, inStr = false, strChar = '';
        for (let c = 0; c < argsExpr.length; c++) {
          const ch = argsExpr[c];
          if (!inStr && (ch === "'" || ch === '"')) { inStr = true; strChar = ch; }
          else if (inStr && ch === strChar) { inStr = false; }
          if (!inStr && ch === '(') pDepth++;
          if (!inStr && ch === ')') pDepth--;
          if (!inStr && ch === ',' && pDepth === 0) {
            parts.push(curr.trim());
            curr = '';
          } else {
            curr += ch;
          }
        }
        if (curr.trim()) parts.push(curr.trim());
        const argVals = parts.map(p => resolveValue(p, ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState));
        let fmt = String(argVals[0] ?? '');
        const vals = argVals.slice(1);
        let vi = 0;
        fmt = fmt.replace(/%([sdfc])/g, (_, spec) => {
          const v = vals[vi++];
          if (v === undefined) return '';
          if (spec === 'd') return String(Math.round(Number(v)));
          if (spec === 'f') return Number(v).toFixed(6);
          if (spec === 'c') return String.fromCharCode(Number(v));
          return String(v);
        });
        ctx.output.push(fmt.replace(/\\n/g, '\n').replace(/\\t/g, '\t'));
        continue;
      }

      const assignIdx = raw.indexOf('=');
      if (assignIdx !== -1 && raw[assignIdx + 1] !== '=' && raw[assignIdx - 1] !== '>' && raw[assignIdx - 1] !== '<' && raw[assignIdx - 1] !== '!' && raw[assignIdx - 1] !== '=') {
        const left = raw.substring(0, assignIdx).trim();
        const right = raw.substring(assignIdx + 1).trim();
        const rVal = resolveValue(right, ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState);

        if (left.startsWith('$')) {
          const bracketIdx = left.indexOf('[');
          if (bracketIdx !== -1 && left.endsWith(']')) {
            const varName = left.substring(0, bracketIdx).trim();
            const indexExpr = left.substring(bracketIdx + 1, left.length - 1).trim();
            
            if (!ctx.vars[varName] || typeof ctx.vars[varName] !== 'object') {
              ctx.vars[varName] = Array.isArray(ctx.vars[varName]) ? [] : {};
            }

            if (!indexExpr) {
              if (Array.isArray(ctx.vars[varName])) {
                ctx.vars[varName].push(rVal);
              } else {
                const nextKey = Object.keys(ctx.vars[varName]).length;
                ctx.vars[varName][nextKey] = rVal;
              }
            } else {
              const key = resolveValue(indexExpr, ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState);
              ctx.vars[varName][key] = rVal;
            }
          } else {
            ctx.vars[left] = rVal;
          }
        }
        continue;
      }

      resolveValue(raw, ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState);
    }

    if (stmt.type === 'if') {
      const condVal = !!resolveValue(stmt.condition ?? '', ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState);
      if (condVal) {
        evaluatePhpBlock(stmt.body ?? [], ctx);
      } else {
        let matchedElif = false;
        for (const elif of stmt.elseifs ?? []) {
          const elifCond = !!resolveValue(elif.condition, ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState);
          if (elifCond) {
            evaluatePhpBlock(elif.body, ctx);
            matchedElif = true;
            break;
          }
        }
        if (!matchedElif && stmt.elseBody) {
          evaluatePhpBlock(stmt.elseBody, ctx);
        }
      }
      continue;
    }

    if (stmt.type === 'while') {
      let guard = 0;
      while (guard++ < 10000) {
        if (ctx.hasReturned) break;
        const condVal = !!resolveValue(stmt.condition ?? '', ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState);
        if (!condVal) break;
        evaluatePhpBlock(stmt.body ?? [], ctx);
      }
      if (guard >= 10000) {
        ctx.output.push('Error: Infinite loop detected inside while loop.\n');
      }
      continue;
    }

    if (stmt.type === 'for') {
      if (stmt.loopInit) {
        const assignIdx = stmt.loopInit.indexOf('=');
        if (assignIdx !== -1) {
          const l = stmt.loopInit.substring(0, assignIdx).trim();
          const r = stmt.loopInit.substring(assignIdx + 1).trim();
          ctx.vars[l] = resolveValue(r, ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState);
        }
      }

      let guard = 0;
      while (guard++ < 10000) {
        if (ctx.hasReturned) break;
        if (stmt.loopCond) {
          const condVal = !!resolveValue(stmt.loopCond, ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState);
          if (!condVal) break;
        }
        evaluatePhpBlock(stmt.body ?? [], ctx);

        if (stmt.loopStep) {
          const step = stmt.loopStep;
          if (step.endsWith('++')) {
            const vName = step.slice(0, -2).trim();
            ctx.vars[vName] = Number(ctx.vars[vName] ?? 0) + 1;
          } else if (step.endsWith('--')) {
            const vName = step.slice(0, -2).trim();
            ctx.vars[vName] = Number(ctx.vars[vName] ?? 0) - 1;
          } else {
            const assignIdx = step.indexOf('=');
            if (assignIdx !== -1) {
              const l = step.substring(0, assignIdx).trim();
              const r = step.substring(assignIdx + 1).trim();
              ctx.vars[l] = resolveValue(r, ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState);
            }
          }
        }
      }
      if (guard >= 10000) {
        ctx.output.push('Error: Infinite loop detected inside for loop.\n');
      }
      continue;
    }

    if (stmt.type === 'foreach') {
      const arr = resolveValue(stmt.foreachArr ?? '', ctx.vars, ctx.constants, ctx.dbState, ctx.setDbState);
      if (Array.isArray(arr)) {
        for (let idx = 0; idx < arr.length; idx++) {
          if (ctx.hasReturned) break;
          if (stmt.foreachKey) ctx.vars[stmt.foreachKey] = idx;
          if (stmt.foreachVal) ctx.vars[stmt.foreachVal] = arr[idx];
          evaluatePhpBlock(stmt.body ?? [], ctx);
        }
      } else if (arr && typeof arr === 'object') {
        const entries = Object.entries(arr);
        for (const [key, val] of entries) {
          if (ctx.hasReturned) break;
          if (stmt.foreachKey) ctx.vars[stmt.foreachKey] = key;
          if (stmt.foreachVal) ctx.vars[stmt.foreachVal] = val;
          evaluatePhpBlock(stmt.body ?? [], ctx);
        }
      }
      continue;
    }
  }
}

function runPhpInterpreter(
  code: string,
  dbState: VirtualDb,
  setDbState: (db: VirtualDb) => void,
  formInputs: { method: 'GET' | 'POST'; params: Record<string, any> }
): string {
  try {
    const stmts = parseBlock(code.replace(/<\?php/gi, '').replace(/\?>/g, ''));
    const output: string[] = [];
    const vars: Record<string, any> = {
      '$_GET': formInputs.method === 'GET' ? formInputs.params : {},
      '$_POST': formInputs.method === 'POST' ? formInputs.params : {},
      '$_REQUEST': formInputs.params,
      '$_SERVER': {
        'REQUEST_METHOD': formInputs.method,
      }
    };
    const ctx: EvalContext = {
      vars,
      constants: {},
      functions: {},
      output,
      dbState,
      setDbState
    };
    evaluatePhpBlock(stmts, ctx);
    return output.join('') || '(no output)';
  } catch (e: any) {
    return `Interpreter Error: ${e.message}`;
  }
}


// ─── Component ────────────────────────────────────────────────────────────────
const Playground = () => {
  const initFiles = (): PlayFile[] => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const p: PlayFile[] = JSON.parse(raw);
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
  const [authReady, setAuthReady] = useState(false);
  const [addingFile, setAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  // New playground states for high interactivity
  const [db, setDb] = useState<VirtualDb>({});
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST'>('POST');
  const [formParams, setFormParams] = useState<{ key: string; value: string }[]>([
    { key: 'student_name', value: 'Saman' },
    { key: 'marks', value: '78' }
  ]);
  const [rightTab, setRightTab] = useState<'output' | 'form' | 'db' | 'refs'>('output');

  // Auto-seed virtual database on mount or restore defaults
  useEffect(() => {
    const sqlFile = files.find(f => f.name.endsWith('.sql'));
    if (sqlFile) {
      const res = executeSql(sqlFile.code, {});
      if (res.success) {
        setDb(res.updatedDb);
      }
    }
  }, [files]);

  const activeFile = files.find(f => f.id === activeId) ?? files[0];
  const usedBytes = totalBytes(files);
  const usedPct = Math.min(100, (usedBytes / MAX_BYTES) * 100);
  const lang = activeFile ? extToLang(activeFile.name) : 'text';
  const meta = langMeta[lang];
  const hasHtmlFile = files.some(f => ['html','htm'].includes(f.name.split('.').pop()?.toLowerCase() ?? ''));
  const isWebLang = lang === 'html' || lang === 'css' || (lang === 'javascript' && hasHtmlFile);
  const runLabel = lang === 'sql' ? 'Run SQL' : lang === 'php' ? 'Run PHP' : isWebLang ? 'Preview' : 'Run';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setUserId(s?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !userId) return;
    supabase.from('playground_files' as any).select('*').eq('user_id', userId).order('sort_order')
      .then(async ({ data, error }: any) => {
        if (!error && data && data.length > 0) {
          const mapped: PlayFile[] = data.map((r: any) => ({
            id: r.id, name: r.name, code: r.code, sortOrder: r.sort_order,
          }));
          const missingDefaults = DEFAULT_FILES.filter(df => !mapped.some(f => f.name === df.name));
          if (missingDefaults.length > 0) {
            const newFiles = missingDefaults.map(f => ({ ...f, id: makeId() }));
            const insertData = newFiles.map(f => ({ id: f.id, user_id: userId, name: f.name, code: f.code, sort_order: f.sortOrder }));
            await (supabase.from as any)('playground_files').insert(insertData);
            mapped.push(...newFiles);
            mapped.sort((a, b) => a.sortOrder - b.sortOrder);
          }
          setFiles(mapped);
          setActiveId(mapped[0].id);
          setOutput(''); setHasRun(false); setShowPreview(false);
        } else if (!error && (!data || data.length === 0)) {
          const defaults = DEFAULT_FILES.map(f => ({ ...f, id: makeId() }));
          const insertData = defaults.map(f => ({ id: f.id, user_id: userId, name: f.name, code: f.code, sort_order: f.sortOrder }));
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

  // No auto-save — changes are only saved when user clicks Save
  const updateFiles = (nf: PlayFile[]) => { setFiles(nf); };

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

  const buildWebPreview = () => {
    const htmlFile = files.find(f => ['html','htm'].includes(f.name.split('.').pop()?.toLowerCase() ?? ''));
    let html = htmlFile?.code ?? '<html><body></body></html>';

    // Resolve <link rel="stylesheet" href="filename.css"> from workspace files
    html = html.replace(/<link\b[^>]*\bhref=["']([^"']+\.css)["'][^>]*>/gi, (match, href) => {
      const fname = href.split('/').pop() ?? '';
      const wsFile = files.find(f => f.name === fname);
      if (wsFile) return `<style>\n/* linked from ${fname} */\n${wsFile.code}\n</style>`;
      return match; // keep as-is if not found in workspace
    });

    // Resolve <script src="filename.js"> from workspace files
    html = html.replace(/<script\b[^>]*\bsrc=["']([^"']+\.(?:js|ts))["'][^>]*><\/script>/gi, (match, src) => {
      const fname = src.split('/').pop() ?? '';
      const wsFile = files.find(f => f.name === fname);
      if (wsFile) return `<script>\n/* linked from ${fname} */\n${wsFile.code}\n</script>`;
      return match;
    });

    // Auto-inject style.css / script.js only if NOT already linked in the HTML
    const cssFile = files.find(f => f.name.split('.').pop()?.toLowerCase() === 'css');
    const jsFile = files.find(f => ['js','ts'].includes(f.name.split('.').pop()?.toLowerCase() ?? ''));
    const cssAlreadyLinked = cssFile && html.includes(cssFile.name);
    const jsAlreadyLinked = jsFile && html.includes(jsFile.name);

    if (cssFile?.code && !cssAlreadyLinked) {
      html = html.replace('</head>', `<style>\n${cssFile.code}\n</style>\n</head>`);
      if (!html.includes('</head>')) html = `<style>\n${cssFile.code}\n</style>\n` + html;
    }
    if (jsFile?.code && !jsAlreadyLinked) {
      html = html.replace('</body>', `<script>\n${jsFile.code}\n</script>\n</body>`);
      if (!html.includes('</body>')) html += `<script>\n${jsFile.code}\n</script>`;
    }
    return html;
  };

  const handleRun = async () => {
    if (!activeFile) return;
    setHasRun(true); setShowPreview(false);
    const code = activeFile.code;
    const hasHtml = files.some(f => ['html','htm'].includes(f.name.split('.').pop()?.toLowerCase() ?? ''));
    if (lang === 'html' || lang === 'css' || (lang === 'javascript' && hasHtml)) {
      setHtmlPreview(buildWebPreview()); setShowPreview(true); setOutput(''); return;
    }
    if (lang === 'sql') {
      setRunning(true); setOutput('');
      try {
        const res = executeSql(code, db);
        setOutput(res.outputString);
        if (res.success) {
          setDb(res.updatedDb);
        }
      } catch (e: any) { setOutput(`Error: ${e.message}`); }
      finally { setRunning(false); }
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
      const unsupportedPatterns: { pattern: RegExp; hint: string }[] = [
        { pattern: /open\s*\(.*encoding\s*=/, hint: '⚠ open() with encoding= is not supported in Skulpt. Remove the encoding keyword: open(filename, "r")' },
        { pattern: /import\s+os\b/, hint: '⚠ The "os" module is not supported in Skulpt (browser Python). Use print() for output.' },
        { pattern: /import\s+sys\b/, hint: '⚠ The "sys" module has limited support in Skulpt. sys.stdin is not available.' },
        { pattern: /import\s+json\b/, hint: '⚠ The "json" module has limited support in Skulpt.' },
      ];
      for (const { pattern, hint } of unsupportedPatterns) {
        if (pattern.test(code)) { setOutput(hint); setRunning(false); return; }
      }
      try {
        await loadSkulpt();
        await new Promise<void>((res, rej) => {
          window.Sk.configure({
            output: (t: string) => col.push(t),
            read: (x: string) => {
              // Check workspace files first (so Python can open() txt/csv/etc files in workspace)
              const fname = x.split('/').pop() ?? x;
              const wsFile = files.find(f => f.name === fname);
              if (wsFile) return wsFile.code;
              // Fall back to Skulpt built-in stdlib
              if (window.Sk.builtinFiles?.files[x]) return window.Sk.builtinFiles.files[x];
              throw new Error(`File not found: '${x}'\nTip: Make sure the file exists in your workspace.`);
            },
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
        const paramsRecord: Record<string, any> = {};
        formParams.forEach(p => {
          if (p.key.trim()) paramsRecord[p.key.trim()] = p.value;
        });
        const out = runPhpInterpreter(code, db, (newDb) => setDb(newDb), {
          method: requestMethod,
          params: paramsRecord
        });
        setOutput(out);
        setRightTab('output');
      } catch (e: any) { setOutput(`Error: ${e.message}`); }
      finally { setRunning(false); }
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
    await saveToDb(files); toast.success('Workspace saved!');
  };
  const restoreDefaults = async () => {
    if (!window.confirm('Restore all default files? Your current code will be replaced.')) return;
    const newDefaults = DEFAULT_FILES.map(f => ({ ...f, id: makeId() }));
    setFiles(newDefaults);
    setActiveId(newDefaults[0].id);
    setOutput(''); setHasRun(false); setShowPreview(false);
    if (userId) {
      await (supabase.from as any)('playground_files').delete().eq('user_id', userId);
      const insertData = newDefaults.map(f => ({ id: f.id, user_id: userId, name: f.name, code: f.code, sort_order: f.sortOrder }));
      await (supabase.from as any)('playground_files').insert(insertData);
      toast.success('Default files restored and saved!');
    } else {
      toast.success('Default files restored!');
    }
  };

  return (
    <StudentLayout>
      {/* Premium Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl border bg-gradient-to-r from-card to-muted/20 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/10">
            <Code2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Code Playground</h1>
            <p className="text-sm text-muted-foreground">Interactive A/L Programming & Database Sandbox</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5 bg-muted/40 px-3.5 py-1.5 rounded-xl border">
            <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${usedPct}%`, background: usedPct > 80 ? '#ef4444' : usedPct > 60 ? '#eab308' : '#22c55e' }} />
            </div>
            <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">{fmtBytes(usedBytes)} / 10 MB</span>
            {usedPct > 80 && <AlertCircle className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />}
          </div>
          {userId ? (
            <Button variant="default" size="sm" onClick={manualSave} disabled={saving} className="gap-2 shadow-sm rounded-xl px-4">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Workspace'}
            </Button>
          ) : (
            <Link to="/login">
              <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground rounded-xl">
                <CloudOff className="w-4 h-4" />
                Log in to save
              </Button>
            </Link>
          )}
        </div>
      </div>

      {!userId && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl border border-primary/20 bg-primary/5 shadow-sm">
          <Cloud className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-sm text-foreground">
            <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
            {' '}to save your workspace files, create new scripts, and sync work across devices.
          </p>
        </div>
      )}

      {/* Main IDE Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_1fr] gap-5 items-stretch">

        {/* ── Card 1: Advanced File Explorer ── */}
        <div className="rounded-2xl border bg-card/60 backdrop-blur-md overflow-hidden flex flex-col shadow-sm" style={{ minHeight: 520 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Workspace Files</span>
            <div className="flex items-center gap-1.5">
              <button
                title="Restore default files"
                onClick={restoreDefaults}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                title={userId ? 'New file' : 'Log in to create files'}
                onClick={() => { if (!userId) { toast.error('Log in to create new files'); return; } setAddingFile(true); }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                style={{ opacity: userId ? 1 : 0.4 }}
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                      className="w-full px-3 py-2 text-xs font-mono bg-muted border rounded-lg outline-none text-foreground"
                    />
                  ) : (
                    <button
                      onClick={() => { setActiveId(file.id); setOutput(''); setHasRun(false); setShowPreview(false); }}
                      onDoubleClick={() => { setRenamingId(file.id); setRenameVal(file.name.includes('.') ? file.name.slice(0, file.name.lastIndexOf('.')) : file.name); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left transition-all rounded-xl ${
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold shadow-sm border border-primary/20'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent'
                      }`}
                    >
                      <span className="text-base leading-none shrink-0" style={{ color: isActive ? m.color : undefined }}>{m.emoji}</span>
                      <span className="truncate flex-1 font-mono">{file.name}</span>
                    </button>
                  )}
                  {renamingId !== file.id && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {userId && (
                        <button onClick={() => { setRenamingId(file.id); setRenameVal(file.name.includes('.') ? file.name.slice(0, file.name.lastIndexOf('.')) : file.name); }}
                          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all" title="Rename">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteFile(file.id)}
                        className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {addingFile && userId && (
              <div className="px-2 py-2 border rounded-xl bg-muted/10">
                <input autoFocus placeholder="filename.py" value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addFile(); if (e.key === 'Escape') { setAddingFile(false); setNewFileName(''); } }}
                  onBlur={addFile}
                  className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border bg-background text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] mt-1.5 text-muted-foreground text-center">Allowed: .py .html .css .sql .js .php</p>
              </div>
            )}
          </div>

          <div className="border-t p-3 bg-muted/10 flex flex-wrap gap-1.5">
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
                  className={`text-[10px] px-2.5 py-1 rounded-full transition-all border font-medium ${
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground bg-transparent border-transparent hover:text-foreground'
                  }`}
                  style={{ borderColor: isActive ? m.color + '40' : undefined }}
                >
                  <span className="mr-1">{m.emoji}</span>{m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Card 2: Interactive Code Editor ── */}
        <div className="rounded-2xl border bg-[#080b10] border-border/80 overflow-hidden flex flex-col shadow-lg relative" style={{ minHeight: 520 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/5 bg-[#0b0e14]">
            <div className="flex items-center gap-3">
              {/* macOS window controls decoration */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56]/90" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]/90" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f]/90" />
              </div>
              <span className="h-4 w-px bg-border/10 ml-1" />
              <span className="text-xs font-mono font-medium text-slate-400">{activeFile?.name ?? '—'}</span>
              {activeFile && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider scale-95"
                  style={{ background: meta.bg, color: meta.color }}>
                  {lang.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-[#161b22] text-slate-400 hover:text-slate-200 transition-colors" title="Copy code">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-[#161b22] text-slate-400 hover:text-slate-200 transition-colors" title="Clear outputs">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* IDE Area with Synchronized Line Numbers */}
          <div className="flex-1 flex overflow-hidden min-h-[380px] bg-[#070a0f] relative">
            <div ref={lineRef} className="py-4 pl-4 pr-2 select-none text-right font-mono text-xs text-slate-600 border-r border-border/5 bg-[#05070a] overflow-hidden flex flex-col pointer-events-none" style={{ minWidth: '3.5rem' }}>
              {Array.from({ length: (activeFile?.code ?? '').split('\n').length || 1 }).map((_, idx) => (
                <div key={idx} className="h-[21px] leading-[21px]">{idx + 1}</div>
              ))}
            </div>
            <textarea
              value={activeFile?.code ?? ''}
              onChange={e => updateCode(e.target.value)}
              onScroll={e => {
                if (lineRef.current) {
                  lineRef.current.scrollTop = e.currentTarget.scrollTop;
                }
              }}
              className="flex-1 font-mono text-xs p-4 resize-none outline-none leading-[21px] bg-[#080b11] text-[#cbd5e1] caret-primary overflow-auto scrollbar-thin"
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
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border/5 bg-[#0b0e14]">
            <Button onClick={handleRun} disabled={running} size="sm" className="gap-2 px-5 font-bold shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              style={{ background: meta.color, color: '#fff', border: 'none' }}>
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              {running ? 'Running…' : runLabel}
            </Button>
            <div className="flex items-center gap-1.5">
              {saving ? (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Auto-saving…
                </div>
              ) : userId ? (
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5 text-primary" /> Synced to Cloud
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Card 3: Dashboard Inspector Panel ── */}
        <div className="rounded-2xl border bg-card overflow-hidden flex flex-col shadow-sm" style={{ minHeight: 520 }}>
          <div className="flex items-center border-b bg-muted/20 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setRightTab('output')}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                rightTab === 'output'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              {isWebLang && showPreview ? '🌐 Live Web Preview' : 'Console Output'}
            </button>
            <button
              onClick={() => setRightTab('form')}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                rightTab === 'form'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              🌐 HTTP Inputs
            </button>
            <button
              onClick={() => setRightTab('db')}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                rightTab === 'db'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              🗄️ Database Schema
            </button>
            <button
              onClick={() => setRightTab('refs')}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                rightTab === 'refs'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              📚 References
            </button>
            {running && rightTab === 'output' && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary ml-auto mr-4" />}
          </div>

          {rightTab === 'refs' && (
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {meta.emoji} {meta.label} Cheat Sheet & Examples
              </p>
              {(LANG_REFS[lang] ?? LANG_REFS.text).map((ref, i) => (
                <div key={i} className="flex flex-col gap-1 rounded-xl border overflow-hidden bg-[#080b10]">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-muted/10 border-b border-border/5">
                    <div>
                      <span className="text-xs font-bold text-slate-200">{ref.title}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{ref.desc}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { navigator.clipboard.writeText(ref.code); toast.success('Copied!'); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </button>
                      <button
                        onClick={() => {
                          updateCode(ref.code);
                          setRightTab('output');
                          setTimeout(() => handleRun(), 100);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-white hover:opacity-90 transition-all font-semibold"
                        style={{ background: meta.color }}
                      >
                        <Play className="w-3 h-3" /> Load
                      </button>
                    </div>
                  </div>
                  <pre className="text-xs font-mono px-3.5 py-2.5 bg-[#0d1117] text-[#cbd5e1] overflow-x-auto whitespace-pre leading-relaxed">
                    {ref.code}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {rightTab === 'form' && (
            <div className="flex-1 p-5 overflow-auto flex flex-col gap-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">HTTP Request Method</h3>
                <div className="flex gap-2">
                  <Button variant={requestMethod === 'POST' ? 'default' : 'outline'} size="sm" onClick={() => setRequestMethod('POST')} className="rounded-xl px-4">POST</Button>
                  <Button variant={requestMethod === 'GET' ? 'default' : 'outline'} size="sm" onClick={() => setRequestMethod('GET')} className="rounded-xl px-4">GET</Button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">Form Parameters (PHP $_POST / $_GET State)</h3>
                <div className="space-y-2.5">
                  {formParams.map((p, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input placeholder="Key" value={p.key} onChange={e => {
                        const newParams = [...formParams];
                        newParams[idx].key = e.target.value;
                        setFormParams(newParams);
                      }} className="h-10 text-xs rounded-xl" />
                      <Input placeholder="Value" value={p.value} onChange={e => {
                        const newParams = [...formParams];
                        newParams[idx].value = e.target.value;
                        setFormParams(newParams);
                      }} className="h-10 text-xs rounded-xl" />
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl shrink-0" onClick={() => {
                        setFormParams(formParams.filter((_, i) => i !== idx));
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setFormParams([...formParams, { key: '', value: '' }])} className="w-full text-xs mt-2 rounded-xl h-10 border-dashed hover:border-solid">
                    + Add Form Parameter
                  </Button>
                </div>
              </div>
            </div>
          )}

          {rightTab === 'db' && (
            <div className="flex-1 p-5 overflow-auto flex flex-col gap-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Virtual SQL Inspector</h3>
                <Button variant="outline" size="sm" onClick={() => {
                  const sqlFile = files.find(f => f.name.endsWith('.sql'));
                  if (sqlFile) {
                    const res = executeSql(sqlFile.code, {});
                    if (res.success) {
                      setDb(res.updatedDb);
                      toast.success('Database reset and re-seeded!');
                    }
                  }
                }} className="text-xs px-3 h-7 rounded-lg">
                  Reset DB
                </Button>
              </div>

              {Object.keys(db).length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-2xl bg-muted/5 flex flex-col items-center justify-center gap-2 p-6">
                  <Database className="w-8 h-8 text-muted-foreground/30" />
                  <p>No tables detected in virtual database.</p>
                  <p className="text-[10px] max-w-[200px]">Run SQL CREATE TABLE statements inside 'school_db.sql' to view tables.</p>
                </div>
              ) : (
                <div className="space-y-4 flex-1">
                  {Object.entries(db).map(([tName, table]) => (
                    <div key={tName} className="rounded-xl border overflow-hidden bg-muted/5 shadow-sm">
                      <div className="px-3.5 py-2 bg-muted/40 border-b flex justify-between items-center">
                        <span className="font-mono text-xs font-bold text-primary">{tName.toUpperCase()}</span>
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{table.rows.length} rows</span>
                      </div>
                      <div className="p-3 overflow-x-auto scrollbar-thin">
                        <table className="w-full text-xs font-mono text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border/80 text-muted-foreground text-[10px]">
                              {table.columns.map(col => (
                                <th key={col} className="pb-1.5 pr-4 font-bold">{col.toUpperCase()}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.length === 0 ? (
                              <tr>
                                <td colSpan={table.columns.length} className="pt-3 text-center text-muted-foreground italic text-[11px]">
                                  Empty table records
                                </td>
                              </tr>
                            ) : (
                              table.rows.map((row, idx) => (
                                <tr key={idx} className="border-b border-border/10 last:border-0 hover:bg-muted/10 transition-colors">
                                  {table.columns.map(col => (
                                    <td key={col} className="py-1.5 pr-4 whitespace-nowrap text-slate-300">{String(row[col] ?? 'NULL')}</td>
                                  ))}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}

                  {/* Console SQL ad-hoc query runner */}
                  <div className="pt-4 border-t mt-6">
                    <h4 className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">Execute Ad-Hoc Statement</h4>
                    <form onSubmit={e => {
                      e.preventDefault();
                      const target = e.currentTarget;
                      const qInput = target.elements.namedItem('q') as HTMLInputElement;
                      const qVal = qInput?.value.trim();
                      if (!qVal) return;
                      const res = executeSql(qVal, db);
                      if (res.success) {
                        setDb(res.updatedDb);
                      }
                      alert(res.outputString);
                    }} className="flex gap-2">
                      <Input name="q" placeholder="SELECT * FROM students WHERE marks >= 80;" className="h-10 text-xs font-mono rounded-xl bg-muted/10" />
                      <Button type="submit" size="sm" className="rounded-xl px-4">Execute</Button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {rightTab === 'output' && (
            isWebLang && showPreview ? (
              <iframe srcDoc={htmlPreview} className="flex-1 w-full bg-white" title="HTML Preview" sandbox="allow-scripts" />
            ) : (
              <div ref={outputRef} className="flex-1 overflow-auto p-4 bg-[#05070a] shadow-inner font-mono text-xs" style={{ minHeight: 380 }}>
                {!hasRun ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 select-none opacity-20 py-16">
                    <Terminal className="w-10 h-10 text-slate-500" />
                    <p className="text-[11px] text-center text-slate-400 font-sans tracking-wide">
                      {lang === 'html' ? 'Click Preview to render document layout'
                        : lang === 'sql' ? 'Click Run SQL to execute DB scripts'
                        : lang === 'php' ? 'Click Run PHP to execute interpretation'
                        : lang === 'css' ? 'Click Preview to render styles'
                        : 'Click Run to compile and execute output'}
                    </p>
                  </div>
                ) : output ? (
                  <pre className="leading-relaxed whitespace-pre-wrap break-words p-2"
                    style={{ color: output.startsWith('⚠') ? '#eab308' : output.includes('Error:') || output.includes('Interpreter Error:') ? '#f85149' : '#3fb950' }}>
                    {output}
                  </pre>
                ) : running ? (
                  <div className="flex items-center gap-2 text-slate-400 p-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" /> Compiling output console…
                  </div>
                ) : (
                  <p className="italic text-slate-500 p-2">Workspace process completed. No output produced.</p>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default Playground;
