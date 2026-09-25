import React from 'react';
import { ComputedStudentResult, SchoolConfig, Subject } from '../types';
import { Printer, ChevronLeft, ChevronRight, X, Award, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';

interface StudentReportCardProps {
  isOpen: boolean;
  onClose: () => void;
  result: ComputedStudentResult;
  allResults: ComputedStudentResult[];
  onSelectStudent: (studentId: string) => void;
  schoolConfig: SchoolConfig;
  subjects: Subject[];
  examTitle: string;
}

export const StudentReportCard: React.FC<StudentReportCardProps> = ({
  isOpen,
  onClose,
  result,
  allResults,
  onSelectStudent,
  schoolConfig,
  subjects,
  examTitle,
}) => {
  if (!isOpen || !result) return null;

  const currentIndex = allResults.findIndex((r) => r.student.id === result.student.id);
  const prevStudent = currentIndex > 0 ? allResults[currentIndex - 1] : null;
  const nextStudent = currentIndex < allResults.length - 1 ? allResults[currentIndex + 1] : null;

  const attendanceDays = result.student.attendanceDays ?? 90;
  const totalDays = result.student.totalWorkingDays ?? 92;
  const attendancePercent = ((attendanceDays / totalDays) * 100).toFixed(1);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-slate-200">
        {/* Navigation & Action Bar (Hidden when printing) */}
        <div className="no-print bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => prevStudent && onSelectStudent(prevStudent.student.id)}
              disabled={!prevStudent}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white transition-colors flex items-center gap-1 text-xs"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs text-slate-300 font-medium px-2">
              Student {currentIndex + 1} of {allResults.length}
            </span>
            <button
              onClick={() => nextStudent && onSelectStudent(nextStudent.student.id)}
              disabled={!nextStudent}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white transition-colors flex items-center gap-1 text-xs"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition-all hover:scale-105"
            >
              <Printer className="w-4 h-4" /> Print Report Card
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Card Document Container */}
        <div className="print-container p-6 sm:p-10 bg-white text-slate-900">
          {/* Ornate School Header */}
          <div className="text-center pb-6 border-b-2 border-amber-600/40 relative">
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center text-amber-700 shadow-inner">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-cooper uppercase">
                  {schoolConfig.schoolName}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 font-medium tracking-wide">
                  {schoolConfig.schoolSubtitle}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Affiliation No: {schoolConfig.affiliationNo}
                </p>
              </div>
            </div>

            {/* Exam Badge */}
            <div className="mt-3 inline-block bg-amber-500 text-slate-950 px-6 py-1 rounded-full text-xs font-black tracking-widest uppercase shadow-sm">
              {examTitle} • SESSION {schoolConfig.academicYear}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
              STUDENT PROGRESS & PERFORMANCE REPORT
            </div>
          </div>

          {/* Student Profile Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 my-5 text-xs">
            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">Student Name</span>
              <span className="font-extrabold text-sm text-slate-900">{result.student.name}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">Roll Number</span>
              <span className="font-bold text-sm text-slate-800">{result.student.rollNo || `RN-${result.student.sNo}`}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">Class & Section</span>
              <span className="font-bold text-sm text-slate-800">{schoolConfig.className} - {schoolConfig.section}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">Attendance</span>
              <span className="font-bold text-sm text-slate-800">
                {attendanceDays}/{totalDays} <span className="text-slate-500 font-normal">({attendancePercent}%)</span>
              </span>
            </div>
          </div>

          {/* Academic Performance Table */}
          <div className="overflow-x-auto my-6 border border-slate-300 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-amber-100 text-slate-900 border-b border-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-3 text-center">Max Marks</th>
                  <th className="py-2.5 px-3 text-center">Pass Marks</th>
                  <th className="py-2.5 px-3 text-center">Marks Obtained</th>
                  <th className="py-2.5 px-3 text-center">Percentage</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
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
                      <td className="py-2.5 px-3 text-center font-medium text-slate-500">{i + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600 no-print" />
                        {sub.name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-600">{sub.maxMarks}</td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{passMark}</td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-sm text-slate-900">
                        {hasMark ? mark : <span className="text-slate-400 font-normal">--</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                        {hasMark ? `${subPct}%` : '--'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {hasMark ? (
                          isPass ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                              <AlertTriangle className="w-3.5 h-3.5" /> Needs Work
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 text-[11px]">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Grand Total Row */}
                <tr className="bg-amber-100 font-extrabold text-slate-900 border-t-2 border-amber-300">
                  <td colSpan={2} className="py-3 px-4 uppercase tracking-wider text-xs">
                    Grand Total
                  </td>
                  <td className="py-3 px-3 text-center text-xs">{result.totalMax}</td>
                  <td className="py-3 px-3 text-center text-xs">{Math.ceil(result.totalMax * 0.33)}</td>
                  <td className="py-3 px-3 text-center text-sm font-black text-amber-950">
                    {result.totalObtained}
                  </td>
                  <td className="py-3 px-3 text-center text-sm font-black text-amber-950">
                    {result.percentage}%
                  </td>
                  <td className="py-3 px-3 text-center text-xs">
                    {result.isPassed ? (
                      <span className="text-emerald-800 font-extrabold">PASSED</span>
                    ) : (
                      <span className="text-red-700 font-extrabold">NEEDS ATTENTION</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Performance Summary Badges & Teacher Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Class Standing</span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-black text-amber-600">Rank #{result.rank}</span>
                <span className="text-xs text-slate-500">out of {allResults.length}</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Overall Grade</span>
              <div className="text-2xl font-black text-slate-800">
                Grade {result.grade}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Official Remark</span>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                {result.remark}
              </span>
            </div>
          </div>

          {/* Teacher's Comprehensive Evaluation */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs mb-8">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
              Class Teacher's Observations:
            </h4>
            <p className="text-slate-600 italic">
              {result.percentage >= 85
                ? `${result.student.name} demonstrates commendable academic mastery, active classroom participation, and strong conceptual understanding across core subjects.`
                : result.percentage >= 60
                ? `${result.student.name} is performing consistently well. Continued focus on regular practice and revision in key areas will help achieve even greater success.`
                : `${result.student.name} shows potential but requires dedicated practice and supportive guidance, especially in subjects scoring below expectations.`}
            </p>
          </div>

          {/* Official Signatures Section */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs text-slate-700">
            <div>
              <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
              <span className="font-bold">Class Teacher</span>
            </div>
            <div>
              <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
              <span className="font-bold">Exam Controller</span>
            </div>
            <div>
              <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
              <span className="font-bold">Principal / Seal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
