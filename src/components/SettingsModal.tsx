import React, { useState } from 'react';
import { SchoolConfig, Subject } from '../types';
import { Settings, Plus, Trash2, RotateCcw, X, Save, Check } from 'lucide-react';
import { DEFAULT_SCHOOL_CONFIG, DEFAULT_SUBJECTS } from '../constants/initialData';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolConfig: SchoolConfig;
  onUpdateSchoolConfig: (cfg: SchoolConfig) => void;
  subjects: Subject[];
  onUpdateSubjects: (subs: Subject[]) => void;
  onResetDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  schoolConfig,
  onUpdateSchoolConfig,
  subjects,
  onUpdateSubjects,
  onResetDefaults,
}) => {
  if (!isOpen) return null;

  const [cfg, setCfg] = useState<SchoolConfig>({ ...schoolConfig });
  const [subs, setSubs] = useState<Subject[]>([...subjects]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubMax, setNewSubMax] = useState('60');
  const [savedAlert, setSavedAlert] = useState(false);

  const handleAddSubject = () => {
    if (!newSubName.trim()) return;
    const max = Number(newSubMax) || 60;
    const id = newSubName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    setSubs([...subs, { id, name: newSubName.trim(), maxMarks: max, passMarks: Math.ceil(max * 0.33) }]);
    setNewSubName('');
    setNewSubMax('60');
  };

  const handleRemoveSubject = (id: string) => {
    if (subs.length <= 1) {
      alert('At least one subject must remain');
      return;
    }
    setSubs(subs.filter((s) => s.id !== id));
  };

  const handleUpdateSubjectMax = (id: string, maxMarks: number) => {
    setSubs(subs.map((s) => s.id === id ? { ...s, maxMarks, passMarks: Math.ceil(maxMarks * 0.33) } : s));
  };

  const handleSave = () => {
    onUpdateSchoolConfig(cfg);
    onUpdateSubjects(subs);
    setSavedAlert(true);
    setTimeout(() => {
      setSavedAlert(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full my-auto overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">Examination & School Configuration</h3>
              <p className="text-xs text-slate-400">Customize school titles, class, subjects, and maximum marks</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* School Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              School & Session Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">School Name</label>
                <input
                  type="text"
                  value={cfg.schoolName}
                  onChange={(e) => setCfg({ ...cfg, schoolName: e.target.value })}
                  className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Affiliation / Subtitle</label>
                <input
                  type="text"
                  value={cfg.schoolSubtitle}
                  onChange={(e) => setCfg({ ...cfg, schoolSubtitle: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Academic Session</label>
                <input
                  type="text"
                  value={cfg.academicYear}
                  onChange={(e) => setCfg({ ...cfg, academicYear: e.target.value })}
                  placeholder="2026-27"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Class</label>
                <input
                  type="text"
                  value={cfg.className}
                  onChange={(e) => setCfg({ ...cfg, className: e.target.value })}
                  placeholder="Class 4"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Section</label>
                <input
                  type="text"
                  value={cfg.section}
                  onChange={(e) => setCfg({ ...cfg, section: e.target.value })}
                  placeholder="A"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Subjects & Max Marks */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Subjects & Maximum Marks
              </h4>
              <span className="text-xs font-bold text-amber-600">
                Total Max Marks: {subs.reduce((sum, s) => sum + s.maxMarks, 0)}
              </span>
            </div>

            <div className="space-y-2">
              {subs.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                >
                  <span className="font-bold text-xs text-slate-800 flex-1">{sub.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Max:</span>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={sub.maxMarks}
                      onChange={(e) => handleUpdateSubjectMax(sub.id, Number(e.target.value) || 0)}
                      className="w-16 p-1 text-xs text-center font-bold border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(sub.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Subject row */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="New Subject Name (e.g. Science)"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                className="flex-1 text-xs p-2 border border-slate-300 rounded-lg focus:outline-none"
              />
              <input
                type="number"
                placeholder="Max"
                value={newSubMax}
                onChange={(e) => setNewSubMax(e.target.value)}
                className="w-16 text-xs p-2 text-center border border-slate-300 rounded-lg focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddSubject}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Reset to initial sheet */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset subjects and school details back to initial 2026-27 sheet format?')) {
                  onResetDefaults();
                  setCfg({ ...DEFAULT_SCHOOL_CONFIG });
                  setSubs([...DEFAULT_SUBJECTS]);
                }
              }}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to Original Sheet Format
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all"
          >
            {savedAlert ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savedAlert ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};
