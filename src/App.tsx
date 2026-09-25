import React, { useState, useEffect } from 'react';
import { 
  Subject, 
  Student, 
  SchoolConfig, 
  GradingRule, 
  ClassData 
} from './types';
import { 
  DEFAULT_CLASSES, 
  DEFAULT_SCHOOL_CONFIG, 
  DEFAULT_GRADING_RULES,
  INITIAL_QUARTERLY_MARKS,
  INITIAL_HALF_YEARLY_MARKS
} from './constants/initialData';
import { 
  computeStudentResults, 
  computeComparativeResults 
} from './utils/calculations';
import { TabulationSheet } from './components/TabulationSheet';
import { RapidEntryModal } from './components/RapidEntryModal';
import { StudentReportCard } from './components/StudentReportCard';
import { BatchReportCards } from './components/BatchReportCards';
import { TabulationRegisterModal } from './components/TabulationRegisterModal';
import { ComparativeReport } from './components/ComparativeReport';
import { AnalyticsView } from './components/AnalyticsView';
import { PasteImportModal } from './components/PasteImportModal';
import { SettingsModal } from './components/SettingsModal';
import { ClassModal } from './components/ClassModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DataStorageModal } from './components/DataStorageModal';
import { DataValidationModal } from './components/DataValidationModal';
import { validateClassData } from './utils/dataValidation';
import { 
  GraduationCap, 
  Layers, 
  TrendingUp, 
  BarChart3, 
  FileSpreadsheet, 
  Printer, 
  Settings, 
  ClipboardPaste, 
  Plus,
  ChevronDown,
  Check,
  HardDrive,
  ShieldCheck,
  Cloud,
  AlertTriangle,
  Menu,
  X,
  CheckCircle2,
  Database,
  Save,
  RefreshCw,
  Loader2
} from 'lucide-react';

export default function App() {
  // Pure Cloud State - NO data stored on local machines
  const [classes, setClasses] = useState<ClassData[]>(DEFAULT_CLASSES);
  const [activeClassId, setActiveClassId] = useState<string>('class_nursery');
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(DEFAULT_SCHOOL_CONFIG);
  const [gradingRules] = useState<GradingRule[]>(DEFAULT_GRADING_RULES);

  // Modals & Navigation state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isRapidEntryOpen, setIsRapidEntryOpen] = useState(false);
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<string | null>(null);
  const [isBatchCardsOpen, setIsBatchCardsOpen] = useState(false);
  const [isRegisterPrintOpen, setIsRegisterPrintOpen] = useState(false);
  const [isPasteImportOpen, setIsPasteImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [storageDefaultTab, setStorageDefaultTab] = useState<'local' | 'mongodb'>('mongodb');

  // MongoDB Cloud Sync State
  const [isMongoConnected, setIsMongoConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [syncToast, setSyncToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setSyncToast({ type, message });
    setTimeout(() => {
      setSyncToast(null);
    }, 4500);
  };

  // Active view tab: 'quarterly' | 'half_yearly' | 'comparative' | 'analytics'
  const [activeTab, setActiveTab] = useState<'quarterly' | 'half_yearly' | 'comparative' | 'analytics'>('quarterly');

  // SAVE TO MONGODB ACTION
  const handleSaveToMongoDB = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/mongodb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classes, schoolConfig }),
      });
      const data = await res.json();
      if (data.success) {
        setIsMongoConnected(true);
        setHasUnsavedChanges(false);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(timeStr);
        showToast('success', `Saved ${classes.length} classes directly to MongoDB Atlas (${timeStr})`);
      } else {
        showToast('error', data.error || 'Failed to save to MongoDB');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Network error saving to MongoDB');
    } finally {
      setIsSaving(false);
    }
  };

  // REFRESH FROM MONGODB ACTION
  const handleRefreshFromMongoDB = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/mongodb/pull');
      const data = await res.json();
      if (data.success && Array.isArray(data.classes) && data.classes.length > 0) {
        setClasses(data.classes);
        if (data.schoolConfig) {
          setSchoolConfig(data.schoolConfig);
        }
        setIsMongoConnected(true);
        setHasUnsavedChanges(false);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(timeStr);
        showToast('success', `Refreshed ${data.classes.length} classes from MongoDB Atlas!`);
      } else if (data.success && data.classes.length === 0) {
        // If cluster is freshly created with no data, seed once
        await handleSaveToMongoDB();
        showToast('success', 'Seeded initial classes to MongoDB Atlas');
      } else {
        showToast('error', data.error || 'Could not fetch data from MongoDB');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Network error connecting to MongoDB');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial load directly from MongoDB (No localStorage used!)
  useEffect(() => {
    // Clear any local storage on the machine to guarantee 100% cloud-only MongoDB operation
    try {
      localStorage.clear();
    } catch (e) {}

    // Check MongoDB connection status
    fetch('/api/mongodb/status')
      .then((res) => res.json())
      .then((data) => {
        setIsMongoConnected(Boolean(data?.connected));
      })
      .catch(() => setIsMongoConnected(false));

    // Pull from MongoDB on load
    fetch('/api/mongodb/pull')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.classes) && data.classes.length > 0) {
          setClasses(data.classes);
          if (data.schoolConfig) {
            setSchoolConfig(data.schoolConfig);
          }
          setIsMongoConnected(true);
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setLastSavedTime(timeStr);
        } else {
          // If MongoDB has no classes, seed once
          fetch('/api/mongodb/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classes: DEFAULT_CLASSES, schoolConfig: DEFAULT_SCHOOL_CONFIG }),
          })
            .then((r) => r.json())
            .then((res) => {
              if (res.success) {
                setIsMongoConnected(true);
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setLastSavedTime(timeStr);
              }
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        console.error('Initial MongoDB load error:', err);
      });
  }, []);

  // Keyboard shortcut: Ctrl+S or Cmd+S to save to MongoDB
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveToMongoDB();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [classes, schoolConfig]);

  // Current active class reference
  const currentClass = classes.find((c) => c.id === activeClassId) || classes[0] || DEFAULT_CLASSES[0];

  const currentStudents = currentClass.students;
  const currentSubjects = currentClass.subjects;
  const currentQuarterlyMarks = currentClass.quarterlyMarks || {};
  const currentHalfYearlyMarks = currentClass.halfYearlyMarks || {};

  // Calculations for current active class
  const quarterlyResults = computeStudentResults(currentStudents, currentSubjects, currentQuarterlyMarks, gradingRules);
  const halfYearlyResults = computeStudentResults(currentStudents, currentSubjects, currentHalfYearlyMarks, gradingRules);
  const comparativeResults = computeComparativeResults(currentStudents, currentSubjects, currentQuarterlyMarks, currentHalfYearlyMarks, gradingRules);

  const isQuarterly = activeTab === 'quarterly';
  const currentMarks = isQuarterly ? currentQuarterlyMarks : currentHalfYearlyMarks;
  const currentResults = isQuarterly ? quarterlyResults : halfYearlyResults;
  const currentExamTitle = isQuarterly ? schoolConfig.quarterlyTitle : schoolConfig.halfYearlyTitle;

  // Active class school config with dynamic class & section
  const activeClassConfig: SchoolConfig = {
    ...schoolConfig,
    className: currentClass.name,
    section: currentClass.section,
    academicYear: currentClass.academicYear || schoolConfig.academicYear,
  };

  // Live real-time data validation diagnostics
  const validationReport = React.useMemo(() => validateClassData(currentClass), [currentClass]);

  // Helper to update current class in classes array
  const updateCurrentClass = (updater: (prev: ClassData) => ClassData) => {
    setHasUnsavedChanges(true);
    setClasses((prevList) =>
      prevList.map((cls) => (cls.id === currentClass.id ? updater(cls) : cls))
    );
  };

  // Handlers for mark updates
  const handleUpdateMark = (studentId: string, subjectId: string, mark: number | null) => {
    updateCurrentClass((prev) => {
      const marksField = isQuarterly ? 'quarterlyMarks' : 'halfYearlyMarks';
      const existingTermMarks = prev[marksField] || {};
      const existingStudentMarks = existingTermMarks[studentId] || {};

      return {
        ...prev,
        [marksField]: {
          ...existingTermMarks,
          [studentId]: {
            ...existingStudentMarks,
            [subjectId]: mark,
          },
        },
      };
    });
  };

  // Student management handlers
  const handleAddStudent = (name: string, rollNo: string) => {
    const newId = 's_' + currentClass.id + '_' + Date.now();
    const newStudent: Student = {
      id: newId,
      sNo: currentStudents.length + 1,
      rollNo,
      name,
      attendanceDays: 90,
      totalWorkingDays: 92,
    };

    updateCurrentClass((prev) => ({
      ...prev,
      students: [...prev.students, newStudent],
    }));
  };

  const handleDeleteStudent = (studentId: string) => {
    if (confirm('Are you sure you want to remove this student?')) {
      updateCurrentClass((prev) => {
        const remaining = prev.students.filter((s) => s.id !== studentId);
        const renumbered = remaining.map((s, idx) => ({ ...s, sNo: idx + 1 }));

        const newQ = { ...prev.quarterlyMarks };
        delete newQ[studentId];
        const newH = { ...prev.halfYearlyMarks };
        delete newH[studentId];

        return {
          ...prev,
          students: renumbered,
          quarterlyMarks: newQ,
          halfYearlyMarks: newH,
        };
      });
    }
  };

  const handleUpdateStudent = (studentId: string, name: string, rollNo: string) => {
    updateCurrentClass((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === studentId ? { ...s, name, rollNo } : s)),
    }));
  };

  // Row Shifting: Move student up
  const handleMoveRowUp = (index: number) => {
    if (index <= 0 || index >= currentStudents.length) return;
    updateCurrentClass((prev) => {
      const newStudents = [...prev.students];
      const temp = newStudents[index];
      newStudents[index] = newStudents[index - 1];
      newStudents[index - 1] = temp;
      const renumbered = newStudents.map((s, idx) => ({ ...s, sNo: idx + 1 }));
      return { ...prev, students: renumbered };
    });
  };

  // Row Shifting: Move student down
  const handleMoveRowDown = (index: number) => {
    if (index < 0 || index >= currentStudents.length - 1) return;
    updateCurrentClass((prev) => {
      const newStudents = [...prev.students];
      const temp = newStudents[index];
      newStudents[index] = newStudents[index + 1];
      newStudents[index + 1] = temp;
      const renumbered = newStudents.map((s, idx) => ({ ...s, sNo: idx + 1 }));
      return { ...prev, students: renumbered };
    });
  };

  // Reorder all students (e.g. from sorting)
  const handleReorderStudents = (newStudents: Student[]) => {
    updateCurrentClass((prev) => ({
      ...prev,
      students: newStudents,
    }));
  };

  // Insert row at specific position
  const handleInsertRowAt = (targetIndex: number, name: string, rollNo: string) => {
    const newId = 's_' + currentClass.id + '_' + Date.now();
    const newStudent: Student = {
      id: newId,
      sNo: targetIndex + 1,
      rollNo,
      name,
      attendanceDays: 90,
      totalWorkingDays: 92,
    };

    updateCurrentClass((prev) => {
      const list = [...prev.students];
      list.splice(targetIndex, 0, newStudent);
      const renumbered = list.map((s, idx) => ({ ...s, sNo: idx + 1 }));
      return { ...prev, students: renumbered };
    });
  };

  // Fill sample marks for current class
  const handleFillSampleMarks = () => {
    updateCurrentClass((prev) => {
      const targetMarks: Record<string, Record<string, number | null>> = {};
      prev.students.forEach((student, idx) => {
        targetMarks[student.id] = {};
        prev.subjects.forEach((subj) => {
          // Realistic high/medium/good marks pattern
          const baseRatio = isQuarterly
            ? 0.58 + ((idx * 9) % 36) / 100
            : 0.65 + ((idx * 9) % 32) / 100;
          const variation = (idx % 3 === 0 ? 0.08 : -0.04);
          const finalRatio = Math.max(0.35, Math.min(0.98, baseRatio + variation));
          targetMarks[student.id][subj.id] = Math.round(subj.maxMarks * finalRatio);
        });
      });

      return isQuarterly
        ? { ...prev, quarterlyMarks: targetMarks }
        : { ...prev, halfYearlyMarks: targetMarks };
    });
  };

  // Clear marks for current class
  const handleClearMarks = () => {
    if (confirm(`Clear all marks entered for ${currentClass.name} (${currentClass.section}) in ${currentExamTitle}? This cannot be undone.`)) {
      updateCurrentClass((prev) =>
        isQuarterly ? { ...prev, quarterlyMarks: {} } : { ...prev, halfYearlyMarks: {} }
      );
    }
  };

  // Import handler for active class
  const handleImportPastedData = (imported: { rollNo: string; name: string; marks: Record<string, number> }[]) => {
    const updatedStudents: Student[] = [];
    const newMarks: Record<string, Record<string, number | null>> = {};

    imported.forEach((item, index) => {
      const id = 's_imp_' + index + '_' + Date.now();
      updatedStudents.push({
        id,
        sNo: index + 1,
        rollNo: item.rollNo || String(index + 101),
        name: item.name,
        attendanceDays: 90,
        totalWorkingDays: 92,
      });

      newMarks[id] = item.marks;
    });

    updateCurrentClass((prev) => ({
      ...prev,
      students: updatedStudents,
      ...(isQuarterly ? { quarterlyMarks: newMarks } : { halfYearlyMarks: newMarks }),
    }));
  };

  // Class Management Handlers
  const handleCreateClass = (newClass: ClassData) => {
    setHasUnsavedChanges(true);
    setClasses((prev) => [...prev, newClass]);
    setActiveClassId(newClass.id);
  };

  const handleUpdateClass = (classId: string, name: string, section: string) => {
    setHasUnsavedChanges(true);
    setClasses((prev) =>
      prev.map((c) => (c.id === classId ? { ...c, name, section } : c))
    );
  };

  const handleDeleteClass = (classId: string) => {
    if (classes.length <= 1) {
      alert('You cannot delete the only remaining class.');
      return;
    }
    setHasUnsavedChanges(true);
    const remaining = classes.filter((c) => c.id !== classId);
    setClasses(remaining);
    if (activeClassId === classId) {
      setActiveClassId(remaining[0].id);
    }
  };

  const handleDuplicateClass = (classId: string) => {
    const target = classes.find((c) => c.id === classId);
    if (!target) return;

    setHasUnsavedChanges(true);
    const nextSectionChar = String.fromCharCode(target.section.charCodeAt(0) + 1);
    const newId = 'class_' + Date.now();

    const duplicatedClass: ClassData = {
      ...target,
      id: newId,
      section: nextSectionChar.length === 1 ? nextSectionChar : `${target.section}-Copy`,
      students: target.students.map((s, idx) => ({
        ...s,
        id: `s_${newId}_${idx + 1}`,
      })),
      quarterlyMarks: {},
      halfYearlyMarks: {},
    };

    setClasses((prev) => [...prev, duplicatedClass]);
    setActiveClassId(newId);
  };

  // Data Restore & Reset Handlers for Storage Modal
  const handleRestoreAllData = (newClasses: ClassData[], newConfig?: SchoolConfig) => {
    setHasUnsavedChanges(true);
    setClasses(newClasses);
    if (newClasses.length > 0) {
      setActiveClassId(newClasses[0].id);
    }
    if (newConfig) {
      setSchoolConfig(newConfig);
    }
  };

  const handleResetAllData = () => {
    setClasses(DEFAULT_CLASSES);
    setActiveClassId(DEFAULT_CLASSES[0].id);
    setSchoolConfig(DEFAULT_SCHOOL_CONFIG);
    localStorage.removeItem('edugrade_all_classes_v2');
    localStorage.removeItem('edugrade_school_config');
    localStorage.removeItem('edugrade_active_class_id');
  };

  // Selected student result for individual report card
  const selectedResult = currentResults.find((r) => r.student.id === selectedStudentForCard);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-16">
      {/* Offline Status Toast Indicator */}
      <OfflineIndicator />

      {/* Top Navbar */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Logo and school session header */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 truncate">
                    GradeDesk
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    {activeClassConfig.academicYear}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs">
                  {schoolConfig.schoolName}
                </p>
              </div>

              {/* Current active class badge on mobile/desktop */}
              <div className="hidden xs:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold shrink-0">
                <span>{currentClass.name}</span>
                <span className="text-[10px] text-amber-700">({currentClass.section})</span>
              </div>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
              {/* PWA Install Button */}
              <PWAInstallButton />

              {/* SAVE TO MONGODB BUTTON */}
              <button
                onClick={handleSaveToMongoDB}
                disabled={isSaving}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-xs ${
                  hasUnsavedChanges
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                }`}
                title="Save all class data and marks directly to MongoDB Atlas (Ctrl+S)"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save to MongoDB'}</span>
                {hasUnsavedChanges && (
                  <span className="w-2 h-2 rounded-full bg-amber-300 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* REFRESH FROM MONGODB BUTTON */}
              <button
                onClick={handleRefreshFromMongoDB}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
                title="Refresh and sync latest data from MongoDB Atlas"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>

              {/* MongoDB Status Pill */}
              <div
                className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600"
                title={isMongoConnected ? 'Connected to MongoDB Atlas cluster' : 'Connecting to MongoDB...'}
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold">{isMongoConnected ? 'MongoDB' : 'Connecting'}</span>
                {lastSavedTime && (
                  <span className="text-[10px] text-slate-400 font-mono">({lastSavedTime})</span>
                )}
              </div>

              {/* Data Validation Status Badge */}
              <button
                onClick={() => setIsValidationModalOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  validationReport.isValid
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                }`}
                title={`Data Validation: ${validationReport.score}% health score (${validationReport.errorCount} errors, ${validationReport.warningCount} warnings)`}
              >
                {validationReport.isValid ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                )}
                <span>{validationReport.isValid ? 'Valid' : `${validationReport.errorCount} Issues`}</span>
              </button>

              <button
                onClick={() => setIsPasteImportOpen(true)}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
                title="Paste data directly from Excel or Google Sheets"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-amber-600" />
                <span>Import Excel</span>
              </button>

              <button
                onClick={() => setIsRegisterPrintOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200"
                title="Print Tabulation Register with Official Signatures"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                <span>Register</span>
              </button>

              <button
                onClick={() => setIsBatchCardsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 transition-all shadow-xs"
                title="Print 4 Report Cards per A4 Page for All Students"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>4-on-A4 Cards</span>
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
                title="Configure School & Subjects"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Horizontal Controls: Save + Refresh + Cards + Burger Menu */}
            <div className="flex md:hidden items-center gap-1 shrink-0">
              {/* Mobile Save Button */}
              <button
                onClick={handleSaveToMongoDB}
                disabled={isSaving}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-extrabold shadow-xs ${
                  hasUnsavedChanges ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' : 'bg-emerald-500 text-slate-950'
                }`}
                title="Save to MongoDB"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save</span>
              </button>

              {/* Mobile Refresh Button */}
              <button
                onClick={handleRefreshFromMongoDB}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                title="Refresh and sync data from MongoDB"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
              </button>

              <button
                onClick={() => setIsBatchCardsOpen(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 shadow-xs"
                title="Print 4 Cards per A4 Page"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Cards</span>
              </button>

              {/* Hamburger Button for Mobile */}
              <button
                onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors"
                aria-label="Toggle navigation menu"
                title="Open menu"
              >
                {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Dedicated Horizontal Class Selector Bar: Always horizontal, smooth scroll */}
        <div className="border-t border-slate-200/90 bg-slate-50/95 px-3 sm:px-6 py-1.5 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-1.5">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider pr-1 shrink-0">
            Classes:
          </span>

          {classes.map((cls) => {
            const isActive = cls.id === activeClassId;
            return (
              <button
                key={cls.id}
                onClick={() => setActiveClassId(cls.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-xs scale-102 ring-1 ring-amber-500/50'
                    : 'bg-white text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/80'
                }`}
              >
                <span>{cls.name}</span>
                <span className="text-[10px] opacity-75 font-semibold">({cls.section})</span>
              </button>
            );
          })}

          <button
            onClick={() => setIsClassModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors shrink-0 shadow-2xs"
            title="Manage All Classes or Add New Class"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage Classes</span>
          </button>
        </div>

        {/* Tab Switcher: Quarterly, Half-Yearly, Comparative, Analytics */}
        <div className="border-t border-slate-200/80 bg-slate-50/60 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto py-2 scrollbar-none">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setActiveTab('quarterly')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'quarterly'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Quarterly Examination (Term 1)
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-md bg-black/10">
                  {quarterlyResults.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('half_yearly')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'half_yearly'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Layers className="w-4 h-4" />
                Half Yearly Examination (Term 2)
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-md bg-black/10">
                  {halfYearlyResults.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('comparative')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'comparative'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-amber-300" />
                Comparative Growth (T1 vs T2)
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'analytics'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-amber-400" />
                Performance Insights & Toppers
              </button>
            </div>

            {/* Current Active Class Badge */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                Active: <strong>{currentClass.name} ({currentClass.section})</strong> • {currentStudents.length} Students
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Tab 1: Quarterly Examination Sheet */}
        {activeTab === 'quarterly' && (
          <TabulationSheet
            examTitle={schoolConfig.quarterlyTitle}
            schoolConfig={activeClassConfig}
            subjects={currentSubjects}
            students={currentStudents}
            results={quarterlyResults}
            marksMap={currentQuarterlyMarks}
            onUpdateMark={handleUpdateMark}
            onAddStudent={handleAddStudent}
            onDeleteStudent={handleDeleteStudent}
            onUpdateStudent={handleUpdateStudent}
            onOpenReportCard={(id) => setSelectedStudentForCard(id)}
            onOpenRapidEntry={() => setIsRapidEntryOpen(true)}
            onFillSampleMarks={handleFillSampleMarks}
            onClearMarks={handleClearMarks}
            onMoveRowUp={handleMoveRowUp}
            onMoveRowDown={handleMoveRowDown}
            onReorderStudents={handleReorderStudents}
            onInsertRowAt={handleInsertRowAt}
            onOpenRegisterPrint={() => setIsRegisterPrintOpen(true)}
          />
        )}

        {/* Tab 2: Half Yearly Examination Sheet */}
        {activeTab === 'half_yearly' && (
          <TabulationSheet
            examTitle={schoolConfig.halfYearlyTitle}
            schoolConfig={activeClassConfig}
            subjects={currentSubjects}
            students={currentStudents}
            results={halfYearlyResults}
            marksMap={currentHalfYearlyMarks}
            onUpdateMark={handleUpdateMark}
            onAddStudent={handleAddStudent}
            onDeleteStudent={handleDeleteStudent}
            onUpdateStudent={handleUpdateStudent}
            onOpenReportCard={(id) => setSelectedStudentForCard(id)}
            onOpenRapidEntry={() => setIsRapidEntryOpen(true)}
            onFillSampleMarks={handleFillSampleMarks}
            onClearMarks={handleClearMarks}
            onMoveRowUp={handleMoveRowUp}
            onMoveRowDown={handleMoveRowDown}
            onReorderStudents={handleReorderStudents}
            onInsertRowAt={handleInsertRowAt}
            onOpenRegisterPrint={() => setIsRegisterPrintOpen(true)}
          />
        )}

        {/* Tab 3: Comparative Quarterly vs Half Yearly Performance Report */}
        {activeTab === 'comparative' && (
          <ComparativeReport
            comparativeResults={comparativeResults}
            schoolConfig={activeClassConfig}
            subjects={currentSubjects}
            onOpenReportCard={(id) => setSelectedStudentForCard(id)}
          />
        )}

        {/* Tab 4: Performance Analytics & Class Toppers */}
        {activeTab === 'analytics' && (
          <AnalyticsView
            results={currentResults}
            subjects={currentSubjects}
            termTitle={currentExamTitle}
            onOpenReportCard={(id) => setSelectedStudentForCard(id)}
          />
        )}
      </main>

      {/* MODALS */}

      {/* Mobile Drawer (Hamburger Menu) */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileNavOpen(false)}
          />

          {/* Slide-out Menu Panel */}
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm leading-tight">School Menu</h3>
                  <p className="text-[10px] text-slate-400 truncate max-w-[170px]">{schoolConfig.schoolName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileNavOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cloud MongoDB Sync Actions */}
            <div className="p-3 bg-emerald-50/70 border-b border-emerald-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  MongoDB Atlas
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {lastSavedTime ? `Synced: ${lastSavedTime}` : 'Cloud Connected'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    await handleSaveToMongoDB();
                  }}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSaving ? 'Saving...' : 'Save Data'}</span>
                </button>
                <button
                  onClick={async () => {
                    await handleRefreshFromMongoDB();
                  }}
                  disabled={isRefreshing}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
                  <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-5 flex-1">
              {/* Classes Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Classes ({classes.length})
                  </span>
                  <button
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      setIsClassModalOpen(true);
                    }}
                    className="text-xs font-bold text-amber-600 flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Manage
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {classes.map((cls) => {
                    const isActive = cls.id === activeClassId;
                    return (
                      <button
                        key={cls.id}
                        onClick={() => {
                          setActiveClassId(cls.id);
                          setIsMobileNavOpen(false);
                        }}
                        className={`p-2 rounded-xl text-xs font-bold text-left transition-all border ${
                          isActive
                            ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <div className="truncate">{cls.name}</div>
                        <div className="text-[10px] opacity-75 font-semibold">Section {cls.section}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exam Switcher */}
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-2">
                  Examination Term
                </span>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab('quarterly');
                      setIsMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      activeTab === 'quarterly'
                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" /> Term 1: Quarterly
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10">{quarterlyResults.length}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('half_yearly');
                      setIsMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      activeTab === 'half_yearly'
                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Term 2: Half-Yearly
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10">{halfYearlyResults.length}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('comparative');
                      setIsMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      activeTab === 'comparative'
                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" /> Comparative Growth
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('analytics');
                      setIsMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      activeTab === 'analytics'
                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" /> Performance Analytics
                  </button>
                </div>
              </div>

              {/* Quick Actions & Tools */}
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-2">
                  Actions & Exports
                </span>
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      setIsBatchCardsOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print 4 Cards / A4 Page</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      setIsRegisterPrintOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                    <span>Print Tabulation Register</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      setIsPasteImportOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                  >
                    <ClipboardPaste className="w-4 h-4 text-amber-600" />
                    <span>Import Excel / Paste</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      setIsValidationModalOpen(true);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold border ${
                      validationReport.isValid
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Data Validation
                    </span>
                    <span className="text-[10px] font-extrabold">{validationReport.score}% Score</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      setIsSettingsOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                  >
                    <Settings className="w-4 h-4 text-slate-600" />
                    <span>School & Subject Settings</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage All Classes Modal */}
      <ClassModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        classes={classes}
        activeClassId={activeClassId}
        onSelectClass={(id) => setActiveClassId(id)}
        onCreateClass={handleCreateClass}
        onUpdateClass={handleUpdateClass}
        onDeleteClass={handleDeleteClass}
        onDuplicateClass={handleDuplicateClass}
      />

      {/* Official Tabulation Register Print Modal */}
      <TabulationRegisterModal
        isOpen={isRegisterPrintOpen}
        onClose={() => setIsRegisterPrintOpen(false)}
        examTitle={currentExamTitle}
        schoolConfig={activeClassConfig}
        subjects={currentSubjects}
        results={currentResults}
      />

      {/* Rapid Numpad Data Entry Modal */}
      <RapidEntryModal
        isOpen={isRapidEntryOpen}
        onClose={() => setIsRapidEntryOpen(false)}
        subjects={currentSubjects}
        students={currentStudents}
        currentMarks={currentMarks}
        onSaveMark={handleUpdateMark}
        termTitle={currentExamTitle}
      />

      {/* Individual Student Report Card */}
      {selectedResult && (
        <StudentReportCard
          isOpen={!!selectedStudentForCard}
          onClose={() => setSelectedStudentForCard(null)}
          result={selectedResult}
          allResults={currentResults}
          onSelectStudent={(id) => setSelectedStudentForCard(id)}
          schoolConfig={activeClassConfig}
          subjects={currentSubjects}
          examTitle={currentExamTitle}
        />
      )}

      {/* Batch Print All Student Report Cards */}
      <BatchReportCards
        isOpen={isBatchCardsOpen}
        onClose={() => setIsBatchCardsOpen(false)}
        results={currentResults}
        schoolConfig={activeClassConfig}
        subjects={currentSubjects}
        examTitle={currentExamTitle}
      />

      {/* Paste / Excel Import Modal */}
      <PasteImportModal
        isOpen={isPasteImportOpen}
        onClose={() => setIsPasteImportOpen(false)}
        subjects={currentSubjects}
        onImportData={handleImportPastedData}
      />

      {/* School & Subject Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        schoolConfig={activeClassConfig}
        onUpdateSchoolConfig={(cfg) => {
          setSchoolConfig(cfg);
          updateCurrentClass((prev) => ({
            ...prev,
            name: cfg.className,
            section: cfg.section,
          }));
        }}
        subjects={currentSubjects}
        onUpdateSubjects={(subs) => {
          updateCurrentClass((prev) => ({ ...prev, subjects: subs }));
        }}
        onResetDefaults={() => {
          setClasses(DEFAULT_CLASSES);
          setActiveClassId('class_4_a');
          setSchoolConfig(DEFAULT_SCHOOL_CONFIG);
        }}
      />

      {/* Data Validation Center Modal */}
      <DataValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        activeClass={currentClass}
        allClasses={classes}
        onUpdateClass={(updated) => updateCurrentClass(() => updated)}
        onUpdateAllClasses={(all) => setClasses(all)}
      />

      {/* Data Storage & Backup Manager Modal */}
      <DataStorageModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        classes={classes}
        schoolConfig={schoolConfig}
        onRestoreData={handleRestoreAllData}
        onResetAllData={handleResetAllData}
        defaultTab={storageDefaultTab}
      />

      {/* Floating Sync Toast Notification */}
      {syncToast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border transition-all animate-in slide-in-from-bottom duration-200 ${
            syncToast.type === 'success'
              ? 'bg-slate-900 text-white border-emerald-500 shadow-emerald-950/20'
              : 'bg-rose-950 text-white border-rose-500 shadow-rose-950/20'
          }`}
        >
          {syncToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{syncToast.message}</span>
        </div>
      )}
    </div>
  );
}
