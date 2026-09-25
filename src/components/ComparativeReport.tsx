import React, { useState } from 'react';
import { ComparativeResult, SchoolConfig, Subject } from '../types';
import { exportComparativeToExcel } from '../utils/exportUtils';
import { Download, TrendingUp, TrendingDown, Minus, Award, Sparkles, Filter, AlertCircle, FileText } from 'lucide-react';

interface ComparativeReportProps {
  comparativeResults: ComparativeResult[];
  schoolConfig: SchoolConfig;
  subjects: Subject[];
  onOpenReportCard: (studentId: string) => void;
}

export const ComparativeReport: React.FC<ComparativeReportProps> = ({
  comparativeResults,
  schoolConfig,
  subjects,
  onOpenReportCard,
}) => {
  const [filter, setFilter] = useState<'all' | 'improved' | 'declined'>('all');

  const totalStudents = comparativeResults.length;
  const improvedStudents = comparativeResults.filter((r) => r.deltaPercentage > 0);
  const declinedStudents = comparativeResults.filter((r) => r.deltaPercentage < 0);

  const avgQuarterlyPct = totalStudents > 0
    ? Number((comparativeResults.reduce((sum, r) => sum + r.quarterly.percentage, 0) / totalStudents).toFixed(1))
    : 0;
  const avgHalfYearlyPct = totalStudents > 0
    ? Number((comparativeResults.reduce((sum, r) => sum + r.halfYearly.percentage, 0) / totalStudents).toFixed(1))
    : 0;
  const avgGrowth = Number((avgHalfYearlyPct - avgQuarterlyPct).toFixed(1));

  // Find most improved student
  const mostImproved = [...comparativeResults].sort((a, b) => b.deltaPercentage - a.deltaPercentage)[0];

  const filteredResults = comparativeResults.filter((item) => {
    if (filter === 'improved') return item.deltaPercentage > 0;
    if (filter === 'declined') return item.deltaPercentage < 0;
    return true;
  });

  const handleExport = () => {
    exportComparativeToExcel(
      schoolConfig,
      subjects,
      comparativeResults,
      `${schoolConfig.className}_Quarterly_vs_HalfYearly_Growth_Report.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Highlights */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial from-amber-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-400/30">
              <TrendingUp className="w-3.5 h-3.5" /> Term 1 vs Term 2 Growth Analytics
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Quarterly vs. Half Yearly Performance Report
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Class: {schoolConfig.className} {schoolConfig.section} • Academic Session {schoolConfig.academicYear}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <Download className="w-4 h-4" /> Export Growth Report (.xlsx)
            </button>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-700/60">
          <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
            <span className="text-xs text-slate-400 font-medium block">Quarterly Class Avg</span>
            <div className="text-xl font-extrabold text-amber-300 mt-0.5">{avgQuarterlyPct}%</div>
            <span className="text-[11px] text-slate-400">Term 1 baseline</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
            <span className="text-xs text-slate-400 font-medium block">Half Yearly Class Avg</span>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{avgHalfYearlyPct}%</div>
            <span className="text-[11px] text-slate-400">Term 2 outcome</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
            <span className="text-xs text-slate-400 font-medium block">Class Net Growth</span>
            <div className={`text-xl font-extrabold mt-0.5 flex items-center gap-1 ${avgGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {avgGrowth >= 0 ? `+${avgGrowth}%` : `${avgGrowth}%`}
              {avgGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <span className="text-[11px] text-slate-400">{improvedStudents.length} of {totalStudents} improved</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
            <span className="text-xs text-amber-300 font-bold block flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Most Improved
            </span>
            <div className="text-sm font-extrabold text-white mt-0.5 truncate">
              {mostImproved?.student.name || 'N/A'}
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold">
              +{mostImproved?.deltaPercentage}% growth!
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Students ({totalStudents})
          </button>
          <button
            onClick={() => setFilter('improved')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
              filter === 'improved' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Improved ({improvedStudents.length})
          </button>
          <button
            onClick={() => setFilter('declined')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
              filter === 'declined' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Dropped / Needs Work ({declinedStudents.length})
          </button>
        </div>

        <span className="text-xs text-slate-500">
          Showing {filteredResults.length} student comparative trajectories
        </span>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Top grouping row */}
              <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th colSpan={3} className="py-2.5 px-4 border-r border-slate-200 bg-slate-100">
                  Student Information
                </th>
                <th colSpan={3} className="py-2.5 px-3 text-center border-r border-slate-200 bg-amber-50 text-amber-900">
                  Quarterly Exam (Term 1)
                </th>
                <th colSpan={3} className="py-2.5 px-3 text-center border-r border-slate-200 bg-sky-50 text-sky-900">
                  Half Yearly Exam (Term 2)
                </th>
                <th colSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200 bg-emerald-50 text-emerald-900">
                  Growth & Trajectory
                </th>
                <th colSpan={3} className="py-2.5 px-3 text-center bg-indigo-50 text-indigo-900">
                  Combined Annual Standing
                </th>
              </tr>
              {/* Sub-header row */}
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                <th className="py-2.5 px-3 w-12 text-center">S.No.</th>
                <th className="py-2.5 px-3 w-20">Roll No</th>
                <th className="py-2.5 px-4 min-w-[160px] border-r border-slate-200">Student Name</th>

                {/* Quarterly */}
                <th className="py-2.5 px-3 text-center bg-amber-50/40">Total</th>
                <th className="py-2.5 px-3 text-center bg-amber-50/40">Pct %</th>
                <th className="py-2.5 px-3 text-center bg-amber-50/40 border-r border-slate-200">Rank</th>

                {/* Half Yearly */}
                <th className="py-2.5 px-3 text-center bg-sky-50/40">Total</th>
                <th className="py-2.5 px-3 text-center bg-sky-50/40">Pct %</th>
                <th className="py-2.5 px-3 text-center bg-sky-50/40 border-r border-slate-200">Rank</th>

                {/* Growth */}
                <th className="py-2.5 px-3 text-center bg-emerald-50/40">Delta %</th>
                <th className="py-2.5 px-3 text-center bg-emerald-50/40 border-r border-slate-200">Status</th>

                {/* Combined */}
                <th className="py-2.5 px-3 text-center bg-indigo-50/40">Combined %</th>
                <th className="py-2.5 px-3 text-center bg-indigo-50/40">Cum. Rank</th>
                <th className="py-2.5 px-3 text-center bg-indigo-50/40">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResults.map((item, idx) => {
                const isImproved = item.deltaPercentage > 0;
                const isDeclined = item.deltaPercentage < 0;

                return (
                  <tr key={item.student.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3 px-3 text-center font-medium text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{item.student.rollNo}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 border-r border-slate-200">
                      {item.student.name}
                    </td>

                    {/* Quarterly */}
                    <td className="py-3 px-3 text-center font-semibold text-slate-700 bg-amber-50/20">
                      {item.quarterly.totalObtained}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800 bg-amber-50/20">
                      {item.quarterly.percentage}%
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 bg-amber-50/20 border-r border-slate-200">
                      #{item.quarterly.rank}
                    </td>

                    {/* Half Yearly */}
                    <td className="py-3 px-3 text-center font-semibold text-slate-700 bg-sky-50/20">
                      {item.halfYearly.totalObtained}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800 bg-sky-50/20">
                      {item.halfYearly.percentage}%
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 bg-sky-50/20 border-r border-slate-200">
                      #{item.halfYearly.rank}
                    </td>

                    {/* Delta Growth */}
                    <td className="py-3 px-3 text-center bg-emerald-50/20">
                      <span
                        className={`font-black inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] ${
                          isImproved
                            ? 'text-emerald-700 bg-emerald-100'
                            : isDeclined
                            ? 'text-rose-700 bg-rose-100'
                            : 'text-slate-600 bg-slate-100'
                        }`}
                      >
                        {isImproved && <TrendingUp className="w-3 h-3" />}
                        {isDeclined && <TrendingDown className="w-3 h-3" />}
                        {!isImproved && !isDeclined && <Minus className="w-3 h-3" />}
                        {isImproved ? `+${item.deltaPercentage}%` : `${item.deltaPercentage}%`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center border-r border-slate-200 bg-emerald-50/20">
                      {isImproved && <span className="text-[10px] font-bold text-emerald-800 uppercase">Improved</span>}
                      {isDeclined && <span className="text-[10px] font-bold text-rose-800 uppercase">Declined</span>}
                      {!isImproved && !isDeclined && <span className="text-[10px] text-slate-500 uppercase">Equal</span>}
                    </td>

                    {/* Combined Standing */}
                    <td className="py-3 px-3 text-center font-extrabold text-indigo-900 bg-indigo-50/20">
                      {item.combinedPercentage}%
                    </td>
                    <td className="py-3 px-3 text-center bg-indigo-50/20">
                      <span className="inline-flex items-center justify-center font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs">
                        #{item.combinedRank}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center bg-indigo-50/20">
                      <button
                        onClick={() => onOpenReportCard(item.student.id)}
                        className="px-2.5 py-1 rounded-md bg-white hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 text-[11px] font-semibold transition-colors flex items-center gap-1 mx-auto"
                      >
                        <FileText className="w-3 h-3" /> Card
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
