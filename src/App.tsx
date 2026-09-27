import React, {useState, useEffect} from 'react';
import {
  Student,
  SchoolConfig,
  GradingRule,
  ClassData
} from './types';

import {
  computeStudentResults,
  computeComparativeResults
} from './utils/calculations';
import {TabulationSheet} from './components/TabulationSheet';
import {RapidEntryModal} from './components/RapidEntryModal';
import {StudentReportCard} from './components/StudentReportCard';
import {BatchReportCards} from './components/BatchReportCards';
import {TabulationRegisterModal} from './components/TabulationRegisterModal';
import {ComparativeReport} from './components/ComparativeReport';
import {AnalyticsView} from './components/AnalyticsView';
import {PasteImportModal} from './components/PasteImportModal';
import {SettingsModal} from './components/SettingsModal';
import {ClassModal} from './components/ClassModal';
import {PWAInstallButton} from './components/PWAInstallButton';
import {OfflineIndicator} from './components/OfflineIndicator';
import {DataStorageModal} from './components/DataStorageModal';
import {DataValidationModal} from './components/DataValidationModal';
import {validateClassData} from './utils/dataValidation';
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
  ShieldCheck,
  AlertTriangle,
  Menu,
  X,
  CheckCircle2,
  Database,
  Save,
  RefreshCw,
  Loader2,
  School,
  FolderPlus
} from 'lucide-react';

// Empty, non-fabricated placeholder used ONLY to satisfy the SchoolConfig shape
// until real data is pulled from MongoDB. No school name / titles / years are
// invented here — the Settings modal must be used to fill these in for real.
const EMPTY_SCHOOL_CONFIG: SchoolConfig = {
  schoolName: '',
  quarterlyTitle: 'Quarterly Examination',
  halfYearlyTitle: 'Half Yearly Examination',
  academicYear: '',
  className: '',
  section: '',
} as SchoolConfig;

// Positive, encouraging thoughts (Hindi) shown one at a time while the app
// connects to MongoDB Atlas — just to make the wait feel a little nicer.
const HINDI_POSITIVE_THOUGHTS: string[] = [
  'हर दिन एक नई शुरुआत है — आज भी कुछ अच्छा सिखाया जाएगा। ✨',
  'एक अच्छा शिक्षक दीपक की तरह होता है, खुद जलकर दूसरों को रोशन करता है। 🪔',
  'मेहनत कभी बेकार नहीं जाती, बस थोड़ा धैर्य रखिए। 🌱',
  'आपके प्रयासों से किसी बच्चे का भविष्य संवर रहा है। 🌟',
  'छोटी शुरुआत भी बड़ी सफलता की नींव होती है। 🚀',
  'आज का एक अच्छा प्रयास, कल की एक बड़ी जीत बन सकता है। 🏆',
  'ज्ञान बांटने से कभी कम नहीं होता, बल्कि और बढ़ता है। 📚',
  'हर बच्चा खास है, बस उसे सही मार्गदर्शन चाहिए। 🌈',
  'धैर्य और लगन से हर मुश्किल आसान हो जाती है। 💪',
  'आपकी मुस्कान किसी की सुबह बना सकती है — आज भी बनाइए। 😊',
];

export default function App () {
  // Pure Cloud State - NO data stored on local machines, no sample/demo data ever
  const [classes, setClasses] = useState<ClassData[]>( [] );
  const [activeClassId, setActiveClassId] = useState<string>( '' );
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>( EMPTY_SCHOOL_CONFIG );
  const [gradingRules, setGradingRules] = useState<GradingRule[]>( [] );

  // Initial cloud load state
  const [isInitialLoading, setIsInitialLoading] = useState( true );
  const [initialLoadError, setInitialLoadError] = useState<string | null>( null );
  const [loaderQuoteIndex, setLoaderQuoteIndex] = useState<number>(
    () => Math.floor( Math.random() * HINDI_POSITIVE_THOUGHTS.length )
  );

  // Modals & Navigation state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState( false );
  const [isClassModalOpen, setIsClassModalOpen] = useState( false );
  const [isRapidEntryOpen, setIsRapidEntryOpen] = useState( false );
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<string | null>( null );
  const [isBatchCardsOpen, setIsBatchCardsOpen] = useState( false );
  const [isRegisterPrintOpen, setIsRegisterPrintOpen] = useState( false );
  const [isPasteImportOpen, setIsPasteImportOpen] = useState( false );
  const [isSettingsOpen, setIsSettingsOpen] = useState( false );
  const [isStorageModalOpen, setIsStorageModalOpen] = useState( false );
  const [isValidationModalOpen, setIsValidationModalOpen] = useState( false );
  const [storageDefaultTab] = useState<'local' | 'mongodb'>( 'mongodb' );

  // MongoDB Cloud Sync State
  const [isMongoConnected, setIsMongoConnected] = useState( false );
  const [isSaving, setIsSaving] = useState( false );
  const [isRefreshing, setIsRefreshing] = useState( false );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState( false );
  const [lastSavedTime, setLastSavedTime] = useState<string | null>( null );
  const [syncToast, setSyncToast] = useState<{type: 'success' | 'error'; message: string;} | null>( null );

  const showToast = ( type: 'success' | 'error', message: string ) => {
    setSyncToast( {type, message} );
    setTimeout( () => {
      setSyncToast( null );
    }, 4500 );
  };

  // Active view tab: 'quarterly' | 'half_yearly' | 'comparative' | 'analytics'
  const [activeTab, setActiveTab] = useState<'quarterly' | 'half_yearly' | 'comparative' | 'analytics'>( 'quarterly' );

  // SAVE TO MONGODB ACTION
  const handleSaveToMongoDB = async () => {
    setIsSaving( true );
    try {
      const res = await fetch( '/api/mongodb/sync', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify( {classes, schoolConfig, gradingRules} ),
      } );
      const data = await res.json();
      if ( data.success ) {
        setIsMongoConnected( true );
        setHasUnsavedChanges( false );
        const timeStr = new Date().toLocaleTimeString( [], {hour: '2-digit', minute: '2-digit'} );
        setLastSavedTime( timeStr );
        showToast( 'success', `Saved ${classes.length} class${classes.length === 1 ? '' : 'es'} directly to MongoDB Atlas (${timeStr})` );
      } else {
        showToast( 'error', data.error || 'Failed to save to MongoDB' );
      }
    } catch ( err: any ) {
      showToast( 'error', err.message || 'Network error saving to MongoDB' );
    } finally {
      setIsSaving( false );
    }
  };

  // REFRESH FROM MONGODB ACTION (no seeding — MongoDB is always the source of truth)
  const handleRefreshFromMongoDB = async () => {
    setIsRefreshing( true );
    try {
      const res = await fetch( '/api/mongodb/pull' );
      const data = await res.json();
      if ( data.success ) {
        const pulledClasses: ClassData[] = Array.isArray( data.classes ) ? data.classes : [];
        setClasses( pulledClasses );
        if ( data.schoolConfig ) {
          setSchoolConfig( data.schoolConfig );
        }
        if ( Array.isArray( data.gradingRules ) ) {
          setGradingRules( data.gradingRules );
        }
        if ( pulledClasses.length > 0 && !pulledClasses.some( ( c ) => c.id === activeClassId ) ) {
          setActiveClassId( pulledClasses[0].id );
        }
        setIsMongoConnected( true );
        setHasUnsavedChanges( false );
        const timeStr = new Date().toLocaleTimeString( [], {hour: '2-digit', minute: '2-digit'} );
        setLastSavedTime( timeStr );
        showToast(
          'success',
          pulledClasses.length > 0
            ? `Refreshed ${pulledClasses.length} class${pulledClasses.length === 1 ? '' : 'es'} from MongoDB Atlas`
            : 'Connected to MongoDB Atlas — no classes saved there yet'
        );
      } else {
        showToast( 'error', data.error || 'Could not fetch data from Database' );
      }
    } catch ( err: any ) {
      showToast( 'error', err.message || 'Network error connecting to Database' );
    } finally {
      setIsRefreshing( false );
    }
  };

  // Initial load directly from MongoDB (No localStorage used, no seeded/sample data!)
  useEffect( () => {
    // Guarantee 100% cloud-only MongoDB operation — never read/write browser storage.
    try {
      localStorage.clear();
    } catch ( e ) {}

    let cancelled = false;

    const loadFromMongo = async () => {
      setIsInitialLoading( true );
      setInitialLoadError( null );
      try {
        // Check MongoDB connection status
        const statusRes = await fetch( '/api/mongodb/status' );
        const statusData = await statusRes.json();
        if ( !cancelled ) setIsMongoConnected( Boolean( statusData?.connected ) );

        // Pull whatever actually exists in MongoDB — nothing is invented locally.
        const pullRes = await fetch( '/api/mongodb/pull' );
        const pullData = await pullRes.json();

        if ( cancelled ) return;

        if ( pullData?.success ) {
          const pulledClasses: ClassData[] = Array.isArray( pullData.classes ) ? pullData.classes : [];
          setClasses( pulledClasses );
          if ( pullData.schoolConfig ) {
            setSchoolConfig( pullData.schoolConfig );
          }
          if ( Array.isArray( pullData.gradingRules ) ) {
            setGradingRules( pullData.gradingRules );
          }
          if ( pulledClasses.length > 0 ) {
            setActiveClassId( pulledClasses[0].id );
            const timeStr = new Date().toLocaleTimeString( [], {hour: '2-digit', minute: '2-digit'} );
            setLastSavedTime( timeStr );
          }
          // If MongoDB genuinely has no classes yet, we leave `classes` as []
          // and show the "no data yet" onboarding screen below — no seeding.
        } else {
          setInitialLoadError( pullData?.error || 'Could not load data from Database' );
        }
      } catch ( err: any ) {
        if ( !cancelled ) setInitialLoadError( err?.message || 'Network error connecting to Database' );
      } finally {
        if ( !cancelled ) setIsInitialLoading( false );
      }
    };

    loadFromMongo();
    return () => {
      cancelled = true;
    };
  }, [] );

  // Cycle through a random positive Hindi thought every few seconds while
  // the initial MongoDB connection is loading — never repeats the same one
  // twice in a row.
  useEffect( () => {
    if ( !isInitialLoading ) return;
    const interval = setInterval( () => {
      setLoaderQuoteIndex( ( prev ) => {
        if ( HINDI_POSITIVE_THOUGHTS.length <= 1 ) return prev;
        let next = prev;
        while ( next === prev ) {
          next = Math.floor( Math.random() * HINDI_POSITIVE_THOUGHTS.length );
        }
        return next;
      } );
    }, 3200 );
    return () => clearInterval( interval );
  }, [isInitialLoading] );

  // Keyboard shortcut: Ctrl+S or Cmd+S to save to MongoDB
  useEffect( () => {
    const handleKeyDown = ( e: KeyboardEvent ) => {
      if ( ( e.ctrlKey || e.metaKey ) && e.key.toLowerCase() === 's' ) {
        e.preventDefault();
        if ( classes.length > 0 ) {
          handleSaveToMongoDB();
        }
      }
    };
    window.addEventListener( 'keydown', handleKeyDown );
    return () => window.removeEventListener( 'keydown', handleKeyDown );
  }, [classes, schoolConfig, gradingRules] );

  // Current active class reference — may legitimately be undefined until the
  // first class exists in MongoDB.
  const currentClass = classes.find( ( c ) => c.id === activeClassId ) || classes[0];

  // ---- Everything below this point assumes a real, loaded currentClass ----
  // (guarded by the early-return render states further down)

  const currentStudents = currentClass ? currentClass.students : [];
  const currentSubjects = currentClass ? currentClass.subjects : [];
  const currentQuarterlyMarks = currentClass ? currentClass.quarterlyMarks || {} : {};
  const currentHalfYearlyMarks = currentClass ? currentClass.halfYearlyMarks || {} : {};

  // Calculations for current active class
  const quarterlyResults = computeStudentResults( currentStudents, currentSubjects, currentQuarterlyMarks, gradingRules );
  const halfYearlyResults = computeStudentResults( currentStudents, currentSubjects, currentHalfYearlyMarks, gradingRules );
  const comparativeResults = computeComparativeResults( currentStudents, currentSubjects, currentQuarterlyMarks, currentHalfYearlyMarks, gradingRules );

  const isQuarterly = activeTab === 'quarterly';
  const currentMarks = isQuarterly ? currentQuarterlyMarks : currentHalfYearlyMarks;
  const currentResults = isQuarterly ? quarterlyResults : halfYearlyResults;
  const currentExamTitle = isQuarterly ? schoolConfig.quarterlyTitle : schoolConfig.halfYearlyTitle;

  // Active class school config with dynamic class & section
  const activeClassConfig: SchoolConfig = {
    ...schoolConfig,
    className: currentClass ? currentClass.name : schoolConfig.className,
    section: currentClass ? currentClass.section : schoolConfig.section,
    academicYear: ( currentClass && currentClass.academicYear ) || schoolConfig.academicYear,
  };

  // Live real-time data validation diagnostics
  const validationReport = React.useMemo(
    () => ( currentClass ? validateClassData( currentClass ) : null ),
    [currentClass]
  );

  // Helper to update current class in classes array
  const updateCurrentClass = ( updater: ( prev: ClassData ) => ClassData ) => {
    if ( !currentClass ) return;
    setHasUnsavedChanges( true );
    setClasses( ( prevList ) =>
      prevList.map( ( cls ) => ( cls.id === currentClass.id ? updater( cls ) : cls ) )
    );
  };

  // Handlers for mark updates
  const handleUpdateMark = ( studentId: string, subjectId: string, mark: number | null ) => {
    updateCurrentClass( ( prev ) => {
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
    } );
  };

  // Student management handlers
  const handleAddStudent = ( name: string, rollNo: string ) => {
    if ( !currentClass ) return;
    const newId = 's_' + currentClass.id + '_' + Date.now();
    const newStudent: Student = {
      id: newId,
      sNo: currentStudents.length + 1,
      rollNo,
      name,
      attendanceDays: 0,
      totalWorkingDays: 0,
    };

    updateCurrentClass( ( prev ) => ( {
      ...prev,
      students: [...prev.students, newStudent],
    } ) );
  };

  const handleDeleteStudent = ( studentId: string ) => {
    if ( confirm( 'Are you sure you want to remove this student?' ) ) {
      updateCurrentClass( ( prev ) => {
        const remaining = prev.students.filter( ( s ) => s.id !== studentId );
        const renumbered = remaining.map( ( s, idx ) => ( {...s, sNo: idx + 1} ) );

        const newQ = {...prev.quarterlyMarks};
        delete newQ[studentId];
        const newH = {...prev.halfYearlyMarks};
        delete newH[studentId];

        return {
          ...prev,
          students: renumbered,
          quarterlyMarks: newQ,
          halfYearlyMarks: newH,
        };
      } );
    }
  };

  const handleUpdateStudent = ( studentId: string, name: string, rollNo: string ) => {
    updateCurrentClass( ( prev ) => ( {
      ...prev,
      students: prev.students.map( ( s ) => ( s.id === studentId ? {...s, name, rollNo} : s ) ),
    } ) );
  };

  // Row Shifting: Move student up
  const handleMoveRowUp = ( index: number ) => {
    if ( index <= 0 || index >= currentStudents.length ) return;
    updateCurrentClass( ( prev ) => {
      const newStudents = [...prev.students];
      const temp = newStudents[index];
      newStudents[index] = newStudents[index - 1];
      newStudents[index - 1] = temp;
      const renumbered = newStudents.map( ( s, idx ) => ( {...s, sNo: idx + 1} ) );
      return {...prev, students: renumbered};
    } );
  };

  // Row Shifting: Move student down
  const handleMoveRowDown = ( index: number ) => {
    if ( index < 0 || index >= currentStudents.length - 1 ) return;
    updateCurrentClass( ( prev ) => {
      const newStudents = [...prev.students];
      const temp = newStudents[index];
      newStudents[index] = newStudents[index + 1];
      newStudents[index + 1] = temp;
      const renumbered = newStudents.map( ( s, idx ) => ( {...s, sNo: idx + 1} ) );
      return {...prev, students: renumbered};
    } );
  };

  // Reorder all students (e.g. from sorting)
  const handleReorderStudents = ( newStudents: Student[] ) => {
    updateCurrentClass( ( prev ) => ( {
      ...prev,
      students: newStudents,
    } ) );
  };

  // Insert row at specific position
  const handleInsertRowAt = ( targetIndex: number, name: string, rollNo: string ) => {
    if ( !currentClass ) return;
    const newId = 's_' + currentClass.id + '_' + Date.now();
    const newStudent: Student = {
      id: newId,
      sNo: targetIndex + 1,
      rollNo,
      name,
      attendanceDays: 0,
      totalWorkingDays: 0,
    };

    updateCurrentClass( ( prev ) => {
      const list = [...prev.students];
      list.splice( targetIndex, 0, newStudent );
      const renumbered = list.map( ( s, idx ) => ( {...s, sNo: idx + 1} ) );
      return {...prev, students: renumbered};
    } );
  };

  // Clear marks for current class
  const handleClearMarks = () => {
    if ( !currentClass ) return;
    if ( confirm( `Clear all marks entered for ${currentClass.name} (${currentClass.section}) in ${currentExamTitle}? This cannot be undone.` ) ) {
      updateCurrentClass( ( prev ) =>
        isQuarterly ? {...prev, quarterlyMarks: {}} : {...prev, halfYearlyMarks: {}}
      );
    }
  };

  // Import handler for active class
  const handleImportPastedData = ( imported: {rollNo: string; name: string; marks: Record<string, number>;}[] ) => {
    const updatedStudents: Student[] = [];
    const newMarks: Record<string, Record<string, number | null>> = {};

    imported.forEach( ( item, index ) => {
      const id = 's_imp_' + index + '_' + Date.now();
      updatedStudents.push( {
        id,
        sNo: index + 1,
        rollNo: item.rollNo || String( index + 101 ),
        name: item.name,
        attendanceDays: 0,
        totalWorkingDays: 0,
      } );

      newMarks[id] = item.marks;
    } );

    updateCurrentClass( ( prev ) => ( {
      ...prev,
      students: updatedStudents,
      ...( isQuarterly ? {quarterlyMarks: newMarks} : {halfYearlyMarks: newMarks} ),
    } ) );
  };

  // Class Management Handlers
  const handleCreateClass = ( newClass: ClassData ) => {
    setHasUnsavedChanges( true );
    setClasses( ( prev ) => [...prev, newClass] );
    setActiveClassId( newClass.id );
  };

  const handleUpdateClass = ( classId: string, name: string, section: string ) => {
    setHasUnsavedChanges( true );
    setClasses( ( prev ) =>
      prev.map( ( c ) => ( c.id === classId ? {...c, name, section} : c ) )
    );
  };

  const handleDeleteClass = ( classId: string ) => {
    if ( classes.length <= 1 ) {
      alert( 'You cannot delete the only remaining class.' );
      return;
    }
    setHasUnsavedChanges( true );
    const remaining = classes.filter( ( c ) => c.id !== classId );
    setClasses( remaining );
    if ( activeClassId === classId ) {
      setActiveClassId( remaining[0].id );
    }
  };

  const handleDuplicateClass = ( classId: string ) => {
    const target = classes.find( ( c ) => c.id === classId );
    if ( !target ) return;

    setHasUnsavedChanges( true );
    const nextSectionChar = String.fromCharCode( target.section.charCodeAt( 0 ) + 1 );
    const newId = 'class_' + Date.now();

    const duplicatedClass: ClassData = {
      ...target,
      id: newId,
      section: nextSectionChar.length === 1 ? nextSectionChar : `${target.section}-Copy`,
      students: target.students.map( ( s, idx ) => ( {
        ...s,
        id: `s_${newId}_${idx + 1}`,
      } ) ),
      quarterlyMarks: {},
      halfYearlyMarks: {},
    };

    setClasses( ( prev ) => [...prev, duplicatedClass] );
    setActiveClassId( newId );
  };

  // Selected student result for individual report card
  const selectedResult = currentResults.find( ( r ) => r.student.id === selectedStudentForCard );

  // ---------------------------------------------------------------------
  // RENDER: full-screen loading state while the very first MongoDB pull
  // is in flight. Nothing is drawn from local/sample data before this
  // resolves.
  // ---------------------------------------------------------------------
  if ( isInitialLoading ) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950 text-white px-6">
        {/* Soft ambient glow blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-amber-500/20 blur-3xl animate-pulse" />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl animate-pulse"
          style={{animationDelay: '0.6s'}}
        />
        <div className="pointer-events-none absolute top-1/3 right-1/4 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" style={{animationDelay: '1.2s'}} />

        {/* Logo mark */}
        <div className="relative flex flex-col items-center gap-5">
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/30">
            <GraduationCap className="w-10 h-10 text-slate-950" />
            <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-slate-900 border-2 border-slate-950 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            </span>
          </div>

          <div className="text-center">
            <h1 className="text-lg font-black tracking-tight">GradeDesk</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center justify-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Connecting to Database…
            </p>
          </div>

          {/* Progress shimmer bar */}
          <div className="w-56 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 animate-[loaderbar_1.4s_ease-in-out_infinite]" />
          </div>

          {/* Rotating positive Hindi thought */}
          <div className="min-h-[3.5rem] max-w-sm flex items-center justify-center px-2">
            <p
              key={loaderQuoteIndex}
              className="text-center text-sm sm:text-base font-semibold text-amber-100/90 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-700"
            >
              {HINDI_POSITIVE_THOUGHTS[loaderQuoteIndex]}
            </p>
          </div>

          {/* Dot indicators for the thought carousel */}
          <div className="flex items-center gap-1.5">
            {HINDI_POSITIVE_THOUGHTS.map( ( _, idx ) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-500 ${idx === loaderQuoteIndex ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/20'
                  }`}
              />
            ) )}
          </div>
        </div>

        <style>{`
          @keyframes loaderbar {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(120%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
    );
  }

  // RENDER: connection/load error — never fall back to fabricated data.
  if ( initialLoadError ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100/70 text-slate-700 gap-3 px-4 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-500" />
        <p className="text-sm font-bold text-rose-700">Could not connect to MongoDB</p>
        <p className="text-xs text-slate-500 max-w-sm">{initialLoadError}</p>
        <button
          onClick={handleRefreshFromMongoDB}
          className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>
      </div>
    );
  }

  // RENDER: MongoDB is connected but genuinely has no classes yet — a real
  // empty state, not sample/demo data.
  if ( !currentClass ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100/70 text-slate-700 gap-4 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
          <GraduationCap className="w-7 h-7" />
        </div>
        <div>
          <p className="text-base font-black text-slate-900">No classes in MongoDB yet</p>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Nothing is pre-loaded — set up your school details, then add your first class to start
            entering marks. Everything you create is saved straight to your MongoDB Atlas cluster.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen( true )}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200"
          >
            <School className="w-3.5 h-3.5 text-amber-600" />
            School Details
          </button>
          <button
            onClick={() => setIsClassModalOpen( true )}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold shadow-xs"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Add First Class
          </button>
        </div>
        <button
          onClick={handleRefreshFromMongoDB}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
          {isRefreshing ? 'Checking MongoDB…' : 'Check MongoDB again'}
        </button>

        {/* Modals still need to be mounted here so onboarding actually works */}
        <ClassModal
          isOpen={isClassModalOpen}
          onClose={() => setIsClassModalOpen( false )}
          classes={classes}
          activeClassId={activeClassId}
          onSelectClass={( id ) => setActiveClassId( id )}
          onCreateClass={handleCreateClass}
          onUpdateClass={handleUpdateClass}
          onDeleteClass={handleDeleteClass}
          onDuplicateClass={handleDuplicateClass}
        />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen( false )}
          schoolConfig={schoolConfig}
          onUpdateSchoolConfig={( cfg ) => {
            setHasUnsavedChanges( true );
            setSchoolConfig( cfg );
          }}
          subjects={[]}
          onUpdateSubjects={() => {}}
        />

        {syncToast && (
          <div
            className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border ${syncToast.type === 'success'
                ? 'bg-slate-900 text-white border-emerald-500'
                : 'bg-rose-950 text-white border-rose-500'
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
                    {activeClassConfig.academicYear || '—'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs">
                  {schoolConfig.schoolName || 'Configure school name in Settings'}
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-xs ${hasUnsavedChanges
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
                title={isMongoConnected ? 'Connected to MongoDB Atlas cluster' : 'Not connected to MongoDB'}
              >
                <Database className={`w-3.5 h-3.5 ${isMongoConnected ? 'text-emerald-600' : 'text-rose-500'}`} />
                <span className="font-semibold">{isMongoConnected ? 'MongoDB' : 'Disconnected'}</span>
                {lastSavedTime && (
                  <span className="text-[10px] text-slate-400 font-mono">({lastSavedTime})</span>
                )}
              </div>

              {/* Data Validation Status Badge */}
              {validationReport && (
                <button
                  onClick={() => setIsValidationModalOpen( true )}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${validationReport.isValid
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
              )}

              <button
                onClick={() => setIsPasteImportOpen( true )}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
                title="Paste data directly from Excel or Google Sheets"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-amber-600" />
                <span>Import Excel</span>
              </button>

              <button
                onClick={() => setIsRegisterPrintOpen( true )}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200"
                title="Print Tabulation Register with Official Signatures"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                <span>Register</span>
              </button>

              <button
                onClick={() => setIsBatchCardsOpen( true )}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 transition-all shadow-xs"
                title="Print 4 Report Cards per A4 Page for All Students"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>4-on-A4 Cards</span>
              </button>

              <button
                onClick={() => setIsSettingsOpen( true )}
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
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-extrabold shadow-xs ${hasUnsavedChanges ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' : 'bg-emerald-500 text-slate-950'
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
                onClick={() => setIsBatchCardsOpen( true )}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 shadow-xs"
                title="Print 4 Cards per A4 Page"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Cards</span>
              </button>

              {/* Hamburger Button for Mobile */}
              <button
                onClick={() => setIsMobileNavOpen( !isMobileNavOpen )}
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

          {classes.map( ( cls ) => {
            const isActive = cls.id === activeClassId;
            return (
              <button
                key={cls.id}
                onClick={() => setActiveClassId( cls.id )}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${isActive
                    ? 'bg-amber-400 text-slate-950 shadow-xs scale-102 ring-1 ring-amber-500/50'
                    : 'bg-white text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/80'
                  }`}
              >
                <span>{cls.name}</span>
                <span className="text-[10px] opacity-75 font-semibold">({cls.section})</span>
              </button>
            );
          } )}

          <button
            onClick={() => setIsClassModalOpen( true )}
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
                onClick={() => setActiveTab( 'quarterly' )}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'quarterly'
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
                onClick={() => setActiveTab( 'half_yearly' )}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'half_yearly'
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
                onClick={() => setActiveTab( 'comparative' )}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'comparative'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
              >
                <TrendingUp className="w-4 h-4 text-amber-300" />
                Comparative Growth (T1 vs T2)
              </button>

              <button
                onClick={() => setActiveTab( 'analytics' )}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'analytics'
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
            onOpenReportCard={( id ) => setSelectedStudentForCard( id )}
            onOpenRapidEntry={() => setIsRapidEntryOpen( true )}
            onClearMarks={handleClearMarks}
            onMoveRowUp={handleMoveRowUp}
            onMoveRowDown={handleMoveRowDown}
            onReorderStudents={handleReorderStudents}
            onInsertRowAt={handleInsertRowAt}
            onOpenRegisterPrint={() => setIsRegisterPrintOpen( true )}
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
            onOpenReportCard={( id ) => setSelectedStudentForCard( id )}
            onOpenRapidEntry={() => setIsRapidEntryOpen( true )}
            onClearMarks={handleClearMarks}
            onMoveRowUp={handleMoveRowUp}
            onMoveRowDown={handleMoveRowDown}
            onReorderStudents={handleReorderStudents}
            onInsertRowAt={handleInsertRowAt}
            onOpenRegisterPrint={() => setIsRegisterPrintOpen( true )}
          />
        )}

        {/* Tab 3: Comparative Quarterly vs Half Yearly Performance Report */}
        {activeTab === 'comparative' && (
          <ComparativeReport
            comparativeResults={comparativeResults}
            schoolConfig={activeClassConfig}
            subjects={currentSubjects}
            onOpenReportCard={( id ) => setSelectedStudentForCard( id )}
          />
        )}

        {/* Tab 4: Performance Analytics & Class Toppers */}
        {activeTab === 'analytics' && (
          <AnalyticsView
            results={currentResults}
            subjects={currentSubjects}
            termTitle={currentExamTitle}
            onOpenReportCard={( id ) => setSelectedStudentForCard( id )}
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
            onClick={() => setIsMobileNavOpen( false )}
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
                  <p className="text-[10px] text-slate-400 truncate max-w-[170px]">{schoolConfig.schoolName || 'Unnamed School'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileNavOpen( false )}
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
                  {lastSavedTime ? `Synced: ${lastSavedTime}` : isMongoConnected ? 'Cloud Connected' : 'Disconnected'}
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
                      setIsMobileNavOpen( false );
                      setIsClassModalOpen( true );
                    }}
                    className="text-xs font-bold text-amber-600 flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Manage
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {classes.map( ( cls ) => {
                    const isActive = cls.id === activeClassId;
                    return (
                      <button
                        key={cls.id}
                        onClick={() => {
                          setActiveClassId( cls.id );
                          setIsMobileNavOpen( false );
                        }}
                        className={`p-2 rounded-xl text-xs font-bold text-left transition-all border ${isActive
                            ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                          }`}
                      >
                        <div className="truncate">{cls.name}</div>
                        <div className="text-[10px] opacity-75 font-semibold">Section {cls.section}</div>
                      </button>
                    );
                  } )}
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
                      setActiveTab( 'quarterly' );
                      setIsMobileNavOpen( false );
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold border transition-colors ${activeTab === 'quarterly'
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
                      setActiveTab( 'half_yearly' );
                      setIsMobileNavOpen( false );
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold border transition-colors ${activeTab === 'half_yearly'
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
                      setActiveTab( 'comparative' );
                      setIsMobileNavOpen( false );
                    }}
                    className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-colors ${activeTab === 'comparative'
                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                      }`}
                  >
                    <TrendingUp className="w-4 h-4" /> Comparative Growth
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab( 'analytics' );
                      setIsMobileNavOpen( false );
                    }}
                    className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-colors ${activeTab === 'analytics'
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
                      setIsMobileNavOpen( false );
                      setIsBatchCardsOpen( true );
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print 4 Cards / A4 Page</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileNavOpen( false );
                      setIsRegisterPrintOpen( true );
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                    <span>Print Tabulation Register</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileNavOpen( false );
                      setIsPasteImportOpen( true );
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                  >
                    <ClipboardPaste className="w-4 h-4 text-amber-600" />
                    <span>Import Excel / Paste</span>
                  </button>

                  {validationReport && (
                    <button
                      onClick={() => {
                        setIsMobileNavOpen( false );
                        setIsValidationModalOpen( true );
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold border ${validationReport.isValid
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Data Validation
                      </span>
                      <span className="text-[10px] font-extrabold">{validationReport.score}% Score</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsMobileNavOpen( false );
                      setIsSettingsOpen( true );
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
        onClose={() => setIsClassModalOpen( false )}
        classes={classes}
        activeClassId={activeClassId}
        onSelectClass={( id ) => setActiveClassId( id )}
        onCreateClass={handleCreateClass}
        onUpdateClass={handleUpdateClass}
        onDeleteClass={handleDeleteClass}
        onDuplicateClass={handleDuplicateClass}
      />

      {/* Official Tabulation Register Print Modal */}
      <TabulationRegisterModal
        isOpen={isRegisterPrintOpen}
        onClose={() => setIsRegisterPrintOpen( false )}
        examTitle={currentExamTitle}
        schoolConfig={activeClassConfig}
        subjects={currentSubjects}
        results={currentResults}
      />

      {/* Rapid Numpad Data Entry Modal */}
      <RapidEntryModal
        isOpen={isRapidEntryOpen}
        onClose={() => setIsRapidEntryOpen( false )}
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
          onClose={() => setSelectedStudentForCard( null )}
          result={selectedResult}
          allResults={currentResults}
          onSelectStudent={( id ) => setSelectedStudentForCard( id )}
          schoolConfig={activeClassConfig}
          subjects={currentSubjects}
          examTitle={currentExamTitle}
        />
      )}

      {/* Batch Print All Student Report Cards */}
      <BatchReportCards
        isOpen={isBatchCardsOpen}
        onClose={() => setIsBatchCardsOpen( false )}
        results={currentResults}
        schoolConfig={activeClassConfig}
        subjects={currentSubjects}
        examTitle={currentExamTitle}
      />

      {/* Paste / Excel Import Modal */}
      <PasteImportModal
        isOpen={isPasteImportOpen}
        onClose={() => setIsPasteImportOpen( false )}
        subjects={currentSubjects}
        onImportData={handleImportPastedData}
      />

      {/* School & Subject Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen( false )}
        schoolConfig={activeClassConfig}
        onUpdateSchoolConfig={( cfg ) => {
          setHasUnsavedChanges( true );
          setSchoolConfig( cfg );
          updateCurrentClass( ( prev ) => ( {
            ...prev,
            name: cfg.className,
            section: cfg.section,
          } ) );
        }}
        subjects={currentSubjects}
        onUpdateSubjects={( subs ) => {
          updateCurrentClass( ( prev ) => ( {...prev, subjects: subs} ) );
        }}
      />

      {/* Data Validation Center Modal */}
      <DataValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen( false )}
        activeClass={currentClass}
        allClasses={classes}
        onUpdateClass={( updated ) => updateCurrentClass( () => updated )}
        onUpdateAllClasses={( all ) => {
          setHasUnsavedChanges( true );
          setClasses( all );
        }}
      />

      {/* Data Storage & Backup Manager Modal */}
      <DataStorageModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen( false )}
        classes={classes}
        schoolConfig={schoolConfig}
        defaultTab={storageDefaultTab}
      />

      {/* Floating Sync Toast Notification */}
      {syncToast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border transition-all animate-in slide-in-from-bottom duration-200 ${syncToast.type === 'success'
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