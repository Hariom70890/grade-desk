import * as XLSX from 'xlsx';
import { Subject, Student, SchoolConfig, ComputedStudentResult, ComparativeResult } from '../types';

export function exportTabulationToExcel(
  title: string,
  schoolConfig: SchoolConfig,
  subjects: Subject[],
  results: ComputedStudentResult[],
  fileName: string = 'Examination_Performance_Sheet.xlsx'
) {
  const wb = XLSX.utils.book_new();

  // Create data array
  const wsData: any[][] = [];

  // Row 1: Main Title
  wsData.push([`${schoolConfig.schoolName.toUpperCase()} - ${title}`]);
  // Row 2: Sub-info
  wsData.push([`Class: ${schoolConfig.className} ${schoolConfig.section} | Academic Session: ${schoolConfig.academicYear}`]);
  // Row 3: Blank
  wsData.push([]);

  // Row 4: Max marks row
  const maxMarksRow = ['', '', 'Max Marks'];
  subjects.forEach((s) => maxMarksRow.push(String(s.maxMarks)));
  const totalMax = subjects.reduce((sum, s) => sum + s.maxMarks, 0);
  maxMarksRow.push(String(totalMax), '100%', '', '');
  wsData.push(maxMarksRow);

  // Row 5: Column Headers (matching user sheet)
  const headerRow = ['S.No.', 'Roll Number', 'Student Name'];
  subjects.forEach((s) => headerRow.push(s.name));
  headerRow.push('Total', 'Percentage', 'Rank', 'Remark');
  wsData.push(headerRow);

  // Rows 6+: Student Data
  results.forEach((res, index) => {
    const row: any[] = [
      index + 1,
      res.student.rollNo,
      res.student.name,
    ];
    subjects.forEach((s) => {
      const val = res.marks[s.id];
      row.push(val !== undefined && val !== null ? val : '');
    });
    row.push(res.totalObtained);
    row.push(`${res.percentage}%`);
    row.push(res.rank);
    row.push(res.remark);
    wsData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = [
    { wch: 8 },  // S.No
    { wch: 14 }, // Roll
    { wch: 26 }, // Name
    ...subjects.map(() => ({ wch: 12 })),
    { wch: 12 }, // Total
    { wch: 14 }, // Percentage
    { wch: 10 }, // Rank
    { wch: 18 }, // Remark
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Marksheet');
  XLSX.writeFile(wb, fileName);
}

export function exportTabulationToCSV(
  title: string,
  schoolConfig: SchoolConfig,
  subjects: Subject[],
  results: ComputedStudentResult[],
  fileName: string = 'Examination_Performance_Sheet.csv'
) {
  const lines: string[] = [];
  lines.push(`"${schoolConfig.schoolName.toUpperCase()} - ${title}"`);
  lines.push(`"Class: ${schoolConfig.className} ${schoolConfig.section} | Academic Session: ${schoolConfig.academicYear}"`);
  lines.push('');

  const headerRow = ['S.No.', 'Roll Number', 'Student Name'];
  subjects.forEach((s) => headerRow.push(`"${s.name} (Max ${s.maxMarks})"`));
  headerRow.push('"Total"', '"Percentage"', '"Rank"', '"Remark"');
  lines.push(headerRow.join(','));

  results.forEach((res, index) => {
    const row: (string | number)[] = [
      index + 1,
      `"${res.student.rollNo}"`,
      `"${res.student.name.replace(/"/g, '""')}"`,
    ];
    subjects.forEach((s) => {
      const val = res.marks[s.id];
      row.push(val !== undefined && val !== null ? val : '');
    });
    row.push(res.totalObtained);
    row.push(`"${res.percentage}%"`);
    row.push(res.rank);
    row.push(`"${res.remark}"`);
    lines.push(row.join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportComparativeToExcel(
  schoolConfig: SchoolConfig,
  subjects: Subject[],
  comparativeResults: ComparativeResult[],
  fileName: string = 'Quarterly_vs_HalfYearly_Comparative_Report.xlsx'
) {
  const wb = XLSX.utils.book_new();
  const wsData: any[][] = [];

  wsData.push([`${schoolConfig.schoolName.toUpperCase()} - ACADEMIC GROWTH REPORT`]);
  wsData.push([`Quarterly vs Half Yearly Examination | Session: ${schoolConfig.academicYear} | ${schoolConfig.className} ${schoolConfig.section}`]);
  wsData.push([]);

  const headers = [
    'S.No.',
    'Roll No',
    'Student Name',
    'Quarterly Total',
    'Quarterly %',
    'Quarterly Rank',
    'Half Yearly Total',
    'Half Yearly %',
    'Half Yearly Rank',
    'Delta Growth (%)',
    'Growth Status',
    'Combined %',
    'Final Annual Rank',
  ];
  wsData.push(headers);

  comparativeResults.forEach((cr, index) => {
    const sign = cr.deltaPercentage > 0 ? `+${cr.deltaPercentage}%` : `${cr.deltaPercentage}%`;
    wsData.push([
      index + 1,
      cr.student.rollNo,
      cr.student.name,
      cr.quarterly.totalObtained,
      `${cr.quarterly.percentage}%`,
      cr.quarterly.rank,
      cr.halfYearly.totalObtained,
      `${cr.halfYearly.percentage}%`,
      cr.halfYearly.rank,
      sign,
      cr.growthStatus.toUpperCase(),
      `${cr.combinedPercentage}%`,
      cr.combinedRank,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Comparative_Growth');
  XLSX.writeFile(wb, fileName);
}

export function parsePastedSpreadsheet(text: string): {
  students: { name: string; rollNo: string; marks: Record<string, number> }[];
  matchedSubjectNames: string[];
} {
  const lines = text.trim().split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return { students: [], matchedSubjectNames: [] };

  const parsedRows = lines.map((line) => line.split(/\t|,|;/).map((c) => c.trim()));
  
  // Try to find header line
  let headerIndex = -1;
  for (let i = 0; i < Math.min(parsedRows.length, 5); i++) {
    const rowStr = parsedRows[i].join(' ').toLowerCase();
    if (rowStr.includes('name') || rowStr.includes('student') || rowStr.includes('roll')) {
      headerIndex = i;
      break;
    }
  }

  const results: { name: string; rollNo: string; marks: Record<string, number> }[] = [];
  const startRow = headerIndex >= 0 ? headerIndex + 1 : 0;

  for (let i = startRow; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (row.length < 2) continue;

    // Check if first column is numeric S.No.
    let roll = '';
    let name = '';
    let markStartIndex = 1;

    if (!isNaN(Number(row[0])) && row.length >= 3 && isNaN(Number(row[1]))) {
      // row[0] is S.No, row[1] could be roll or name
      if (!isNaN(Number(row[1]))) {
        roll = row[1];
        name = row[2];
        markStartIndex = 3;
      } else {
        roll = String(i + 1);
        name = row[1];
        markStartIndex = 2;
      }
    } else if (isNaN(Number(row[0]))) {
      name = row[0];
      roll = String(i + 1);
      markStartIndex = 1;
    } else {
      roll = row[0];
      name = row[1] || `Student ${i + 1}`;
      markStartIndex = 2;
    }

    if (!name) continue;

    const marks: Record<string, number> = {};
    const commonKeys = ['maths', 'english', 'evs', 'hindi', 'gk', 'drawing'];
    let subjectIdx = 0;

    for (let c = markStartIndex; c < row.length; c++) {
      const cleanVal = row[c].replace('%', '').trim();
      const num = parseFloat(cleanVal);
      if (!isNaN(num) && subjectIdx < commonKeys.length) {
        marks[commonKeys[subjectIdx]] = num;
        subjectIdx++;
      }
    }

    results.push({ name, rollNo: roll, marks });
  }

  return { students: results, matchedSubjectNames: ['Maths', 'English', 'E.V.S.', 'Hindi', 'G.K.', 'Drawing'] };
}
