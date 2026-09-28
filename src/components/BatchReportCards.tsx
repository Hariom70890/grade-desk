import React, {useState} from 'react';
import {ComputedStudentResult, SchoolConfig, Subject} from '../types';
import {Printer, X, Award, Grid2X2, FileText} from 'lucide-react';

interface BatchReportCardsProps {
  isOpen: boolean;
  onClose: () => void;
  results: ComputedStudentResult[];
  schoolConfig: SchoolConfig;
  subjects: Subject[];
  examTitle: string;
}

export const BatchReportCards: React.FC<BatchReportCardsProps> = ( {
  isOpen,
  onClose,
  results,
  schoolConfig,
  subjects,
  examTitle,
} ) => {
  const [layoutMode, setLayoutMode] = useState<'quad' | 'full'>( 'quad' );

  if ( !isOpen ) return null;

  const chunkedResults: ComputedStudentResult[][] = [];
  for ( let i = 0; i < results.length; i += 4 ) {
    chunkedResults.push( results.slice( i, i + 4 ) );
  }

  const totalPages =
    layoutMode === 'quad' ? chunkedResults.length : results.length;

  const getGradeInfo = ( percentage: number ) => {
    if ( percentage >= 90 ) return {grade: 'A1', remark: 'Outstanding'};
    if ( percentage >= 80 ) return {grade: 'A2', remark: 'Excellent'};
    if ( percentage >= 70 ) return {grade: 'B1', remark: 'Very Good'};
    if ( percentage >= 60 ) return {grade: 'B2', remark: 'Good'};
    if ( percentage >= 50 ) return {grade: 'C1', remark: 'Above Average'};
    if ( percentage >= 40 ) return {grade: 'C2', remark: 'Average'};
    if ( percentage >= 33 ) return {grade: 'D', remark: 'Needs Improvement'};
    return {grade: 'E', remark: 'Poor'};
  };

  const getPassMark = ( subject: Subject ) =>
    subject.passMarks ?? Math.ceil( subject.maxMarks * 0.33 );

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-slate-950/85 backdrop-blur-sm print:overflow-visible print:bg-white">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }

          html,
          body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #111827 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .print-full-container {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .quad-page-wrapper {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .a4-sheet-quad {
            width: 200mm !important;
            height: 287mm !important;
            min-height: 0 !important;
            max-width: none !important;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            grid-template-rows: repeat(2, minmax(0, 1fr)) !important;
            gap: 4mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
          }

          .a4-sheet-quad:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .single-card-quad {
            min-width: 0 !important;
            min-height: 0 !important;
            padding: 3mm !important;
            border: 1px solid #475569 !important;
            border-radius: 3mm !important;
            box-shadow: none !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .quad-school-name {
            font-size: 14pt !important;
          }

          .quad-student-name {
            font-size: 12pt !important;
          }

          .quad-table {
            font-size: 8.5pt !important;
          }

          .quad-table th {
            font-size: 7.5pt !important;
          }

          .quad-table td,
          .quad-table th {
            padding-top: 1.2mm !important;
            padding-bottom: 1.2mm !important;
          }

          .a4-sheet-full {
            width: 200mm !important;
            height: 287mm !important;
            max-width: none !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
          }

          .a4-sheet-full:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      <div className="no-print sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-900/95 px-4 py-3 text-white shadow-xl sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-400/15 text-amber-300">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold sm:text-base">
              Report Cards · {results.length} Students
            </h2>
            <p className="text-[11px] text-slate-400">
              {examTitle} · {schoolConfig.className} - {schoolConfig.section} ·{' '}
              {totalPages} page{totalPages === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-700 bg-slate-800 p-1 text-xs">
            <button
              onClick={() => setLayoutMode( 'quad' )}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold transition ${layoutMode === 'quad'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              title="Print four cards on each A4 page"
            >
              <Grid2X2 className="h-4 w-4" />
              <span>4 Cards / Page</span>
            </button>
            <button
              onClick={() => setLayoutMode( 'full' )}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold transition ${layoutMode === 'full'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              title="Print one card per A4 page"
            >
              <FileText className="h-4 w-4" />
              <span>1 Card / Page</span>
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300 sm:text-sm"
          >
            <Printer className="h-4 w-4" />
            Print · {totalPages} Page{totalPages === 1 ? '' : 's'}
          </button>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 p-2.5 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            title="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="print-full-container mx-auto flex w-full max-w-6xl flex-col items-center gap-8 p-3 sm:p-8">
        {layoutMode === 'quad'
          ? chunkedResults.map( ( pageGroup, pageIndex ) => (
            <div
              key={`page-${pageIndex}`}
              className="quad-page-wrapper flex w-full flex-col items-center"
            >
              <div className="no-print mb-2 text-xs font-bold text-slate-400">
                A4 Sheet {pageIndex + 1} of {chunkedResults.length}
              </div>

              <div className="a4-sheet-quad grid min-h-[1100px] w-full max-w-[850px] grid-cols-1 grid-rows-2 gap-3.5 rounded-xl border border-slate-300 bg-white p-4 text-slate-900 shadow-2xl sm:grid-cols-2 sm:p-5">
                {pageGroup.map( ( result ) => {
                  const gradeInfo = getGradeInfo( Number( result.percentage ) || 0 );

                  return (
                    <article
                      key={result.student.id}
                      className="single-card-quad relative flex min-h-0 flex-col overflow-hidden rounded-xl border-2 border-slate-700 bg-white p-3 shadow-sm"
                    >
                      <div className="pointer-events-none absolute inset-1.5 rounded-lg border border-dashed border-slate-200" />

                      <header className="relative z-10 border-b-2 border-amber-400 pb-2 text-center"> 
                        <h3 className="quad-school-name text-[16px] font-black uppercase leading-tight tracking-wide text-slate-900">
                          {schoolConfig.schoolName}
                        </h3>
                        
                        <span className="mt-1.5 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-900">
                          {examTitle}
                        </span>
                      </header>

                      <section className="relative z-10 my-2 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                        <div className="min-w-0">
                          <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-500">
                            Student Name
                          </span>
                          <span className="quad-student-name block truncate text-[13px] font-extrabold leading-tight text-slate-900">
                            {result.student.name}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-500">
                            Roll Number
                          </span>
                          <span className="block truncate text-[11px] font-bold text-slate-800">
                            {result.student.rollNo || `#${result.student.sNo}`}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-500">
                            Class & Section
                          </span>
                          <span className="text-[10px] font-bold text-slate-800">
                            {schoolConfig.className} - {schoolConfig.section}
                          </span>
                        </div>
                      </section>

                      <div className="relative z-10 min-h-0 flex-1">
                        <table className="quad-table w-full table-fixed border-collapse overflow-hidden rounded-lg border border-slate-300 text-left text-[9px]">
                          <thead>
                            <tr className="bg-slate-800 text-[8px] font-extrabold uppercase text-white">
                              <th className="w-[38%] px-1.5 py-1.5">Subject</th>
                              <th className="w-[13%] px-1 py-1.5 text-center">Max</th>
                              <th className="w-[13%] px-1 py-1.5 text-center">Pass</th>
                              <th className="w-[15%] px-1 py-1.5 text-center">Obt.</th>
                              <th className="w-[21%] px-1 py-1.5 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-slate-800">
                            {subjects.map( ( subject, index ) => {
                              const mark = result.marks[subject.id];
                              const hasMark = mark !== undefined && mark !== null;
                              const passMark = getPassMark( subject );
                              const isPass =
                                hasMark && Number( mark ) >= passMark;

                              return (
                                <tr
                                  key={subject.id}
                                  className={
                                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                  }
                                >
                                  <td className="truncate px-1.5 py-1 font-semibold">
                                    {subject.name}
                                  </td>
                                  <td className="px-1 py-1 text-center">
                                    {subject.maxMarks}
                                  </td>
                                  <td className="px-1 py-1 text-center">
                                    {passMark}
                                  </td>
                                  <td className="px-1 py-1 text-center font-extrabold">
                                    {hasMark ? mark : '—'}
                                  </td>
                                  <td className="px-1 py-1 text-center text-[8px] font-extrabold">
                                    {hasMark ? (
                                      <span
                                        className={
                                          isPass
                                            ? 'text-emerald-700'
                                            : 'text-rose-600'
                                        }
                                      >
                                        {isPass ? 'PASS' : 'FAIL'}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            } )}
                            <tr className="border-t-2 border-amber-400 bg-amber-100 font-extrabold text-slate-900">
                              <td className="px-1.5 py-1.5 uppercase">Total</td>
                              <td className="px-1 py-1.5 text-center">
                                {result.totalMax}
                              </td>
                              <td className="px-1 py-1.5 text-center">—</td>
                              <td className="px-1 py-1.5 text-center">
                                {result.totalObtained}
                              </td>
                              <td className="px-1 py-1.5 text-center text-amber-900">
                                {result.percentage}%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <section className="relative z-10 my-2 grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                        <div>
                          <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-500">
                            Rank
                          </span>
                          <span className="text-[12px] font-black text-amber-700">
                            #{result.rank}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-500">
                            Grade
                          </span>
                          <span className="text-[12px] font-black text-slate-800">
                            {gradeInfo.grade}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-500">
                            Result
                          </span>
                          <span className="block truncate text-[10px] font-bold text-slate-700">
                            {gradeInfo.remark}
                          </span>
                        </div>
                      </section>

                      <footer className="relative z-10  mt-auto grid grid-cols-2 justify-end gap-5 border-t border-dashed border-slate-300 pt-2 text-center text-[8px] font-semibold text-slate-600">
                        <div></div>
                        <div>
                          <div className="mb-1 h-5 border-b border-slate-400" />
                          Class Teacher
                        </div>
                      </footer>
                    </article>
                  );
                } )}

                {Array.from( {length: 4 - pageGroup.length} ).map( ( _, index ) => (
                  <div
                    key={`empty-${index}`}
                    className="single-card-quad flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-300 print:invisible"
                  >
                    Blank
                  </div>
                ) )}
              </div>
            </div>
          ) )
          : results.map( ( result ) => {
            const attendanceDays = result.student.attendanceDays ?? 90;
            const totalDays = result.student.totalWorkingDays ?? 92;
            const attendancePercent =
              totalDays > 0
                ? ( ( attendanceDays / totalDays ) * 100 ).toFixed( 1 )
                : '0.0';

            return (
              <article
                key={result.student.id}
                className="a4-sheet-full w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-xl sm:p-10"
              >
                <header className="border-b-2 border-amber-500 pb-5 text-center">
                  <div className="mb-2 flex items-center justify-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-100 text-amber-700">
                      <Award className="h-7 w-7" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black uppercase tracking-tight">
                        {schoolConfig.schoolName}
                      </h1>
                      <p className="text-xs font-medium text-slate-600">
                        {schoolConfig.schoolSubtitle}
                      </p>
                    </div>
                  </div>
                  <span className="inline-block rounded-full bg-amber-400 px-4 py-1 text-xs font-extrabold uppercase tracking-wide text-slate-950">
                    {examTitle} · Session {schoolConfig.academicYear}
                  </span>
                </header>

                <section className="my-4 grid grid-cols-4 gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
                  <div>
                    <span className="block font-semibold text-slate-500">
                      Student Name
                    </span>
                    <span className="font-extrabold">{result.student.name}</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-500">
                      Roll Number
                    </span>
                    <span className="font-bold">
                      {result.student.rollNo || `#${result.student.sNo}`}
                    </span>
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-500">
                      Class & Section
                    </span>
                    <span className="font-bold">
                      {schoolConfig.className} - {schoolConfig.section}
                    </span>
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-500">
                      Attendance
                    </span>
                    <span className="font-bold">
                      {attendanceDays}/{totalDays} ({attendancePercent}%)
                    </span>
                  </div>
                </section>

                <table className="my-4 w-full overflow-hidden rounded-lg border border-slate-300 text-left text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-[11px] font-bold uppercase text-white">
                      <th className="px-3 py-2 text-center">#</th>
                      <th className="px-4 py-2">Subject</th>
                      <th className="px-3 py-2 text-center">Max Marks</th>
                      <th className="px-3 py-2 text-center">Pass Marks</th>
                      <th className="px-3 py-2 text-center">Obtained</th>
                      <th className="px-3 py-2 text-center">Percentage</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {subjects.map( ( subject, index ) => {
                      const mark = result.marks[subject.id];
                      const hasMark = mark !== undefined && mark !== null;
                      const passMark = getPassMark( subject );
                      const isPass = hasMark && Number( mark ) >= passMark;
                      const subjectPercentage = hasMark
                        ? ( ( Number( mark ) / subject.maxMarks ) * 100 ).toFixed( 1 )
                        : '--';

                      return (
                        <tr
                          key={subject.id}
                          className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                        >
                          <td className="px-3 py-2 text-center text-slate-500">
                            {index + 1}
                          </td>
                          <td className="px-4 py-2 font-bold">{subject.name}</td>
                          <td className="px-3 py-2 text-center">
                            {subject.maxMarks}
                          </td>
                          <td className="px-3 py-2 text-center">{passMark}</td>
                          <td className="px-3 py-2 text-center font-bold">
                            {hasMark ? mark : '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {hasMark ? `${subjectPercentage}%` : '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {hasMark ? (
                              <span
                                className={
                                  isPass
                                    ? 'font-bold text-emerald-700'
                                    : 'font-bold text-rose-600'
                                }
                              >
                                {isPass ? 'PASS' : 'NEEDS WORK'}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    } )}
                    <tr className="bg-amber-100 font-extrabold">
                      <td colSpan={2} className="px-4 py-2 uppercase">
                        Grand Total
                      </td>
                      <td className="px-3 py-2 text-center">
                        {result.totalMax}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {Math.ceil( result.totalMax * 0.33 )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {result.totalObtained}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {result.percentage}%
                      </td>
                      <td className="px-3 py-2 text-center">
                        {result.isPassed ? 'PASSED' : 'NEEDS ATTENTION'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <section className="my-4 grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="block text-slate-500">Class Standing</span>
                    <span className="text-lg font-extrabold text-amber-700">
                      Rank #{result.rank}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="block text-slate-500">Grade</span>
                    <span className="text-lg font-extrabold">
                      Grade {result.grade}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="block text-slate-500">Teacher Remark</span>
                    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-900">
                      {result.remark}
                    </span>
                  </div>
                </section>

                <footer className="grid grid-cols-3 gap-4 border-t border-slate-300 pt-6 text-center text-xs text-slate-700">
                  {['Class Teacher', 'Exam Controller', 'Principal'].map(
                    ( label ) => (
                      <div key={label}>
                        <div className="mb-1 h-8 border-b border-dashed border-slate-400" />
                        <span className="font-semibold">{label}</span>
                      </div>
                    ),
                  )}
                </footer>
              </article>
            );
          } )}
      </div>
    </div>
  );
};