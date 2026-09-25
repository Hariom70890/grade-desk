import { Student, Subject, GradingRule, ComputedStudentResult, ComparativeResult } from '../types';

export function getGradeAndRemark(percentage: number, rules: GradingRule[]): { grade: string; remark: string; badgeColor: string } {
  // Sort rules descending by minPercentage
  const sorted = [...rules].sort((a, b) => b.minPercentage - a.minPercentage);
  for (const rule of sorted) {
    if (percentage >= rule.minPercentage) {
      return { grade: rule.grade, remark: rule.remark, badgeColor: rule.badgeColor };
    }
  }
  const last = sorted[sorted.length - 1];
  return { grade: last?.grade || 'E', remark: last?.remark || 'Poor', badgeColor: last?.badgeColor || 'bg-red-100 text-red-800' };
}

export function computeStudentResults(
  students: Student[],
  subjects: Subject[],
  marksMap: Record<string, Record<string, number | null>>,
  gradingRules: GradingRule[]
): ComputedStudentResult[] {
  const totalMax = subjects.reduce((sum, s) => sum + s.maxMarks, 0);

  // First calculate raw sums and percentages
  const preliminary = students.map((student) => {
    const studentMarks = marksMap[student.id] || {};
    let totalObtained = 0;
    let marksCount = 0;
    let isPassed = true;

    subjects.forEach((subject) => {
      const val = studentMarks[subject.id];
      if (val !== undefined && val !== null && !isNaN(Number(val))) {
        const numVal = Number(val);
        totalObtained += numVal;
        marksCount++;
        const passMark = subject.passMarks ?? (subject.maxMarks * 0.33);
        if (numVal < passMark) {
          isPassed = false;
        }
      } else {
        isPassed = false;
      }
    });

    const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const { grade, remark } = getGradeAndRemark(percentage, gradingRules);

    return {
      student,
      marks: studentMarks,
      totalObtained,
      totalMax,
      percentage: Number(percentage.toFixed(2)),
      rank: 1, // temporary
      grade,
      remark,
      isPassed,
      marksCount,
    };
  });

  // Calculate ranks based on totalObtained / percentage descending
  // Using standard competition ranking: 1, 2, 3, etc.
  const sortedForRank = [...preliminary].sort((a, b) => b.totalObtained - a.totalObtained);

  let currentRank = 1;
  sortedForRank.forEach((item, index) => {
    if (index > 0 && item.totalObtained < sortedForRank[index - 1].totalObtained) {
      currentRank = index + 1;
    }
    item.rank = currentRank;
  });

  // Return mapped back by original student order
  const rankMap = new Map(sortedForRank.map((item) => [item.student.id, item.rank]));

  return preliminary.map((item) => ({
    ...item,
    rank: rankMap.get(item.student.id) || 1,
  }));
}

export function computeComparativeResults(
  students: Student[],
  subjects: Subject[],
  quarterlyMarks: Record<string, Record<string, number | null>>,
  halfYearlyMarks: Record<string, Record<string, number | null>>,
  gradingRules: GradingRule[]
): ComparativeResult[] {
  const qResults = computeStudentResults(students, subjects, quarterlyMarks, gradingRules);
  const hResults = computeStudentResults(students, subjects, halfYearlyMarks, gradingRules);

  const qMap = new Map(qResults.map((r) => [r.student.id, r]));
  const hMap = new Map(hResults.map((r) => [r.student.id, r]));

  const rawList = students.map((student) => {
    const q = qMap.get(student.id)!;
    const h = hMap.get(student.id)!;
    const deltaPercentage = Number((h.percentage - q.percentage).toFixed(2));
    const combinedTotalObtained = q.totalObtained + h.totalObtained;
    const combinedTotalMax = q.totalMax + h.totalMax;
    const combinedPercentage = combinedTotalMax > 0 ? Number(((combinedTotalObtained / combinedTotalMax) * 100).toFixed(2)) : 0;

    let growthStatus: 'improved' | 'declined' | 'constant' = 'constant';
    if (deltaPercentage > 0.05) growthStatus = 'improved';
    else if (deltaPercentage < -0.05) growthStatus = 'declined';

    return {
      student,
      quarterly: q,
      halfYearly: h,
      deltaPercentage,
      growthStatus,
      combinedTotalObtained,
      combinedTotalMax,
      combinedPercentage,
      combinedRank: 1,
    };
  });

  // Calculate combined ranks
  const sortedCombined = [...rawList].sort((a, b) => b.combinedTotalObtained - a.combinedTotalObtained);
  let rank = 1;
  sortedCombined.forEach((item, index) => {
    if (index > 0 && item.combinedTotalObtained < sortedCombined[index - 1].combinedTotalObtained) {
      rank = index + 1;
    }
    item.combinedRank = rank;
  });

  const rankMap = new Map(sortedCombined.map((i) => [i.student.id, i.combinedRank]));

  return rawList.map((item) => ({
    ...item,
    combinedRank: rankMap.get(item.student.id) || 1,
  }));
}

export interface SubjectStats {
  subject: Subject;
  average: number;
  highest: number;
  highestScorers: string[];
  lowest: number;
  passCount: number;
  failCount: number;
}

export function computeSubjectStats(
  subjects: Subject[],
  results: ComputedStudentResult[]
): SubjectStats[] {
  return subjects.map((subject) => {
    let sum = 0;
    let count = 0;
    let highest = -1;
    let lowest = Infinity;
    let passCount = 0;
    let failCount = 0;
    const highestScorers: string[] = [];

    const passMark = subject.passMarks ?? (subject.maxMarks * 0.33);

    results.forEach((res) => {
      const val = res.marks[subject.id];
      if (val !== undefined && val !== null && !isNaN(Number(val))) {
        const num = Number(val);
        sum += num;
        count++;
        if (num > highest) {
          highest = num;
        }
        if (num < lowest) {
          lowest = num;
        }
        if (num >= passMark) {
          passCount++;
        } else {
          failCount++;
        }
      }
    });

    if (count > 0 && highest >= 0) {
      results.forEach((res) => {
        const val = Number(res.marks[subject.id]);
        if (val === highest) {
          highestScorers.push(res.student.name);
        }
      });
    }

    return {
      subject,
      average: count > 0 ? Number((sum / count).toFixed(1)) : 0,
      highest: highest >= 0 ? highest : 0,
      highestScorers,
      lowest: lowest !== Infinity ? lowest : 0,
      passCount,
      failCount,
    };
  });
}
