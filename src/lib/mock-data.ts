import { Class, User, Notification, ShopProduct, RankPaper, BankAccount } from '@/types';

// Mock current user (student)
export const mockCurrentUser: User = {
  id: '1',
  phone: '0771234567',
  firstName: 'Kasun',
  lastName: 'Perera',
  schoolName: 'Royal College Colombo',
  birthday: '2008-05-15',
  address: '123, Galle Road, Colombo 03',
  grade: 12,
  role: 'STUDENT',
  status: 'ACTIVE',
  createdAt: '2024-01-15T10:00:00Z',
};

// Mock classes
export const mockClasses: Class[] = [
  {
    id: '1',
    title: 'A/L Combined Maths 2026 Batch',
    description: 'Comprehensive Combined Maths course for A/L students preparing for the 2026 examination.',
    gradeMin: 12,
    gradeMax: 13,
    monthlyFeeAmount: 3500,
    isPrivate: false,
    createdBy: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'A/L Physics 2025 Batch',
    description: 'Complete A/L Physics preparation course with practical exercises and model papers.',
    gradeMin: 10,
    gradeMax: 11,
    monthlyFeeAmount: 2500,
    isPrivate: false,
    createdBy: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    title: 'Grade 9 ICT Foundation',
    description: 'Build a strong foundation in ICT concepts for Grade 9 students.',
    gradeMin: 9,
    gradeMax: 9,
    monthlyFeeAmount: 2000,
    isPrivate: false,
    createdBy: 'admin',
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: '4',
    title: 'Special Revision - A/L 2025',
    description: 'Intensive revision class for 2025 A/L candidates.',
    gradeMin: 13,
    gradeMax: 13,
    monthlyFeeAmount: 4000,
    isPrivate: true,
    privateCode: 'REV2025',
    adminOtpPhone: '0771112233',
    createdBy: 'admin',
    createdAt: '2024-06-01T00:00:00Z',
  },
];

// Mock enrolled classes for current user
export const mockEnrolledClassIds = ['1', '2'];

// Mock payment statuses (classId -> status for current month)
export const mockPaymentStatus: Record<string, 'PAID' | 'PENDING' | 'UNPAID'> = {
  '1': 'PAID',
  '2': 'PENDING',
};

// Mock notifications
export const mockNotifications: Notification[] = [
  {
    id: '1',
    targetType: 'ALL',
    title: 'New Rank Paper Available',
    message: 'A/L ICT Model Paper 2026 is now available. Complete it before the deadline to secure your spot on the leaderboard!',
    createdBy: 'admin',
    createdAt: '2024-02-01T09:00:00Z',
  },
  {
    id: '2',
    targetType: 'CLASS',
    targetRef: '1',
    title: 'Class Schedule Update',
    message: 'Saturday\'s class has been rescheduled to Sunday 4 PM due to the holiday.',
    createdBy: 'admin',
    createdAt: '2024-02-02T14:00:00Z',
  },
  {
    id: '3',
    targetType: 'ALL',
    title: 'Payment Reminder',
    message: 'Please ensure your February payments are completed by the 5th to maintain access to materials.',
    createdBy: 'admin',
    createdAt: '2024-02-03T08:00:00Z',
  },
];

// Mock shop products
export const mockShopProducts: ShopProduct[] = [
  {
    id: '1',
    title: 'A/L ICT Complete Theory Notes',
    description: 'Comprehensive theory notes covering all A/L ICT syllabus topics with diagrams and examples.',
    type: 'BOTH',
    priceSoft: 1500,
    pricePrinted: 2500,
    priceBoth: 3000,
    isActive: true,
  },
  {
    id: '2',
    title: 'Programming Practice Problems',
    description: '100+ programming problems with solutions in Pascal and Python.',
    type: 'SOFT',
    priceSoft: 800,
    isActive: true,
  },
  {
    id: '3',
    title: 'Past Papers Collection 2015-2024',
    description: 'All A/L ICT past papers with detailed marking schemes.',
    type: 'BOTH',
    priceSoft: 1200,
    pricePrinted: 2000,
    priceBoth: 2500,
    isActive: true,
  },
];

// Mock rank papers
export const mockRankPapers: RankPaper[] = [
  {
    id: '1',
    title: 'A/L ICT Model Paper 2026 - January',
    grade: 13,
    classId: '1',
    feeAmount: 500,
    timeLimitMinutes: 180,
    hasMcq: true,
    hasShortEssay: true,
    hasEssay: true,
    publishStatus: 'PUBLISHED',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '2',
    title: 'O/L ICT Practice Test - February',
    grade: 11,
    classId: '2',
    feeAmount: 300,
    timeLimitMinutes: 120,
    hasMcq: true,
    hasShortEssay: true,
    hasEssay: false,
    publishStatus: 'PUBLISHED',
    createdAt: '2024-02-01T00:00:00Z',
  },
];

// Mock bank accounts
export const mockBankAccounts: BankAccount[] = [
  {
    id: '1',
    bankName: 'Bank of Ceylon',
    accountName: 'ICT Academy',
    accountNumber: '12345678901234',
    branch: 'Colombo Main',
    isActive: true,
  },
  {
    id: '2',
    bankName: 'Commercial Bank',
    accountName: 'ICT Academy',
    accountNumber: '98765432109876',
    branch: 'Kollupitiya',
    isActive: true,
  },
];

// Mock lessons for a class
export const mockLessons = [
  {
    id: '1',
    classDayId: '1',
    title: 'Introduction to Databases',
    description: 'Understanding DBMS concepts, types of databases, and their applications.',
    notesText: 'Key concepts covered: RDBMS, NoSQL, Data models...',
    youtubeUrl: 'https://www.youtube.com/watch?v=example1',
    createdBy: 'admin',
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: '2',
    classDayId: '2',
    title: 'SQL Fundamentals',
    description: 'Learn basic SQL commands: SELECT, INSERT, UPDATE, DELETE.',
    pdfUrl: '/materials/sql-basics.pdf',
    youtubeUrl: 'https://www.youtube.com/watch?v=example2',
    createdBy: 'admin',
    createdAt: '2024-02-08T00:00:00Z',
  },
  {
    id: '3',
    classDayId: '3',
    title: 'Database Normalization',
    description: 'Understanding 1NF, 2NF, 3NF and their importance in database design.',
    pdfUrl: '/materials/normalization.pdf',
    createdBy: 'admin',
    createdAt: '2024-02-15T00:00:00Z',
  },
];

// Mock class schedule for a month
export const mockClassDays = [
  { id: '1', date: '2024-02-03', isExtra: false, title: 'Week 1' },
  { id: '2', date: '2024-02-10', isExtra: false, title: 'Week 2' },
  { id: '3', date: '2024-02-17', isExtra: false, title: 'Week 3' },
  { id: '4', date: '2024-02-24', isExtra: false, title: 'Week 4' },
  { id: '5', date: '2024-02-28', isExtra: true, title: 'Extra Session' },
];
