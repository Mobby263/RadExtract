// components/AnalysisView.tsx
import React, { useState, useEffect } from 'react';
import { MergedRecord, ExtractedData, AppStatus } from '../types';
import { extractDataFromReport } from '../services/geminiService';
import { Loader2, CheckCircle, AlertCircle, FileText, BrainCircuit, Sparkles } from 'lucide-react';

interface Props {
  patient: MergedRecord;
  onUpdate: (updatedPatient: MergedRecord) => void;
  onBack: () => void;
}

export const AnalysisView: React.FC<Props> = ({ patient, onUpdate, onBack }) => {
  const [reportText, setReportText] = useState(patient.radiologyReportText || '');
  const [data, setData] = useState<ExtractedData | undefined>(patient.extractedData);
  
  // Initialize status/error based on passed patient record
  const [status, setStatus] = useState<AppStatus>(
      patient.extractionStatus === 'ERROR' ? AppStatus.ERROR : 
      patient.extractionStatus === 'REVIEWED' ? AppStatus.SUCCESS : AppStatus.IDLE
  );
  const [errorMsg, setErrorMsg] = useState(patient.extractionError || '');

  // Allow passing specific text (e.g., from paste event) or use current state
  const handleExtract = async (textOverride?: string) => {
    const textToProcess = textOverride ?? reportText;
    
    if (!textToProcess || !textToProcess.trim()) {
        setErrorMsg("Please enter report text first.");
        return;
    }
    
    setStatus(AppStatus.LOADING);
    setErrorMsg('');
    
    try {
      const result = await extractDataFromReport(textToProcess, patient.clinicInfo);
      setData(result);
      setStatus(AppStatus.SUCCESS);
      
      // Save results
      onUpdate({
        ...patient,
        radiologyReportText: textToProcess,
        extractedData: result,
        extractionStatus: 'REVIEWED',
        extractionError: undefined // Clear previous errors
      });
    } catch (err: any) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      
      // Robust error message extraction
      let msg = "Failed to extract data. Check API key and try again.";
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'string') {
        msg = err;
      } else if (err && typeof err === 'object') {
        // Try to stringify if it's an object (like a raw API response error)
        try {
            msg = JSON.stringify(err);
            if (msg === '{}') msg = "Unknown error occurred (empty object).";
        } catch (e) {
            msg = "Unknown error occurred.";
        }
      }
      
      setErrorMsg(msg);
      // We don't necessarily update the parent record here unless we want to persist the 'ERROR' status
      // For now, let's persist it so it shows in the list if they go back
      onUpdate({
          ...patient,
          extractionStatus: 'ERROR',
          extractionError: msg
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    // If the text area is mostly empty and we paste a significant amount of text,
    // we assume it's a new report and trigger extraction automatically.
    if (reportText.trim().length < 50 && pastedText.length > 50) {
        // Trigger extraction with the pasted text
        handleExtract(pastedText);
    }
  };

  const handleFieldChange = (key: keyof ExtractedData, value: any) => {
    if (!data) return;
    const newData = { ...data, [key]: value };
    setData(newData);
    onUpdate({
      ...patient,
      radiologyReportText: reportText,
      extractedData: newData,
      extractionStatus: 'REVIEWED',
      extractionError: undefined
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
        <div>
          <button onClick={onBack} className="text-sm text-slate-500 hover:text-indigo-600 mb-1">
            ← Back to List
          </button>
          <h2 className="text-2xl font-bold text-slate-800">
            {patient.name} <span className="text-slate-400 font-normal">#{patient.id}</span>
          </h2>
        </div>
        <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
                status === AppStatus.SUCCESS ? 'bg-green-100 text-green-700' : 
                status === AppStatus.LOADING ? 'bg-indigo-100 text-indigo-700' :
                status === AppStatus.ERROR ? 'bg-red-100 text-red-700' :
                'bg-slate-100 text-slate-600'
            }`}>
                {status === AppStatus.LOADING && <Loader2 className="w-3 h-3 animate-spin" />}
                {status === AppStatus.SUCCESS && <CheckCircle className="w-3 h-3" />}
                {status === AppStatus.ERROR && <AlertCircle className="w-3 h-3" />}
                {status === AppStatus.SUCCESS ? 'Extraction Complete' : 
                 status === AppStatus.LOADING ? 'Analyzing Report...' : 
                 status === AppStatus.ERROR ? 'Error' :
                 'Ready to Process'}
            </span>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left: Report Input */}
        <div className="w-1/2 flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Radiology Report Text
          </label>
          <div className="flex-1 relative group">
            <textarea
              className="w-full h-full p-4 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm leading-relaxed font-mono bg-slate-50 focus:bg-white transition-colors"
              placeholder="Paste the full text of the radiology report here. Data extraction will start automatically..."
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              onPaste={handlePaste}
            />
            {status === AppStatus.IDLE && !reportText && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    <div className="flex flex-col items-center text-slate-400">
                        <FileText className="w-12 h-12 mb-2" />
                        <span className="text-sm font-medium">Paste Report to Analyze</span>
                    </div>
                </div>
            )}
            
            <button
              onClick={() => handleExtract()}
              disabled={status === AppStatus.LOADING || !reportText}
              className="absolute bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-md shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all z-10"
            >
              {status === AppStatus.LOADING ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
              ) : (
                <><BrainCircuit className="w-4 h-4" /> {data ? 'Re-analyze' : 'Extract Data'}</>
              )}
            </button>
          </div>
          {errorMsg && (
             <div className="mt-2 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-start gap-2 border border-red-200 break-words overflow-y-auto max-h-32">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> 
                <span>{errorMsg}</span>
             </div>
          )}
        </div>

        {/* Right: Extracted Data Form */}
        <div className="w-1/2 overflow-y-auto pr-2 scroll-smooth">
          <div className={`bg-white p-6 rounded-lg border transition-all ${status === AppStatus.LOADING ? 'border-indigo-200 shadow-indigo-100 shadow-lg' : 'border-slate-200'}`}>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              {status === AppStatus.LOADING ? (
                 <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              ) : (
                 <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              Extracted Variables
            </h3>
            
            {!data && status !== AppStatus.LOADING && (
              <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                <BrainCircuit className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Paste a report to automatically populate these fields.</p>
              </div>
            )}

            {status === AppStatus.LOADING && !data && (
                <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-1/3 mb-6"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-10 bg-slate-100 rounded"></div>
                        <div className="h-10 bg-slate-100 rounded"></div>
                        <div className="h-10 bg-slate-100 rounded"></div>
                        <div className="h-10 bg-slate-100 rounded"></div>
                    </div>
                </div>
            )}

            {data && (
              <div className={`space-y-8 transition-opacity duration-500 ${status === AppStatus.LOADING ? 'opacity-50' : 'opacity-100'}`}>
                
                {/* Patient / Clinical Information Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b pb-1">Clinical Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Injury Mechanism</label>
                        <select 
                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white hover:border-indigo-300 transition-colors focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                            value={data.injury_mechanism}
                            onChange={(e) => handleFieldChange('injury_mechanism', parseInt(e.target.value))}
                        >
                            <option value={0}>Other / Unknown (0)</option>
                            <option value={1}>Strangulation (1)</option>
                            <option value={2}>Hanging (2)</option>
                            <option value={9}>N/A (9)</option>
                            <option value={999}>Missing (999)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">GCS</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                            placeholder="e.g. 15"
                            value={data.gcs}
                            onChange={(e) => handleFieldChange('gcs', e.target.value)}
                        />
                    </div>
                    <StatusSelect label="Intubated" value={data.intubated} onChange={(v) => handleFieldChange('intubated', v)} />
                    <StatusSelect label="GBV History" value={data.gbv} onChange={(v) => handleFieldChange('gbv', v)} />
                    <StatusSelect label="Soft Tissue Inj." value={data.soft_tissue_injury} onChange={(v) => handleFieldChange('soft_tissue_injury', v)} />
                    <StatusSelect label="Neckpain" value={data.neckpain} onChange={(v) => handleFieldChange('neckpain', v)} />
                    <StatusSelect label="Dysphagia" value={data.dysphagia} onChange={(v) => handleFieldChange('dysphagia', v)} />
                    <StatusSelect label="Bruising" value={data.bruising} onChange={(v) => handleFieldChange('bruising', v)} />
                    <StatusSelect label="Ligature" value={data.ligature} onChange={(v) => handleFieldChange('ligature', v)} />
                    <StatusSelect label="Swelling" value={data.swelling} onChange={(v) => handleFieldChange('swelling', v)} />
                    <StatusSelect label="Subconj. Hemorrhages" value={data.subconj_hemorrhages} onChange={(v) => handleFieldChange('subconj_hemorrhages', v)} />
                    <StatusSelect label="C-Spine Tenderness" value={data.cspine_tenderness} onChange={(v) => handleFieldChange('cspine_tenderness', v)} />
                    <StatusSelect label="Hoarseness" value={data.hoarseness} onChange={(v) => handleFieldChange('hoarseness', v)} />
                    <StatusSelect label="LOC" value={data.loc} onChange={(v) => handleFieldChange('loc', v)} />
                    <StatusSelect label="Focal Neuro" value={data.focal_neuro} onChange={(v) => handleFieldChange('focal_neuro', v)} />
                    <StatusSelect label="Limb Impaired" value={data.limb_impaired} onChange={(v) => handleFieldChange('limb_impaired', v)} />
                    <StatusSelect label="Seizures" value={data.seizures} onChange={(v) => handleFieldChange('seizures', v)} />
                  </div>
                </div>

                {/* Fractures Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b pb-1">Radiology: Fractures</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <StatusSelect label="Any Fracture" value={data.rr_fractures} onChange={(v) => handleFieldChange('rr_fractures', v)} />
                    <StatusSelect label="C-Spine" value={data.rr_fractures_cspine} onChange={(v) => handleFieldChange('rr_fractures_cspine', v)} />
                    <StatusSelect label="Calvarium" value={data.rr_fractures_calvarium} onChange={(v) => handleFieldChange('rr_fractures_calvarium', v)} />
                    <StatusSelect label="Skull Base" value={data.rr_fractures_skullbase} onChange={(v) => handleFieldChange('rr_fractures_skullbase', v)} />
                    <StatusSelect label="Le Fort" value={data.rr_fractures_leforte} onChange={(v) => handleFieldChange('rr_fractures_leforte', v)} />
                    <StatusSelect label="Cricoid" value={data.rr_fractures_cricoid} onChange={(v) => handleFieldChange('rr_fractures_cricoid', v)} />
                    <StatusSelect label="Hyoid" value={data.rr_fractures_hyoid} onChange={(v) => handleFieldChange('rr_fractures_hyoid', v)} />
                    <StatusSelect label="Larynx" value={data.rr_fractures_larynx} onChange={(v) => handleFieldChange('rr_fractures_larynx', v)} />
                  </div>
                </div>

                {/* Vascular Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b pb-1">Radiology: Vascular</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <StatusSelect label="Vascular Injury" value={data.rr_vascular_injury} onChange={(v) => handleFieldChange('rr_vascular_injury', v)} />
                    <StatusSelect label="Carotid" value={data.vessel_carotid} onChange={(v) => handleFieldChange('vessel_carotid', v)} />
                    <StatusSelect label="Vertebral" value={data.vessel_vertebral} onChange={(v) => handleFieldChange('vessel_vertebral', v)} />
                    <StatusSelect label="Other Vessel" value={data.vessel_other} onChange={(v) => handleFieldChange('vessel_other', v)} />
                    
                    {data.vessel_other === 1 && (
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Specify Other Vessel</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded text-sm bg-indigo-50 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                                value={data.vessel_other_specify}
                                onChange={(e) => handleFieldChange('vessel_other_specify', e.target.value)}
                            />
                        </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Vessel Report Comments</label>
                    <textarea 
                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none h-16"
                        value={data.rr_vessel_injured_report_comments}
                        onChange={(e) => handleFieldChange('rr_vessel_injured_report_comments', e.target.value)}
                    />
                  </div>
                </div>

                {/* Biffl Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b pb-1">Biffl Grading</h4>
                  <StatusSelect label="Biffl Used" value={data.rr_biffl_used} onChange={(v) => handleFieldChange('rr_biffl_used', v)} />
                  
                  <div className="grid grid-cols-2 gap-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="space-y-3">
                          <label className="block text-xs font-bold text-indigo-800 uppercase tracking-tight">Carotid</label>
                          <BifflField label="RT Carotid" value={data.rr_biffl_rt_carotid} onChange={(v) => handleFieldChange('rr_biffl_rt_carotid', v)} />
                          <BifflField label="LT Carotid" value={data.rr_biffl_lt_carotid} onChange={(v) => handleFieldChange('rr_biffl_lt_carotid', v)} />
                      </div>
                      <div className="space-y-3">
                          <label className="block text-xs font-bold text-indigo-800 uppercase tracking-tight">Vertebral</label>
                          <BifflField label="RT Vertebral" value={data.rr_biffl_rt_vertebral} onChange={(v) => handleFieldChange('rr_biffl_rt_vertebral', v)} />
                          <BifflField label="LT Vertebral" value={data.rr_biffl_lt_vertebral} onChange={(v) => handleFieldChange('rr_biffl_lt_vertebral', v)} />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div className="space-y-3">
                          <label className="block text-xs font-bold text-indigo-900 uppercase tracking-tight">Reviewed Carotid</label>
                          <BifflField label="RT Carotid (Rev)" value={data.rr_reviewed_biffl_rt_carotid} onChange={(v) => handleFieldChange('rr_reviewed_biffl_rt_carotid', v)} />
                          <BifflField label="LT Carotid (Rev)" value={data.rr_reviewed_biffl_lt_carotid} onChange={(v) => handleFieldChange('rr_reviewed_biffl_lt_carotid', v)} />
                      </div>
                      <div className="space-y-3">
                          <label className="block text-xs font-bold text-indigo-900 uppercase tracking-tight">Reviewed Vertebral</label>
                          <BifflField label="RT Vertebral (Rev)" value={data.rr_reviewed_biffl_rt_vertebral} onChange={(v) => handleFieldChange('rr_reviewed_biffl_rt_vertebral', v)} />
                          <BifflField label="LT Vertebral (Rev)" value={data.rr_reviewed_biffl_lt_vertebral} onChange={(v) => handleFieldChange('rr_reviewed_biffl_lt_vertebral', v)} />
                      </div>
                  </div>
                </div>

                {/* Brain Pathology Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b pb-1">Radiology: Brain Pathology</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <StatusSelect label="Any Pathology" value={data.rr_brain_pathology} onChange={(v) => handleFieldChange('rr_brain_pathology', v)} />
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Pathology Type</label>
                        <select 
                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white hover:border-indigo-300 transition-colors focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                            value={data.rr_brain_pathology_type}
                            onChange={(e) => handleFieldChange('rr_brain_pathology_type', parseInt(e.target.value))}
                        >
                            <option value={0}>None (0)</option>
                            <option value={1}>Ischemia (1)</option>
                            <option value={2}>Hemorrhage (2)</option>
                            <option value={9}>N/A (9)</option>
                            <option value={999}>Missing (999)</option>
                        </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Brain Report Comments</label>
                    <textarea 
                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none h-16"
                        value={data.rr_brain_pathology_report_comments}
                        onChange={(e) => handleFieldChange('rr_brain_pathology_report_comments', e.target.value)}
                    />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper sub-component for Biffl Grade selection
const BifflField: React.FC<{ label: string, value: string, onChange: (v: string) => void }> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase">{label}</label>
        <select 
            className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white hover:border-indigo-300 transition-colors focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">None</option>
            <option value="I">I</option>
            <option value="II">II</option>
            <option value="III">III</option>
            <option value="IV">IV</option>
            <option value="V">V</option>
        </select>
    </div>
);

// Helper sub-component for boolean 0/1/9/999 selection
const StatusSelect: React.FC<{ label: string, value: number, onChange: (v: number) => void }> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
        <div className="flex bg-white rounded-md border border-slate-300 overflow-hidden">
            <button 
                className={`flex-1 py-1 text-xs font-medium transition-colors focus:outline-none focus:bg-indigo-50 ${value === 1 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => onChange(1)}
                title="Yes (1)"
            >
                Yes
            </button>
            <div className="w-px bg-slate-300"></div>
            <button 
                className={`flex-1 py-1 text-xs font-medium transition-colors focus:outline-none focus:bg-slate-100 ${value === 0 ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => onChange(0)}
                title="No (0)"
            >
                No
            </button>
            <div className="w-px bg-slate-300"></div>
             <button 
                className={`flex-1 py-1 text-xs font-medium transition-colors focus:outline-none focus:bg-slate-100 ${value === 9 ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}
                onClick={() => onChange(9)}
                title="Not Applicable (9)"
            >
                N/A
            </button>
            <div className="w-px bg-slate-300"></div>
             <button 
                className={`flex-1 py-1 text-xs font-medium transition-colors focus:outline-none focus:bg-purple-100 ${value === 999 ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' : 'text-slate-400 hover:bg-slate-50'}`}
                onClick={() => onChange(999)}
                title="Missing (999)"
            >
                Msng
            </button>
        </div>
    </div>
);