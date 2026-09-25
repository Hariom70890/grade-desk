import React, { useState } from 'react';
import { ComputedStudentResult, SchoolConfig, Subject } from '../types';
import { Printer, X, Award, Grid2X2, FileText, CheckCircle2 } from 'lucide-react';

interface BatchReportCardsProps {
  isOpen: boolean;
  onClose: () => void;
  results: ComputedStudentResult[];
  schoolConfig: SchoolConfig;
  subjects: Subject[];
  examTitle: string;
}

export const BatchReportCards: React.FC<BatchReportCardsProps> = ({
  isOpen,
  onClose,
  results,
  schoolConfig,
  subjects,
  examTitle,
}) => {
  const [layoutMode, setLayoutMode] = useState<'quad' | 'full'>('quad'); // 'quad' = 4 cards per A4 page

  if (!isOpen) return null;

  // Chunk results into groups of 4 for the 4-per-page A4 layout
  const chunkedResults: ComputedStudentResult[][] = [];
  for (let i = 0; i < results.length; i += 4) {
    chunkedResults.push(results.slice(i, i + 4));
  }

  const totalPages = layoutMode === 'quad' ? chunkedResults.length : results.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-xs overflow-y-auto print:bg-white print:overflow-visible">
      {/* Print styles injected */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-container {
            padding: 0 !important;
            margin: 0 !important;
            gap: 0 !important;
            background: white !important;
          }
          .a4-sheet-quad {
            width: 100% !important;
            height: 286mm !important;
            max-height: 286mm !important;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: repeat(2, 1fr) !important;
            gap: 3.5mm !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .a4-sheet-full {
            width: 100% !important;
            height: 286mm !important;
            max-height: 286mm !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 6mm !important;
            border: none !important;
            box-shadow: none !important;
          }
          .single-card-quad {
            box-sizing: border-box !important;
            border: 1.5px solid #292524 !important;
            border-radius: 6px !important;
            padding: 3mm !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Floating control bar (hidden when printing) */}
      <div className="no-print sticky top-0 z-50 bg-slate-900/95 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
              Batch Report Cards Preview ({results.length} Students)
            </h2>
            <p className="text-[11px] text-slate-400">
              {examTitle} • {schoolConfig.className} - {schoolConfig.section} • {totalPages} A4 Page{totalPages > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Layout Mode Selector (4 per A4 page vs 1 per page) */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700 text-xs">
            <button
              onClick={() => setLayoutMode('quad')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                layoutMode === 'quad'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Prints 4 cards on each A4 page (2x2 grid)"
            >
              <Grid2X2 className="w-3.5 h-3.5" />
              <span>4 Cards / A4 Page</span>
            </button>
            <button
              onClick={() => setLayoutMode('full')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                layoutMode === 'full'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Prints 1 large full-page card per student"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1 Card / Page</span>
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all hover:scale-102"
          >
            <Printer className="w-4 h-4" /> Print {layoutMode === 'quad' ? '4-on-A4' : 'All'} ({totalPages} Pages)
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="print-full-container p-3 sm:p-8 flex flex-col items-center gap-8 w-full max-w-6xl mx-auto">
        {layoutMode === 'quad' ? (
          // ==========================================
          // 4 CARDS PER A4 PAGE (2x2 GRID FORMAT)
          // ==========================================
          chunkedResults.map((pageGroup, pageIndex) => (
            <div key={`page-${pageIndex}`} className="flex flex-col items-center w-full">
              {/* Screen indicator for page number */}
              <div className="no-print text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                <span>A4 Sheet #{pageIndex + 1} of {chunkedResults.length}</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400">Contains {pageGroup.length} Cards (2x2 Grid)</span>
              </div>

              {/* Physical A4 Sheet Container */}
              <div className="a4-sheet-quad bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 w-full max-w-[850px] min-h-[1100px] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 grid-rows-2 gap-3.5 box-border">
                {pageGroup.map((result) => {
                  const attendanceDays = result.student.attendanceDays ?? 90;
                  const totalDays = result.student.totalWorkingDays ?? 92;
                  const attendancePercent = ((attendanceDays / totalDays) * 100).toFixed(0);

                  return (
                    <div
                      key={result.student.id}
                      className="single-card-quad bg-white border-2 border-stone-800 rounded-lg p-2.5 sm:p-3 flex flex-col justify-between relative overflow-hidden shadow-xs"
                    >
                      {/* Inner ornate border accent */}
                      <div className="absolute inset-0.5 border border-dashed border-stone-300 pointer-events-none rounded-md" />

                      {/* Card Header: School info & Exam Title */}
                      <div className="text-center relative z-10 pb-1.5 border-b border-stone-300">
                        <h3 className="font-extrabold text-[11px] sm:text-[12px] uppercase text-stone-900 tracking-tight leading-tight">
                          {schoolConfig.schoolName}
                        </h3>
                        <p className="text-[8px] text-stone-600 font-medium leading-none mt-0.5 truncate">
                          {schoolConfig.schoolSubtitle}
                        </p>
                        <div className="mt-1 inline-block bg-amber-100 text-stone-900 px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider border border-amber-300">
                          {examTitle} • {schoolConfig.academicYear}
                        </div>
                      </div>

                      {/* Student Details Grid */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-amber-50/40 p-1.5 rounded border border-amber-200/80 my-1.5 text-[9px] relative z-10">
                        <div className="truncate">
                          <span className="text-stone-500 text-[8px] block leading-none">Student Name</span>
                          <span className="font-black text-stone-900 text-[10px] leading-tight truncate block">
                            {result.student.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500 text-[8px] block leading-none">Roll No</span>
                          <span className="font-bold text-stone-800 text-[10px] leading-tight">
                            {result.student.rollNo || `#${result.student.sNo}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500 text-[8px] block leading-none">Class & Sec</span>
                          <span className="font-bold text-stone-800 text-[9px] leading-tight">
                            {schoolConfig.className} - {schoolConfig.section}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500 text-[8px] block leading-none">Attendance</span>
                          <span className="font-bold text-stone-800 text-[9px] leading-tight">
                            {attendanceDays}/{totalDays} ({attendancePercent}%)
                          </span>
                        </div>
                      </div>

                      {/* Compact Marks Table */}
                      <div className="relative z-10 flex-1 my-1">
                        <table className="w-full text-left text-[8.5px] border border-stone-300 rounded overflow-hidden">
                          <thead>
                            <tr className="bg-stone-100 text-stone-900 border-b border-stone-300 font-black uppercase text-[8px]">
                              <th className="py-0.5 px-1.5">Subject</th>
                              <th className="py-0.5 px-1 text-center">Max</th>
                              <th className="py-0.5 px-1 text-center">Pass</th>
                              <th className="py-0.5 px-1 text-center">Obt.</th>
                              <th className="py-0.5 px-1 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200">
                            {subjects.map((sub, i) => {
                              const mark = result.marks[sub.id];
                              const hasMark = mark !== undefined && mark !== null;
                              const passMark = sub.passMarks ?? Math.ceil(sub.maxMarks * 0.33);
                              const isPass = hasMark && Number(mark) >= passMark;

                              return (
                                <tr key={sub.id} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                                  <td className="py-0.5 px-1.5 font-bold text-stone-900 truncate max-w-[90px]">
                                    {sub.name}
                                  </td>
                                  <td className="py-0.5 px-1 text-center text-stone-600 font-medium">{sub.maxMarks}</td>
                                  <td className="py-0.5 px-1 text-center text-stone-500">{passMark}</td>
                                  <td className="py-0.5 px-1 text-center font-black text-stone-900">
                                    {hasMark ? mark : '--'}
                                  </td>
                                  <td className="py-0.5 px-1 text-center font-bold">
                                    {hasMark ? (
                                      isPass ? (
                                        <span className="text-emerald-700 text-[7.5px]">PASS</span>
                                      ) : (
                                        <span className="text-rose-600 text-[7.5px]">FAIL</span>
                                      )
                                    ) : (
                                      <span className="text-stone-400">--</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Grand Total Row */}
                            <tr className="bg-amber-100/90 font-black text-stone-900 border-t-2 border-stone-400">
                              <td className="py-1 px-1.5 uppercase text-[8.5px]">Total</td>
                              <td className="py-1 px-1 text-center">{result.totalMax}</td>
                              <td className="py-1 px-1 text-center">--</td>
                              <td className="py-1 px-1 text-center font-black text-stone-950 text-[9.5px]">
                                {result.totalObtained}
                              </td>
                              <td className="py-1 px-1 text-center text-[8px] font-bold text-emerald-800">
                                {result.percentage}%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Rank, Grade & Remark Summary */}
                      <div className="grid grid-cols-3 gap-1 bg-stone-50 border border-stone-200 rounded p-1 text-center my-1 relative z-10 text-[8px]">
                        <div>
                          <span className="text-stone-500 block text-[7px] leading-tight">Rank</span>
                          <span className="font-extrabold text-amber-700 text-[9px] leading-tight">
                            #{result.rank}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[7px] leading-tight">Grade</span>
                          <span className="font-extrabold text-stone-800 text-[9px] leading-tight">
                            {result.grade}
                          </span>
                        </div>
                        <div className="truncate">
                          <span className="text-stone-500 block text-[7px] leading-tight">Remark</span>
                          <span className="font-bold text-stone-700 text-[8px] leading-tight truncate block">
                            {result.remark}
                          </span>
                        </div>
                      </div>

                      {/* Signatures */}
                      <div className="pt-2 border-t border-dashed border-stone-300 grid grid-cols-2 gap-2 text-center text-[8px] text-stone-600 relative z-10 mt-auto">
                        <div>
                          <div className="h-4 border-b border-stone-400 mb-0.5"></div>
                          <span className="font-bold">Class Teacher</span>
                        </div>
                        <div>
                          <div className="h-4 border-b border-stone-400 mb-0.5"></div>
                          <span className="font-bold">Principal</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* If page has less than 4 cards, fill remaining slots with empty layout so A4 grid doesn't stretch */}
                {Array.from({ length: 4 - pageGroup.length }).map((_, emptyIdx) => (
                  <div
                    key={`empty-${emptyIdx}`}
                    className="single-card-quad border-2 border-dashed border-stone-200 rounded-lg p-3 flex items-center justify-center text-stone-300 text-xs font-semibold print:opacity-0"
                  >
                    Blank Slot
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          // ==========================================
          // 1 FULL PAGE PER STUDENT (STANDARD FORMAT)
          // ==========================================
          results.map((result) => {
            const attendanceDays = result.student.attendanceDays ?? 90;
            const totalDays = result.student.totalWorkingDays ?? 92;
            const attendancePercent = ((attendanceDays / totalDays) * 100).toFixed(1);

            return (
              <div
                key={result.student.id}
                className="a4-sheet-full bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 max-w-4xl w-full p-8 sm:p-10"
              >
                {/* School Header */}
                <div className="text-center pb-5 border-b-2 border-amber-600/40">
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <div className="w-12 h-12 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center text-amber-700">
                      <Award className="w-7 h-7" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 uppercase">
                        {schoolConfig.schoolName}
                      </h1>
                      <p className="text-xs text-slate-600 font-medium">
                        {schoolConfig.schoolSubtitle}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 inline-block bg-amber-500 text-slate-950 px-4 py-0.5 rounded-full text-xs font-black tracking-wider uppercase">
                    {examTitle} • SESSION {schoolConfig.academicYear}
                  </div>
                </div>

                {/* Student info */}
                <div className="grid grid-cols-4 gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200 my-4 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold">Student Name</span>
                    <span className="font-extrabold text-slate-900">{result.student.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold">Roll No</span>
                    <span className="font-bold text-slate-800">{result.student.rollNo || `#${result.student.sNo}`}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold">Class & Section</span>
                    <span className="font-bold text-slate-800">{schoolConfig.className} - {schoolConfig.section}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block font-semibold">Attendance</span>
                    <span className="font-bold text-slate-800">{attendanceDays}/{totalDays} ({attendancePercent}%)</span>
                  </div>
                </div>

                {/* Subject Marks Table */}
                <table className="w-full text-left text-xs border border-slate-300 rounded-lg overflow-hidden my-4">
                  <thead>
                    <tr className="bg-amber-100 text-slate-900 border-b border-slate-300 font-bold uppercase text-[10px]">
                      <th className="py-2 px-3 text-center">#</th>
                      <th className="py-2 px-4">Subject</th>
                      <th className="py-2 px-3 text-center">Max Marks</th>
                      <th className="py-2 px-3 text-center">Pass Marks</th>
                      <th className="py-2 px-3 text-center">Marks Obtained</th>
                      <th className="py-2 px-3 text-center">Percentage</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {subjects.map((sub, i) => {
                      const mark = result.marks[sub.id];
                      const hasMark = mark !== undefined && mark !== null;
                      const passMark = sub.passMarks ?? Math.ceil(sub.maxMarks * 0.33);
                      const isPass = hasMark && Number(mark) >= passMark;
                      const subPct = hasMark ? ((Number(mark) / sub.maxMarks) * 100).toFixed(1) : '-';

                      return (
                        <tr key={sub.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="py-2 px-3 text-center text-slate-500">{i + 1}</td>
                          <td className="py-2 px-4 font-bold text-slate-900">{sub.name}</td>
                          <td className="py-2 px-3 text-center text-slate-600">{sub.maxMarks}</td>
                          <td className="py-2 px-3 text-center text-slate-500">{passMark}</td>
                          <td className="py-2 px-3 text-center font-bold text-slate-900">
                            {hasMark ? mark : '--'}
                          </td>
                          <td className="py-2 px-3 text-center font-medium text-slate-700">
                            {hasMark ? `${subPct}%` : '--'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {hasMark ? (
                              isPass ? (
                                <span className="text-[10px] font-bold text-emerald-700">PASS</span>
                              ) : (
                                <span className="text-[10px] font-bold text-red-600">NEEDS WORK</span>
                              )
                            ) : (
                              <span className="text-slate-400">--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-amber-100 font-extrabold text-slate-900">
                      <td colSpan={2} className="py-2 px-4 uppercase text-xs">Grand Total</td>
                      <td className="py-2 px-3 text-center text-xs">{result.totalMax}</td>
                      <td className="py-2 px-3 text-center text-xs">{Math.ceil(result.totalMax * 0.33)}</td>
                      <td className="py-2 px-3 text-center text-sm font-black text-amber-950">{result.totalObtained}</td>
                      <td className="py-2 px-3 text-center text-sm font-black text-amber-950">{result.percentage}%</td>
                      <td className="py-2 px-3 text-center text-xs">
                        {result.isPassed ? (
                          <span className="text-emerald-800 font-bold">PASSED</span>
                        ) : (
                          <span className="text-red-700 font-bold">NEEDS ATTENTION</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Bottom Result summary */}
                <div className="grid grid-cols-3 gap-3 my-4 text-center text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                    <span className="text-[10px] text-slate-500 block">Class Standing</span>
                    <span className="font-extrabold text-amber-600 text-lg">Rank #{result.rank}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                    <span className="text-[10px] text-slate-500 block">Grade</span>
                    <span className="font-extrabold text-slate-800 text-lg">Grade {result.grade}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                    <span className="text-[10px] text-slate-500 block">Teacher Remark</span>
                    <span className="font-bold text-amber-900 text-xs px-2 py-0.5 bg-amber-100 rounded-full inline-block mt-1">
                      {result.remark}
                    </span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs text-slate-700">
                  <div>
                    <div className="h-8 border-b border-dashed border-slate-400 mb-1"></div>
                    <span className="font-semibold text-[11px]">Class Teacher</span>
                  </div>
                  <div>
                    <div className="h-8 border-b border-dashed border-slate-400 mb-1"></div>
                    <span className="font-semibold text-[11px]">Exam Controller</span>
                  </div>
                  <div>
                    <div className="h-8 border-b border-dashed border-slate-400 mb-1"></div>
                    <span className="font-semibold text-[11px]">Principal</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
