import { Subject, Student, SchoolConfig, GradingRule, ClassData } from '../types';

export const KINDERGARTEN_SUBJECTS: Subject[] = [
  { id: 'english', name: 'English', maxMarks: 50, passMarks: 17 },
  { id: 'hindi', name: 'Hindi', maxMarks: 50, passMarks: 17 },
  { id: 'maths', name: 'Number Work / Maths', maxMarks: 50, passMarks: 17 },
  { id: 'rhymes', name: 'Rhymes & Conversation', maxMarks: 50, passMarks: 17 },
  { id: 'drawing', name: 'Drawing & Craft', maxMarks: 30, passMarks: 10 },
];

export const PRIMARY_SUBJECTS: Subject[] = [
  { id: 'maths', name: 'Maths', maxMarks: 60, passMarks: 20 },
  { id: 'english', name: 'English', maxMarks: 60, passMarks: 20 },
  { id: 'evs', name: 'E.V.S.', maxMarks: 60, passMarks: 20 },
  { id: 'hindi', name: 'Hindi', maxMarks: 60, passMarks: 20 },
  { id: 'gk', name: 'G.K.', maxMarks: 60, passMarks: 20 },
  { id: 'drawing', name: 'Drawing', maxMarks: 10, passMarks: 3.3 },
];

export const MIDDLE_SUBJECTS: Subject[] = [
  { id: 'math', name: 'Mathematics', maxMarks: 80, passMarks: 27 },
  { id: 'science', name: 'Science', maxMarks: 80, passMarks: 27 },
  { id: 'social', name: 'Social Science', maxMarks: 80, passMarks: 27 },
  { id: 'english', name: 'English', maxMarks: 80, passMarks: 27 },
  { id: 'hindi', name: 'Hindi', maxMarks: 80, passMarks: 27 },
  { id: 'sanskrit', name: 'Sanskrit', maxMarks: 50, passMarks: 17 },
];

export const DEFAULT_SUBJECTS: Subject[] = PRIMARY_SUBJECTS;

export const DEFAULT_STUDENTS: Student[] = [
  { id: 's1', sNo: 1, rollNo: '101', name: 'Vaidik Phagore', attendanceDays: 88, totalWorkingDays: 92 },
  { id: 's2', sNo: 2, rollNo: '102', name: 'Vihan Suryavanshi', attendanceDays: 90, totalWorkingDays: 92 },
  { id: 's3', sNo: 3, rollNo: '103', name: 'Mitanshu Ningwal', attendanceDays: 85, totalWorkingDays: 92 },
  { id: 's4', sNo: 4, rollNo: '104', name: 'Mishti Ningwal', attendanceDays: 92, totalWorkingDays: 92 },
  { id: 's5', sNo: 5, rollNo: '105', name: 'Yuvraj Waskel', attendanceDays: 78, totalWorkingDays: 92 },
  { id: 's6', sNo: 6, rollNo: '106', name: 'Vanshraj Barman', attendanceDays: 89, totalWorkingDays: 92 },
  { id: 's7', sNo: 7, rollNo: '107', name: 'Divyansh Waskel', attendanceDays: 84, totalWorkingDays: 92 },
  { id: 's8', sNo: 8, rollNo: '108', name: 'Mitansh Mandloi', attendanceDays: 87, totalWorkingDays: 92 },
  { id: 's9', sNo: 9, rollNo: '109', name: 'Yakshit Mukati', attendanceDays: 91, totalWorkingDays: 92 },
  { id: 's10', sNo: 10, rollNo: '110', name: 'Hansraj Chouhan', attendanceDays: 83, totalWorkingDays: 92 },
  { id: 's11', sNo: 11, rollNo: '111', name: 'Tanishq Waskel', attendanceDays: 86, totalWorkingDays: 92 },
  { id: 's12', sNo: 12, rollNo: '112', name: 'Rajveer Waskel', attendanceDays: 80, totalWorkingDays: 92 },
];

export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  schoolName: 'ST. XAVIER MODEL PUBLIC SCHOOL',
  schoolSubtitle: 'Affiliated to Central Board of Secondary Education',
  affiliationNo: 'CBSE / AFF / 2026 / 84210',
  academicYear: '2026-27',
  className: 'Class 4',
  section: 'A',
  quarterlyTitle: 'QUARTERLY EXAMINATION 2026-27',
  halfYearlyTitle: 'HALF YEARLY EXAMINATION 2026-27',
};

export const DEFAULT_GRADING_RULES: GradingRule[] = [
  { minPercentage: 90, grade: 'A1', remark: 'Outstanding', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { minPercentage: 80, grade: 'A2', remark: 'Excellent', badgeColor: 'bg-teal-100 text-teal-800 border-teal-300' },
  { minPercentage: 70, grade: 'B1', remark: 'Very Good', badgeColor: 'bg-blue-100 text-blue-800 border-blue-300' },
  { minPercentage: 60, grade: 'B2', remark: 'Good', badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { minPercentage: 50, grade: 'C1', remark: 'Above Average', badgeColor: 'bg-amber-100 text-amber-800 border-amber-300' },
  { minPercentage: 40, grade: 'C2', remark: 'Average', badgeColor: 'bg-orange-100 text-orange-800 border-orange-300' },
  { minPercentage: 33, grade: 'D', remark: 'Needs Improvement', badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { minPercentage: 0, grade: 'E', remark: 'Poor', badgeColor: 'bg-red-100 text-red-800 border-red-300' },
];

export const INITIAL_QUARTERLY_MARKS: Record<string, Record<string, number | null>> = {
  s1: { maths: 54, english: 52, evs: 56, hindi: 49, gk: 55, drawing: 9 },
  s2: { maths: 48, english: 45, evs: 50, hindi: 46, gk: 47, drawing: 8 },
  s3: { maths: 42, english: 40, evs: 45, hindi: 38, gk: 41, drawing: 7 },
  s4: { maths: 58, english: 57, evs: 59, hindi: 56, gk: 58, drawing: 10 },
  s5: { maths: 35, english: 32, evs: 36, hindi: 34, gk: 30, drawing: 6 },
  s6: { maths: 51, english: 49, evs: 52, hindi: 48, gk: 50, drawing: 9 },
  s7: { maths: 28, english: 25, evs: 29, hindi: 24, gk: 26, drawing: 5 },
  s8: { maths: 46, english: 44, evs: 48, hindi: 42, gk: 45, drawing: 8 },
  s9: { maths: 55, english: 53, evs: 54, hindi: 52, gk: 56, drawing: 9 },
  s10: { maths: 38, english: 35, evs: 40, hindi: 36, gk: 39, drawing: 7 },
  s11: { maths: 44, english: 42, evs: 46, hindi: 40, gk: 43, drawing: 8 },
  s12: { maths: 18, english: 16, evs: 19, hindi: 15, gk: 20, drawing: 4 },
};

export const INITIAL_HALF_YEARLY_MARKS: Record<string, Record<string, number | null>> = {
  s1: { maths: 56, english: 55, evs: 58, hindi: 52, gk: 57, drawing: 9 },
  s2: { maths: 51, english: 48, evs: 53, hindi: 49, gk: 50, drawing: 8 },
  s3: { maths: 45, english: 44, evs: 47, hindi: 42, gk: 44, drawing: 8 },
  s4: { maths: 59, english: 58, evs: 60, hindi: 58, gk: 59, drawing: 10 },
  s5: { maths: 38, english: 36, evs: 40, hindi: 37, gk: 35, drawing: 7 },
  s6: { maths: 53, english: 51, evs: 54, hindi: 50, gk: 52, drawing: 9 },
  s7: { maths: 34, english: 31, evs: 35, hindi: 30, gk: 32, drawing: 6 },
  s8: { maths: 49, english: 47, evs: 50, hindi: 45, gk: 48, drawing: 8 },
  s9: { maths: 57, english: 55, evs: 56, hindi: 54, gk: 58, drawing: 10 },
  s10: { maths: 41, english: 39, evs: 43, hindi: 38, gk: 42, drawing: 7 },
  s11: { maths: 47, english: 45, evs: 48, hindi: 43, gk: 46, drawing: 8 },
  s12: { maths: 24, english: 22, evs: 26, hindi: 20, gk: 25, drawing: 5 },
};

export interface SubjectTemplate {
  id: string;
  name: string;
  description: string;
  subjects: Subject[];
}

export const SUBJECT_TEMPLATES: SubjectTemplate[] = [
  {
    id: 'kindergarten',
    name: 'Pre-Primary (Nursery, LKG, UKG)',
    description: 'English (50), Hindi (50), Maths (50), Rhymes (50), Drawing (30)',
    subjects: KINDERGARTEN_SUBJECTS,
  },
  {
    id: 'primary',
    name: 'Primary (Class 1 to 5)',
    description: 'Maths (60), English (60), E.V.S. (60), Hindi (60), G.K. (60), Drawing (10)',
    subjects: PRIMARY_SUBJECTS,
  },
  {
    id: 'middle',
    name: 'Middle School (Class 6 to 8)',
    description: 'Mathematics (80), Science (80), Social Science (80), English (80), Hindi (80), Sanskrit (50)',
    subjects: MIDDLE_SUBJECTS,
  },
  {
    id: 'secondary',
    name: 'Secondary (Class 9 & 10)',
    description: 'Mathematics (80), Science (80), Social Science (80), English (80), Hindi (80), Computer Apps (50)',
    subjects: [
      { id: 'math', name: 'Mathematics', maxMarks: 80, passMarks: 27 },
      { id: 'science', name: 'Science', maxMarks: 80, passMarks: 27 },
      { id: 'social', name: 'Social Science', maxMarks: 80, passMarks: 27 },
      { id: 'english', name: 'English Lang & Lit', maxMarks: 80, passMarks: 27 },
      { id: 'hindi', name: 'Hindi Course-A', maxMarks: 80, passMarks: 27 },
      { id: 'computer', name: 'Computer Applications', maxMarks: 50, passMarks: 17 },
    ],
  },
];

// Helper to generate realistic marks for a class
function generateClassMarks(
  students: Student[], 
  subjects: Subject[], 
  multiplierQuarterly = 0.8, 
  multiplierHalfYearly = 0.86
) {
  const qMarks: Record<string, Record<string, number | null>> = {};
  const hMarks: Record<string, Record<string, number | null>> = {};

  students.forEach((st, idx) => {
    qMarks[st.id] = {};
    hMarks[st.id] = {};
    const skillFactor = 0.65 + ((idx * 7) % 35) / 100; // varied natural performance

    subjects.forEach((sub) => {
      const qVal = Math.round(Math.min(sub.maxMarks, Math.max(Math.ceil(sub.maxMarks * 0.35), sub.maxMarks * multiplierQuarterly * skillFactor)));
      const hVal = Math.round(Math.min(sub.maxMarks, Math.max(qVal, sub.maxMarks * multiplierHalfYearly * skillFactor)));
      qMarks[st.id][sub.id] = qVal;
      hMarks[st.id][sub.id] = hVal;
    });
  });

  return { qMarks, hMarks };
}

// Helper to create class students
function createStudents(prefix: string, startRoll: number, names: string[]): Student[] {
  return names.map((name, i) => ({
    id: `${prefix}_s${i + 1}`,
    sNo: i + 1,
    rollNo: `${startRoll + i}`,
    name,
    attendanceDays: 84 + (i % 8),
    totalWorkingDays: 92,
  }));
}

// 1. Nursery
const nurseryStudents = createStudents('nur', 101, [
  'Aarav Sharma', 'Anvi Patel', 'Reyan Joshi', 'Kiara Singhal', 
  'Kabir Verma', 'Advik Mishra', 'Pari Chouhan', 'Vivaan Gupta'
]);
const nurseryMarks = generateClassMarks(nurseryStudents, KINDERGARTEN_SUBJECTS, 0.84, 0.90);

// 2. LKG - Section A
const lkgAStudents = createStudents('lkg_a', 201, [
  'Dhruv Deshmukh', 'Myra Kulkarni', 'Ayaan Khan', 'Shanaya Kapoor',
  'Reyansh Rao', 'Prisha Bhatt', 'Shaurya Roy', 'Ananya Nair'
]);
const lkgAMarks = generateClassMarks(lkgAStudents, KINDERGARTEN_SUBJECTS, 0.82, 0.88);

// 3. LKG - Section B
const lkgBStudents = createStudents('lkg_b', 221, [
  'Atharv Jain', 'Navya Saxena', 'Rudra Pandey', 'Siya Agrawal',
  'Devansh Sen', 'Avni Mehra', 'Samar Mittal', 'Ishani Tiwari'
]);
const lkgBMarks = generateClassMarks(lkgBStudents, KINDERGARTEN_SUBJECTS, 0.80, 0.87);

// 4. UKG - Section A
const ukgAStudents = createStudents('ukg_a', 301, [
  'Ishaan Bansal', 'Tara Somani', 'Kavish Goyal', 'Zoya Siddiqui',
  'Hardik Rawat', 'Mishti Sethi', 'Ronit Shukla', 'Aditi Chauhan'
]);
const ukgAMarks = generateClassMarks(ukgAStudents, KINDERGARTEN_SUBJECTS, 0.85, 0.91);

// 5. UKG - Section B
const ukgBStudents = createStudents('ukg_b', 321, [
  'Vihaan Dubey', 'Anika Ghosh', 'Darshil Vyas', 'Tanvi Mathur',
  'Abeer Chawla', 'Meera Rajput', 'Tejas Solanki', 'Riya Kashyap'
]);
const ukgBMarks = generateClassMarks(ukgBStudents, KINDERGARTEN_SUBJECTS, 0.81, 0.87);

// 6. Class 1 - Section A
const c1AStudents = createStudents('c1_a', 401, [
  'Arnav Kothari', 'Diya Rathore', 'Manan Jaiswal', 'Bhavna Dave',
  'Yug Soni', 'Kriti Bhasin', 'Nirvaan Seth', 'Gauri Chopra'
]);
const c1AMarks = generateClassMarks(c1AStudents, PRIMARY_SUBJECTS, 0.82, 0.89);

// 7. Class 1 - Section B
const c1BStudents = createStudents('c1_b', 421, [
  'Vivaan Lamba', 'Ira Trivedi', 'Kushagra Soni', 'Saumya Dixit',
  'Arham Vora', 'Trisha Grover', 'Divit Ahuja', 'Jiya Khatri'
]);
const c1BMarks = generateClassMarks(c1BStudents, PRIMARY_SUBJECTS, 0.79, 0.86);

// 8. Class 2 - Section A
const c2AStudents = createStudents('c2_a', 501, [
  'Madhav Bhatia', 'Saanvi Kaul', 'Shlok Mahajan', 'Vidhi Agnihotri',
  'Daksh Narang', 'Charvi Bajaj', 'Aarush Sabharwal', 'Tanvi Chadha'
]);
const c2AMarks = generateClassMarks(c2AStudents, PRIMARY_SUBJECTS, 0.83, 0.90);

// 9. Class 2 - Section B
const c2BStudents = createStudents('c2_b', 521, [
  'Parth Goswami', 'Bhoomi Wadhwa', 'Agastya Puri', 'Anaya Oberoi',
  'Krishav Bedi', 'Nitya Juneja', 'Vedant Tandon', 'Lavanya Vohra'
]);
const c2BMarks = generateClassMarks(c2BStudents, PRIMARY_SUBJECTS, 0.80, 0.87);

// 10. Class 3 - Section A
const c3AStudents = createStudents('c3_a', 601, [
  'Neil Chhabra', 'Pooja Sahni', 'Lakshay Nagpal', 'Ridhi Gulati',
  'Kunal Madan', 'Vanshika Kohli', 'Raghav Anand', 'Avika Thapar'
]);
const c3AMarks = generateClassMarks(c3AStudents, PRIMARY_SUBJECTS, 0.81, 0.88);

// 11. Class 3 - Section B
const c3BStudents = createStudents('c3_b', 621, [
  'Yuvansh Talwar', 'Aarna Sood', 'Devrat Monga', 'Chhavi Sehgal',
  'Moksh Bindra', 'Isha Bakshi', 'Kiaan Suri', 'Manya Bhalla'
]);
const c3BMarks = generateClassMarks(c3BStudents, PRIMARY_SUBJECTS, 0.82, 0.89);

// 12. Class 4 - Section A (The flagship detailed class)
const c4AStudents = DEFAULT_STUDENTS;
const c4AQMarks = INITIAL_QUARTERLY_MARKS;
const c4AHMarks = INITIAL_HALF_YEARLY_MARKS;

// 13. Class 5 - Section A
const c5AStudents = createStudents('c5_a', 801, [
  'Aarav Sharma', 'Diya Patel', 'Rohan Verma', 'Ananya Joshi',
  'Ishaan Kulkarni', 'Saanvi Malhotra', 'Reyansh Gupta', 'Meera Rao'
]);
const c5AMarks = generateClassMarks(c5AStudents, PRIMARY_SUBJECTS, 0.83, 0.89);

// 14. Class 6 - Section A
const c6AStudents = createStudents('c6_a', 901, [
  'Tushar Pandey', 'Sakshi Jha', 'Naman Shukla', 'Palak Mishra',
  'Shubham Dubey', 'Khushi Tripathi', 'Hemant Tiwari', 'Neha Dwivedi'
]);
const c6AMarks = generateClassMarks(c6AStudents, MIDDLE_SUBJECTS, 0.78, 0.85);

// 15. Class 7 - Section A
const c7AStudents = createStudents('c7_a', 1001, [
  'Pranav Srivastava', 'Ritu Saxena', 'Abhinav Bhatnagar', 'Simran Mathur',
  'Utkarsh Johri', 'Anushree Kulshrestha', 'Gaurav Asthana', 'Swati Nigam'
]);
const c7AMarks = generateClassMarks(c7AStudents, MIDDLE_SUBJECTS, 0.80, 0.86);

// 16. Class 8 - Section A
const c8AStudents = createStudents('c8_a', 1101, [
  'Aditya Singh', 'Priya Nair', 'Harshvardhan Deshmukh', 'Sneha Roy',
  'Kabir Chawla', 'Tanvi Agarwal', 'Aryan Bhatt', 'Nandini Sen'
]);
const c8AMarks = generateClassMarks(c8AStudents, MIDDLE_SUBJECTS, 0.82, 0.88);

export const DEFAULT_CLASSES: ClassData[] = [
  {
    id: 'class_nursery',
    name: 'Nursery',
    section: 'A',
    academicYear: '2026-27',
    subjects: KINDERGARTEN_SUBJECTS,
    students: nurseryStudents,
    quarterlyMarks: nurseryMarks.qMarks,
    halfYearlyMarks: nurseryMarks.hMarks,
  },
  {
    id: 'class_lkg_a',
    name: 'LKG',
    section: 'A',
    academicYear: '2026-27',
    subjects: KINDERGARTEN_SUBJECTS,
    students: lkgAStudents,
    quarterlyMarks: lkgAMarks.qMarks,
    halfYearlyMarks: lkgAMarks.hMarks,
  },
  {
    id: 'class_lkg_b',
    name: 'LKG',
    section: 'B',
    academicYear: '2026-27',
    subjects: KINDERGARTEN_SUBJECTS,
    students: lkgBStudents,
    quarterlyMarks: lkgBMarks.qMarks,
    halfYearlyMarks: lkgBMarks.hMarks,
  },
  {
    id: 'class_ukg_a',
    name: 'UKG',
    section: 'A',
    academicYear: '2026-27',
    subjects: KINDERGARTEN_SUBJECTS,
    students: ukgAStudents,
    quarterlyMarks: ukgAMarks.qMarks,
    halfYearlyMarks: ukgAMarks.hMarks,
  },
  {
    id: 'class_ukg_b',
    name: 'UKG',
    section: 'B',
    academicYear: '2026-27',
    subjects: KINDERGARTEN_SUBJECTS,
    students: ukgBStudents,
    quarterlyMarks: ukgBMarks.qMarks,
    halfYearlyMarks: ukgBMarks.hMarks,
  },
  {
    id: 'class_1_a',
    name: 'Class 1',
    section: 'A',
    academicYear: '2026-27',
    subjects: PRIMARY_SUBJECTS,
    students: c1AStudents,
    quarterlyMarks: c1AMarks.qMarks,
    halfYearlyMarks: c1AMarks.hMarks,
  },
  {
    id: 'class_1_b',
    name: 'Class 1',
    section: 'B',
    academicYear: '2026-27',
    subjects: PRIMARY_SUBJECTS,
    students: c1BStudents,
    quarterlyMarks: c1BMarks.qMarks,
    halfYearlyMarks: c1BMarks.hMarks,
  },
  {
    id: 'class_2_a',
    name: 'Class 2',
    section: 'A',
    academicYear: '2026-27',
    subjects: PRIMARY_SUBJECTS,
    students: c2AStudents,
    quarterlyMarks: c2AMarks.qMarks,
    halfYearlyMarks: c2AMarks.hMarks,
  },
  {
    id: 'class_2_b',
    name: 'Class 2',
    section: 'B',
    academicYear: '2026-27',
    subjects: PRIMARY_SUBJECTS,
    students: c2BStudents,
    quarterlyMarks: c2BMarks.qMarks,
    halfYearlyMarks: c2BMarks.hMarks,
  },
  {
    id: 'class_3_a',
    name: 'Class 3',
    section: 'A',
    academicYear: '2026-27',
    subjects: PRIMARY_SUBJECTS,
    students: c3AStudents,
    quarterlyMarks: c3AMarks.qMarks,
    halfYearlyMarks: c3AMarks.hMarks,
  },
  {
    id: 'class_3_b',
    name: 'Class 3',
    section: 'B',
    academicYear: '2026-27',
    subjects: PRIMARY_SUBJECTS,
    students: c3BStudents,
    quarterlyMarks: c3BMarks.qMarks,
    halfYearlyMarks: c3BMarks.hMarks,
  },
  {
    id: 'class_4_a',
    name: 'Class 4',
    section: 'A',
    academicYear: '2026-27',
    subjects: PRIMARY_SUBJECTS,
    students: c4AStudents,
    quarterlyMarks: c4AQMarks,
    halfYearlyMarks: c4AHMarks,
  },
  {
    id: 'class_5_a',
    name: 'Class 5',
    section: 'A',
    academicYear: '2026-27',
    subjects: PRIMARY_SUBJECTS,
    students: c5AStudents,
    quarterlyMarks: c5AMarks.qMarks,
    halfYearlyMarks: c5AMarks.hMarks,
  },
  {
    id: 'class_6_a',
    name: 'Class 6',
    section: 'A',
    academicYear: '2026-27',
    subjects: MIDDLE_SUBJECTS,
    students: c6AStudents,
    quarterlyMarks: c6AMarks.qMarks,
    halfYearlyMarks: c6AMarks.hMarks,
  },
  {
    id: 'class_7_a',
    name: 'Class 7',
    section: 'A',
    academicYear: '2026-27',
    subjects: MIDDLE_SUBJECTS,
    students: c7AStudents,
    quarterlyMarks: c7AMarks.qMarks,
    halfYearlyMarks: c7AMarks.hMarks,
  },
  {
    id: 'class_8_a',
    name: 'Class 8',
    section: 'A',
    academicYear: '2026-27',
    subjects: MIDDLE_SUBJECTS,
    students: c8AStudents,
    quarterlyMarks: c8AMarks.qMarks,
    halfYearlyMarks: c8AMarks.hMarks,
  },
];
