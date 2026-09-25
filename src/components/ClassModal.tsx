import React, { useState } from 'react';
import { ClassData, Subject } from '../types';
import { SUBJECT_TEMPLATES } from '../constants/initialData';
import { 
  X, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  BookOpen, 
  GraduationCap, 
  Users, 
  Layers, 
  CheckCircle2,
  FolderPlus
} from 'lucide-react';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassData[];
  activeClassId: string;
  onSelectClass: (classId: string) => void;
  onCreateClass: (newClass: ClassData) => void;
  onUpdateClass: (classId: string, name: string, section: string) => void;
  onDeleteClass: (classId: string) => void;
  onDuplicateClass: (classId: string) => void;
}

export const ClassModal: React.FC<ClassModalProps> = ({
  isOpen,
  onClose,
  classes,
  activeClassId,
  onSelectClass,
  onCreateClass,
  onUpdateClass,
  onDeleteClass,
  onDuplicateClass,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  // New Class Form State
  const [newClassName, setNewClassName] = useState('Class 6');
  const [newSection, setNewSection] = useState('A');
  const [selectedTemplateId, setSelectedTemplateId] = useState('middle');
  const [includeSampleStudents, setIncludeSampleStudents] = useState(true);

  // Edit Class State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSection, setEditSection] = useState('');

  if (!isOpen) return null;

  const handleStartEdit = (cls: ClassData) => {
    setEditingId(cls.id);
    setEditName(cls.name);
    setEditSection(cls.section);
  };

  const handleSaveEdit = (classId: string) => {
    if (editName.trim()) {
      onUpdateClass(classId, editName.trim(), editSection.trim() || 'A');
    }
    setEditingId(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const template = SUBJECT_TEMPLATES.find((t) => t.id === selectedTemplateId) || SUBJECT_TEMPLATES[0];
    const newId = 'class_' + Date.now();

    const sampleStudents = includeSampleStudents
      ? [
          { id: `s_${newId}_1`, sNo: 1, rollNo: '101', name: 'Aarav Patel', attendanceDays: 90, totalWorkingDays: 92 },
          { id: `s_${newId}_2`, sNo: 2, rollNo: '102', name: 'Bhavna Sharma', attendanceDays: 88, totalWorkingDays: 92 },
          { id: `s_${newId}_3`, sNo: 3, rollNo: '103', name: 'Chirag Joshi', attendanceDays: 91, totalWorkingDays: 92 },
          { id: `s_${newId}_4`, sNo: 4, rollNo: '104', name: 'Deepika Rao', attendanceDays: 85, totalWorkingDays: 92 },
          { id: `s_${newId}_5`, sNo: 5, rollNo: '105', name: 'Eshaan Verma', attendanceDays: 89, totalWorkingDays: 92 },
          { id: `s_${newId}_6`, sNo: 6, rollNo: '106', name: 'Fatima Khan', attendanceDays: 92, totalWorkingDays: 92 },
        ]
      : [];

    // Realistic demo marks based on maxMarks
    const quarterlyMarks: Record<string, Record<string, number | null>> = {};
    const halfYearlyMarks: Record<string, Record<string, number | null>> = {};

    if (includeSampleStudents) {
      sampleStudents.forEach((student, idx) => {
        quarterlyMarks[student.id] = {};
        halfYearlyMarks[student.id] = {};
        template.subjects.forEach((subj) => {
          const ratioQ = 0.55 + ((idx * 7) % 35) / 100;
          const ratioH = Math.min(0.98, ratioQ + 0.05);
          quarterlyMarks[student.id][subj.id] = Math.round(subj.maxMarks * ratioQ);
          halfYearlyMarks[student.id][subj.id] = Math.round(subj.maxMarks * ratioH);
        });
      });
    }

    const newClassData: ClassData = {
      id: newId,
      name: newClassName.trim(),
      section: newSection.trim() || 'A',
      academicYear: '2026-27',
      subjects: template.subjects.map((s) => ({ ...s })),
      students: sampleStudents,
      quarterlyMarks,
      halfYearlyMarks,
    };

    onCreateClass(newClassData);
    onSelectClass(newId);
    setActiveTab('list');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Manage All Classes & Sections</h2>
              <p className="text-xs text-slate-400">
                Switch between classes, create new grades, or customize subjects
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'list'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All Classes ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Class / Section
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'list' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                <span>Select a class to open its marksheet & performance reports</span>
                <button
                  onClick={() => setActiveTab('create')}
                  className="text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> New Class
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classes.map((cls) => {
                  const isActive = cls.id === activeClassId;
                  const isEditing = editingId === cls.id;

                  return (
                    <div
                      key={cls.id}
                      className={`relative p-4 rounded-2xl border-2 transition-all ${
                        isActive
                          ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Class Name"
                              className="text-xs p-1.5 border rounded-lg w-full font-bold"
                              autoFocus
                            />
                            <input
                              type="text"
                              value={editSection}
                              onChange={(e) => setEditSection(e.target.value)}
                              placeholder="Sec"
                              className="text-xs p-1.5 border rounded-lg w-16 text-center font-bold"
                            />
                          </div>
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(cls.id)}
                              className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded-lg font-bold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-sm text-slate-900">
                                  {cls.name}
                                </h3>
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-[10px] font-black text-slate-700">
                                  Sec {cls.section}
                                </span>
                                {isActive && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                <span>{cls.students.length} Students</span>
                                <span>•</span>
                                <span>{cls.subjects.length} Subjects</span>
                              </p>
                            </div>
                          </div>

                          {/* Subject tags preview */}
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {cls.subjects.slice(0, 4).map((sub) => (
                              <span
                                key={sub.id}
                                className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded"
                              >
                                {sub.name} ({sub.maxMarks})
                              </span>
                            ))}
                            {cls.subjects.length > 4 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                                +{cls.subjects.length - 4} more
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <button
                              onClick={() => {
                                onSelectClass(cls.id);
                                onClose();
                              }}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                isActive
                                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-600'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {isActive ? 'Current Sheet' : 'Open Sheet'}
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleStartEdit(cls)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                                title="Rename Class"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => onDuplicateClass(cls.id)}
                                className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100"
                                title="Duplicate Class"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {classes.length > 1 && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete ${cls.name} (${cls.section}) and all its marks?`)) {
                                      onDeleteClass(cls.id);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                                  title="Delete Class"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* CREATE CLASS FORM */
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Class / Grade Name *
                  </label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g. Class 1, Class 6, Class 9, Class 11-Sci"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    placeholder="e.g. A, B, C, Rose"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Subject Curriculum Template:
                </label>
                <div className="space-y-2">
                  {SUBJECT_TEMPLATES.map((tmpl) => (
                    <label
                      key={tmpl.id}
                      className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        selectedTemplateId === tmpl.id
                          ? 'border-amber-500 bg-amber-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="subjectTemplate"
                        value={tmpl.id}
                        checked={selectedTemplateId === tmpl.id}
                        onChange={() => setSelectedTemplateId(tmpl.id)}
                        className="mt-1 text-amber-500 focus:ring-amber-500"
                      />
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">{tmpl.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{tmpl.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeSampleStudents}
                    onChange={(e) => setIncludeSampleStudents(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Pre-populate with sample student roster & demo marks</span>
                </label>
                <p className="text-[11px] text-slate-500 ml-6 mt-1">
                  You can edit, rename, clear, or add students anytime later.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Back to List
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all hover:scale-105"
                >
                  <FolderPlus className="w-4 h-4" />
                  Create Class & Open Sheet
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
