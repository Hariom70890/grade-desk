import React from 'react';
import { ComputedStudentResult, Subject } from '../types';
import { computeSubjectStats } from '../utils/calculations';
import { Award, Trophy, TrendingUp, AlertTriangle, CheckCircle, BarChart3, Users, Star } from 'lucide-react';

interface AnalyticsViewProps {
  results: ComputedStudentResult[];
  subjects: Subject[];
  termTitle: string;
  onOpenReportCard: (studentId: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  results,
  subjects,
  termTitle,
  onOpenReportCard,
}) => {
  const subjectStats = computeSubjectStats(subjects, results);

  const totalStudents = results.length;
  const passedStudents = results.filter((r) => r.isPassed);
  const passPercentage = totalStudents > 0 ? ((passedStudents.length / totalStudents) * 100).toFixed(1) : '0';

  const classAvgPercentage = totalStudents > 0
    ? (results.reduce((acc, r) => acc + r.percentage, 0) / totalStudents).toFixed(1)
    : '0';

  // Sorted by rank/percentage
  const sorted = [...results].sort((a, b) => b.totalObtained - a.totalObtained);
  const rank1 = sorted[0];
  const rank2 = sorted[1];
  const rank3 = sorted[2];

  // Needs attention
  const needsAttention = results.filter((r) => r.percentage < 40 || !r.isPassed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">
            Executive Analytics & Performance Insights
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{termTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Holistic examination evaluation, topper highlights, subject difficulty, and diagnostic tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] text-amber-800 font-bold uppercase block">Class Pass Rate</span>
            <span className="text-xl font-extrabold text-amber-900">{passPercentage}%</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] text-emerald-800 font-bold uppercase block">Class Average</span>
            <span className="text-xl font-extrabold text-emerald-900">{classAvgPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="bg-gradient-to-b from-amber-500/10 via-white to-white p-6 rounded-2xl border border-amber-200/60 shadow-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-sm mb-1">
            <Trophy className="w-3.5 h-3.5" /> Examination Toppers Podium
          </div>
          <p className="text-xs text-slate-500">The highest academic achievers in this examination term</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto items-end pt-4">
          {/* Rank 2 (Silver) */}
          {rank2 && (
            <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-md text-center order-2 md:order-1 relative hover:border-slate-300 transition-all">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xl mb-3 shadow-inner">
                🥈
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Rank #2</span>
              <h4 className="font-extrabold text-slate-900 text-lg mt-0.5 truncate">{rank2.student.name}</h4>
              <p className="text-sm font-black text-slate-700 mt-1">{rank2.percentage}%</p>
              <p className="text-xs text-slate-500">{rank2.totalObtained} / {rank2.totalMax} Marks</p>
              <button
                onClick={() => onOpenReportCard(rank2.student.id)}
                className="mt-3 text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline"
              >
                View Marksheet →
              </button>
            </div>
          )}

          {/* Rank 1 (Gold) */}
          {rank1 && (
            <div className="bg-gradient-to-b from-amber-50 to-white rounded-2xl p-6 border-2 border-amber-400 shadow-xl text-center order-1 md:order-2 relative -translate-y-2 hover:shadow-2xl transition-all">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest shadow-md">
                Class Topper 👑
              </div>
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white flex items-center justify-center font-black text-2xl mb-3 shadow-lg ring-4 ring-amber-200">
                🥇
              </div>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">Rank #1</span>
              <h4 className="font-black text-slate-900 text-xl mt-0.5 truncate">{rank1.student.name}</h4>
              <p className="text-lg font-black text-amber-600 mt-1">{rank1.percentage}%</p>
              <p className="text-xs text-slate-600">{rank1.totalObtained} / {rank1.totalMax} Marks</p>
              <button
                onClick={() => onOpenReportCard(rank1.student.id)}
                className="mt-4 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-sm transition-all"
              >
                View Report Card
              </button>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {rank3 && (
            <div className="bg-white rounded-2xl p-5 border-2 border-amber-200/80 shadow-md text-center order-3 md:order-3 relative hover:border-amber-300 transition-all">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xl mb-3 shadow-inner">
                🥉
              </div>
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Rank #3</span>
              <h4 className="font-extrabold text-slate-900 text-lg mt-0.5 truncate">{rank3.student.name}</h4>
              <p className="text-sm font-black text-slate-700 mt-1">{rank3.percentage}%</p>
              <p className="text-xs text-slate-500">{rank3.totalObtained} / {rank3.totalMax} Marks</p>
              <button
                onClick={() => onOpenReportCard(rank3.student.id)}
                className="mt-3 text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline"
              >
                View Marksheet →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subject-Wise Performance Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-500" />
          Subject-Wise Performance & Difficulty Matrix
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Compare class average, peak scores, and subject pass rates to pinpoint curriculum focus areas
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectStats.map((stat) => {
            const avgPct = ((stat.average / stat.subject.maxMarks) * 100).toFixed(1);
            return (
              <div
                key={stat.subject.id}
                className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:bg-white hover:border-amber-300 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-extrabold text-slate-900 text-sm">{stat.subject.name}</h4>
                    <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      Max: {stat.subject.maxMarks}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${avgPct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-200/60 mb-3">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Class Average</span>
                      <span className="font-extrabold text-slate-800 text-sm">
                        {stat.average} <span className="text-slate-500 font-normal text-xs">({avgPct}%)</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Pass / Fail</span>
                      <span className="font-bold text-slate-800">
                        <span className="text-emerald-600 font-extrabold">{stat.passCount} Pass</span> /{' '}
                        <span className="text-red-500 font-extrabold">{stat.failCount} Fail</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs bg-amber-50/60 p-2 rounded-lg border border-amber-200/40">
                  <span className="text-amber-800 font-bold block text-[10px] uppercase">
                    ⭐ Highest Score: {stat.highest} / {stat.subject.maxMarks}
                  </span>
                  <span className="text-slate-700 text-[11px] font-medium truncate block">
                    {stat.highestScorers.join(', ') || 'None'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Students Needing Academic Support */}
      {needsAttention.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="text-base font-extrabold text-rose-950">
              Students Requiring Academic Attention & Remedial Focus ({needsAttention.length})
            </h3>
          </div>
          <p className="text-xs text-rose-800 mb-4">
            Students who scored below 40% aggregate or failed in one or more subjects. Suggested action: Remedial classes, focused homework review, and parent-teacher conference.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {needsAttention.map((res) => (
              <div
                key={res.student.id}
                className="bg-white rounded-xl p-3.5 border border-rose-200 shadow-xs flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{res.student.name}</h4>
                  <span className="text-xs text-slate-500">Roll: {res.student.rollNo}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-black text-rose-600">{res.percentage}%</span>
                    <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      {res.remark}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onOpenReportCard(res.student.id)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 transition-colors"
                >
                  Inspect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
