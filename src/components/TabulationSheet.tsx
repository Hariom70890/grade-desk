import React, { useState, useRef, useMemo } from 'react';
import { Subject, Student, ComputedStudentResult, SchoolConfig } from '../types';
import { exportTabulationToExcel, exportTabulationToCSV } from '../utils/exportUtils';
import { 
  FileText, 
  Download, 
  Printer, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Zap, 
  Table, 
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  CheckSquare,
  Square,
  FileSpreadsheet,
  CornerDownRight,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';

interface TabulationSheetProps {
  examTitle: string;
  schoolConfig: SchoolConfig;
  subjects: Subject[];
  students: Student[];
  results: ComputedStudentResult[];
  marksMap: Record<string, Record<string, number | null>>;
  onUpdateMark: (studentId: string, subjectId: string, mark: number | null) => void;
  onAddStudent: (name: string, rollNo: string) => void;
  onDeleteStudent: (studentId: string) => void;
  onUpdateStudent: (studentId: string, name: string, rollNo: string) => void;
  onOpenReportCard: (studentId: string) => void;
  onOpenRapidEntry: () => void;
  onFillSampleMarks: () => void;
  onClearMarks: () => void;
  onMoveRowUp: (studentIndex: number) => void;
  onMoveRowDown: (studentIndex: number) => void;
  onReorderStudents: (newStudents: Student[]) => void;
  onInsertRowAt?: (index: number, name: string, rollNo: string) => void;
  onOpenRegisterPrint?: () => void;
}

export const TabulationSheet: React.FC<TabulationSheetProps> = ({
  examTitle,
  schoolConfig,
  subjects,
  students,
  results,
  marksMap,
  onUpdateMark,
  onAddStudent,
  onDeleteStudent,
  onUpdateStudent,
  onOpenReportCard,
  onOpenRapidEntry,
  onFillSampleMarks,
  onClearMarks,
  onMoveRowUp,
  onMoveRowDown,
  onReorderStudents,
  onInsertRowAt,
  onOpenRegisterPrint,
}) => {
  const [viewMode, setViewMode] = useState<'classic' | 'modern'>('modern');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Editing state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoll, setEditRoll] = useState('');

  // Add row prompt
  const [showAddRow, setShowAddRow] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [errorCell, setErrorCell] = useState<{ studentId: string; subjectId: string; message: string } | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<'default' | 'rollNo' | 'name' | 'total' | 'rank'>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const totalMaxMarks = subjects.reduce((sum, s) => sum + s.maxMarks, 0);

  // Keyboard navigation map
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const getCellKey = (studentIndex: number, subjectIndex: number) => `${studentIndex}-${subjectIndex}`;

  // Filtered and sorted results
  const displayedResults = useMemo(() => {
    let list = [...results];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.student.name.toLowerCase().includes(q) ||
          r.student.rollNo.toLowerCase().includes(q)
      );
    }

    // Sort if selected
    if (sortField !== 'default') {
      list.sort((a, b) => {
        let valA: string | number = 0;
        let valB: string | number = 0;

        if (sortField === 'rollNo') {
          valA = Number(a.student.rollNo) || a.student.rollNo;
          valB = Number(b.student.rollNo) || b.student.rollNo;
        } else if (sortField === 'name') {
          valA = a.student.name.toLowerCase();
          valB = b.student.name.toLowerCase();
        } else if (sortField === 'total') {
          valA = a.totalObtained;
          valB = b.totalObtained;
        } else if (sortField === 'rank') {
          valA = a.rank;
          valB = b.rank;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [results, searchQuery, sortField, sortDirection]);

  // Apply current sorting permanently to the student order
  const handleApplySortPermanently = () => {
    const reorderedStudents = displayedResults.map((r, idx) => ({
      ...r.student,
      sNo: idx + 1,
    }));
    onReorderStudents(reorderedStudents);
    setSortField('default');
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIndex: number,
    subjectIndex: number,
    studentId: string,
    subjectId: string,
    maxMarks: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to same subject, next student
      const nextKey = getCellKey(studentIndex + 1, subjectIndex);
      const nextInput = cellRefs.current.get(nextKey);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextKey = getCellKey(studentIndex + 1, subjectIndex);
      cellRefs.current.get(nextKey)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevKey = getCellKey(studentIndex - 1, subjectIndex);
      cellRefs.current.get(prevKey)?.focus();
    } else if (e.key === 'ArrowRight' && (e.currentTarget.selectionStart === e.currentTarget.value.length || e.currentTarget.value === '')) {
      const rightKey = getCellKey(studentIndex, subjectIndex + 1);
      cellRefs.current.get(rightKey)?.focus();
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      const leftKey = getCellKey(studentIndex, subjectIndex - 1);
      cellRefs.current.get(leftKey)?.focus();
    }
  };

  const handleCellChange = (
    studentId: string,
    subjectId: string,
    value: string,
    maxMarks: number
  ) => {
    if (value.trim() === '') {
      onUpdateMark(studentId, subjectId, null);
      setErrorCell(null);
      return;
    }

    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'ab' || trimmed === 'a' || trimmed === 'absent') {
      onUpdateMark(studentId, subjectId, 0);
      setErrorCell({ studentId, subjectId, message: 'Student marked Absent (recorded as 0 marks)' });
      return;
    }

    const num = Number(value);
    if (isNaN(num)) {
      setErrorCell({ studentId, subjectId, message: `Invalid input "${value}". Marks must be numbers or "Ab".` });
      return;
    }

    if (num < 0) {
      setErrorCell({ studentId, subjectId, message: `Marks cannot be negative (${num}).` });
      return;
    }

    if (num > maxMarks) {
      setErrorCell({
        studentId,
        subjectId,
        message: `Entered score (${num}) exceeds maximum allowed (${maxMarks}) for this subject!`,
      });
    } else {
      setErrorCell(null);
    }

    onUpdateMark(studentId, subjectId, num);
  };

  const handleSaveStudentEdit = (studentId: string) => {
    if (editName.trim()) {
      onUpdateStudent(studentId, editName.trim(), editRoll.trim());
    }
    setEditingStudentId(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    if (insertAfterIndex !== null && onInsertRowAt) {
      onInsertRowAt(
        insertAfterIndex + 1,
        newStudentName.trim(),
        newStudentRoll.trim() || String(students.length + 101)
      );
    } else {
      onAddStudent(
        newStudentName.trim(),
        newStudentRoll.trim() || String(students.length + 101)
      );
    }

    setNewStudentName('');
    setNewStudentRoll('');
    setShowAddRow(false);
    setInsertAfterIndex(null);
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.size === displayedResults.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(displayedResults.map((r) => r.student.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  const handleDeleteSelected = () => {
    if (selectedStudentIds.size === 0) return;
    if (confirm(`Remove ${selectedStudentIds.size} selected student(s)?`)) {
      const remainingStudents = students.filter((s) => !selectedStudentIds.has(s.id));
      const renumbered = remainingStudents.map((s, idx) => ({ ...s, sNo: idx + 1 }));
      onReorderStudents(renumbered);
      setSelectedStudentIds(new Set());
    }
  };

  const handleExportExcel = () => {
    exportTabulationToExcel(
      examTitle,
      schoolConfig,
      subjects,
      results,
      `${schoolConfig.className}_${schoolConfig.section}_${examTitle.replace(/\s+/g, '_')}.xlsx`
    );
  };

  const handleExportCSV = () => {
    exportTabulationToCSV(
      examTitle,
      schoolConfig,
      subjects,
      results,
      `${schoolConfig.className}_${schoolConfig.section}_${examTitle.replace(/\s+/g, '_')}.csv`
    );
  };

  return (
    <div className="space-y-4">
      {/* Control bar / Sheet Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setViewMode('classic')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'classic'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Exact Yellow Marksheet layout matching original document"
              >
                <Table className="w-3.5 h-3.5" /> Classic Yellow Sheet
              </button>
              <button
                onClick={() => setViewMode('modern')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'modern'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Modern View
              </button>
            </div>

            {/* Rapid Entry Button */}
            <button
              onClick={onOpenRapidEntry}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all hover:scale-102"
              title="Enter marks fast using numpad and auto-advance"
            >
              <Zap className="w-3.5 h-3.5 fill-current" /> Rapid Auto-Entry Mode
            </button>

            {/* Add Student Button */}
            <button
              onClick={() => {
                setInsertAfterIndex(null);
                setShowAddRow(!showAddRow);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Student
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Excel & CSV Export Buttons */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
              title="Download formatted Excel (.xlsx) file"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>

            <button
              onClick={handleExportCSV}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
              title="Download CSV format"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
            </button>

            {/* Print Register Button */}
            <button
              onClick={onOpenRegisterPrint || (() => window.print())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
              title="Print official tabulation register with signature blocks"
            >
              <Printer className="w-3.5 h-3.5" /> Print Register
            </button>

            {/* Quick Demo Marks & Clear Marks */}
            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

            <button
              onClick={onFillSampleMarks}
              className="text-xs text-amber-700 hover:text-amber-800 font-bold px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
              title="Auto-fill realistic demo marks for all students in this class"
            >
              Fill Demo Marks
            </button>

            <button
              onClick={onClearMarks}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
              title="Clear all marks entered for this exam"
            >
              Clear Marks
            </button>
          </div>
        </div>

        {/* Row Operations Sub-Bar: Search Filter & Sort Rows */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter / Search student by name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Mobile horizontal scroll indicator */}
          <div className="flex sm:hidden items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] font-semibold text-amber-900">
            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Roll number is pinned on left when scrolling table</span>
          </div>

          {/* Sort rows toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-bold flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" /> Sort Rows:
            </span>

            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="default">Original S.No Order</option>
              <option value="rollNo">Sort by Roll Number</option>
              <option value="name">Sort by Student Name</option>
              <option value="total">Sort by Total Marks</option>
              <option value="rank">Sort by Rank (#1 Topper First)</option>
            </select>

            {sortField !== 'default' && (
              <>
                <button
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  title="Toggle Ascending / Descending"
                >
                  {sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending'}
                </button>
                <button
                  onClick={handleApplySortPermanently}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-2xs"
                  title="Make this order permanent and re-number S.No"
                >
                  Save New Row Order
                </button>
                <button
                  onClick={() => setSortField('default')}
                  className="text-slate-500 hover:text-slate-800 text-xs px-1"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </div>

        {/* Selected Rows Batch Bar */}
        {selectedStudentIds.size > 0 && (
          <div className="bg-amber-500/10 border border-amber-300 px-4 py-2 rounded-xl flex items-center justify-between text-xs font-bold text-slate-900 animate-in fade-in">
            <span className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-amber-600" />
              {selectedStudentIds.size} student(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
              <button
                onClick={() => setSelectedStudentIds(new Set())}
                className="px-2.5 py-1 text-slate-600 hover:text-slate-900"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add student inline prompt */}
      {showAddRow && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex flex-wrap items-center gap-3 animate-in fade-in duration-150"
        >
          <span className="text-xs font-bold text-amber-900 uppercase">
            {insertAfterIndex !== null
              ? `Insert Student After Row #${insertAfterIndex + 1}:`
              : 'Add New Student to Sheet:'}
          </span>
          <input
            type="text"
            placeholder="Student Full Name *"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            className="text-xs p-2 bg-white border border-slate-300 rounded-lg flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
            required
            autoFocus
          />
          <input
            type="text"
            placeholder="Roll Number (e.g. 113)"
            value={newStudentRoll}
            onChange={(e) => setNewStudentRoll(e.target.value)}
            className="text-xs p-2 bg-white border border-slate-300 rounded-lg w-36 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm"
          >
            {insertAfterIndex !== null ? 'Insert Row' : 'Add Student'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddRow(false);
              setInsertAfterIndex(null);
            }}
            className="px-3 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Error notification banner */}
      {errorCell && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-2 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span><strong>Input Alert:</strong> {errorCell.message}</span>
        </div>
      )}

      {/* SPREADSHEET CONTAINER */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === 'classic' ? (
            /* CLASSIC AUTHENTIC SHEET MATCHING USER IMAGE EXACTLY */
            <table className="w-full text-left text-xs border-collapse select-none">
              {/* TOP HEADER: YELLOW BANNER */}
              <thead>
                <tr>
                  <th
                    colSpan={4 + subjects.length + 4}
                    className="bg-[#FFFF00] text-black text-center py-2.5 px-4 font-black text-xl tracking-wider uppercase border-b border-black shadow-xs font-serif"
                    style={{ backgroundColor: '#FFFF00', color: '#000000', letterSpacing: '0.08em' }}
                  >
                    {examTitle}
                  </th>
                </tr>

                {/* SUBHEADER: Blue corner, Orange Student info, Yellow Max Marks */}
                <tr className="border-b border-black">
                  {/* Select Checkbox & Shift buttons column (Desktop) */}
                  <th className="hidden sm:table-cell sm:sticky sm:left-0 z-30 bg-[#3B82F6] border-r border-black w-14 text-center" style={{ backgroundColor: '#3B82F6' }}>
                    <button
                      onClick={handleSelectAll}
                      className="text-white hover:text-amber-200 transition-colors"
                      title="Select / Deselect All Rows"
                    >
                      {selectedStudentIds.size > 0 && selectedStudentIds.size === displayedResults.length ? (
                        <CheckSquare className="w-4 h-4 inline" />
                      ) : (
                        <Square className="w-4 h-4 inline" />
                      )}
                    </button>
                  </th>
                  {/* S.No - Sticky on mobile & desktop */}
                  <th 
                    className="sticky left-0 sm:left-14 z-30 bg-[#3B82F6] border-r border-black w-10 sm:w-12 text-center text-[10px] text-white font-bold" 
                    style={{ backgroundColor: '#3B82F6' }}
                  >
                    #
                  </th>
                  {/* Orange block over Roll Number (Sticky on mobile & desktop) */}
                  <th
                    className="sticky left-10 sm:left-26 z-30 bg-[#F59E0B] border-r-2 border-black text-center font-black text-[10px] text-black uppercase w-20 sm:w-24 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.25)]"
                    style={{ backgroundColor: '#F59E0B' }}
                  >
                    ROLL NO
                  </th>
                  {/* Orange block over Student Name */}
                  <th
                    className="bg-[#F59E0B] border-r border-black text-center font-bold text-[11px] text-black uppercase min-w-[170px]"
                    style={{ backgroundColor: '#F59E0B' }}
                  >
                    STUDENT NAME
                  </th>
                  {/* Max Marks for each subject in yellow cells */}
                  {subjects.map((sub) => (
                    <th
                      key={sub.id}
                      className="bg-[#FFFF00] border-r border-black text-center py-1.5 px-2 font-extrabold text-sm text-black"
                      style={{ backgroundColor: '#FFFF00' }}
                    >
                      {sub.maxMarks}
                    </th>
                  ))}
                  {/* Max marks for Total */}
                  <th
                    className="bg-[#FFFF00] border-r border-black text-center py-1.5 px-2 font-extrabold text-sm text-black"
                    style={{ backgroundColor: '#FFFF00' }}
                  >
                    {totalMaxMarks}
                  </th>
                  {/* Empty above Percentage, Rank, Remark */}
                  <th
                    colSpan={3}
                    className="bg-white border-r border-black text-center text-slate-400 text-[10px]"
                  >
                    &nbsp;
                  </th>
                </tr>

                {/* COLUMN HEADERS ROW */}
                <tr className="border-b-2 border-black bg-white text-black font-extrabold text-xs">
                  <th className="hidden sm:table-cell sm:sticky sm:left-0 z-30 bg-slate-100 border-r border-black py-2 px-1 text-center w-14 text-[10px] text-slate-500 uppercase">
                    Shift
                  </th>
                  <th className="sticky left-0 sm:left-14 z-30 bg-slate-100 border-r border-black py-2 px-1 text-center w-10 sm:w-12 font-bold text-black">
                    S.No.
                  </th>
                  <th className="sticky left-10 sm:left-26 z-30 bg-amber-200 border-r-2 border-black py-2 px-2 text-center w-20 sm:w-24 font-extrabold text-black shadow-[4px_0_10px_-2px_rgba(0,0,0,0.22)]">
                    Roll No
                  </th>
                  <th className="border-r border-black py-2 px-3 min-w-[170px] bg-white font-extrabold text-black">
                    Student Name
                  </th>
                  {subjects.map((sub) => (
                    <th key={sub.id} className="border-r border-black py-2 px-2 text-center min-w-[70px]">
                      {sub.name}
                    </th>
                  ))}
                  <th className="border-r border-black py-2 px-2 text-center min-w-[70px] bg-slate-50">
                    Total
                  </th>
                  <th className="border-r border-black py-2 px-2 text-center min-w-[90px] bg-slate-50">
                    Percentage
                  </th>
                  <th className="border-r border-black py-2 px-2 text-center w-16 bg-slate-50">
                    Rank
                  </th>
                  <th className="py-2 px-3 text-center min-w-[100px] bg-slate-50">
                    Remark
                  </th>
                </tr>
              </thead>

              {/* DATA ROWS */}
              <tbody className="divide-y divide-black/30">
                {displayedResults.map((res, displayIdx) => {
                  const isEditingThisStudent = editingStudentId === res.student.id;
                  const isSelected = selectedStudentIds.has(res.student.id);

                  // Find original student index for shifting
                  const originalIndex = students.findIndex((s) => s.id === res.student.id);

                  return (
                    <tr
                      key={res.student.id}
                      className={`transition-colors group ${
                        isSelected
                          ? 'bg-amber-100/70'
                          : displayIdx % 2 === 1
                          ? 'bg-slate-50/50 hover:bg-amber-50/50'
                          : 'hover:bg-amber-50/50'
                      }`}
                    >
                      {/* Row Shift & Selection Controls (Desktop) */}
                      <td className="hidden sm:table-cell sm:sticky sm:left-0 z-20 bg-white group-hover:bg-amber-50 border-r border-black/30 py-1 px-1 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(res.student.id)}
                            className="rounded text-amber-500 focus:ring-amber-500 mr-0.5 cursor-pointer"
                          />
                          {/* Shift Up Button */}
                          <button
                            type="button"
                            onClick={() => onMoveRowUp(originalIndex)}
                            disabled={originalIndex === 0}
                            className={`p-0.5 rounded transition-colors ${
                              originalIndex === 0
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                            }`}
                            title="Shift row up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          {/* Shift Down Button */}
                          <button
                            type="button"
                            onClick={() => onMoveRowDown(originalIndex)}
                            disabled={originalIndex === students.length - 1}
                            className={`p-0.5 rounded transition-colors ${
                              originalIndex === students.length - 1
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                            }`}
                            title="Shift row down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* S.No - Pinned Sticky on mobile & desktop */}
                      <td className="sticky left-0 sm:left-14 z-20 bg-white group-hover:bg-amber-50 border-r border-black/30 py-1.5 px-1 text-center font-bold text-black w-10 sm:w-12">
                        {displayIdx + 1}
                      </td>

                      {/* Roll Number - Pinned Sticky with Shadow & Mobile Student Label */}
                      <td className="sticky left-10 sm:left-26 z-20 bg-amber-50 group-hover:bg-amber-100 border-r-2 border-black py-1 px-1.5 text-center font-mono text-black font-semibold w-20 sm:w-24 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.18)]">
                        {isEditingThisStudent ? (
                          <input
                            type="text"
                            value={editRoll}
                            onChange={(e) => setEditRoll(e.target.value)}
                            className="w-full text-center text-xs p-1 border border-amber-500 rounded bg-white font-mono font-bold"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-mono text-xs font-black text-black leading-none">
                              {res.student.rollNo || '-'}
                            </span>
                            {/* Mobile helper label: Shows student name under roll number so teacher is 100% sure */}
                            <span
                              className="block sm:hidden text-[9px] font-bold text-slate-700 truncate max-w-[70px] leading-tight mt-0.5"
                              title={res.student.name}
                            >
                              {res.student.name}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Student Name */}
                      <td className="border-r border-black/30 py-1 px-3 text-black font-semibold min-w-[170px] bg-white group-hover:bg-amber-50">
                        {isEditingThisStudent ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full text-xs p-1 border border-amber-500 rounded bg-white font-bold"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveStudentEdit(res.student.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Save name & roll number"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingStudentId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 truncate">
                              <span
                                onClick={() => onOpenReportCard(res.student.id)}
                                className="cursor-pointer hover:text-amber-800 hover:underline font-bold truncate text-xs"
                                title="Click to view full printable report card"
                              >
                                {res.student.name}
                              </span>
                              {/* Mobile shift buttons */}
                              <div className="flex sm:hidden items-center shrink-0 ml-1">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); onMoveRowUp(originalIndex); }}
                                  disabled={originalIndex === 0}
                                  className="p-0.5 text-slate-400 hover:text-black disabled:opacity-20"
                                  title="Shift Up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); onMoveRowDown(originalIndex); }}
                                  disabled={originalIndex === students.length - 1}
                                  className="p-0.5 text-slate-400 hover:text-black disabled:opacity-20"
                                  title="Shift Down"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setInsertAfterIndex(originalIndex);
                                  setShowAddRow(true);
                                }}
                                className="p-0.5 text-slate-400 hover:text-emerald-700 rounded hover:bg-emerald-50"
                                title="Insert row below this student"
                              >
                                <CornerDownRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStudentId(res.student.id);
                                  setEditName(res.student.name);
                                  setEditRoll(res.student.rollNo);
                                }}
                                className="p-0.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                                title="Edit Student"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Delete student ${res.student.name} (Roll ${res.student.rollNo})?`)) {
                                    onDeleteStudent(res.student.id);
                                  }
                                }}
                                className="p-0.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                title="Delete Student"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Subject Mark Cells (Interactive Inputs) */}
                      {subjects.map((sub, subjectIdx) => {
                        const markVal = res.marks[sub.id];
                        const cellKey = getCellKey(displayIdx, subjectIdx);
                        const isOverMax = markVal !== undefined && markVal !== null && Number(markVal) > sub.maxMarks;
                        const isNegative = markVal !== undefined && markVal !== null && Number(markVal) < 0;
                        const isInvalid = isOverMax || isNegative;

                        return (
                          <td
                            key={sub.id}
                            className={`border-r border-black/30 py-0.5 px-1 text-center relative ${
                              isInvalid ? 'bg-rose-100 ring-2 ring-rose-500/70' : ''
                            }`}
                            title={
                              isOverMax
                                ? `Validation Alert: Score (${markVal}) exceeds maximum (${sub.maxMarks})`
                                : isNegative
                                ? `Validation Alert: Score (${markVal}) cannot be negative`
                                : undefined
                            }
                          >
                            <input
                              ref={(el) => {
                                if (el) cellRefs.current.set(cellKey, el);
                                else cellRefs.current.delete(cellKey);
                              }}
                              type="number"
                              step="any"
                              min="0"
                              max={sub.maxMarks}
                              value={markVal !== undefined && markVal !== null ? markVal : ''}
                              onChange={(e) =>
                                handleCellChange(res.student.id, sub.id, e.target.value, sub.maxMarks)
                              }
                              onKeyDown={(e) =>
                                handleCellKeyDown(e, displayIdx, subjectIdx, res.student.id, sub.id, sub.maxMarks)
                              }
                              placeholder=""
                              className={`w-full py-1.5 text-center text-xs font-bold text-black bg-transparent focus:bg-amber-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 rounded transition-colors ${
                                isInvalid ? 'text-rose-700 font-black' : ''
                              }`}
                            />
                            {isInvalid && (
                              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                            )}
                          </td>
                        );
                      })}

                      {/* Calculated Total */}
                      <td className="border-r border-black/30 py-1.5 px-2 text-center font-bold text-black bg-slate-50">
                        {res.totalObtained}
                      </td>

                      {/* Calculated Percentage */}
                      <td className="border-r border-black/30 py-1.5 px-2 text-center font-bold text-black bg-slate-50">
                        {res.percentage.toFixed(2)}%
                      </td>

                      {/* Calculated Rank */}
                      <td className="border-r border-black/30 py-1.5 px-2 text-center font-extrabold text-black bg-slate-50">
                        #{res.rank}
                      </td>

                      {/* Calculated Remark */}
                      <td className="py-1.5 px-3 text-center font-semibold text-black bg-slate-50">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            res.percentage >= 80
                              ? 'text-emerald-800 bg-emerald-100'
                              : res.percentage >= 60
                              ? 'text-blue-800 bg-blue-100'
                              : res.percentage >= 33
                              ? 'text-amber-800 bg-amber-100'
                              : 'text-red-800 bg-red-100'
                          }`}
                        >
                          {res.remark}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* MODERN PRO VIEW */
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold uppercase text-[11px] tracking-wider">
                  <th className="hidden sm:table-cell sm:sticky sm:left-0 z-30 bg-slate-900 py-3 px-2 text-center w-14">Shift</th>
                  <th className="sticky left-0 sm:left-14 z-30 bg-slate-900 border-r border-slate-700 py-3 px-1 text-center w-10 sm:w-12">#</th>
                  <th className="sticky left-10 sm:left-26 z-30 bg-slate-800 text-amber-300 border-r-2 border-slate-600 py-3 px-2 text-center w-20 sm:w-24 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.3)]">
                    Roll No
                  </th>
                  <th className="py-3 px-4 min-w-[170px] bg-slate-900">Student Name</th>
                  {subjects.map((sub) => (
                    <th key={sub.id} className="py-3 px-3 text-center bg-slate-900">
                      {sub.name}
                      <span className="block text-[9px] font-normal text-amber-300">
                        (Max {sub.maxMarks})
                      </span>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center bg-slate-800">Total ({totalMaxMarks})</th>
                  <th className="py-3 px-3 text-center bg-slate-800">Percentage</th>
                  <th className="py-3 px-3 text-center bg-slate-800">Rank</th>
                  <th className="py-3 px-3 text-center bg-slate-800">Remark</th>
                  <th className="py-3 px-3 text-center bg-slate-800">Report Card</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedResults.map((res, displayIdx) => {
                  const originalIndex = students.findIndex((s) => s.id === res.student.id);

                  return (
                    <tr key={res.student.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="hidden sm:table-cell sm:sticky sm:left-0 z-20 bg-white group-hover:bg-slate-50 py-2.5 px-2 text-center border-r border-slate-200">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onMoveRowUp(originalIndex)}
                            disabled={originalIndex === 0}
                            className={`p-1 rounded ${
                              originalIndex === 0
                                ? 'text-slate-300'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                            }`}
                            title="Shift Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onMoveRowDown(originalIndex)}
                            disabled={originalIndex === students.length - 1}
                            className={`p-1 rounded ${
                              originalIndex === students.length - 1
                                ? 'text-slate-300'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                            }`}
                            title="Shift Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="sticky left-0 sm:left-14 z-20 bg-white group-hover:bg-slate-50 py-2.5 px-1 text-center font-bold text-slate-800 w-10 sm:w-12 border-r border-slate-200">
                        {displayIdx + 1}
                      </td>
                      <td className="sticky left-10 sm:left-26 z-20 bg-amber-50 group-hover:bg-amber-100 py-2 px-1.5 font-mono font-bold text-amber-950 text-center w-20 sm:w-24 border-r-2 border-amber-300 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]">
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {res.student.rollNo}
                          </span>
                          <span
                            className="block sm:hidden text-[9px] font-medium text-slate-600 truncate max-w-[70px] leading-tight"
                            title={res.student.name}
                          >
                            {res.student.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 min-w-[170px] bg-white group-hover:bg-slate-50">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{res.student.name}</span>
                          <div className="flex sm:hidden items-center shrink-0">
                            <button
                              onClick={() => onMoveRowUp(originalIndex)}
                              disabled={originalIndex === 0}
                              className="p-1 text-slate-400 hover:text-black disabled:opacity-20"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onMoveRowDown(originalIndex)}
                              disabled={originalIndex === students.length - 1}
                              className="p-1 text-slate-400 hover:text-black disabled:opacity-20"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                      {subjects.map((sub) => {
                        const markVal = res.marks[sub.id];
                        const isOverMax = markVal !== undefined && markVal !== null && Number(markVal) > sub.maxMarks;
                        const isNegative = markVal !== undefined && markVal !== null && Number(markVal) < 0;
                        const isInvalid = isOverMax || isNegative;

                        return (
                          <td key={sub.id} className="py-1 px-1 text-center relative">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max={sub.maxMarks}
                              value={markVal !== undefined && markVal !== null ? markVal : ''}
                              onChange={(e) =>
                                handleCellChange(res.student.id, sub.id, e.target.value, sub.maxMarks)
                              }
                              className={`w-16 py-1 text-center font-bold text-xs rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition-colors ${
                                isInvalid
                                  ? 'bg-rose-100 text-rose-800 border-2 border-rose-500 ring-1 ring-rose-400 font-black'
                                  : 'bg-slate-100 border border-slate-200 text-slate-800'
                              }`}
                              title={
                                isOverMax
                                  ? `Marks (${markVal}) exceed max allowed (${sub.maxMarks})`
                                  : isNegative
                                  ? 'Marks cannot be negative'
                                  : undefined
                              }
                            />
                            {isInvalid && (
                              <span className="absolute top-0 right-1 text-[9px] font-black text-rose-600">!</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-center font-black text-slate-900 bg-slate-50">
                        {res.totalObtained}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-slate-900 bg-slate-50">
                        {res.percentage}%
                      </td>
                      <td className="py-2.5 px-3 text-center bg-slate-50">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs">
                          #{res.rank}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center bg-slate-50">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800">
                          {res.remark}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center bg-slate-50">
                        <button
                          onClick={() => onOpenReportCard(res.student.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-colors"
                        >
                          View Card
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Helpful keyboard hints & summary footer */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-2 py-1 gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span>💡 <strong>Keyboard Shortcuts:</strong> Press <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono font-bold">Enter</kbd> to jump down to next student</span>
          <span>•</span>
          <span>Use <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono font-bold">Arrow Keys</kbd> to move left/right/up/down</span>
          <span>•</span>
          <span>Click <strong>⬆️ / ⬇️</strong> in the Shift column to move rows</span>
        </div>
        <div className="font-semibold text-slate-700">
          Showing {displayedResults.length} of {students.length} students • Total Max Marks: {totalMaxMarks}
        </div>
      </div>
    </div>
  );
};
