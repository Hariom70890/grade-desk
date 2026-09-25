import React from 'react';
import { Subject, ComputedStudentResult, SchoolConfig } from '../types';
import { Printer, X, FileSpreadsheet, Download } from 'lucide-react';
import { exportTabulationToExcel } from '../utils/exportUtils';

interface TabulationRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  examTitle: string;
  schoolConfig: SchoolConfig;
  subjects: Subject[];
  results: ComputedStudentResult[];
}

export const TabulationRegisterModal: React.FC<TabulationRegisterModalProps> = ({
  isOpen,
  onClose,
  examTitle,
  schoolConfig,
  subjects,
  results,
}) => {
  if (!isOpen) return null;

  const totalMaxMarks = subjects.reduce((sum, s) => sum + s.maxMarks, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExcel = () => {
    exportTabulationToExcel(
      examTitle,
      schoolConfig,
      subjects,
      results,
      `${schoolConfig.className}_${schoolConfig.section}_Tabulation_Register.xlsx`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      {/* Top action bar (hidden during print) */}
      <div className="no-print sticky top-0 z-50 bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">
              Official Tabulation Register — {schoolConfig.className} ({schoolConfig.section})
            </h2>
            <p className="text-xs text-slate-400">
              {examTitle} • Formatted for landscape master print with official signatures
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExcel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-105"
          >
            <Printer className="w-4 h-4" /> Print Register (Landscape)
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Sheet Canvas */}
      <div className="p-4 sm:p-8 flex justify-center">
        <div className="w-full max-w-[1200px] bg-white text-black p-8 rounded-xl shadow-2xl border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0">
          {/* School Header */}
          <div className="text-center pb-4 border-b-2 border-black mb-4">
            <h1 className="text-2xl font-black uppercase tracking-wider font-serif">
              {schoolConfig.schoolName}
            </h1>
            <p className="text-xs font-semibold text-slate-700">
              {schoolConfig.schoolSubtitle} {schoolConfig.affiliationNo && `• Affiliation: ${schoolConfig.affiliationNo}`}
            </p>
            <div className="inline-block mt-2 px-4 py-1 bg-amber-200 border border-black rounded-lg text-sm font-black uppercase tracking-wide">
              {examTitle} — TABULATION REGISTER
            </div>
            <div className="flex justify-between items-center text-xs font-bold mt-3 px-2">
              <span>CLASS: {schoolConfig.className.toUpperCase()} ({schoolConfig.section})</span>
              <span>ACADEMIC SESSION: {schoolConfig.academicYear}</span>
              <span>TOTAL STUDENTS: {results.length}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-black">
              <thead>
                {/* Max marks row */}
                <tr className="bg-amber-100 border-b border-black font-extrabold text-[11px]">
                  <th className="border-r border-black py-1 px-2 text-center w-10">S.No.</th>
                  <th className="border-r border-black py-1 px-2 text-center w-20">Roll No</th>
                  <th className="border-r border-black py-1 px-3 min-w-[160px]">Student Name</th>
                  {subjects.map((sub) => (
                    <th key={sub.id} className="border-r border-black py-1 px-1 text-center min-w-[60px]">
                      {sub.name}
                      <span className="block text-[9px] font-bold text-slate-700">
                        (Max {sub.maxMarks})
                      </span>
                    </th>
                  ))}
                  <th className="border-r border-black py-1 px-2 text-center min-w-[60px] bg-amber-200">
                    Total ({totalMaxMarks})
                  </th>
                  <th className="border-r border-black py-1 px-2 text-center min-w-[70px] bg-amber-200">
                    %age
                  </th>
                  <th className="border-r border-black py-1 px-2 text-center w-14 bg-amber-200">
                    Rank
                  </th>
                  <th className="py-1 px-2 text-center min-w-[80px] bg-amber-200">
                    Remark
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {results.map((res, idx) => (
                  <tr key={res.student.id} className="border-b border-black text-[11px]">
                    <td className="border-r border-black py-1 px-2 text-center font-bold">
                      {idx + 1}
                    </td>
                    <td className="border-r border-black py-1 px-2 text-center font-mono font-bold">
                      {res.student.rollNo}
                    </td>
                    <td className="border-r border-black py-1 px-3 font-bold truncate max-w-[200px]">
                      {res.student.name}
                    </td>
                    {subjects.map((sub) => {
                      const mark = res.marks[sub.id];
                      return (
                        <td key={sub.id} className="border-r border-black py-1 px-1 text-center font-semibold">
                          {mark !== undefined && mark !== null ? mark : '-'}
                        </td>
                      );
                    })}
                    <td className="border-r border-black py-1 px-2 text-center font-black bg-slate-50">
                      {res.totalObtained}
                    </td>
                    <td className="border-r border-black py-1 px-2 text-center font-black bg-slate-50">
                      {res.percentage}%
                    </td>
                    <td className="border-r border-black py-1 px-2 text-center font-black bg-slate-50">
                      #{res.rank}
                    </td>
                    <td className="py-1 px-2 text-center font-bold text-[10px] bg-slate-50">
                      {res.remark}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Statistical Summary Box */}
          <div className="mt-4 p-3 bg-slate-50 border border-black rounded-lg text-xs flex flex-wrap justify-between items-center gap-4">
            <div>
              <strong>Class Strength:</strong> {results.length} |{' '}
              <strong>Appeared:</strong> {results.filter((r) => r.marksCount > 0).length} |{' '}
              <strong>Passed:</strong> {results.filter((r) => r.isPassed).length}
            </div>
            <div>
              <strong>Pass Percentage:</strong>{' '}
              {results.length > 0
                ? `${((results.filter((r) => r.isPassed).length / results.length) * 100).toFixed(1)}%`
                : '0%'}
            </div>
            <div>
              <strong>Class Average:</strong>{' '}
              {results.length > 0
                ? `${(results.reduce((acc, r) => acc + r.percentage, 0) / results.length).toFixed(1)}%`
                : '0%'}
            </div>
          </div>

          {/* Official Signature Blocks */}
          <div className="mt-14 pt-8 grid grid-cols-3 gap-6 text-center text-xs font-bold border-t border-dashed border-slate-400">
            <div>
              <div className="border-b border-black w-44 mx-auto mb-2" />
              <p>Class Teacher</p>
              <p className="text-[10px] text-slate-500 font-normal">Signature & Date</p>
            </div>
            <div>
              <div className="border-b border-black w-44 mx-auto mb-2" />
              <p>Examination Incharge</p>
              <p className="text-[10px] text-slate-500 font-normal">Signature & Verification</p>
            </div>
            <div>
              <div className="border-b border-black w-44 mx-auto mb-2" />
              <p>Principal</p>
              <p className="text-[10px] text-slate-500 font-normal">Seal & Official Endorsement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
