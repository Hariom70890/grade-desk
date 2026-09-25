import React, { useState, useMemo } from 'react';
import { ClassData, TermType } from '../types';
import { 
  validateClassData, 
  validateAllClasses, 
  autoFixClampAllMarks, 
  autoFixDuplicateRollNumbers,
  autoFillMissingMarks,
  ValidationError, 
  ValidationReport 
} from '../utils/dataValidation';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Wrench, 
  CheckCircle2, 
  X, 
  Sparkles, 
  RefreshCw, 
  Layers, 
  ArrowRight,
  Server
} from 'lucide-react';

interface DataValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeClass: ClassData;
  allClasses: ClassData[];
  onUpdateClass: (updatedClass: ClassData) => void;
  onUpdateAllClasses: (updatedClasses: ClassData[]) => void;
  onSelectStudentCell?: (studentId: string, subjectId?: string) => void;
}

export const DataValidationModal: React.FC<DataValidationModalProps> = ({
  isOpen,
  onClose,
  activeClass,
  allClasses,
  onUpdateClass,
  onUpdateAllClasses,
}) => {
  if (!isOpen) return null;

  const [scope, setScope] = useState<'active' | 'all'>('active');
  const [filterType, setFilterType] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [serverCheckResult, setServerCheckResult] = useState<any | null>(null);
  const [isServerChecking, setIsServerChecking] = useState(false);

  // Compute live validation report
  const currentReport: ValidationReport = useMemo(() => {
    if (scope === 'active') {
      return validateClassData(activeClass);
    } else {
      return validateAllClasses(allClasses);
    }
  }, [scope, activeClass, allClasses]);

  const filteredItems = useMemo(() => {
    if (filterType === 'all') return currentReport.items;
    return currentReport.items.filter((i) => i.type === filterType);
  }, [currentReport, filterType]);

  const showNotification = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 3500);
  };

  // 1-Click Fixer: Clamp Exceeding Marks
  const handleFixClampMarks = () => {
    if (scope === 'active') {
      const fixed = autoFixClampAllMarks(activeClass);
      onUpdateClass(fixed);
      showNotification(`Clamped exceeding marks to maximum allowed limit for ${activeClass.name}!`);
    } else {
      const fixedAll = allClasses.map((c) => autoFixClampAllMarks(c));
      onUpdateAllClasses(fixedAll);
      showNotification(`Clamped exceeding marks across all ${allClasses.length} classes!`);
    }
  };

  // 1-Click Fixer: Duplicate Roll Numbers
  const handleFixDuplicateRolls = () => {
    if (scope === 'active') {
      const fixed = autoFixDuplicateRollNumbers(activeClass);
      onUpdateClass(fixed);
      showNotification(`Re-assigned sequential roll numbers for ${activeClass.name}!`);
    } else {
      const fixedAll = allClasses.map((c) => autoFixDuplicateRollNumbers(c));
      onUpdateAllClasses(fixedAll);
      showNotification(`Resolved roll number collisions across all classes!`);
    }
  };

  // 1-Click Fixer: Fill Missing Marks with 0
  const handleFixMissingMarks = (term: TermType) => {
    if (scope === 'active') {
      const fixed = autoFillMissingMarks(activeClass, term, 0);
      onUpdateClass(fixed);
      showNotification(`Filled pending marks with 0 for ${term === 'quarterly' ? 'Quarterly' : 'Half-Yearly'}!`);
    } else {
      const fixedAll = allClasses.map((c) => autoFillMissingMarks(c, term, 0));
      onUpdateAllClasses(fixedAll);
      showNotification(`Filled pending marks across all classes!`);
    }
  };

  // Fix Single Issue
  const handleFixSingleIssue = (issue: ValidationError) => {
    if (issue.fixAction === 'clamp_mark' && issue.studentId && issue.subjectId && issue.allowedMax !== undefined) {
      const targetClass = allClasses.find((c) => c.id === issue.classId) || activeClass;
      const isQ = issue.term === 'quarterly';
      const currentStore = isQ ? { ...targetClass.quarterlyMarks } : { ...targetClass.halfYearlyMarks };
      
      if (!currentStore[issue.studentId]) currentStore[issue.studentId] = {};
      currentStore[issue.studentId] = {
        ...currentStore[issue.studentId],
        [issue.subjectId]: issue.allowedMax,
      };

      const updatedClass: ClassData = {
        ...targetClass,
        ...(isQ ? { quarterlyMarks: currentStore } : { halfYearlyMarks: currentStore }),
      };

      if (targetClass.id === activeClass.id) {
        onUpdateClass(updatedClass);
      } else {
        onUpdateAllClasses(allClasses.map((c) => (c.id === updatedClass.id ? updatedClass : c)));
      }
      showNotification(`Corrected mark to maximum limit (${issue.allowedMax}) for ${issue.studentName}`);
    } else if (issue.fixAction === 'set_zero' && issue.studentId && issue.subjectId) {
      const targetClass = allClasses.find((c) => c.id === issue.classId) || activeClass;
      const isQ = issue.term === 'quarterly';
      const currentStore = isQ ? { ...targetClass.quarterlyMarks } : { ...targetClass.halfYearlyMarks };
      
      if (!currentStore[issue.studentId]) currentStore[issue.studentId] = {};
      currentStore[issue.studentId] = {
        ...currentStore[issue.studentId],
        [issue.subjectId]: 0,
      };

      const updatedClass: ClassData = {
        ...targetClass,
        ...(isQ ? { quarterlyMarks: currentStore } : { halfYearlyMarks: currentStore }),
      };

      if (targetClass.id === activeClass.id) {
        onUpdateClass(updatedClass);
      } else {
        onUpdateAllClasses(allClasses.map((c) => (c.id === updatedClass.id ? updatedClass : c)));
      }
      showNotification(`Set mark to 0 for ${issue.studentName}`);
    } else if (issue.fixAction === 'generate_roll' || issue.category === 'student') {
      handleFixDuplicateRolls();
    }
  };

  // Run backend /api/validate test
  const handleRunServerAudit = async () => {
    setIsServerChecking(true);
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classes: scope === 'active' ? [activeClass] : allClasses }),
      });
      const data = await res.json();
      setServerCheckResult(data);
    } catch (e: any) {
      setServerCheckResult({ error: e.message || 'Server audit unavailable' });
    } finally {
      setIsServerChecking(false);
    }
  };

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    if (score >= 80) return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-rose-500 bg-rose-50 border-rose-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">Data Integrity & Validation Center</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Real-Time Engine
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Audits marks boundaries, duplicate roll numbers, attendance ratios, and incomplete entries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="bg-emerald-600 text-white px-5 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button onClick={() => setSuccessBanner(null)} className="opacity-80 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Top Control Bar: Scope Switcher + Integrity Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Scope Selection */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Validation Scope
                </span>
                <p className="text-xs text-slate-700 font-medium">
                  {scope === 'active' ? `Scanning current: ${activeClass.name} (${activeClass.section})` : `Scanning all ${allClasses.length} registered classes`}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-3 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setScope('active')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    scope === 'active'
                      ? 'bg-amber-400 text-slate-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active Class
                </button>
                <button
                  onClick={() => setScope('all')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    scope === 'all'
                      ? 'bg-amber-400 text-slate-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Classes ({allClasses.length})
                </button>
              </div>
            </div>

            {/* Health Score Gauge */}
            <div className={`border rounded-2xl p-4 flex items-center justify-between ${getScoreColor(currentReport.score)}`}>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider block opacity-80">
                  Data Quality Score
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black">{currentReport.score}%</span>
                  <span className="text-xs font-bold opacity-75">
                    {currentReport.score === 100 ? 'Flawless' : currentReport.score >= 80 ? 'Good' : 'Needs Fixes'}
                  </span>
                </div>
                <p className="text-[11px] font-medium mt-1 opacity-90">
                  {currentReport.errorCount === 0
                    ? 'No critical integrity errors found!'
                    : `${currentReport.errorCount} critical error(s) require action.`}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/80 border border-current/20 flex items-center justify-center shrink-0">
                {currentReport.errorCount === 0 ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-rose-500" />
                )}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 grid grid-cols-2 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Checked Marks</span>
                <span className="text-sm font-black text-slate-800">{currentReport.summary.totalMarksChecked}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Students</span>
                <span className="text-sm font-black text-slate-800">{currentReport.summary.totalStudentsChecked}</span>
              </div>
              <div className={`p-2 rounded-xl border ${currentReport.summary.exceedingMarksCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-100 text-slate-700'}`}>
                <span className="text-[10px] font-bold uppercase block">Exceeding</span>
                <span className="text-sm font-black">{currentReport.summary.exceedingMarksCount}</span>
              </div>
              <div className={`p-2 rounded-xl border ${currentReport.summary.duplicateRollsCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-100 text-slate-700'}`}>
                <span className="text-[10px] font-bold uppercase block">Duplicate Rolls</span>
                <span className="text-sm font-black">{currentReport.summary.duplicateRollsCount}</span>
              </div>
            </div>
          </div>

          {/* 1-Click Auto-Fix Action Bar */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-200/80 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    1-Click Auto-Repair Tools
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Instantly fix common tabulation errors safely without manual retyping
                  </p>
                </div>
              </div>
              <button
                onClick={handleRunServerAudit}
                disabled={isServerChecking}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition-colors shadow-2xs self-start sm:self-auto"
              >
                <Server className="w-3.5 h-3.5 text-amber-600" />
                <span>{isServerChecking ? 'Auditing...' : 'Run Server Audit'}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleFixClampMarks}
                disabled={currentReport.summary.exceedingMarksCount === 0 && currentReport.summary.negativeMarksCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-xs transition-all"
                title="Clamps any marks entered above max limit to the maximum score allowed (e.g. 105 -> 100)"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Clamp Exceeding Marks ({currentReport.summary.exceedingMarksCount})</span>
              </button>

              <button
                onClick={handleFixDuplicateRolls}
                disabled={currentReport.summary.duplicateRollsCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-800 font-bold text-xs border border-slate-300 transition-all shadow-2xs"
                title="Re-assigns clean sequential roll numbers (101, 102...) to resolve duplicates"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                <span>Resolve Duplicate Rolls ({currentReport.summary.duplicateRollsCount})</span>
              </button>

              <button
                onClick={() => handleFixMissingMarks('quarterly')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 transition-all"
                title="Fill all blank/pending quarterly marks with 0"
              >
                <span>Fill Blank Qtr Marks (0)</span>
              </button>

              <button
                onClick={() => handleFixMissingMarks('half_yearly')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 transition-all"
                title="Fill all blank/pending half-yearly marks with 0"
              >
                <span>Fill Blank Half-Yr Marks (0)</span>
              </button>
            </div>
          </div>

          {/* Server audit result banner if triggered */}
          {serverCheckResult && (
            <div className="bg-slate-900 text-white rounded-2xl p-4 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between text-amber-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <Server className="w-4 h-4" />
                  <span>Server-side /api/validate Audit Result</span>
                </span>
                <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded">
                  {serverCheckResult.valid ? 'PASSED' : `${serverCheckResult.issuesCount} Issues`}
                </span>
              </div>
              <p className="text-slate-300">
                Audited {serverCheckResult.totalMarks} marks across submitted classes. Exceeding: {serverCheckResult.exceeding}, Negative: {serverCheckResult.negative}, Duplicate Rolls: {serverCheckResult.duplicateRolls}.
              </p>
            </div>
          )}

          {/* Issues List with Category Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Identified Items ({currentReport.items.length})
                </span>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    filterType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All ({currentReport.items.length})
                </button>
                <button
                  onClick={() => setFilterType('error')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    filterType === 'error' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  Errors ({currentReport.errorCount})
                </button>
                <button
                  onClick={() => setFilterType('warning')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    filterType === 'warning' ? 'bg-amber-500 text-slate-950' : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  Warnings ({currentReport.warningCount})
                </button>
                <button
                  onClick={() => setFilterType('info')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    filterType === 'info' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Pending ({currentReport.infoCount})
                </button>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">All Clean & Validated</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  No issues matching the selected filter. Every student record, mark entry, and roll number is verified and ready for report generation!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredItems.map((item) => {
                  const isError = item.type === 'error';
                  const isWarning = item.type === 'warning';
                  const isInfo = item.type === 'info';

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 transition-colors ${
                        isError
                          ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                          : isWarning
                          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                          : 'bg-blue-50/50 border-blue-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          {isError ? (
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                          ) : isWarning ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Info className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900">{item.title}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-600">
                              {item.className}
                            </span>
                            {item.studentRoll && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                                Roll #{item.studentRoll}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{item.message}</p>
                        </div>
                      </div>

                      {item.fixable && (
                        <button
                          onClick={() => handleFixSingleIssue(item)}
                          className={`shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                            isError
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          Auto Fix
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Automatic validation runs continuously as you type marks.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
