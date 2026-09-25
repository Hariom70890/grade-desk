import React, { useState } from 'react';
import { Subject } from '../types';
import { parsePastedSpreadsheet } from '../utils/exportUtils';
import * as XLSX from 'xlsx';
import { Upload, Clipboard, Check, AlertCircle, X, FileSpreadsheet } from 'lucide-react';

interface PasteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  onImportData: (importedStudents: { rollNo: string; name: string; marks: Record<string, number> }[]) => void;
}

export const PasteImportModal: React.FC<PasteImportModalProps> = ({
  isOpen,
  onClose,
  subjects,
  onImportData,
}) => {
  if (!isOpen) return null;

  const [pastedText, setPastedText] = useState('');
  const [previewData, setPreviewData] = useState<{ rollNo: string; name: string; marks: Record<string, number> }[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const sampleTemplate = `S.No.\tRoll Number\tStudent Name\tMaths\tEnglish\tE.V.S.\tHindi\tG.K.\tDrawing
1\t101\tVaidik Phagore\t54\t52\t56\t49\t55\t9
2\t102\tVihan Suryavanshi\t48\t45\t50\t46\t47\t8
3\t103\tMitanshu Ningwal\t42\t40\t45\t38\t41\t7`;

  const handleParse = (text: string) => {
    setPastedText(text);
    if (!text.trim()) {
      setPreviewData([]);
      setErrorMsg('');
      return;
    }

    try {
      const parsed = parsePastedSpreadsheet(text);
      if (parsed.students.length === 0) {
        setErrorMsg('Could not detect student rows. Please paste tabular data with student names.');
        setPreviewData([]);
      } else {
        setPreviewData(parsed.students);
        setErrorMsg('');
      }
    } catch (err: any) {
      setErrorMsg('Error parsing pasted data: ' + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        handleParse(csv);
      } catch (err: any) {
        setErrorMsg('Failed to read Excel file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = () => {
    if (previewData.length === 0) return;
    onImportData(previewData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">Import Data from Excel / CSV</h3>
              <p className="text-xs text-slate-400">Paste rows directly or upload an Excel (.xlsx / .csv) file</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* File input button */}
          <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-amber-50/70 border border-dashed border-amber-300 rounded-xl">
            <div className="flex items-center gap-2 text-xs text-amber-950 font-medium">
              <Upload className="w-4 h-4 text-amber-600" />
              <span>Have an Excel file? Upload it directly:</span>
            </div>
            <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors">
              Choose .xlsx / .csv
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Paste area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Or Paste Spreadsheet Cells Here:
              </label>
              <button
                type="button"
                onClick={() => handleParse(sampleTemplate)}
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold underline"
              >
                Insert Sample Template
              </button>
            </div>
            <textarea
              rows={6}
              value={pastedText}
              onChange={(e) => handleParse(e.target.value)}
              placeholder="Copy rows from Excel or Google Sheets (Ctrl+C) and paste them here (Ctrl+V)..."
              className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              <AlertCircle className="w-4 h-4" />
              {errorMsg}
            </div>
          )}

          {/* Preview Table */}
          {previewData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Detected {previewData.length} Students Ready to Import:
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="p-2">Roll</th>
                      <th className="p-2">Name</th>
                      {subjects.map((s) => (
                        <th key={s.id} className="p-2 text-center">{s.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.slice(0, 10).map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-600">{p.rollNo}</td>
                        <td className="p-2 font-semibold text-slate-900">{p.name}</td>
                        {subjects.map((s) => (
                          <td key={s.id} className="p-2 text-center font-medium">
                            {p.marks[s.id] !== undefined ? p.marks[s.id] : '--'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.length > 10 && (
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  + {previewData.length - 10} more rows
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={previewData.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white shadow-sm transition-all"
            >
              Import {previewData.length} Students
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
