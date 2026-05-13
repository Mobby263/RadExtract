// App.tsx
import React, { useState } from 'react';
import { PatientRecord, MergedRecord, ExtractedData } from './types';
import { PatientUploader } from './components/PatientUploader';
import { MasterTable } from './components/MasterTable';
import { AnalysisView } from './components/AnalysisView';
import { ErrorLog } from './components/ErrorLog';
import { extractDataFromReport } from './services/geminiService';
import { Stethoscope, Database, FileSpreadsheet, PlayCircle, StopCircle, Loader2, FileText, RefreshCw, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [patientData, setPatientData] = useState<MergedRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [view, setView] = useState<'UPLOAD' | 'LIST' | 'DETAIL'>('UPLOAD');
  const [showErrorLog, setShowErrorLog] = useState(false);
  
  // Batch Processing State
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const processingRef = React.useRef(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // Load initial CSV or updated data from Uploader
  const handleDataLoaded = (incomingRecords: PatientRecord[]) => {
    if (!incomingRecords || incomingRecords.length === 0) {
        setPatientData([]);
        setView('UPLOAD');
        return;
    }

    setPatientData(prevData => {
        const nextData = [...prevData];
        
        incomingRecords.forEach(incoming => {
            const index = nextData.findIndex(p => p.id === incoming.id);
            
            if (index >= 0) {
                // UPDATE existing record
                const existing = nextData[index];
                nextData[index] = {
                    ...existing,
                    ...incoming,
                    radiologyReportText: (incoming as MergedRecord).radiologyReportText || existing.radiologyReportText,
                    reportFilename: (incoming as MergedRecord).reportFilename || existing.reportFilename,
                    extractedData: existing.extractedData,
                    extractionStatus: existing.extractionStatus,
                    extractionError: existing.extractionError
                };
            } else {
                // INSERT new record
                nextData.push({
                    ...incoming,
                    extractionStatus: 'PENDING'
                });
            }
        });
        
        return nextData;
    });
    setView('LIST');
  };

  const handleSelectPatient = (id: string) => {
    if (processingRef.current) return; 
    setSelectedPatientId(id);
    setView('DETAIL');
  };

  const handleUpdatePatient = (updated: MergedRecord) => {
    setPatientData(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  // --- Optimized Batch Processing Logic ---
  const handleBatchProcess = async () => {
    if (isBatchProcessing) {
        setIsBatchProcessing(false); 
        processingRef.current = false;
        return;
    }

    const queue = patientData.filter(p => 
        p.radiologyReportText && 
        (p.extractionStatus === 'PENDING' || p.extractionStatus === 'ERROR')
    );
    
    if (queue.length === 0) {
        alert("No pending or failed records with report text found. Upload reports first.");
        return;
    }

    setIsBatchProcessing(true);
    processingRef.current = true;
    setBatchProgress({ current: 0, total: queue.length });

    // Configuration
    const CONCURRENCY = 10; 
    let activeTasks = 0;
    let completedCount = 0;
    let currentIndex = 0;

    // Use a lookup map for O(1) indexing
    const idToIndexMap = new Map(patientData.map((p, idx) => [p.id, idx]));

    const resultsBuffer: any[] = [];
    const flushBuffer = () => {
        if (resultsBuffer.length === 0) return;
        
        const currentBatch = [...resultsBuffer];
        resultsBuffer.length = 0;

        setPatientData(prevData => {
            const nextData = [...prevData];
            currentBatch.forEach(res => {
                const idx = idToIndexMap.get(res.id);
                if (idx !== undefined && idx !== -1) {
                    if (res.success) {
                        nextData[idx] = {
                            ...nextData[idx],
                            extractedData: res.data as ExtractedData,
                            extractionStatus: 'REVIEWED',
                            extractionError: undefined
                        };
                    } else {
                        nextData[idx] = {
                            ...nextData[idx],
                            extractionStatus: 'ERROR',
                            extractionError: res.error as string
                        };
                    }
                }
            });
            return nextData;
        });
    };

    const runTask = async (patient: MergedRecord) => {
        if (!processingRef.current) return;
        activeTasks++;
        
        try {
            const result = await extractDataFromReport(patient.radiologyReportText!, patient.clinicInfo);
            resultsBuffer.push({ id: patient.id, success: true, data: result });
        } catch (err: any) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            resultsBuffer.push({ id: patient.id, success: false, error: errorMessage });
        } finally {
            activeTasks--;
            completedCount++;
            setBatchProgress(prev => ({ ...prev, current: completedCount }));
            
            // Flush buffer if it's getting large or if we're done
            if (resultsBuffer.length >= 5 || completedCount === queue.length || !processingRef.current) {
                flushBuffer();
            }

            // Start next task if any
            if (currentIndex < queue.length && processingRef.current) {
                runTask(queue[currentIndex++]);
            }

            // Check final completion
            if (completedCount === queue.length || (!processingRef.current && activeTasks === 0)) {
                setIsBatchProcessing(false);
                processingRef.current = false;
            }
        }
    };

    // Initial batch start
    for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
        if (!processingRef.current) break;
        runTask(queue[i]);
        currentIndex++;
    }
  };

  // Export Logic
  const handleExport = () => {
    if (patientData.length === 0) return;

    // Filter out columns as requested (removed: name, timeToStudy, radiologyReportText, status, errors)
    const patientKeys = Object.keys(patientData[0]).filter(k => 
        k !== 'extractedData' && 
        k !== 'radiologyReportText' && 
        k !== 'extractionStatus' && 
        k !== 'extractionError' &&
        k !== 'name' &&
        k !== 'reportFilename'
    );
    
    const extractedKeys = [
        "gbv", "gcs", "intubated", 
        "soft_tissue_injury", "neckpain", "dysphagia", "bruising", 
        "ligature", "swelling", "subconj_hemorrhages", "cspine_tenderness",
        "hoarseness", "focal_neuro", "limb_impaired", "loc", "seizures",
        
        "rr_fractures", "rr_fractures_cspine", "rr_fractures_calvarium", "rr_fractures_skullbase",
        "rr_fractures_leforte", "rr_fractures_cricoid", "rr_fractures_hyoid", "rr_fractures_larynx",
        
        "rr_vascular_injury", "vessel_carotid", "vessel_vertebral",
        "vessel_other", "vessel_other_specify", "rr_vessel_injured_report_comments",
        
        "rr_biffl_used", 
        "rr_biffl_rt_carotid", "rr_biffl_lt_carotid", 
        "rr_biffl_rt_vertebral", "rr_biffl_lt_vertebral",
        "rr_reviewed_biffl_rt_carotid", "rr_reviewed_biffl_lt_carotid",
        "rr_reviewed_biffl_rt_vertebral", "rr_reviewed_biffl_lt_vertebral",

        "rr_brain_pathology", "rr_brain_pathology_type", "rr_brain_pathology_report_comments",
        
        "injury_mechanism"
    ];

    // Single Report_Filename column, removed extraction error column
    const headerRow = [...patientKeys, "Report_Filename", ...extractedKeys].join(',');

    const rows = patientData.map(p => {
        const pValues = patientKeys.map(k => `"${p[k] || ''}"`);
        const eData = p.extractedData as any || {};
        const eValues = extractedKeys.map(k => `"${eData[k] !== undefined ? eData[k] : ''}"`);
        return [...pValues, `"${p.reportFilename || ''}"`, ...eValues].join(',');
    });

    const csvContent = [headerRow, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'final_master_sheet.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const pendingCount = patientData.filter(p => p.radiologyReportText && p.extractionStatus === 'PENDING').length;
  const errorCount = patientData.filter(p => p.extractionStatus === 'ERROR').length;
  const readyToRunCount = pendingCount + errorCount;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-indigo-900 text-white shadow-md z-20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-lg">
                    <Stethoscope className="w-6 h-6 text-indigo-300" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">RadExtract <span className="text-indigo-300 font-normal">AI</span></h1>
                    <p className="text-xs text-indigo-200">Radiology Report Variable Extractor</p>
                </div>
            </div>
            
            {patientData.length > 0 && !isBatchProcessing && (
                <div className="flex gap-4 text-sm">
                    <button 
                        onClick={() => setView('LIST')}
                        className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${view === 'LIST' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                    >
                        <Database className="w-4 h-4" /> Data Sheet
                    </button>
                     <button 
                        onClick={() => setView('UPLOAD')}
                        className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${view === 'UPLOAD' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Import / Add Data
                    </button>
                </div>
            )}
        </div>
      </header>
      
      {/* Batch Progress Bar */}
      {isBatchProcessing && (
          <div className="bg-indigo-800 text-white px-4 py-2 flex items-center justify-between sticky top-0 z-50 shadow-md">
              <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                  <span className="text-sm font-medium">Processing Batch... {batchProgress.current} / {batchProgress.total}</span>
              </div>
              <div className="w-64 h-2 bg-indigo-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-300 transition-all duration-300" 
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  />
              </div>
          </div>
      )}

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 overflow-hidden flex flex-col">
        {view === 'UPLOAD' && (
            <div className="max-w-3xl mx-auto mt-6">
                <PatientUploader 
                    onDataLoaded={handleDataLoaded} 
                    existingData={patientData} 
                />
                {patientData.length > 0 && (
                    <div className="text-center mt-6">
                        <button onClick={() => setView('LIST')} className="text-indigo-600 hover:underline">
                            Cancel and return to list
                        </button>
                    </div>
                )}
            </div>
        )}

        {view === 'LIST' && (
            <div className="h-full flex flex-col">
                {/* Batch Action Bar */}
                {readyToRunCount > 0 && (
                    <div className="mb-4 bg-white p-4 rounded-lg border border-indigo-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2">
                             <div className={`p-2 rounded-full ${errorCount > 0 ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                <FileText className="w-5 h-5" />
                             </div>
                             <div>
                                 <h3 className="font-semibold text-slate-800">Ready to Process</h3>
                                 <p className="text-xs text-slate-500">
                                    {pendingCount} new, <span className={errorCount > 0 ? "text-red-600 font-bold" : ""}>{errorCount} failed</span>. Ready for AI analysis.
                                 </p>
                             </div>
                        </div>
                        <div className="flex gap-2">
                             {errorCount > 0 && (
                                <button
                                    onClick={() => setShowErrorLog(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all"
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                    View Errors
                                </button>
                            )}
                            <button 
                                onClick={handleBatchProcess}
                                disabled={isBatchProcessing}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isBatchProcessing ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}`}
                            >
                                {isBatchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                                {isBatchProcessing ? 'Processing...' : (errorCount > 0 ? 'Retry Batch' : 'Run Batch Analysis')}
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-hidden">
                    <MasterTable 
                        data={patientData} 
                        onSelect={handleSelectPatient} 
                        onExport={handleExport}
                    />
                </div>
            </div>
        )}

        {view === 'DETAIL' && selectedPatientId && (
            <AnalysisView 
                patient={patientData.find(p => p.id === selectedPatientId)!}
                onUpdate={handleUpdatePatient}
                onBack={() => setView('LIST')}
            />
        )}
        
        {/* Error Log Modal */}
        {showErrorLog && (
            <ErrorLog 
                errors={patientData.filter(p => p.extractionStatus === 'ERROR')}
                onClose={() => setShowErrorLog(false)}
                onRetry={() => {
                    setShowErrorLog(false);
                    handleBatchProcess();
                }}
            />
        )}
      </main>
    </div>
  );
};

export default App;