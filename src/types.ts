export interface Subject {
  id: string;
  name: string;
  maxMarks: number;
  passMarks?: number;
}

export interface Student {
  id: string;
  sNo: number;
  rollNo: string;
  name: string;
  fatherName?: string;
  motherName?: string;
  attendanceDays?: number;
  totalWorkingDays?: number;
}

export type TermType = 'quarterly' | 'half_yearly';

export interface GradingRule {
  minPercentage: number;
  grade: string;
  remark: string;
  badgeColor: string;
}

export interface SchoolConfig {
  schoolName: string;
  schoolSubtitle: string;
  affiliationNo: string;
  academicYear: string;
  className: string;
  section: string;
  quarterlyTitle: string;
  halfYearlyTitle: string;
}

export interface ClassData {
  id: string;
  name: string;
  section: string;
  academicYear?: string;
  subjects: Subject[];
  students: Student[];
  quarterlyMarks: Record<string, Record<string, number | null>>;
  halfYearlyMarks: Record<string, Record<string, number | null>>;
}

export interface ComputedStudentResult {
  student: Student;
  marks: Record<string, number | null>;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  rank: number;
  grade: string;
  remark: string;
  isPassed: boolean;
  marksCount: number;
}

export interface ComparativeResult {
  student: Student;
  quarterly: ComputedStudentResult;
  halfYearly: ComputedStudentResult;
  deltaPercentage: number;
  growthStatus: 'improved' | 'declined' | 'constant';
  combinedTotalObtained: number;
  combinedTotalMax: number;
  combinedPercentage: number;
  combinedRank: number;
}
