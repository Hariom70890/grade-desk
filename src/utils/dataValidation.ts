import { ClassData, Student, Subject, TermType } from '../types';

export interface ValidationError {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'marks' | 'student' | 'subject' | 'attendance';
  title: string;
  message: string;
  classId: string;
  className: string;
  studentId?: string;
  studentName?: string;
  studentRoll?: string;
  subjectId?: string;
  subjectName?: string;
  term?: TermType;
  currentValue?: any;
  allowedMax?: number;
  fixable?: boolean;
  fixAction?: 'clamp_mark' | 'generate_roll' | 'set_zero' | 'sanitize_name' | 'clamp_attendance';
}

export interface ValidationSummary {
  totalStudentsChecked: number;
  totalMarksChecked: number;
  exceedingMarksCount: number;
  negativeMarksCount: number;
  duplicateRollsCount: number;
  missingNamesCount: number;
  missingMarksCount: number;
  invalidAttendanceCount: number;
}

export interface ValidationReport {
  isValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  score: number; // 0 - 100 percentage score
  items: ValidationError[];
  summary: ValidationSummary;
  timestamp: string;
}

/**
 * Validates a single mark input against maxMarks boundary rules.
 */
export function validateMarkValue(
  value: string | number | null | undefined,
  maxMarks: number
): {
  isValid: boolean;
  parsedValue: number | null;
  error?: string;
} {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, parsedValue: null };
  }

  // Handle strings like "Ab", "A", "ML" (Absent / Medical Leave)
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return { isValid: true, parsedValue: null };
    if (['ab', 'absent', 'a', 'ml'].includes(trimmed.toLowerCase())) {
      return { isValid: true, parsedValue: 0 };
    }
    const num = Number(trimmed);
    if (isNaN(num)) {
      return { isValid: false, parsedValue: null, error: 'Must be a valid number' };
    }
    value = num;
  }

  if (typeof value === 'number') {
    if (isNaN(value)) {
      return { isValid: false, parsedValue: null, error: 'Invalid number' };
    }
    if (value < 0) {
      return { isValid: false, parsedValue: value, error: 'Marks cannot be negative' };
    }
    if (value > maxMarks) {
      return {
        isValid: false,
        parsedValue: value,
        error: `Marks (${value}) exceed maximum allowed (${maxMarks})`,
      };
    }
  }

  return { isValid: true, parsedValue: value };
}

/**
 * Validates a student record.
 */
export function validateStudent(
  student: Student,
  allStudents: Student[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!student.name || !student.name.trim()) {
    errors.push('Student name cannot be empty');
  }

  if (!student.rollNo || !student.rollNo.trim()) {
    errors.push('Roll number is required');
  } else {
    const duplicates = allStudents.filter(
      (s) => s.id !== student.id && s.rollNo.trim().toLowerCase() === student.rollNo.trim().toLowerCase()
    );
    if (duplicates.length > 0) {
      errors.push(`Duplicate roll number "${student.rollNo}" already assigned to ${duplicates[0].name}`);
    }
  }

  if (student.attendanceDays !== undefined && student.totalWorkingDays !== undefined) {
    if (student.attendanceDays < 0) {
      errors.push('Attendance days cannot be negative');
    }
    if (student.attendanceDays > student.totalWorkingDays) {
      errors.push(`Attendance days (${student.attendanceDays}) exceed total working days (${student.totalWorkingDays})`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates an entire class data object and generates a full diagnostic report.
 */
export function validateClassData(classData: ClassData): ValidationReport {
  const items: ValidationError[] = [];
  const classNameDisplay = `${classData.name} (${classData.section})`;

  let totalStudentsChecked = classData.students.length;
  let totalMarksChecked = 0;
  let exceedingMarksCount = 0;
  let negativeMarksCount = 0;
  let duplicateRollsCount = 0;
  let missingNamesCount = 0;
  let missingMarksCount = 0;
  let invalidAttendanceCount = 0;

  // 1. Check duplicate and invalid roll numbers
  const rollMap = new Map<string, Student[]>();
  classData.students.forEach((student) => {
    const cleanRoll = (student.rollNo || '').trim().toLowerCase();
    if (!cleanRoll) {
      items.push({
        id: `err_roll_missing_${student.id}`,
        type: 'error',
        category: 'student',
        title: 'Missing Roll Number',
        message: `Student "${student.name || 'Unnamed'}" has no roll number assigned.`,
        classId: classData.id,
        className: classNameDisplay,
        studentId: student.id,
        studentName: student.name,
        fixable: true,
        fixAction: 'generate_roll',
      });
      duplicateRollsCount++;
    } else {
      const list = rollMap.get(cleanRoll) || [];
      list.push(student);
      rollMap.set(cleanRoll, list);
    }

    // Check empty or whitespace student names
    if (!student.name || !student.name.trim()) {
      items.push({
        id: `err_name_missing_${student.id}`,
        type: 'error',
        category: 'student',
        title: 'Empty Student Name',
        message: `Row with Roll No. ${student.rollNo || student.sNo} has an empty student name.`,
        classId: classData.id,
        className: classNameDisplay,
        studentId: student.id,
        studentRoll: student.rollNo,
        fixable: true,
        fixAction: 'sanitize_name',
      });
      missingNamesCount++;
    }

    // Check attendance boundaries
    if (student.attendanceDays !== undefined && student.totalWorkingDays !== undefined) {
      if (student.attendanceDays < 0 || student.attendanceDays > student.totalWorkingDays) {
        items.push({
          id: `err_att_${student.id}`,
          type: 'warning',
          category: 'attendance',
          title: 'Invalid Attendance Ratio',
          message: `Attendance (${student.attendanceDays} days) exceeds total working days (${student.totalWorkingDays} days) for ${student.name}.`,
          classId: classData.id,
          className: classNameDisplay,
          studentId: student.id,
          studentName: student.name,
          currentValue: student.attendanceDays,
          allowedMax: student.totalWorkingDays,
          fixable: true,
          fixAction: 'clamp_attendance',
        });
        invalidAttendanceCount++;
      }
    }
  });

  // Flag duplicate rolls
  rollMap.forEach((studentsWithRoll, roll) => {
    if (studentsWithRoll.length > 1) {
      studentsWithRoll.forEach((st) => {
        items.push({
          id: `err_roll_dup_${st.id}`,
          type: 'error',
          category: 'student',
          title: 'Duplicate Roll Number',
          message: `Roll No. "${st.rollNo}" is duplicated across ${studentsWithRoll.length} students (${studentsWithRoll.map((s) => s.name).join(', ')}).`,
          classId: classData.id,
          className: classNameDisplay,
          studentId: st.id,
          studentName: st.name,
          studentRoll: st.rollNo,
          fixable: true,
          fixAction: 'generate_roll',
        });
      });
      duplicateRollsCount += studentsWithRoll.length;
    }
  });

  // 2. Validate subjects
  const subjectNameMap = new Map<string, Subject[]>();
  classData.subjects.forEach((subj) => {
    if (!subj.name || !subj.name.trim()) {
      items.push({
        id: `err_subj_name_${subj.id}`,
        type: 'error',
        category: 'subject',
        title: 'Empty Subject Name',
        message: 'A subject has an empty or blank name.',
        classId: classData.id,
        className: classNameDisplay,
        subjectId: subj.id,
      });
    }

    if (subj.maxMarks <= 0 || isNaN(subj.maxMarks)) {
      items.push({
        id: `err_subj_max_${subj.id}`,
        type: 'error',
        category: 'subject',
        title: 'Invalid Maximum Marks',
        message: `Subject "${subj.name}" has invalid maximum marks (${subj.maxMarks}). Must be greater than 0.`,
        classId: classData.id,
        className: classNameDisplay,
        subjectId: subj.id,
        subjectName: subj.name,
      });
    }

    if (subj.passMarks !== undefined && subj.passMarks > subj.maxMarks) {
      items.push({
        id: `err_subj_pass_${subj.id}`,
        type: 'error',
        category: 'subject',
        title: 'Pass Marks Exceed Max Marks',
        message: `Subject "${subj.name}" pass marks (${subj.passMarks}) cannot be higher than maximum marks (${subj.maxMarks}).`,
        classId: classData.id,
        className: classNameDisplay,
        subjectId: subj.id,
        subjectName: subj.name,
      });
    }

    const cleanSubjName = (subj.name || '').trim().toLowerCase();
    const existing = subjectNameMap.get(cleanSubjName) || [];
    existing.push(subj);
    subjectNameMap.set(cleanSubjName, existing);
  });

  subjectNameMap.forEach((subjs, name) => {
    if (subjs.length > 1 && name) {
      items.push({
        id: `warn_subj_dup_${subjs[0].id}`,
        type: 'warning',
        category: 'subject',
        title: 'Duplicate Subject Name',
        message: `Subject "${subjs[0].name}" is defined multiple times in this class.`,
        classId: classData.id,
        className: classNameDisplay,
      });
    }
  });

  // 3. Validate Marks (Quarterly & Half-Yearly)
  const terms: TermType[] = ['quarterly', 'half_yearly'];

  terms.forEach((term) => {
    const marksStore = term === 'quarterly' ? classData.quarterlyMarks : classData.halfYearlyMarks;
    const termTitle = term === 'quarterly' ? 'Quarterly Exam' : 'Half-Yearly Exam';

    classData.students.forEach((student) => {
      const studentMarks = marksStore?.[student.id] || {};

      classData.subjects.forEach((subject) => {
        totalMarksChecked++;
        const markVal = studentMarks[subject.id];

        if (markVal === null || markVal === undefined) {
          missingMarksCount++;
          // Informational note for incomplete sheet
          items.push({
            id: `info_missing_${term}_${student.id}_${subject.id}`,
            type: 'info',
            category: 'marks',
            title: 'Pending Mark Entry',
            message: `${student.name} is missing marks in ${subject.name} for ${termTitle}.`,
            classId: classData.id,
            className: classNameDisplay,
            studentId: student.id,
            studentName: student.name,
            studentRoll: student.rollNo,
            subjectId: subject.id,
            subjectName: subject.name,
            term,
            fixable: true,
            fixAction: 'set_zero',
          });
          return;
        }

        if (typeof markVal === 'number') {
          if (isNaN(markVal)) {
            items.push({
              id: `err_nan_${term}_${student.id}_${subject.id}`,
              type: 'error',
              category: 'marks',
              title: 'Invalid Mark Value (NaN)',
              message: `Invalid number recorded for ${student.name} in ${subject.name} (${termTitle}).`,
              classId: classData.id,
              className: classNameDisplay,
              studentId: student.id,
              studentName: student.name,
              studentRoll: student.rollNo,
              subjectId: subject.id,
              subjectName: subject.name,
              term,
              fixable: true,
              fixAction: 'set_zero',
            });
            negativeMarksCount++;
          } else if (markVal < 0) {
            items.push({
              id: `err_neg_${term}_${student.id}_${subject.id}`,
              type: 'error',
              category: 'marks',
              title: 'Negative Marks Detected',
              message: `${student.name} has negative marks (${markVal}) in ${subject.name} (${termTitle}).`,
              classId: classData.id,
              className: classNameDisplay,
              studentId: student.id,
              studentName: student.name,
              studentRoll: student.rollNo,
              subjectId: subject.id,
              subjectName: subject.name,
              term,
              currentValue: markVal,
              allowedMax: subject.maxMarks,
              fixable: true,
              fixAction: 'set_zero',
            });
            negativeMarksCount++;
          } else if (markVal > subject.maxMarks) {
            items.push({
              id: `err_exceed_${term}_${student.id}_${subject.id}`,
              type: 'error',
              category: 'marks',
              title: 'Marks Exceed Maximum Allowed Limit',
              message: `${student.name} has ${markVal} marks in ${subject.name}, but maximum allowed is ${subject.maxMarks} (${termTitle}).`,
              classId: classData.id,
              className: classNameDisplay,
              studentId: student.id,
              studentName: student.name,
              studentRoll: student.rollNo,
              subjectId: subject.id,
              subjectName: subject.name,
              term,
              currentValue: markVal,
              allowedMax: subject.maxMarks,
              fixable: true,
              fixAction: 'clamp_mark',
            });
            exceedingMarksCount++;
          }
        }
      });
    });
  });

  const errorCount = items.filter((i) => i.type === 'error').length;
  const warningCount = items.filter((i) => i.type === 'warning').length;
  const infoCount = items.filter((i) => i.type === 'info').length;

  // Calculate integrity score (100 is pristine)
  let penalty = errorCount * 15 + warningCount * 5;
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    isValid: errorCount === 0,
    hasErrors: errorCount > 0,
    hasWarnings: warningCount > 0,
    errorCount,
    warningCount,
    infoCount,
    score,
    items,
    summary: {
      totalStudentsChecked,
      totalMarksChecked,
      exceedingMarksCount,
      negativeMarksCount,
      duplicateRollsCount,
      missingNamesCount,
      missingMarksCount,
      invalidAttendanceCount,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validates multiple classes and combines results.
 */
export function validateAllClasses(classes: ClassData[]): ValidationReport {
  let combinedItems: ValidationError[] = [];
  let totalStudents = 0;
  let totalMarks = 0;
  let exceedingMarks = 0;
  let negativeMarks = 0;
  let duplicateRolls = 0;
  let missingNames = 0;
  let missingMarks = 0;
  let invalidAttendance = 0;

  classes.forEach((c) => {
    const report = validateClassData(c);
    combinedItems = combinedItems.concat(report.items);
    totalStudents += report.summary.totalStudentsChecked;
    totalMarks += report.summary.totalMarksChecked;
    exceedingMarks += report.summary.exceedingMarksCount;
    negativeMarks += report.summary.negativeMarksCount;
    duplicateRolls += report.summary.duplicateRollsCount;
    missingNames += report.summary.missingNamesCount;
    missingMarks += report.summary.missingMarksCount;
    invalidAttendance += report.summary.invalidAttendanceCount;
  });

  const errorCount = combinedItems.filter((i) => i.type === 'error').length;
  const warningCount = combinedItems.filter((i) => i.type === 'warning').length;
  const infoCount = combinedItems.filter((i) => i.type === 'info').length;
  const penalty = errorCount * 12 + warningCount * 4;
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    isValid: errorCount === 0,
    hasErrors: errorCount > 0,
    hasWarnings: warningCount > 0,
    errorCount,
    warningCount,
    infoCount,
    score,
    items: combinedItems,
    summary: {
      totalStudentsChecked: totalStudents,
      totalMarksChecked: totalMarks,
      exceedingMarksCount: exceedingMarks,
      negativeMarksCount: negativeMarks,
      duplicateRollsCount: duplicateRolls,
      missingNamesCount: missingNames,
      missingMarksCount: missingMarks,
      invalidAttendanceCount: invalidAttendance,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 1-Click Fixers for Common Validation Issues
 */

/**
 * Clamps all marks that exceed maximum marks to maxMarks, and resets negative marks to 0.
 */
export function autoFixClampAllMarks(classData: ClassData): ClassData {
  const maxMarksMap = new Map<string, number>();
  classData.subjects.forEach((s) => maxMarksMap.set(s.id, s.maxMarks));

  const fixMarksStore = (
    marksRecord: Record<string, Record<string, number | null>>
  ): Record<string, Record<string, number | null>> => {
    const updated: Record<string, Record<string, number | null>> = {};
    for (const studentId in marksRecord) {
      updated[studentId] = {};
      for (const subjId in marksRecord[studentId]) {
        const val = marksRecord[studentId][subjId];
        const max = maxMarksMap.get(subjId) || 100;
        if (typeof val === 'number') {
          if (val > max) {
            updated[studentId][subjId] = max;
          } else if (val < 0) {
            updated[studentId][subjId] = 0;
          } else {
            updated[studentId][subjId] = val;
          }
        } else {
          updated[studentId][subjId] = val;
        }
      }
    }
    return updated;
  };

  return {
    ...classData,
    quarterlyMarks: fixMarksStore(classData.quarterlyMarks || {}),
    halfYearlyMarks: fixMarksStore(classData.halfYearlyMarks || {}),
  };
}

/**
 * Automatically renumbers duplicate or missing roll numbers sequentially starting from base (e.g. 101).
 */
export function autoFixDuplicateRollNumbers(classData: ClassData): ClassData {
  const seenRolls = new Set<string>();
  let nextNumericRoll = 101;

  const updatedStudents = classData.students.map((student, idx) => {
    let cleanRoll = (student.rollNo || '').trim();
    if (!cleanRoll || seenRolls.has(cleanRoll.toLowerCase())) {
      while (seenRolls.has(String(nextNumericRoll))) {
        nextNumericRoll++;
      }
      cleanRoll = String(nextNumericRoll);
      nextNumericRoll++;
    }
    seenRolls.add(cleanRoll.toLowerCase());
    return {
      ...student,
      sNo: idx + 1,
      rollNo: cleanRoll,
      name: student.name.trim() || `Student ${idx + 1}`,
    };
  });

  return {
    ...classData,
    students: updatedStudents,
  };
}

/**
 * Fills pending or missing marks with a specified default (e.g. 0).
 */
export function autoFillMissingMarks(classData: ClassData, term: TermType, defaultValue = 0): ClassData {
  const isQuarterly = term === 'quarterly';
  const currentMarks = isQuarterly ? { ...classData.quarterlyMarks } : { ...classData.halfYearlyMarks };

  classData.students.forEach((student) => {
    if (!currentMarks[student.id]) {
      currentMarks[student.id] = {};
    } else {
      currentMarks[student.id] = { ...currentMarks[student.id] };
    }

    classData.subjects.forEach((subj) => {
      if (currentMarks[student.id][subj.id] === null || currentMarks[student.id][subj.id] === undefined) {
        currentMarks[student.id][subj.id] = defaultValue;
      }
    });
  });

  return isQuarterly
    ? { ...classData, quarterlyMarks: currentMarks }
    : { ...classData, halfYearlyMarks: currentMarks };
}
