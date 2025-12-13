// App.tsx
import React, { useState } from 'react';
import { PatientRecord, MergedRecord, ExtractedData } from './types';
import { PatientUploader } from './components/PatientUploader';
import { MasterTable } from './components/MasterTable';
import { AnalysisView } from './components/AnalysisView';
import { Stethoscope, Database, FileSpreadsheet } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [patientData, setPatientData] = useState<MergedRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [view, setView] = useState<'UPLOAD' | 'LIST' | 'DETAIL'>('UPLOAD');

  // Load initial CSV
  const handleDataLoaded = (records: PatientRecord[]) => {
    const merged: MergedRecord[] = records.map(r => ({
      ...r,
      extractionStatus: 'PENDING'
    }));
    setPatientData(merged);
    setView('LIST');
  };

  // Select a patient for analysis
  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id);
    setView('DETAIL');
  };

  // Update a single patient record (after AI extraction or manual edit)
  const handleUpdatePatient = (updated: MergedRecord) => {
    setPatientData(prev => prev.map(p => p.id === updated.id ? updated : p));
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

    const headerRow = [...patientKeys, ...extractedKeys].join(',');

    // 2. Build rows
    const rows = patientData.map(p => {
        const pValues = patientKeys.map(k => `"${p[k] || ''}"`);
        const eData = p.extractedData as any || {};
        const eValues = extractedKeys.map(k => `"${eData[k] !== undefined ? eData[k] : ''}"`);
        return [...pValues, ...eValues].join(',');
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
      <header className="bg-indigo-900 text-white shadow-md">
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
            
            {patientData.length > 0 && (
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
                        <FileSpreadsheet className="w-4 h-4" /> Import New
                    </button>
                </div>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 overflow-hidden">
        {view === 'UPLOAD' && (
            <div className="max-w-2xl mx-auto mt-10">
                <PatientUploader onDataLoaded={handleDataLoaded} />
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
            <div className="h-[calc(100vh-140px)]">
                <MasterTable 
                    data={patientData} 
                    onSelect={handleSelectPatient} 
                    onExport={handleExport}
                />
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