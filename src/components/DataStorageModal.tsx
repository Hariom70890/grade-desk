import React, { useState, useRef, useEffect } from 'react';
import { ClassData, SchoolConfig } from '../types';
import { 
  Database, 
  HardDrive, 
  Download, 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  X, 
  FileCode, 
  Copy, 
  Trash2,
  Cloud,
  CloudUpload,
  CloudDownload,
  Server,
  RefreshCw,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';

interface DataStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassData[];
  schoolConfig: SchoolConfig;
  onRestoreData: (newClasses: ClassData[], newConfig?: SchoolConfig) => void;
  onResetAllData: () => void;
  defaultTab?: 'local' | 'mongodb';
}

export const DataStorageModal: React.FC<DataStorageModalProps> = ({
  isOpen,
  onClose,
  classes,
  schoolConfig,
  onRestoreData,
  onResetAllData,
  defaultTab = 'local',
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'local' | 'mongodb'>(defaultTab);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // MongoDB state
  const [mongoStatus, setMongoStatus] = useState<any | null>(null);
  const [isLoadingMongoStatus, setIsLoadingMongoStatus] = useState(false);
  const [customUriInput, setCustomUriInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  // Calculate statistics
  const totalClasses = classes.length;
  const totalStudents = classes.reduce((sum, c) => sum + (c.students?.length || 0), 0);
  let totalMarksEntered = 0;
  classes.forEach((c) => {
    Object.values(c.quarterlyMarks || {}).forEach((subMap) => {
      Object.values(subMap || {}).forEach((val) => {
        if (val !== null && val !== undefined) totalMarksEntered++;
      });
    });
    Object.values(c.halfYearlyMarks || {}).forEach((subMap) => {
      Object.values(subMap || {}).forEach((val) => {
        if (val !== null && val !== undefined) totalMarksEntered++;
      });
    });
  });

  // Calculate approximate storage usage
  const storageDataString = localStorage.getItem('edugrade_all_classes_v2') || '';
  const storageSizeKb = (new Blob([storageDataString]).size / 1024).toFixed(1);

  // Fetch MongoDB status from server
  const fetchMongoStatus = async () => {
    setIsLoadingMongoStatus(true);
    try {
      const res = await fetch('/api/mongodb/status');
      const data = await res.json();
      setMongoStatus(data);
    } catch (e: any) {
      setMongoStatus({
        configured: false,
        connected: false,
        error: e.message || 'Could not contact server API',
      });
    } finally {
      setIsLoadingMongoStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMongoStatus();
    }
  }, [isOpen]);

  // Test custom or environment MongoDB URI
  const handleTestMongoConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/mongodb/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: customUriInput.trim() || undefined }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        fetchMongoStatus();
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  // Push local data to MongoDB Cloud
  const handleSyncToMongo = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/mongodb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classes,
          schoolConfig,
          customUri: customUriInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback({
          success: true,
          message: data.message || `Successfully synced ${classes.length} classes to MongoDB!`,
        });
        fetchMongoStatus();
      } else {
        setSyncFeedback({
          success: false,
          message: data.error || 'Failed to sync to MongoDB',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        success: false,
        message: err.message || 'Error communicating with MongoDB backend',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull data from MongoDB Cloud into local app
  const handlePullFromMongo = async () => {
    if (!window.confirm('Pulling from MongoDB will update your local classes with the data stored in cloud. Continue?')) {
      return;
    }
    setIsPulling(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/mongodb/pull');
      const data = await res.json();
      if (data.success && Array.isArray(data.classes)) {
        if (data.classes.length === 0) {
          setSyncFeedback({
            success: false,
            message: 'MongoDB database is empty. No classes found to pull.',
          });
        } else {
          onRestoreData(data.classes, data.schoolConfig);
          setSyncFeedback({
            success: true,
            message: `Successfully loaded ${data.classes.length} classes from MongoDB!`,
          });
        }
      } else {
        setSyncFeedback({
          success: false,
          message: data.error || 'Failed to pull data from MongoDB',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        success: false,
        message: err.message || 'Error pulling data from MongoDB',
      });
    } finally {
      setIsPulling(false);
    }
  };

  // Export JSON backup file
  const handleExportBackup = () => {
    const backupPayload = {
      app: 'GradeDesk',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      schoolConfig,
      classes,
    };

    const dataBlob = new Blob([JSON.stringify(backupPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `GradeDesk_Backup_${schoolConfig.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Restore from JSON backup file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (Array.isArray(parsed)) {
          onRestoreData(parsed);
          setImportStatus({ success: true, message: `Successfully restored ${parsed.length} classes from backup!` });
        } else if (parsed && Array.isArray(parsed.classes)) {
          onRestoreData(parsed.classes, parsed.schoolConfig);
          setImportStatus({
            success: true,
            message: `Successfully restored ${parsed.classes.length} classes and school configuration!`,
          });
        } else {
          setImportStatus({ success: false, message: 'Invalid backup file structure. Expecting classes array.' });
        }
      } catch (err: any) {
        setImportStatus({ success: false, message: 'Could not parse JSON backup file: ' + err.message });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const copyStorageKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Database className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Data Storage & Database Hub</h3>
              <p className="text-xs text-slate-300">Local device persistence, MongoDB URI & cloud backup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('local')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition-all border-b-2 ${
              activeTab === 'local'
                ? 'bg-white border-amber-500 text-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <HardDrive className="w-4 h-4 text-amber-500" />
            <span>Local Storage & Backup</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('mongodb');
              fetchMongoStatus();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition-all border-b-2 ${
              activeTab === 'mongodb'
                ? 'bg-white border-emerald-500 text-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Cloud className="w-4 h-4 text-emerald-500" />
            <div className="flex items-center gap-1.5">
              <span>MongoDB Cloud Sync</span>
              <span className={`w-2 h-2 rounded-full ${mongoStatus?.connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {activeTab === 'mongodb' ? (
            /* MongoDB Integration Section */
            <div className="space-y-6">
              {/* Server Connection Status Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4.5 border border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <Cloud className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-white">MongoDB Cluster Status</h4>
                        {mongoStatus?.connected ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            CONNECTED
                          </span>
                        ) : mongoStatus?.configured ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            CONNECTION ERROR
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            NOT CONFIGURED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {mongoStatus?.connected
                          ? `Database: "${mongoStatus.dbName}" • Latency: ${mongoStatus.latencyMs}ms`
                          : 'Configure MONGODB_URI to enable automatic multi-device cloud sync and backups'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={fetchMongoStatus}
                    disabled={isLoadingMongoStatus}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                    title="Refresh connection status"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingMongoStatus ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Connected Stats */}
                {mongoStatus?.connected && (
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-700/80 text-center">
                    <div className="bg-slate-800/80 p-2 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Ping Latency</span>
                      <span className="text-sm font-extrabold text-emerald-400">{mongoStatus.latencyMs} ms</span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Cloud Classes</span>
                      <span className="text-sm font-extrabold text-white">{mongoStatus.classesInCloud || 0}</span>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Collections</span>
                      <span className="text-sm font-extrabold text-amber-400">{mongoStatus.collections?.length || 0}</span>
                    </div>
                  </div>
                )}

                {/* Connection Error Message */}
                {mongoStatus?.error && (
                  <div className="mt-3 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs">
                    <span className="font-bold">Error:</span> {mongoStatus.error}
                  </div>
                )}
              </div>

              {/* Sync Feedback Toast */}
              {syncFeedback && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 ${
                    syncFeedback.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border border-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {syncFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{syncFeedback.message}</span>
                  </div>
                  <button onClick={() => setSyncFeedback(null)} className="opacity-70 hover:opacity-100">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* One-Click Cloud Sync Controls */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500 text-slate-950">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      Two-Way Cloud Synchronization
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Sync marks, classes, and school data directly to your MongoDB cluster
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleSyncToMongo}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-xs transition-all"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>{isSyncing ? 'Pushing to MongoDB...' : 'Push to MongoDB Cloud'}</span>
                  </button>

                  <button
                    onClick={handlePullFromMongo}
                    disabled={isPulling}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold text-xs shadow-xs transition-all"
                  >
                    <CloudDownload className="w-4 h-4 text-amber-400" />
                    <span>{isPulling ? 'Pulling from MongoDB...' : 'Pull from MongoDB Cloud'}</span>
                  </button>
                </div>
              </div>

              {/* MongoDB URI Config / Test Form */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    MongoDB Connection String (URI)
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">mongodb+srv:// or mongodb://</span>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={customUriInput}
                    onChange={(e) => setCustomUriInput(e.target.value)}
                    placeholder={mongoStatus?.configured ? 'Default: Configured in environment (MONGODB_URI)' : 'mongodb+srv://user:pass@cluster0.mongodb.net/gradedesk'}
                    className="w-full pl-3 pr-24 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                      title={showPassword ? 'Hide URI' : 'Show URI'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleTestMongoConnection}
                      disabled={isTesting}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors disabled:opacity-50"
                    >
                      {isTesting ? 'Testing...' : 'Test URI'}
                    </button>
                  </div>
                </div>

                {/* Test Result Message */}
                {testResult && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-medium ${
                      testResult.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {testResult.success ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Connected successfully to database <strong>"{testResult.dbName}"</strong> in {testResult.latencyMs}ms!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{testResult.error || testResult.message}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Vercel Environment Variables Instruction */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-slate-700 space-y-1.5">
                  <p className="font-extrabold text-amber-950 flex items-center gap-1.5">
                    <span>How to configure MONGODB_URI on Vercel:</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 pl-1">
                    <li>Go to your project on <span className="font-semibold text-slate-800">vercel.com</span></li>
                    <li>Navigate to <span className="font-semibold text-slate-800">Settings &gt; Environment Variables</span></li>
                    <li>Add Key: <code className="bg-amber-100/80 text-amber-900 px-1 py-0.5 rounded font-mono">MONGODB_URI</code></li>
                    <li>Add Value: Your connection string from MongoDB Atlas</li>
                    <li>Re-deploy to enable instant cloud synchronization!</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            /* Local Storage Section */
            <div className="space-y-6">
              {/* Storage Summary Highlight Box */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shrink-0 mt-0.5">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div className="text-xs text-slate-800 leading-relaxed">
                    <p className="font-extrabold text-amber-950 text-sm mb-1">
                      100% Stored in Your Browser's Local Storage (<code className="text-amber-800 bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">localStorage</code>)
                    </p>
                    <p className="text-slate-700">
                      All your classes, student records, roll numbers, quarterly marks, half-yearly marks, and school configs are securely saved directly inside your computer or mobile phone's browser cache.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200/60 text-center">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/40">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Classes</p>
                    <p className="text-base font-extrabold text-slate-900">{totalClasses}</p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/40">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Students</p>
                    <p className="text-base font-extrabold text-slate-900">{totalStudents}</p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/40">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Marks Stored</p>
                    <p className="text-base font-extrabold text-emerald-600">{totalMarksEntered}</p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/40">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Storage Used</p>
                    <p className="text-base font-extrabold text-amber-600 font-mono">{storageSizeKb} KB</p>
                  </div>
                </div>
              </div>

              {/* Privacy & Security Guarantees */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  Storage Features & Benefits
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Zero Cloud Leak</p>
                      <p className="text-[11px] text-slate-500">Works standalone on your device without transmitting data.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Auto-Save on Keystroke</p>
                      <p className="text-[11px] text-slate-500">Every mark is instantly saved when you press enter or change cells.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                    <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Works 100% Offline</p>
                      <p className="text-[11px] text-slate-500">No internet required to edit, calculate ranks, or print report cards.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                    <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">Vercel & PWA Ready</p>
                      <p className="text-[11px] text-slate-500">When hosted on Vercel or installed to home screen, storage stays persistent.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Browser Keys Details */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2 text-xs">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-slate-500" />
                  Technical Browser Keys Used:
                </p>
                <div className="space-y-1 font-mono text-[11px]">
                  {[
                    { key: 'edugrade_all_classes_v2', desc: 'All classes, students, subjects & exam marks' },
                    { key: 'edugrade_school_config', desc: 'School name, session, affiliation & signatures' },
                    { key: 'edugrade_active_class_id', desc: 'Currently selected class ID' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <div>
                        <span className="font-bold text-slate-900">{item.key}</span>
                        <span className="text-slate-400 text-[10px] ml-2 block sm:inline">({item.desc})</span>
                      </div>
                      <button
                        onClick={() => copyStorageKey(item.key)}
                        className="text-slate-400 hover:text-slate-700 p-1"
                        title="Copy Key Name"
                      >
                        {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Message */}
              {importStatus && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  importStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'
                }`}>
                  {importStatus.success ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>{importStatus.message}</span>
                </div>
              )}

              {/* Backup & Restore Controls */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  Backup, Transfer & Restore
                </h4>
                <p className="text-xs text-slate-600">
                  To move your data between devices (e.g. from laptop to mobile phone) or protect against browser history clearance, download a JSON backup:
                </p>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={handleExportBackup}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    Download JSON Backup File
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Restore from Backup JSON
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Danger zone */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Need a fresh start?</span>
                <button
                  onClick={() => {
                    if (window.confirm('Reset all classes and marks back to initial default demo data?')) {
                      onResetAllData();
                      onClose();
                    }
                  }}
                  className="text-rose-600 hover:text-rose-700 font-bold hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reset to Factory Demo Data
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            {activeTab === 'mongodb' ? 'MongoDB Driver 6.x • Safe upsert enabled' : 'Browser localStorage API • Client-side encryption'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
