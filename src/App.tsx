import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {LucideIcon} from 'lucide-react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardPaste,
  Database,
  FileSpreadsheet,
  FolderPlus,
  GraduationCap,
  HardDrive,
  Layers,
  Loader2,
  Menu,
  Plus,
  Printer,
  RefreshCw,
  Save,
  School,
  Settings,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';

import {ClassData, GradingRule, SchoolConfig, Student} from './types';
import {computeComparativeResults, computeStudentResults} from './utils/calculations';
import {validateClassData} from './utils/dataValidation';
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

/* ------------------------------------------------------------------ */
/* Constants & types                                                   */
/* ------------------------------------------------------------------ */

const POLL_INTERVAL_MS = 30_000;
const TOAST_DURATION_MS = 4_500;
const DEFAULT_ATTENDANCE_DAYS = 90;
const DEFAULT_WORKING_DAYS = 92;

const EMPTY_SCHOOL_CONFIG = {
  schoolName: '',
  quarterlyTitle: 'Quarterly Examination',
  halfYearlyTitle: 'Half Yearly Examination',
  academicYear: '',
  className: '',
  section: '',
} as SchoolConfig;

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

type Term = 'quarterly' | 'halfYearly';
type TabId = 'quarterly' | 'half_yearly' | 'comparative' | 'analytics';
type MarksMap = Record<string, Record<string, number | null>>;
type ToastState = {type: 'success' | 'error'; message: string;} | null;

interface PendingMark {
  classId: string;
  term: Term;
  studentId: string;
  subjectId: string;
  mark: number | null;
}

const TABS: {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  activeClass: string;
}[] = [
    {
      id: 'quarterly',
      label: 'Quarterly Examination (Term 1)',
      shortLabel: 'Term 1: Quarterly',
      icon: FileSpreadsheet,
      activeClass: 'bg-amber-500 text-slate-950 shadow-sm',
    },
    {
      id: 'half_yearly',
      label: 'Half Yearly Examination (Term 2)',
      shortLabel: 'Term 2: Half-Yearly',
      icon: Layers,
      activeClass: 'bg-amber-500 text-slate-950 shadow-sm',
    },
    {
      id: 'comparative',
      label: 'Comparative Growth (T1 vs T2)',
      shortLabel: 'Comparative Growth',
      icon: TrendingUp,
      activeClass: 'bg-indigo-600 text-white shadow-sm',
    },
    {
      id: 'analytics',
      label: 'Performance Insights & Toppers',
      shortLabel: 'Performance Analytics',
      icon: BarChart3,
      activeClass: 'bg-slate-900 text-white shadow-sm',
    },
  ];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function api<T = any> (
  url: string,
  init?: RequestInit & {json?: unknown;}
): Promise<T> {
  const {json, ...rest} = init ?? {};

  const res = await fetch( url, {
    ...rest,
    headers:
      json !== undefined
        ? {'Content-Type': 'application/json', ...rest.headers}
        : rest.headers,
    body: json !== undefined ? JSON.stringify( json ) : rest.body,
  } );

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Empty response body.
  }

  if ( !res.ok || data?.success === false ) {
    throw new Error( data?.error || data?.message || `Request failed (${res.status})` );
  }

  return data as T;
}

const nowLabel = () =>
  new Date().toLocaleTimeString( [], {hour: '2-digit', minute: '2-digit'} );

const renumber = ( list: Student[] ) =>
  list.map( ( student, index ) => ( {...student, sNo: index + 1} ) );

const newStudentId = ( classId: string ) =>
  `s_${classId}_${Date.now()}_${Math.random().toString( 36 ).slice( 2, 6 )}`;

function makeStudent (
  classId: string,
  sNo: number,
  rollNo: string,
  name: string
): Student {
  return {
    id: newStudentId( classId ),
    sNo,
    rollNo,
    name,
    attendanceDays: DEFAULT_ATTENDANCE_DAYS,
    totalWorkingDays: DEFAULT_WORKING_DAYS,
  };
}

/* ------------------------------------------------------------------ */
/* Small presentational components                                     */
/* ------------------------------------------------------------------ */

function Toast ( {toast}: {toast: ToastState;} ) {
  if ( !toast ) return null;

  const ok = toast.type === 'success';

  return (
    <div
      role="status"
      className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border animate-in slide-in-from-bottom duration-200 ${ok
          ? 'bg-slate-900 text-white border-emerald-500'
          : 'bg-rose-950 text-white border-rose-500'
        }`}
    >
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
      )}
      <span>{toast.message}</span>
    </div>
  );
}

function LoadingScreen ( {quoteIndex}: {quoteIndex: number;} ) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950 text-white px-6">
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-amber-500/20 blur-3xl animate-pulse" />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl animate-pulse"
        style={{animationDelay: '0.6s'}}
      />

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

        <div className="w-56 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 animate-[loaderbar_1.4s_ease-in-out_infinite]" />
        </div>

        <div className="min-h-[3.5rem] max-w-sm flex items-center justify-center px-2">
          <p
            key={quoteIndex}
            lang="hi"
            className="text-center text-sm sm:text-base font-semibold text-amber-100/90 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-700"
          >
            {HINDI_POSITIVE_THOUGHTS[quoteIndex]}
          </p>
        </div>

        <div className="flex items-center gap-1.5" aria-hidden>
          {HINDI_POSITIVE_THOUGHTS.map( ( _, index ) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all duration-500 ${index === quoteIndex ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/20'
                }`}
            />
          ) )}
        </div>
      </div>

      <style>{`@keyframes loaderbar {0%{transform:translateX(-100%)}50%{transform:translateX(120%)}100%{transform:translateX(-100%)}}`}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App () {
  const [classes, setClasses] = useState<ClassData[]>( [] );
  const [activeClassId, setActiveClassId] = useState( '' );
  const [schoolConfig, setSchoolConfig] =
    useState<SchoolConfig>( EMPTY_SCHOOL_CONFIG );
  const [gradingRules, setGradingRules] = useState<GradingRule[]>( [] );

  const [isInitialLoading, setIsInitialLoading] = useState( true );
  const [initialLoadError, setInitialLoadError] = useState<string | null>( null );
  const [loaderQuoteIndex, setLoaderQuoteIndex] = useState( () =>
    Math.floor( Math.random() * HINDI_POSITIVE_THOUGHTS.length )
  );

  const [activeTab, setActiveTab] = useState<TabId>( 'quarterly' );
  const [isMobileNavOpen, setIsMobileNavOpen] = useState( false );
  const [isClassModalOpen, setIsClassModalOpen] = useState( false );
  const [isRapidEntryOpen, setIsRapidEntryOpen] = useState( false );
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<string | null>(
    null
  );
  const [isBatchCardsOpen, setIsBatchCardsOpen] = useState( false );
  const [isRegisterPrintOpen, setIsRegisterPrintOpen] = useState( false );
  const [isPasteImportOpen, setIsPasteImportOpen] = useState( false );
  const [isSettingsOpen, setIsSettingsOpen] = useState( false );
  const [isStorageModalOpen, setIsStorageModalOpen] = useState( false );
  const [isValidationModalOpen, setIsValidationModalOpen] = useState( false );

  const [isMongoConnected, setIsMongoConnected] = useState( false );
  const [isSaving, setIsSaving] = useState( false );
  const [isRefreshing, setIsRefreshing] = useState( false );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState( false );
  const [lastSavedTime, setLastSavedTime] = useState<string | null>( null );
  const [toast, setToast] = useState<ToastState>( null );

  const pendingMarksRef = useRef<Map<string, PendingMark>>( new Map() );
  const dirtyClassIdsRef = useRef<Set<string>>( new Set() );
  const classesRef = useRef( classes );
  const schoolConfigRef = useRef( schoolConfig );
  const busyRef = useRef( false );
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  classesRef.current = classes;
  schoolConfigRef.current = schoolConfig;

  const showToast = useCallback( ( type: 'success' | 'error', message: string ) => {
    clearTimeout( toastTimerRef.current );
    setToast( {type, message} );
    toastTimerRef.current = setTimeout( () => setToast( null ), TOAST_DURATION_MS );
  }, [] );

  useEffect( () => () => clearTimeout( toastTimerRef.current ), [] );

  const markSaved = useCallback( () => {
    setIsMongoConnected( true );
    setHasUnsavedChanges( false );
    setLastSavedTime( nowLabel() );
  }, [] );

  /* ------------------------------------------------------------------ */
  /* Save / Refresh                                                      */
  /* ------------------------------------------------------------------ */

  const handleSaveToMongoDB = useCallback( async () => {
    if ( busyRef.current ) return;

    busyRef.current = true;
    setIsSaving( true );

    try {
      const dirtySnapshot = new Set( dirtyClassIdsRef.current );
      const markSnapshot = new Map( pendingMarksRef.current );

      for ( const id of dirtySnapshot ) {
        const cls = classesRef.current.find( ( item ) => item.id === id );

        if ( cls ) {
          await api( `/api/mongodb/classes/${encodeURIComponent( id )}`, {
            method: 'PUT',
            json: cls,
          } );
        }

        dirtyClassIdsRef.current.delete( id );
      }

      const groups = new Map<
        string,
        {
          classId: string;
          term: Term;
          marks: Omit<PendingMark, 'classId' | 'term'>[];
        }
      >();

      for ( const mark of markSnapshot.values() ) {
        const key = `${mark.classId}_${mark.term}`;
        if ( !groups.has( key ) ) {
          groups.set( key, {classId: mark.classId, term: mark.term, marks: []} );
        }
        groups.get( key )!.marks.push( {
          studentId: mark.studentId,
          subjectId: mark.subjectId,
          mark: mark.mark,
        } );
      }

      for ( const group of groups.values() ) {
        await api(
          `/api/mongodb/classes/${encodeURIComponent( group.classId )}/marks`,
          {
            method: 'PATCH',
            json: {term: group.term, marks: group.marks},
          }
        );
      }

      await api( '/api/mongodb/school-config', {
        method: 'PATCH',
        json: schoolConfigRef.current,
      } );

      for ( const [key, savedMark] of markSnapshot ) {
        const currentMark = pendingMarksRef.current.get( key );
        if ( currentMark && currentMark.mark === savedMark.mark ) {
          pendingMarksRef.current.delete( key );
        }
      }

      const stillDirty =
        dirtyClassIdsRef.current.size > 0 || pendingMarksRef.current.size > 0;

      setIsMongoConnected( true );
      setHasUnsavedChanges( stillDirty );
      setLastSavedTime( nowLabel() );

      showToast(
        'success',
        stillDirty
          ? 'Saved. Newer edits still need saving.'
          : `Saved to MongoDB Atlas (${nowLabel()})`
      );
    } catch ( err: any ) {
      showToast( 'error', err?.message || 'Network error while saving to MongoDB' );
    } finally {
      busyRef.current = false;
      setIsSaving( false );
    }
  }, [showToast] );

  const handleRefreshFromMongoDB = useCallback( async () => {
    if ( busyRef.current ) return;

    if (
      ( dirtyClassIdsRef.current.size > 0 || pendingMarksRef.current.size > 0 ) &&
      !confirm( 'You have unsaved changes. Refreshing will discard them. Continue?' )
    ) {
      return;
    }

    busyRef.current = true;
    setIsRefreshing( true );

    try {
      const data = await api( '/api/mongodb/pull' );
      const pulled: ClassData[] = Array.isArray( data.classes ) ? data.classes : [];

      setClasses( pulled );
      if ( data.schoolConfig ) setSchoolConfig( data.schoolConfig );
      if ( Array.isArray( data.gradingRules ) ) setGradingRules( data.gradingRules );

      setActiveClassId( ( prev ) =>
        pulled.some( ( item ) => item.id === prev ) ? prev : pulled[0]?.id ?? ''
      );

      pendingMarksRef.current.clear();
      dirtyClassIdsRef.current.clear();
      setInitialLoadError( null );
      markSaved();

      showToast(
        'success',
        pulled.length > 0
          ? `Refreshed ${pulled.length} class${pulled.length === 1 ? '' : 'es'} from MongoDB Atlas`
          : 'Connected to MongoDB Atlas — no classes saved there yet'
      );
    } catch ( err: any ) {
      showToast( 'error', err?.message || 'Network error connecting to Database' );
    } finally {
      busyRef.current = false;
      setIsRefreshing( false );
    }
  }, [markSaved, showToast] );

  /* ------------------------------------------------------------------ */
  /* Effects                                                             */
  /* ------------------------------------------------------------------ */

  useEffect( () => {
    let cancelled = false;

    ( async () => {
      try {
        const [status, pull] = await Promise.all( [
          api( '/api/mongodb/status' ).catch( () => null ),
          api( '/api/mongodb/pull' ),
        ] );

        if ( cancelled ) return;

        setIsMongoConnected( Boolean( status?.connected ) );

        const pulled: ClassData[] = Array.isArray( pull.classes ) ? pull.classes : [];
        setClasses( pulled );

        if ( pull.schoolConfig ) setSchoolConfig( pull.schoolConfig );
        if ( Array.isArray( pull.gradingRules ) ) setGradingRules( pull.gradingRules );

        if ( pulled.length > 0 ) {
          setActiveClassId( pulled[0].id );
          setLastSavedTime( nowLabel() );
        }
      } catch ( err: any ) {
        if ( !cancelled ) {
          setInitialLoadError(
            err?.message || 'Network error connecting to Database'
          );
        }
      } finally {
        if ( !cancelled ) setIsInitialLoading( false );
      }
    } )();

    return () => {
      cancelled = true;
    };
  }, [] );

  useEffect( () => {
    if ( !isInitialLoading ) return;

    const id = setInterval( () => {
      setLoaderQuoteIndex( ( prev ) => {
        if ( HINDI_POSITIVE_THOUGHTS.length <= 1 ) return prev;

        let next = prev;
        while ( next === prev ) {
          next = Math.floor( Math.random() * HINDI_POSITIVE_THOUGHTS.length );
        }
        return next;
      } );
    }, 3200 );

    return () => clearInterval( id );
  }, [isInitialLoading] );

  useEffect( () => {
    const id = setInterval( async () => {
      if ( busyRef.current || document.hidden ) return;

      try {
        const data = await api( '/api/mongodb/pull' );
        if ( !Array.isArray( data.classes ) || data.classes.length === 0 ) return;

        const remoteClasses: ClassData[] = data.classes;

        setClasses( ( prev ) => {
          const merged = remoteClasses.map( ( remote ) => {
            const local = prev.find( ( item ) => item.id === remote.id );
            if ( !local ) return remote;

            const structuralDirty = dirtyClassIdsRef.current.has( remote.id );

            const overlay = (
              base: MarksMap | undefined,
              term: Term
            ): MarksMap => {
              const output: MarksMap = {};

              for ( const [studentId, row] of Object.entries( base || {} ) ) {
                output[studentId] = {...row};
              }

              for ( const pending of pendingMarksRef.current.values() ) {
                if ( pending.classId === remote.id && pending.term === term ) {
                  ( output[pending.studentId] ||= {} )[pending.subjectId] =
                    pending.mark;
                }
              }

              return output;
            };

            return structuralDirty
              ? {
                ...local,
                quarterlyMarks: overlay( remote.quarterlyMarks, 'quarterly' ),
                halfYearlyMarks: overlay( remote.halfYearlyMarks, 'halfYearly' ),
              }
              : {
                ...remote,
                quarterlyMarks: overlay( remote.quarterlyMarks, 'quarterly' ),
                halfYearlyMarks: overlay( remote.halfYearlyMarks, 'halfYearly' ),
              };
          } );

          const localOnly = prev.filter(
            ( local ) =>
              dirtyClassIdsRef.current.has( local.id ) &&
              !remoteClasses.some( ( remote ) => remote.id === local.id )
          );

          return [...merged, ...localOnly];
        } );

        if ( data.schoolConfig ) {
          setSchoolConfig( ( prev ) => ( {...prev, ...data.schoolConfig} ) );
        }

        setIsMongoConnected( true );
      } catch {
        // Retry on the next polling interval.
      }
    }, POLL_INTERVAL_MS );

    return () => clearInterval( id );
  }, [] );

  useEffect( () => {
    const onKey = ( event: KeyboardEvent ) => {
      if ( ( event.ctrlKey || event.metaKey ) && event.key.toLowerCase() === 's' ) {
        event.preventDefault();
        if ( classesRef.current.length > 0 ) void handleSaveToMongoDB();
      }
    };

    window.addEventListener( 'keydown', onKey );
    return () => window.removeEventListener( 'keydown', onKey );
  }, [handleSaveToMongoDB] );

  useEffect( () => {
    if ( !hasUnsavedChanges ) return;

    const onBeforeUnload = ( event: BeforeUnloadEvent ) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener( 'beforeunload', onBeforeUnload );
    return () => window.removeEventListener( 'beforeunload', onBeforeUnload );
  }, [hasUnsavedChanges] );

  /* ------------------------------------------------------------------ */
  /* Derived data                                                        */
  /* ------------------------------------------------------------------ */

  const currentClass =
    classes.find( ( item ) => item.id === activeClassId ) || classes[0];

  const currentStudents = useMemo(
    () => currentClass?.students ?? [],
    [currentClass]
  );
  const currentSubjects = useMemo(
    () => currentClass?.subjects ?? [],
    [currentClass]
  );
  const currentQuarterlyMarks = useMemo(
    () => currentClass?.quarterlyMarks || {},
    [currentClass]
  );
  const currentHalfYearlyMarks = useMemo(
    () => currentClass?.halfYearlyMarks || {},
    [currentClass]
  );

  const quarterlyResults = useMemo(
    () =>
      computeStudentResults(
        currentStudents,
        currentSubjects,
        currentQuarterlyMarks,
        gradingRules
      ),
    [currentStudents, currentSubjects, currentQuarterlyMarks, gradingRules]
  );

  const halfYearlyResults = useMemo(
    () =>
      computeStudentResults(
        currentStudents,
        currentSubjects,
        currentHalfYearlyMarks,
        gradingRules
      ),
    [currentStudents, currentSubjects, currentHalfYearlyMarks, gradingRules]
  );

  const comparativeResults = useMemo(
    () =>
      computeComparativeResults(
        currentStudents,
        currentSubjects,
        currentQuarterlyMarks,
        currentHalfYearlyMarks,
        gradingRules
      ),
    [
      currentStudents,
      currentSubjects,
      currentQuarterlyMarks,
      currentHalfYearlyMarks,
      gradingRules,
    ]
  );

  const isQuarterly = activeTab !== 'half_yearly';
  const term: Term = isQuarterly ? 'quarterly' : 'halfYearly';
  const currentMarks = isQuarterly
    ? currentQuarterlyMarks
    : currentHalfYearlyMarks;
  const currentResults = isQuarterly ? quarterlyResults : halfYearlyResults;
  const currentExamTitle = isQuarterly
    ? schoolConfig.quarterlyTitle
    : schoolConfig.halfYearlyTitle;

  const activeClassConfig: SchoolConfig = useMemo(
    () => ( {
      ...schoolConfig,
      className: currentClass?.name ?? schoolConfig.className,
      section: currentClass?.section ?? schoolConfig.section,
      academicYear: currentClass?.academicYear || schoolConfig.academicYear,
    } ),
    [schoolConfig, currentClass]
  );

  const validationReport = useMemo(
    () => ( currentClass ? validateClassData( currentClass ) : null ),
    [currentClass]
  );

  const selectedResult = currentResults.find(
    ( result ) => result.student.id === selectedStudentForCard
  );

  /* ------------------------------------------------------------------ */
  /* Mutations                                                           */
  /* ------------------------------------------------------------------ */

  const updateCurrentClass = (
    updater: ( prev: ClassData ) => ClassData,
    structural = true
  ) => {
    if ( !currentClass ) return;

    const id = currentClass.id;
    if ( structural ) dirtyClassIdsRef.current.add( id );

    setHasUnsavedChanges( true );
    setClasses( ( list ) =>
      list.map( ( item ) => ( item.id === id ? updater( item ) : item ) )
    );
  };

  const queueMark = ( pending: PendingMark ) => {
    pendingMarksRef.current.set(
      `${pending.classId}_${pending.term}_${pending.studentId}_${pending.subjectId}`,
      pending
    );
  };

  const purgePending = ( predicate: ( pending: PendingMark ) => boolean ) => {
    for ( const [key, pending] of pendingMarksRef.current ) {
      if ( predicate( pending ) ) pendingMarksRef.current.delete( key );
    }
  };

  const handleUpdateMark = (
    studentId: string,
    subjectId: string,
    mark: number | null
  ) => {
    if ( !currentClass ) return;

    const field = isQuarterly ? 'quarterlyMarks' : 'halfYearlyMarks';
    const item: PendingMark = {
      classId: currentClass.id,
      term,
      studentId,
      subjectId,
      mark,
    };

    updateCurrentClass(
      ( prev ) => {
        const termMarks = prev[field] || {};
        return {
          ...prev,
          [field]: {
            ...termMarks,
            [studentId]: {
              ...( termMarks[studentId] || {} ),
              [subjectId]: mark,
            },
          },
        };
      },
      false
    );

    queueMark( item );

    const key = `${item.classId}_${term}_${studentId}_${subjectId}`;

    api(
      `/api/mongodb/classes/${encodeURIComponent( item.classId )}/students/${encodeURIComponent(
        studentId
      )}/subjects/${encodeURIComponent( subjectId )}/mark`,
      {
        method: 'PATCH',
        json: {term, mark},
      }
    )
      .then( () => {
        const current = pendingMarksRef.current.get( key );
        if ( current?.mark === mark ) {
          pendingMarksRef.current.delete( key );
        }
      } )
      .catch( () => {
        // Keep the edit queued so the Save button can retry it.
      } );
  };

  const handleAddStudent = ( name: string, rollNo: string ) => {
    if ( !currentClass ) return;

    const student = makeStudent(
      currentClass.id,
      currentStudents.length + 1,
      rollNo,
      name
    );

    updateCurrentClass( ( prev ) => ( {
      ...prev,
      students: [...prev.students, student],
    } ) );
  };

  const handleInsertRowAt = (
    targetIndex: number,
    name: string,
    rollNo: string
  ) => {
    if ( !currentClass ) return;

    const student = makeStudent( currentClass.id, targetIndex + 1, rollNo, name );

    updateCurrentClass( ( prev ) => {
      const list = [...prev.students];
      list.splice( targetIndex, 0, student );
      return {...prev, students: renumber( list )};
    } );
  };

  const handleDeleteStudent = ( studentId: string ) => {
    if ( !confirm( 'Are you sure you want to remove this student?' ) ) return;

    purgePending( ( pending ) => pending.studentId === studentId );

    updateCurrentClass( ( prev ) => {
      const {[studentId]: _quarterly, ...quarterlyMarks} =
        prev.quarterlyMarks || {};
      const {[studentId]: _halfYearly, ...halfYearlyMarks} =
        prev.halfYearlyMarks || {};

      return {
        ...prev,
        students: renumber(
          prev.students.filter( ( student ) => student.id !== studentId )
        ),
        quarterlyMarks,
        halfYearlyMarks,
      };
    } );
  };

  const handleUpdateStudent = (
    studentId: string,
    name: string,
    rollNo: string
  ) =>
    updateCurrentClass( ( prev ) => ( {
      ...prev,
      students: prev.students.map( ( student ) =>
        student.id === studentId ? {...student, name, rollNo} : student
      ),
    } ) );

  const swapRows = ( a: number, b: number ) =>
    updateCurrentClass( ( prev ) => {
      const list = [...prev.students];
      [list[a], list[b]] = [list[b], list[a]];
      return {...prev, students: renumber( list )};
    } );

  const handleMoveRowUp = ( index: number ) => {
    if ( index > 0 && index < currentStudents.length ) {
      swapRows( index, index - 1 );
    }
  };

  const handleMoveRowDown = ( index: number ) => {
    if ( index >= 0 && index < currentStudents.length - 1 ) {
      swapRows( index, index + 1 );
    }
  };

  const handleReorderStudents = ( students: Student[] ) =>
    updateCurrentClass( ( prev ) => ( {...prev, students} ) );

  const handleFillSampleMarks = () => {
    if ( !currentClass ) return;

    if (
      !confirm(
        'This fills DEMO marks and will overwrite existing marks for this exam. Continue?'
      )
    ) {
      return;
    }

    const field = isQuarterly ? 'quarterlyMarks' : 'halfYearlyMarks';
    const generated: MarksMap = {};

    currentClass.students.forEach( ( student, index ) => {
      generated[student.id] = {};

      currentClass.subjects.forEach( ( subject ) => {
        const base = isQuarterly
          ? 0.58 + ( ( index * 9 ) % 36 ) / 100
          : 0.65 + ( ( index * 9 ) % 32 ) / 100;

        const ratio = Math.max(
          0.35,
          Math.min( 0.98, base + ( index % 3 === 0 ? 0.08 : -0.04 ) )
        );

        const mark = Math.round( subject.maxMarks * ratio );
        generated[student.id][subject.id] = mark;

        queueMark( {
          classId: currentClass.id,
          term,
          studentId: student.id,
          subjectId: subject.id,
          mark,
        } );
      } );
    } );

    updateCurrentClass( ( prev ) => ( {...prev, [field]: generated} ), false );
  };

  const handleClearMarks = async () => {
    if ( !currentClass ) return;

    if (
      !confirm(
        `Clear all marks entered for ${currentClass.name} (${currentClass.section}) in ${currentExamTitle}? This cannot be undone.`
      )
    ) {
      return;
    }

    const classId = currentClass.id;
    purgePending(
      ( pending ) => pending.classId === classId && pending.term === term
    );

    updateCurrentClass(
      ( prev ) =>
        isQuarterly
          ? {...prev, quarterlyMarks: {}}
          : {...prev, halfYearlyMarks: {}},
      false
    );

    try {
      await api( '/api/mongodb/clear-marks', {
        method: 'PATCH',
        json: {classId, term},
      } );

      showToast( 'success', `Cleared ${currentExamTitle} marks for ${currentClass.name}` );
    } catch ( err: any ) {
      showToast(
        'error',
        err?.message || 'Marks cleared locally, but the server could not be updated'
      );
    }
  };

  const handleImportPastedData = (
    imported: {rollNo: string; name: string; marks: Record<string, number>;}[]
  ) => {
    if ( !currentClass ) return;

    const stamp = Date.now();
    const students: Student[] = [];
    const marks: MarksMap = {};

    imported.forEach( ( item, index ) => {
      const id = `s_imp_${stamp}_${index}`;

      students.push( {
        id,
        sNo: index + 1,
        rollNo: item.rollNo || String( index + 101 ),
        name: item.name,
        attendanceDays: DEFAULT_ATTENDANCE_DAYS,
        totalWorkingDays: DEFAULT_WORKING_DAYS,
      } );

      marks[id] = item.marks;
    } );

    purgePending(
      ( pending ) => pending.classId === currentClass.id && pending.term === term
    );

    updateCurrentClass( ( prev ) => ( {
      ...prev,
      students,
      ...( isQuarterly
        ? {quarterlyMarks: marks}
        : {halfYearlyMarks: marks} ),
    } ) );
  };

  /* ---------- class management ---------- */

  const handleCreateClass = ( newClass: ClassData ) => {
    dirtyClassIdsRef.current.add( newClass.id );
    setHasUnsavedChanges( true );
    setClasses( ( prev ) => [...prev, newClass] );
    setActiveClassId( newClass.id );
  };

  const handleUpdateClass = (
    classId: string,
    name: string,
    section: string
  ) => {
    dirtyClassIdsRef.current.add( classId );
    setHasUnsavedChanges( true );
    setClasses( ( prev ) =>
      prev.map( ( item ) =>
        item.id === classId ? {...item, name, section} : item
      )
    );
  };

  const handleDeleteClass = async ( classId: string ) => {
    if ( classes.length <= 1 ) {
      alert( 'You cannot delete the only remaining class.' );
      return;
    }

    const remaining = classes.filter( ( item ) => item.id !== classId );
    dirtyClassIdsRef.current.delete( classId );
    purgePending( ( pending ) => pending.classId === classId );
    setClasses( remaining );

    if ( activeClassId === classId ) {
      setActiveClassId( remaining[0].id );
    }

    try {
      await api( `/api/mongodb/class/${encodeURIComponent( classId )}`, {
        method: 'DELETE',
      } );
      showToast( 'success', 'Class deleted' );
    } catch ( err: any ) {
      showToast(
        'error',
        err?.message || 'Class removed locally, but the server could not delete it'
      );
    }
  };

  const handleDuplicateClass = ( classId: string ) => {
    const target = classes.find( ( item ) => item.id === classId );
    if ( !target ) return;

    const newId = `class_${Date.now()}`;
    const nextChar = String.fromCharCode( target.section.charCodeAt( 0 ) + 1 );

    const copy: ClassData = {
      ...target,
      id: newId,
      section: /^[A-Za-z]$/.test( target.section )
        ? nextChar
        : `${target.section}-Copy`,
      students: target.students.map( ( student, index ) => ( {
        ...student,
        id: `s_${newId}_${index + 1}`,
      } ) ),
      quarterlyMarks: {},
      halfYearlyMarks: {},
    };

    handleCreateClass( copy );
  };

  const handleUpdateSchoolConfig = (
    config: SchoolConfig,
    alsoRenameClass: boolean
  ) => {
    setHasUnsavedChanges( true );
    setSchoolConfig( config );

    if ( alsoRenameClass ) {
      updateCurrentClass( ( prev ) => ( {
        ...prev,
        name: config.className,
        section: config.section,
      } ) );
    }
  };

  /* ------------------------------------------------------------------ */
  /* Shared modals                                                       */
  /* ------------------------------------------------------------------ */

  const classModal = (
    <ClassModal
      isOpen={isClassModalOpen}
      onClose={() => setIsClassModalOpen( false )}
      classes={classes}
      activeClassId={activeClassId}
      onSelectClass={setActiveClassId}
      onCreateClass={handleCreateClass}
      onUpdateClass={handleUpdateClass}
      onDeleteClass={handleDeleteClass}
      onDuplicateClass={handleDuplicateClass}
    />
  );

  /* ------------------------------------------------------------------ */
  /* Early-return screens                                                */
  /* ------------------------------------------------------------------ */

  if ( isInitialLoading ) {
    return <LoadingScreen quoteIndex={loaderQuoteIndex} />;
  }

  if ( initialLoadError ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100/70 text-slate-700 gap-3 px-4 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-500" />
        <p className="text-sm font-bold text-rose-700">
          Could not connect to MongoDB
        </p>
        <p className="text-xs text-slate-500 max-w-sm">{initialLoadError}</p>
        <button
          onClick={() => void handleRefreshFromMongoDB()}
          disabled={isRefreshing}
          className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold disabled:opacity-60"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Try Again
        </button>
        <Toast toast={toast} />
      </div>
    );
  }

  if ( !currentClass ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100/70 text-slate-700 gap-4 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
          <GraduationCap className="w-7 h-7" />
        </div>

        <div>
          <p className="text-base font-black text-slate-900">
            No classes in MongoDB yet
          </p>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Nothing is pre-loaded — set up your school details, then add your
            first class to start entering marks.
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
          onClick={() => void handleRefreshFromMongoDB()}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
        >
          <RefreshCw
            className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-amber-600' : ''
              }`}
          />
          {isRefreshing ? 'Checking MongoDB…' : 'Check MongoDB again'}
        </button>

        {classModal}

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen( false )}
          schoolConfig={schoolConfig}
          onUpdateSchoolConfig={( config ) =>
            handleUpdateSchoolConfig( config, false )
          }
          subjects={[]}
          onUpdateSubjects={() => {}}
        />

        <Toast toast={toast} />
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Main render                                                         */
  /* ------------------------------------------------------------------ */

  const tabCount = ( id: TabId ) =>
    id === 'quarterly'
      ? quarterlyResults.length
      : id === 'half_yearly'
        ? halfYearlyResults.length
        : null;

  const tabulationProps = {
    schoolConfig: activeClassConfig,
    subjects: currentSubjects,
    students: currentStudents,
    onUpdateMark: handleUpdateMark,
    onAddStudent: handleAddStudent,
    onDeleteStudent: handleDeleteStudent,
    onUpdateStudent: handleUpdateStudent,
    onOpenReportCard: ( id: string ) => setSelectedStudentForCard( id ),
    onOpenRapidEntry: () => setIsRapidEntryOpen( true ),
    onFillSampleMarks: handleFillSampleMarks,
    onClearMarks: handleClearMarks,
    onMoveRowUp: handleMoveRowUp,
    onMoveRowDown: handleMoveRowDown,
    onReorderStudents: handleReorderStudents,
    onInsertRowAt: handleInsertRowAt,
    onOpenRegisterPrint: () => setIsRegisterPrintOpen( true ),
  };

  const closeNavThen = ( fn: () => void ) => () => {
    setIsMobileNavOpen( false );
    fn();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-16">
      <OfflineIndicator />

      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-black tracking-tight truncate">
                    GradeDesk
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-1.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    {activeClassConfig.academicYear || '—'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs">
                  {schoolConfig.schoolName || 'Configure school name in Settings'}
                </p>
              </div>

              <div className="hidden xs:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold shrink-0">
                <span>{currentClass.name}</span>
                <span className="text-[10px] text-amber-700">
                  ({currentClass.section})
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
              <PWAInstallButton />

              <button
                onClick={() => void handleSaveToMongoDB()}
                disabled={isSaving}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-xs disabled:opacity-70 ${hasUnsavedChanges
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                  }`}
                title="Save all class data and marks to MongoDB Atlas (Ctrl+S)"
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

              <button
                onClick={() => void handleRefreshFromMongoDB()}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
                title="Refresh and sync latest data from MongoDB Atlas"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin text-amber-600' : ''
                    }`}
                />
                <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>

              <div
                className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600"
                title={
                  isMongoConnected
                    ? 'Connected to MongoDB Atlas cluster'
                    : 'Connecting to MongoDB...'
                }
              >
                <Database
                  className={`w-3.5 h-3.5 ${isMongoConnected ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                />
                <span className="font-semibold">
                  {isMongoConnected ? 'MongoDB' : 'Connecting'}
                </span>
                {lastSavedTime && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({lastSavedTime})
                  </span>
                )}
              </div>

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
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <span>
                    {validationReport.isValid
                      ? 'Valid'
                      : `${validationReport.errorCount} Issues`}
                  </span>
                </button>
              )}

              <button
                onClick={() => setIsPasteImportOpen( true )}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200"
                title="Paste data directly from Excel or Google Sheets"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-amber-600" />
                <span>Import Excel</span>
              </button>

              <button
                onClick={() => setIsRegisterPrintOpen( true )}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200"
                title="Print Tabulation Register with Official Signatures"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                <span>Register</span>
              </button>

              <button
                onClick={() => setIsBatchCardsOpen( true )}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 shadow-xs"
                title="Print 4 Report Cards per A4 Page for All Students"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>4-on-A4 Cards</span>
              </button>

              <button
                onClick={() => setIsStorageModalOpen( true )}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                title="Data storage & backup"
                aria-label="Data storage and backup"
              >
                <HardDrive className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsSettingsOpen( true )}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                title="Configure School & Subjects"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="flex md:hidden items-center gap-1 shrink-0">
              <button
                onClick={() => void handleSaveToMongoDB()}
                disabled={isSaving}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-extrabold shadow-xs ${hasUnsavedChanges
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                    : 'bg-emerald-500 text-slate-950'
                  }`}
                title="Save to MongoDB"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save</span>
              </button>

              <button
                onClick={() => void handleRefreshFromMongoDB()}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                aria-label="Refresh from MongoDB"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''
                    }`}
                />
              </button>

              <button
                onClick={() => setIsBatchCardsOpen( true )}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 shadow-xs"
                title="Print 4 Cards per A4 Page"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Cards</span>
              </button>

              <button
                onClick={() => setIsMobileNavOpen( ( open ) => !open )}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileNavOpen}
              >
                {isMobileNavOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/90 bg-slate-50/95 px-3 sm:px-6 py-1.5 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-1.5">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider pr-1 shrink-0">
            Classes:
          </span>

          {classes.map( ( cls ) => {
            const isActive = cls.id === currentClass.id;

            return (
              <button
                key={cls.id}
                onClick={() => setActiveClassId( cls.id )}
                aria-pressed={isActive}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${isActive
                    ? 'bg-amber-400 text-slate-950 shadow-xs ring-1 ring-amber-500/50'
                    : 'bg-white text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/80'
                  }`}
              >
                <span>{cls.name}</span>
                <span className="text-[10px] opacity-75 font-semibold">
                  ({cls.section})
                </span>
              </button>
            );
          } )}

          <button
            onClick={() => setIsClassModalOpen( true )}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 shrink-0"
            title="Manage All Classes or Add New Class"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage Classes</span>
          </button>
        </div>

        <div className="border-t border-slate-200/80 bg-slate-50/60 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto py-2 scrollbar-none">
            <div className="flex items-center gap-2 sm:gap-3" role="tablist">
              {TABS.map( ( tab ) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const count = tabCount( tab.id );

                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab( tab.id )}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${isActive
                        ? tab.activeClass
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {count !== null && (
                      <span className="ml-1 text-[10px] px-1.5 rounded-md bg-black/10">
                        {count}
                      </span>
                    )}
                  </button>
                );
              } )}
            </div>

            <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                Active: <strong>{currentClass.name} ({currentClass.section})</strong> •{' '}
                {currentStudents.length} Students
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {( activeTab === 'quarterly' || activeTab === 'half_yearly' ) && (
          <TabulationSheet
            {...tabulationProps}
            examTitle={currentExamTitle}
            results={currentResults}
            marksMap={currentMarks}
          />
        )}

        {activeTab === 'comparative' && (
          <ComparativeReport
            comparativeResults={comparativeResults}
            schoolConfig={activeClassConfig}
            subjects={currentSubjects}
            onOpenReportCard={( id ) => setSelectedStudentForCard( id )}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            results={currentResults}
            subjects={currentSubjects}
            termTitle={currentExamTitle}
            onOpenReportCard={( id ) => setSelectedStudentForCard( id )}
          />
        )}
      </main>

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsMobileNavOpen( false )}
          />

          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm leading-tight">
                    School Menu
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate max-w-[170px]">
                    {schoolConfig.schoolName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsMobileNavOpen( false )}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                  onClick={() => void handleSaveToMongoDB()}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save Data'}</span>
                </button>

                <button
                  onClick={() => void handleRefreshFromMongoDB()}
                  disabled={isRefreshing}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''
                      }`}
                  />
                  <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-5 flex-1">
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Classes ({classes.length})
                  </span>
                  <button
                    onClick={closeNavThen( () => setIsClassModalOpen( true ) )}
                    className="text-xs font-bold text-amber-600 flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Manage
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {classes.map( ( cls ) => (
                    <button
                      key={cls.id}
                      onClick={closeNavThen( () => setActiveClassId( cls.id ) )}
                      className={`p-2 rounded-xl text-xs font-bold text-left border ${cls.id === currentClass.id
                          ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                        }`}
                    >
                      <div className="truncate">{cls.name}</div>
                      <div className="text-[10px] opacity-75 font-semibold">
                        Section {cls.section}
                      </div>
                    </button>
                  ) )}
                </div>
              </section>

              <section>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-2">
                  Examination Term
                </span>
                <div className="space-y-1">
                  {TABS.map( ( tab ) => {
                    const Icon = tab.icon;
                    const count = tabCount( tab.id );

                    return (
                      <button
                        key={tab.id}
                        onClick={closeNavThen( () => setActiveTab( tab.id ) )}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold border ${activeTab === tab.id
                            ? 'bg-amber-500 text-slate-950 border-amber-600'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                          }`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" /> {tab.shortLabel}
                        </span>
                        {count !== null && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  } )}
                </div>
              </section>

              <section>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-2">
                  Actions & Exports
                </span>

                <div className="space-y-1.5">
                  <button
                    onClick={closeNavThen( () => setIsBatchCardsOpen( true ) )}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print 4 Cards / A4 Page</span>
                  </button>

                  <button
                    onClick={closeNavThen( () => setIsRegisterPrintOpen( true ) )}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                    <span>Print Tabulation Register</span>
                  </button>

                  <button
                    onClick={closeNavThen( () => setIsPasteImportOpen( true ) )}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                  >
                    <ClipboardPaste className="w-4 h-4 text-amber-600" />
                    <span>Import Excel / Paste</span>
                  </button>

                  {validationReport && (
                    <button
                      onClick={closeNavThen( () => setIsValidationModalOpen( true ) )}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold border ${validationReport.isValid
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck
                          className={`w-4 h-4 ${validationReport.isValid
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                            }`}
                        />
                        Data Validation
                      </span>
                      <span className="text-[10px] font-extrabold">
                        {validationReport.score}% Score
                      </span>
                    </button>
                  )}

                  <button
                    onClick={closeNavThen( () => setIsStorageModalOpen( true ) )}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                  >
                    <HardDrive className="w-4 h-4 text-slate-600" />
                    <span>Data Storage & Backup</span>
                  </button>

                  <button
                    onClick={closeNavThen( () => setIsSettingsOpen( true ) )}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                  >
                    <Settings className="w-4 h-4 text-slate-600" />
                    <span>School & Subject Settings</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {classModal}

      <TabulationRegisterModal
        isOpen={isRegisterPrintOpen}
        onClose={() => setIsRegisterPrintOpen( false )}
        examTitle={currentExamTitle}
        schoolConfig={activeClassConfig}
        subjects={currentSubjects}
        results={currentResults}
      />

      <RapidEntryModal
        isOpen={isRapidEntryOpen}
        onClose={() => setIsRapidEntryOpen( false )}
        subjects={currentSubjects}
        students={currentStudents}
        currentMarks={currentMarks}
        onSaveMark={handleUpdateMark}
        termTitle={currentExamTitle}
      />

      {selectedResult && (
        <StudentReportCard
          isOpen
          onClose={() => setSelectedStudentForCard( null )}
          result={selectedResult}
          allResults={currentResults}
          onSelectStudent={( id ) => setSelectedStudentForCard( id )}
          schoolConfig={activeClassConfig}
          subjects={currentSubjects}
          examTitle={currentExamTitle}
        />
      )}

      <BatchReportCards
        isOpen={isBatchCardsOpen}
        onClose={() => setIsBatchCardsOpen( false )}
        results={currentResults}
        schoolConfig={activeClassConfig}
        subjects={currentSubjects}
        examTitle={currentExamTitle}
      />

      <PasteImportModal
        isOpen={isPasteImportOpen}
        onClose={() => setIsPasteImportOpen( false )}
        subjects={currentSubjects}
        onImportData={handleImportPastedData}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen( false )}
        schoolConfig={activeClassConfig}
        onUpdateSchoolConfig={( config ) =>
          handleUpdateSchoolConfig( config, true )
        }
        subjects={currentSubjects}
        onUpdateSubjects={( subjects ) =>
          updateCurrentClass( ( prev ) => ( {...prev, subjects} ) )
        }
        onResetDefaults={handleRefreshFromMongoDB}
      />

      <DataValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen( false )}
        activeClass={currentClass}
        allClasses={classes}
        onUpdateClass={( updated ) => updateCurrentClass( () => updated )}
        onUpdateAllClasses={( all ) => {
          all.forEach( ( cls ) => dirtyClassIdsRef.current.add( cls.id ) );
          setHasUnsavedChanges( true );
          setClasses( all );
        }}
      />

      <DataStorageModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen( false )}
        classes={classes}
        schoolConfig={schoolConfig}
        defaultTab="mongodb"
      />

      <Toast toast={toast} />
    </div>
  );
}