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
  { name: 'python_basics.py', sortOrder: 0, code: `# ================================================================
# Python Basics - A/L ICT Playground
# Topics: Variables, Data Types, Functions, Lists, Dictionaries
# ================================================================

# --- Variables & Data Types ---
student_name = "Kamal Perera"
grade = 13
gpa = 3.85
is_active = True

print("=" * 40)
print("  STUDENT INFORMATION SYSTEM")
print("=" * 40)
print(f"Name   : {student_name}")
print(f"Grade  : {grade}")
print(f"GPA    : {gpa:.2f}")
print(f"Active : {is_active}")

# --- Lists ---
subjects = ["ICT", "Mathematics", "Science", "English", "History"]
marks    = [92, 88, 76, 85, 79]

print("\\n--- Subject Results ---")
for subject, mark in zip(subjects, marks):
    grade_letter = "A" if mark >= 85 else "B" if mark >= 70 else "C"
    print(f"  {subject:<14} {mark:>3}  [{grade_letter}]")

# --- Dictionary ---
student = {
    "name"    : student_name,
    "marks"   : marks,
    "average" : sum(marks) / len(marks),
    "highest" : max(marks),
    "lowest"  : min(marks),
}

print("\\n--- Summary ---")
print(f"  Average  : {student['average']:.2f}")
print(f"  Highest  : {student['highest']}")
print(f"  Lowest   : {student['lowest']}")

# --- Functions ---
def classify(avg):
    if avg >= 90: return "Distinction"
    if avg >= 75: return "Merit"
    if avg >= 50: return "Pass"
    return "Fail"

print(f"  Result   : {classify(student['average'])}")

# --- List Comprehension ---
passed = [s for s, m in zip(subjects, marks) if m >= 80]
print(f"\\n  Passed with 80+: {', '.join(passed)}")

print("\\n[Program End]")
` },
  { name: 'oop_python.py', sortOrder: 1, code: `# ================================================================
# Object-Oriented Programming (OOP) - A/L ICT
# Topics: Classes, Inheritance, Encapsulation, Polymorphism
# ================================================================

# --- Base Class ---
class Person:
    def __init__(self, name, age, phone):
        self.name  = name
        self.age   = age
        self.__phone = phone   # private (encapsulation)

    def get_phone(self):
        return self.__phone

    def introduce(self):
        return f"Hi, I am {self.name}, age {self.age}."

    def __str__(self):
        return f"Person({self.name})"


# --- Inheritance ---
class Student(Person):
    def __init__(self, name, age, phone, student_id, subjects):
        super().__init__(name, age, phone)
        self.student_id = student_id
        self.subjects   = subjects
        self.__marks    = {}

    def add_mark(self, subject, mark):
        if subject in self.subjects:
            self.__marks[subject] = mark
        else:
            print(f"  ⚠ '{subject}' not in enrolled subjects.")

    def average(self):
        if not self.__marks:
            return 0
        return sum(self.__marks.values()) / len(self.__marks)

    def report(self):
        print(f"\\n{'=' * 38}")
        print(f"  Student Report Card")
        print(f"{'=' * 38}")
        print(f"  ID     : {self.student_id}")
        print(f"  Name   : {self.name}")
        print(f"  Age    : {self.age}")
        print(f"  Phone  : {self.get_phone()}")
        print(f"  {'Subject':<16} {'Mark':>5}")
        print(f"  {'-'*24}")
        for subj, mark in self.__marks.items():
            bar = "█" * (mark // 10)
            print(f"  {subj:<16} {mark:>5}  {bar}")
        print(f"  {'-'*24}")
        avg = self.average()
        grade = "A" if avg >= 85 else "B" if avg >= 70 else "C" if avg >= 55 else "F"
        print(f"  Average: {avg:>6.2f}  Grade: {grade}")
        print(f"{'=' * 38}")


class Teacher(Person):
    def __init__(self, name, age, phone, subject):
        super().__init__(name, age, phone)
        self.subject = subject

    def introduce(self):   # polymorphism
        return f"I am Teacher {self.name}, teaching {self.subject}."


# --- Main Program ---
s = Student("Nimal Silva", 17, "0771234567", "S-2024-045",
            ["ICT", "Maths", "Science", "English"])

s.add_mark("ICT",     95)
s.add_mark("Maths",   88)
s.add_mark("Science", 76)
s.add_mark("English", 82)
s.add_mark("History", 70)   # not enrolled -> warning

s.report()

t = Teacher("Mrs. Perera", 38, "0712345678", "ICT")
print(f"\\n  {t.introduce()}")
print(f"  {s.introduce()}")

# --- List of Objects ---
students = [
    Student("Dilani",  16, "0781111111", "S-001", ["ICT", "Maths"]),
    Student("Ruwan",   17, "0782222222", "S-002", ["ICT", "Science"]),
    Student("Amali",   17, "0783333333", "S-003", ["ICT", "English"]),
]
for st in students:
    st.add_mark("ICT", [90, 78, 95][students.index(st)])

print("\\n--- ICT Marks of All Students ---")
for st in students:
    print(f"  {st.name:<12} avg: {st.average():.1f}")
` },
  { name: 'index.html', sortOrder: 2, code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ICT Student Portal</title>
</head>
<body>

  <header>
    <h1>🎓 ICT Student Portal</h1>
    <p>A/L Information &amp; Communication Technology — 2024/2025</p>
  </header>

  <div class="grid">
    <div class="card" onclick="showAlert('Python')">
      <div class="icon">🐍</div>
      <h3>Python Programming</h3>
      <p>Variables, OOP, File I/O and algorithms for A/L ICT.</p>
      <span class="badge">12 Lessons</span>
    </div>
    <div class="card" onclick="showAlert('Database')">
      <div class="icon">🗄️</div>
      <h3>Database &amp; SQL</h3>
      <p>MySQL, ERD, normalization and query writing practice.</p>
      <span class="badge">8 Lessons</span>
    </div>
    <div class="card" onclick="showAlert('Web Dev')">
      <div class="icon">🌐</div>
      <h3>Web Development</h3>
      <p>HTML5, CSS3, PHP backend and form handling.</p>
      <span class="badge">10 Lessons</span>
    </div>
    <div class="card" onclick="showAlert('Networks')">
      <div class="icon">🔗</div>
      <h3>Networks</h3>
      <p>OSI model, TCP/IP, IP addressing and subnetting.</p>
      <span class="badge">6 Lessons</span>
    </div>
  </div>

  <div class="progress-section">
    <h2>📊 Your Progress</h2>
    <div class="progress-item">
      <label><span>Python Programming</span><span id="py-pct">75%</span></label>
      <div class="bar-track"><div class="bar-fill" id="py-bar" style="width:0%"></div></div>
    </div>
    <div class="progress-item">
      <label><span>Database &amp; SQL</span><span id="db-pct">60%</span></label>
      <div class="bar-track"><div class="bar-fill" id="db-bar" style="width:0%"></div></div>
    </div>
    <div class="progress-item">
      <label><span>Web Development</span><span id="web-pct">90%</span></label>
      <div class="bar-track"><div class="bar-fill" id="web-bar" style="width:0%"></div></div>
    </div>
    <div class="progress-item">
      <label><span>Networks</span><span id="net-pct">45%</span></label>
      <div class="bar-track"><div class="bar-fill" id="net-bar" style="width:0%"></div></div>
    </div>
  </div>

  <button class="btn" id="save-btn">Save Progress</button>

</body>
</html>` },
  { name: 'style.css', sortOrder: 3, code: `/* ── ICT Student Portal — style.css ─────── */

/* Reset & Base */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
  min-height: 100vh;
  color: #e2e8f0;
  padding: 24px 16px;
}

/* Header */
header {
  text-align: center;
  margin-bottom: 32px;
}
header h1 {
  font-size: 2.2rem;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}
header p { color: #94a3b8; margin-top: 6px; }

/* Card Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  max-width: 900px;
  margin: 0 auto 32px;
}
.card {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 24px 20px;
  transition: transform 0.2s, background 0.2s;
  cursor: pointer;
}
.card:hover { transform: translateY(-4px); background: rgba(255,255,255,0.1); }
.card .icon { font-size: 2rem; margin-bottom: 12px; }
.card h3 { font-size: 1rem; font-weight: 600; color: #f1f5f9; }
.card p  { font-size: 0.82rem; color: #94a3b8; margin-top: 6px; line-height: 1.5; }
.card .badge {
  display: inline-block;
  margin-top: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  background: rgba(56,189,248,0.15);
  color: #38bdf8;
  border: 1px solid #38bdf840;
}

/* Progress Section */
.progress-section {
  max-width: 900px;
  margin: 0 auto 32px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 24px;
}
.progress-section h2 { color: #f1f5f9; margin-bottom: 18px; font-size: 1rem; }
.progress-item { margin-bottom: 14px; }
.progress-item label {
  display: flex; justify-content: space-between;
  font-size: 0.82rem; color: #94a3b8; margin-bottom: 6px;
}
.bar-track {
  height: 8px; background: rgba(255,255,255,0.1);
  border-radius: 4px; overflow: hidden;
}
.bar-fill {
  height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  transition: width 1s ease;
}

/* Button */
.btn {
  display: block;
  max-width: 200px;
  margin: 0 auto;
  padding: 12px 28px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  color: #0f172a;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn:hover { opacity: 0.85; }
.btn.saved { background: #22c55e; color: #fff; }` },
  { name: 'script.js', sortOrder: 4, code: `// ── ICT Student Portal — script.js ──────────

// Animate progress bars on load
window.addEventListener('DOMContentLoaded', () => {
  const bars = [
    { bar: 'py-bar',  pct: 75 },
    { bar: 'db-bar',  pct: 60 },
    { bar: 'web-bar', pct: 90 },
    { bar: 'net-bar', pct: 45 },
  ];

  setTimeout(() => {
    bars.forEach(({ bar, pct }) => {
      const el = document.getElementById(bar);
      if (el) el.style.width = pct + '%';
    });
  }, 200);

  // Save button interaction
  const btn = document.getElementById('save-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      btn.textContent = '✅ Progress Saved!';
      btn.classList.add('saved');
      setTimeout(() => {
        btn.textContent = 'Save Progress';
        btn.classList.remove('saved');
      }, 2000);
    });
  }
});

// Show module alert
function showAlert(module) {
  alert('Opening ' + module + ' Module...');
}` },
  { name: 'student_form.php', sortOrder: 3, code: `<?php
// ================================================================
// PHP Student Registration & Processing - A/L ICT
// Topics: Variables, Arrays, Functions, Form Handling, Sessions
// ================================================================

// --- Configuration ---
define('APP_NAME', 'ICT Student System');
define('MIN_MARKS', 0);
define('MAX_MARKS', 100);

// --- Helper Functions ---
function sanitize($value) {
    return htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
}

function calculate_grade($marks) {
    if ($marks >= 85) return ['A', 'Distinction'];
    if ($marks >= 70) return ['B', 'Merit'];
    if ($marks >= 55) return ['C', 'Credit'];
    if ($marks >= 40) return ['S', 'Simple Pass'];
    return ['F', 'Fail'];
}

function validate_marks($marks) {
    return is_numeric($marks) 
        && $marks >= MIN_MARKS 
        && $marks <= MAX_MARKS;
}

// --- Sample Student Database (Array of Associative Arrays) ---
$students = [
    ['id' => 'S001', 'name' => 'Kamal Perera',      'grade' => 13, 'marks' => [92, 88, 76]],
    ['id' => 'S002', 'name' => 'Nimal Silva',        'grade' => 13, 'marks' => [78, 95, 82]],
    ['id' => 'S003', 'name' => 'Dilani Rathnayake',  'grade' => 12, 'marks' => [65, 70, 58]],
    ['id' => 'S004', 'name' => 'Amali Fernando',     'grade' => 12, 'marks' => [90, 85, 92]],
    ['id' => 'S005', 'name' => 'Ruwan Bandara',      'grade' => 13, 'marks' => [45, 52, 48]],
];
$subjects = ['ICT', 'Mathematics', 'Science'];

// --- Process Students ---
echo APP_NAME . " - Student Report\\n";
echo str_repeat("=", 60) . "\\n";
printf("%-6s %-22s %5s %6s %6s %6s %6s  %s\\n",
    "ID", "Name", "Gr", ...$subjects, "Avg", "Grade");
echo str_repeat("-", 60) . "\\n";

foreach ($students as $student) {
    $avg = array_sum($student['marks']) / count($student['marks']);
    [$letter, $desc] = calculate_grade($avg);

    printf("%-6s %-22s %5d %6d %6d %6d %6.1f  %s (%s)\\n",
        $student['id'],
        $student['name'],
        $student['grade'],
        $student['marks'][0],
        $student['marks'][1],
        $student['marks'][2],
        $avg,
        $letter,
        $desc
    );
}

echo str_repeat("=", 60) . "\\n";

// --- Class Statistics ---
$all_marks = array_merge(...array_column($students, 'marks'));
$class_avg = array_sum($all_marks) / count($all_marks);

echo "\\n--- Class Statistics ---\\n";
echo "Total Students : " . count($students) . "\\n";
printf("Class Average  : %.2f\\n", $class_avg);
echo "Highest Mark   : " . max($all_marks) . "\\n";
echo "Lowest Mark    : " . min($all_marks) . "\\n";

// --- Simulated Form Handling ---
$_POST['name']  = "Test Student";
$_POST['marks'] = "88";
$_POST['grade'] = "12";

echo "\\n--- Form Submission Demo ---\\n";
if (!empty($_POST['name']) && validate_marks($_POST['marks'])) {
    $name  = sanitize($_POST['name']);
    $marks = (int) $_POST['marks'];
    [$letter, $desc] = calculate_grade($marks);
    echo "Name   : $name\\n";
    echo "Marks  : $marks\\n";
    echo "Grade  : $letter - $desc\\n";
    echo "Status : Registration Successful ✓\\n";
} else {
    echo "Error  : Invalid input.\\n";
}

// --- String & Array Functions ---
echo "\\n--- PHP String Functions Demo ---\\n";
$title = "  ict student  ";
echo "Original      : '$title'\\n";
echo "Trimmed       : '" . trim($title) . "'\\n";
echo "Upper         : '" . strtoupper(trim($title)) . "'\\n";
echo "Str Length    : " . strlen(trim($title)) . "\\n";
echo "Replace       : '" . str_replace("student", "LEARNER", trim($title)) . "'\\n";

$csv = "Kamal,Nimal,Dilani,Amali,Ruwan";
$names = explode(",", $csv);
echo "\\nNames Array   : ";
print_r($names);
echo "Joined Again  : " . implode(" | ", $names) . "\\n";

echo "\\n[Script End]\\n";
?>` },
  { name: 'school_db.sql', sortOrder: 4, code: `-- ================================================================
-- School Database Schema - A/L ICT
-- Topics: DDL, DML, DQL, Joins, Aggregates, Views, Indexes
-- ================================================================

-- ── 1. DROP existing tables (clean slate) ──────────────────────
DROP TABLE IF EXISTS enrollment_records;
DROP TABLE IF EXISTS exam_results;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS classes;

-- ── 2. CREATE TABLES (DDL) ─────────────────────────────────────

CREATE TABLE classes (
    class_id   INT         PRIMARY KEY AUTO_INCREMENT,
    class_name VARCHAR(20) NOT NULL UNIQUE,   -- e.g. "13A", "12B"
    year       INT         NOT NULL,
    capacity   INT         DEFAULT 40
);

CREATE TABLE subjects (
    subject_id   INT          PRIMARY KEY AUTO_INCREMENT,
    subject_name VARCHAR(100) NOT NULL,
    subject_code VARCHAR(10)  NOT NULL UNIQUE,
    credits      INT          DEFAULT 3
);

CREATE TABLE teachers (
    teacher_id   INT          PRIMARY KEY AUTO_INCREMENT,
    full_name    VARCHAR(100) NOT NULL,
    email        VARCHAR(100) UNIQUE,
    phone        VARCHAR(15),
    subject_id   INT,
    joined_date  DATE,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
);

CREATE TABLE students (
    student_id   INT          PRIMARY KEY AUTO_INCREMENT,
    student_code VARCHAR(10)  NOT NULL UNIQUE,  -- e.g. "S-2024-001"
    full_name    VARCHAR(100) NOT NULL,
    birthday     DATE,
    gender       ENUM('M','F','Other') DEFAULT 'M',
    phone        VARCHAR(15),
    class_id     INT,
    enrolled_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    is_active    BOOLEAN      DEFAULT TRUE,
    FOREIGN KEY (class_id) REFERENCES classes(class_id)
);

CREATE TABLE exam_results (
    result_id   INT   PRIMARY KEY AUTO_INCREMENT,
    student_id  INT   NOT NULL,
    subject_id  INT   NOT NULL,
    exam_date   DATE  NOT NULL,
    marks       DECIMAL(5,2) NOT NULL CHECK (marks BETWEEN 0 AND 100),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
);

-- ── 3. INDEXES ─────────────────────────────────────────────────
CREATE INDEX idx_student_class   ON students(class_id);
CREATE INDEX idx_result_student  ON exam_results(student_id);
CREATE INDEX idx_result_subject  ON exam_results(subject_id);

-- ── 4. INSERT DATA (DML) ───────────────────────────────────────

INSERT INTO classes (class_name, year, capacity) VALUES
    ('13A', 2024, 35),
    ('13B', 2024, 35),
    ('12A', 2024, 38),
    ('12B', 2024, 38);

INSERT INTO subjects (subject_name, subject_code, credits) VALUES
    ('Information & Communication Technology', 'ICT',  4),
    ('Mathematics',                            'MATH', 4),
    ('Science',                                'SCI',  4),
    ('English',                                'ENG',  3),
    ('History',                                'HIS',  3);

INSERT INTO teachers (full_name, email, phone, subject_id, joined_date) VALUES
    ('Mrs. S. Perera',  'sperera@school.lk',  '0712345678', 1, '2018-01-15'),
    ('Mr. R. Silva',    'rsilva@school.lk',   '0713456789', 2, '2015-08-01'),
    ('Mrs. D. Fernando','dfernando@school.lk','0714567890', 3, '2020-03-10'),
    ('Mr. K. Bandara',  'kbandara@school.lk', '0715678901', 4, '2019-06-20');

INSERT INTO students (student_code, full_name, birthday, gender, phone, class_id) VALUES
    ('S-2024-001', 'Kamal Perera',      '2007-03-15', 'M', '0771001001', 1),
    ('S-2024-002', 'Nimal Silva',       '2007-07-22', 'M', '0771002002', 1),
    ('S-2024-003', 'Dilani Rathnayake', '2007-01-10', 'F', '0771003003', 1),
    ('S-2024-004', 'Amali Fernando',    '2007-11-30', 'F', '0771004004', 2),
    ('S-2024-005', 'Ruwan Bandara',     '2007-05-18', 'M', '0771005005', 2),
    ('S-2024-006', 'Sachini Jayawardena','2007-09-25','F', '0771006006', 3),
    ('S-2024-007', 'Tharaka Dissanayake','2008-04-12','M', '0771007007', 3);

INSERT INTO exam_results (student_id, subject_id, exam_date, marks) VALUES
    (1, 1, '2024-11-10', 92.50),
    (1, 2, '2024-11-11', 88.00),
    (1, 3, '2024-11-12', 76.50),
    (2, 1, '2024-11-10', 78.00),
    (2, 2, '2024-11-11', 95.00),
    (2, 3, '2024-11-12', 82.50),
    (3, 1, '2024-11-10', 65.00),
    (3, 2, '2024-11-11', 70.00),
    (3, 3, '2024-11-12', 58.00),
    (4, 1, '2024-11-10', 90.00),
    (4, 2, '2024-11-11', 85.50),
    (4, 3, '2024-11-12', 92.00),
    (5, 1, '2024-11-10', 45.00),
    (5, 2, '2024-11-11', 52.00),
    (5, 3, '2024-11-12', 48.50);

-- ── 5. SELECT QUERIES (DQL) ────────────────────────────────────

-- 5.1 All students with their class
SELECT s.student_code, s.full_name, c.class_name, s.gender
FROM students s
JOIN classes c ON s.class_id = c.class_id
ORDER BY c.class_name, s.full_name;

-- 5.2 Student results with subject names
SELECT s.full_name, sub.subject_name, r.marks,
    CASE
        WHEN r.marks >= 85 THEN 'A - Distinction'
        WHEN r.marks >= 70 THEN 'B - Merit'
        WHEN r.marks >= 55 THEN 'C - Credit'
        WHEN r.marks >= 40 THEN 'S - Pass'
        ELSE                    'F - Fail'
    END AS grade
FROM exam_results r
JOIN students s  ON r.student_id  = s.student_id
JOIN subjects sub ON r.subject_id = sub.subject_id
ORDER BY s.full_name, sub.subject_name;

-- 5.3 Average marks per student (aggregate)
SELECT s.full_name,
       COUNT(r.result_id)  AS exams_taken,
       ROUND(AVG(r.marks), 2) AS average_marks,
       MAX(r.marks)        AS highest,
       MIN(r.marks)        AS lowest
FROM students s
LEFT JOIN exam_results r ON s.student_id = r.student_id
GROUP BY s.student_id, s.full_name
ORDER BY average_marks DESC;

-- 5.4 Class-wise performance
SELECT c.class_name,
       COUNT(DISTINCT s.student_id) AS student_count,
       ROUND(AVG(r.marks), 2)       AS class_average
FROM classes c
JOIN students s       ON c.class_id    = s.class_id
JOIN exam_results r   ON s.student_id  = r.student_id
GROUP BY c.class_id, c.class_name
ORDER BY class_average DESC;

-- 5.5 Top scorer per subject
SELECT sub.subject_name, s.full_name, r.marks AS top_marks
FROM exam_results r
JOIN students s   ON r.student_id  = s.student_id
JOIN subjects sub ON r.subject_id  = sub.subject_id
WHERE r.marks = (
    SELECT MAX(r2.marks) FROM exam_results r2
    WHERE r2.subject_id = r.subject_id
)
ORDER BY sub.subject_name;

-- ── 6. UPDATE & DELETE ─────────────────────────────────────────

-- Update a student phone
UPDATE students SET phone = '0779999999' WHERE student_code = 'S-2024-001';

-- Soft-delete (deactivate) a student
UPDATE students SET is_active = FALSE WHERE student_code = 'S-2024-007';

-- Delete a result record
DELETE FROM exam_results WHERE student_id = 5 AND subject_id = 3;

-- Verify updates
SELECT student_code, full_name, phone, is_active FROM students ORDER BY student_id;
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
  const runLabel = lang === 'sql' ? 'Run SQL' : isWebLang ? 'Preview' : 'Run';

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

          {/* Language tabs at bottom of explorer — HTML/CSS/JS shown separately */}
          <div className="border-t p-2 flex flex-wrap gap-1">
            {(['python','html','css','javascript','sql'] as Language[]).map(l => {
              const m = langMeta[l];
              const isActive = lang === l;
              const extMap: Record<string, string[]> = {
                html: ['html','htm'], css: ['css'], javascript: ['js','ts','jsx','tsx'],
                python: ['py'], sql: ['sql'],
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

        {/* ── Card 3: Output / Preview ── */}
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col" style={{ minHeight: 480 }}>
          <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
            <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {isWebLang && showPreview ? '🌐 Web Preview' : lang === 'sql' ? 'SQL Output' : 'Output'}
            </span>
            {running && <Loader2 className="w-3 h-3 animate-spin text-primary ml-auto" />}
          </div>

          {isWebLang && showPreview ? (
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
