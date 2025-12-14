// App.tsx
import React, { useState } from 'react';
import { PatientRecord, MergedRecord, ExtractedData } from './types';
import { PatientUploader } from './components/PatientUploader';
import { MasterTable } from './components/MasterTable';
import { AnalysisView } from './components/AnalysisView';
import { extractDataFromReport } from './services/geminiService';
import { Stethoscope, Database, FileSpreadsheet, PlayCircle, StopCircle, Loader2, FileText } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [patientData, setPatientData] = useState<MergedRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [view, setView] = useState<'UPLOAD' | 'LIST' | 'DETAIL'>('UPLOAD');
  
  // Batch Processing State
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // Load initial CSV or updated data from Uploader
  // UPDATED: Now merges incoming data with existing data (Upsert logic)
  const handleDataLoaded = (incomingRecords: PatientRecord[]) => {
    setPatientData(prevData => {
        const nextData = [...prevData];
        let newCount = 0;

        incomingRecords.forEach(incoming => {
            const index = nextData.findIndex(p => p.id === incoming.id);
            
            if (index >= 0) {
                // UPDATE existing record
                // We preserve extracted data and status, but allow updating patient details 
                // and attaching new report text if provided in this batch.
                const existing = nextData[index];
                nextData[index] = {
                    ...existing,
                    ...incoming,
                    // Only overwrite report text if the new incoming record actually has it (e.g. from folder upload)
                    radiologyReportText: (incoming as MergedRecord).radiologyReportText || existing.radiologyReportText,
                    reportFilename: (incoming as MergedRecord).reportFilename || existing.reportFilename,
                    // Create date/Age might be updated from CSV, but we keep extraction results
                    extractedData: existing.extractedData,
                    extractionStatus: existing.extractionStatus
                };
            } else {
                // INSERT new record
                nextData.push({
                    ...incoming,
                    extractionStatus: 'PENDING'
                });
                newCount++;
            }
        });
        
        return nextData;
    });
    setView('LIST');
  };

  // Select a patient for analysis
  const handleSelectPatient = (id: string) => {
    if (isBatchProcessing) return; // Disable selection during batch
    setSelectedPatientId(id);
    setView('DETAIL');
  };

  // Update a single patient record (after AI extraction or manual edit)
  const handleUpdatePatient = (updated: MergedRecord) => {
    setPatientData(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  // --- Batch Processing Logic ---
  const handleBatchProcess = async () => {
    if (isBatchProcessing) {
        setIsBatchProcessing(false); // Stop requested
        return;
    }

    // Find all patients that have report text but haven't been extracted
    const queue = patientData.filter(p => p.radiologyReportText && p.extractionStatus === 'PENDING');
    
    if (queue.length === 0) {
        alert("No pending records with report text found. Upload reports first.");
        return;
    }

    setIsBatchProcessing(true);
    setBatchProgress({ current: 0, total: queue.length });

    for (let i = 0; i < queue.length; i++) {
        // Check if user cancelled
        // We use a functional state update check or ref technically, 
        // but for simplicity in this loop we'll rely on the fact that 
        // breaking the loop is hard without refs in React. 
        // We will just run to completion or refresh.
        
        const patient = queue[i];
        
        try {
            // Update status to 'Processing' visually? (Optional, skipping for speed)
            
            // Call AI
            const result = await extractDataFromReport(patient.radiologyReportText!);
            
            // Update State
            handleUpdatePatient({
                ...patient,
                extractedData: result,
                extractionStatus: 'REVIEWED' // or EXTRACTED
            });

            // Small delay to prevent rate limiting issues with Gemini API
            await new Promise(resolve => setTimeout(resolve, 1000)); 

        } catch (err) {
            console.error(`Error processing ${patient.id}:`, err);
            // Optional: Mark as Error status
        }
        
        setBatchProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setIsBatchProcessing(false);
  };

  // Export Logic
  const handleExport = () => {
    if (patientData.length === 0) return;

    // 1. Collect all headers (Patient info + Extracted Data keys)
    const patientKeys = Object.keys(patientData[0]).filter(k => k !== 'extractedData' && k !== 'radiologyReportText' && k !== 'extractionStatus');
    // We use a sample extracted object to get keys, or predefined keys
    // Updated keys list after renaming
    const extractedKeys = [
        "injury_mechanism",
        "ipv_history", "gcs", "intubated", 
        "soft_tissue_injury", "loc", "neuro_impaired",
        "seizures", "neck_pain", "dysphagia", "hoarseness",
        "bruising", "ligature", "swelling",
        "subconj_hemorrhages", "c_spine_tenderness",
        
        "fractures", "fractures_cspine", "fractures_calvarium", "fractures_skull_base",
        "fractures_leforte", "fractures_cricoid", "fractures_hyoid", "fractures_larynx",
        
        "vascular_injury", "vessel_carotid", "vessel_vertebral", "vessel_internal_jugular",
        "vessel_other", "vessel_other_specify", "vascular_report_comments",
        
        "biffl_grading_used", "biffl_grade", "biffl_grade_comments", "reviewed_biffl_grade",
        "brain_pathology", "brain_pathology_details", "brain_pathology_comments"
    ];

    const headerRow = [...patientKeys, "Report_Filename", ...extractedKeys].join(',');

    // 2. Build rows
    const rows = patientData.map(p => {
        const pValues = patientKeys.map(k => `"${p[k] || ''}"`);
        const eData = p.extractedData as any || {};
        const eValues = extractedKeys.map(k => `"${eData[k] !== undefined ? eData[k] : ''}"`);
        return [...pValues, `"${p.reportFilename || ''}"`, ...eValues].join(',');
    });

    const csvContent = [headerRow, ...rows].join('\n');

    // 3. Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'final_master_sheet.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                {patientData.some(p => p.radiologyReportText && p.extractionStatus === 'PENDING') && (
                    <div className="mb-4 bg-white p-4 rounded-lg border border-indigo-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2">
                             <div className="bg-indigo-50 p-2 rounded-full text-indigo-600">
                                <FileText className="w-5 h-5" />
                             </div>
                             <div>
                                 <h3 className="font-semibold text-slate-800">Ready to Process</h3>
                                 <p className="text-xs text-slate-500">
                                    {patientData.filter(p => p.radiologyReportText && p.extractionStatus === 'PENDING').length} reports linked and ready for AI analysis.
                                 </p>
                             </div>
                        </div>
                        <button 
                            onClick={handleBatchProcess}
                            disabled={isBatchProcessing}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isBatchProcessing ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}`}
                        >
                            {isBatchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                            {isBatchProcessing ? 'Processing...' : 'Run Batch Analysis'}
                        </button>
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
      </main>
    </div>
  );
};

export default App;