import React, { useState, useEffect, useRef } from 'react';
import { Subject, Student } from '../types';
import { X, CheckCircle, ArrowRight, ArrowLeft, Zap, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RapidEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  students: Student[];
  currentMarks: Record<string, Record<string, number | null>>;
  onSaveMark: (studentId: string, subjectId: string, mark: number | null) => void;
  termTitle: string;
}

export const RapidEntryModal: React.FC<RapidEntryModalProps> = ({
  isOpen,
  onClose,
  subjects,
  students,
  currentMarks,
  onSaveMark,
  termTitle,
}) => {
  if (!isOpen) return null;

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const currentStudent = students[currentIndex];

  useEffect(() => {
    if (currentStudent && selectedSubject) {
      const existing = currentMarks[currentStudent.id]?.[selectedSubject.id];
      setInputValue(existing !== undefined && existing !== null ? String(existing) : '');
      setErrorMsg('');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [currentIndex, selectedSubjectId, currentMarks, currentStudent, selectedSubject]);

  const handleNext = () => {
    if (!selectedSubject || !currentStudent) return;

    if (inputValue.trim() === '') {
      onSaveMark(currentStudent.id, selectedSubject.id, null);
      advance();
      return;
    }

    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed === 'ab' || trimmed === 'a' || trimmed === 'absent') {
      onSaveMark(currentStudent.id, selectedSubject.id, 0);
      advance();
      return;
    }

    const num = Number(inputValue);
    if (isNaN(num)) {
      setErrorMsg('Please enter a valid number or "Ab" for Absent');
      return;
    }

    if (num < 0) {
      setErrorMsg('Marks cannot be negative');
      return;
    }

    if (num > selectedSubject.maxMarks) {
      setErrorMsg(`Maximum marks for ${selectedSubject.name} is ${selectedSubject.maxMarks}`);
      return;
    }

    // Save
    onSaveMark(currentStudent.id, selectedSubject.id, num);
    advance();
  };

  const advance = () => {
    setErrorMsg('');
    if (currentIndex < students.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed subject entry!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
      // Optionally stay or notify
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setErrorMsg('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleNext();
    }
  };

  // Quick preset buttons for touch/fast entry
  const presetRatios = [0.5, 0.75, 0.9, 1.0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-200 animate-pulse" />
            <div>
              <h3 className="font-bold text-lg leading-tight">Rapid Data Entry Mode</h3>
              <p className="text-xs text-amber-100">{termTitle} • Step-by-Step Focus</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subject Selector Tabs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Select Subject to Grade:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {subjects.map((sub) => {
              const isSelected = sub.id === selectedSubjectId;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubjectId(sub.id);
                    setCurrentIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-400/40'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {sub.name} <span className="opacity-75 font-normal">({sub.maxMarks})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Entry Card */}
        {currentStudent && selectedSubject && (
          <div className="p-6 flex-1 flex flex-col items-center text-center">
            {/* Progress indicator */}
            <div className="w-full flex items-center justify-between text-xs text-slate-500 mb-4 font-medium">
              <span>
                Student <strong className="text-slate-800">{currentIndex + 1}</strong> of {students.length}
              </span>
              <span>
                Subject: <strong className="text-amber-600">{selectedSubject.name}</strong> (Max: {selectedSubject.maxMarks})
              </span>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-6">
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / students.length) * 100}%` }}
              />
            </div>

            {/* Student Info Card */}
            <div className="w-full bg-amber-50/60 rounded-xl p-4 border border-amber-200/60 mb-6 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <span className="inline-block text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 mb-1">
                    Roll No: {currentStudent.rollNo}
                  </span>
                  <h4 className="text-xl font-bold text-slate-900">{currentStudent.name}</h4>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">S.No.</span>
                  <div className="text-lg font-bold text-slate-700">#{currentStudent.sNo}</div>
                </div>
              </div>
            </div>

            {/* Big Input */}
            <div className="w-full max-w-xs mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Enter Marks Obtained (0 - {selectedSubject.maxMarks})
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="number"
                  step="any"
                  min="0"
                  max={selectedSubject.maxMarks}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setErrorMsg('');
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={`0 - ${selectedSubject.maxMarks}`}
                  className="w-full text-center text-4xl font-extrabold text-slate-900 py-3 px-4 border-2 border-amber-400 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-400/30 focus:border-amber-500 bg-white shadow-inner"
                />
                <span className="absolute right-3 bottom-3 text-xs font-semibold text-slate-400">
                  / {selectedSubject.maxMarks}
                </span>
              </div>
              {errorMsg && (
                <p className="text-xs text-red-600 font-semibold mt-2 animate-bounce">
                  ⚠️ {errorMsg}
                </p>
              )}
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5 mb-6">
              <span className="text-[11px] text-slate-400 mr-1">Quick fill:</span>
              {presetRatios.map((ratio) => {
                const mark = Math.round(selectedSubject.maxMarks * ratio);
                return (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => {
                      setInputValue(String(mark));
                      setErrorMsg('');
                      inputRef.current?.focus();
                    }}
                    className="px-2.5 py-1 text-xs rounded-md bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600 font-semibold border border-slate-200 transition-colors"
                  >
                    {mark}
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="w-full flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02]"
              >
                {currentIndex === students.length - 1 ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Save & Complete
                  </>
                ) : (
                  <>
                    Save & Next (Enter) <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
