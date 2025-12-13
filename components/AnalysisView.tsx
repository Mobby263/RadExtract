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
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState('');

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
      const result = await extractDataFromReport(textToProcess);
      setData(result);
      setStatus(AppStatus.SUCCESS);
      
      // Save results
      onUpdate({
        ...patient,
        radiologyReportText: textToProcess,
        extractedData: result,
        extractionStatus: 'REVIEWED'
      });
    } catch (err: any) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      // Show the actual error message
      setErrorMsg(err.message || "Failed to extract data. Check API key and try again.");
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
      extractionStatus: 'REVIEWED'
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
             <div className="mt-2 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4" /> {errorMsg}
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
                
                {/* Clinical Information Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b pb-1">Clinical Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Injury Mechanism */}
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
                            <option value={3}>N/A (3)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">GCS</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                            placeholder="e.g. 15"
                            value={data.gcs}
                            onChange={(e) => handleFieldChange('gcs', e.target.value)}
                        />
                    </div>
                    <StatusSelect label="Intubated" value={data.intubated} onChange={(v) => handleFieldChange('intubated', v)} />
                    <StatusSelect label="IPV History" value={data.ipv_history} onChange={(v) => handleFieldChange('ipv_history', v)} />
                    <StatusSelect label="Soft Tissue Inj." value={data.soft_tissue_injury} onChange={(v) => handleFieldChange('soft_tissue_injury', v)} />
                    <StatusSelect label="LOC" value={data.loc} onChange={(v) => handleFieldChange('loc', v)} />
                    <StatusSelect label="Neuro Impaired" value={data.neuro_impaired} onChange={(v) => handleFieldChange('neuro_impaired', v)} />
                    <StatusSelect label="Seizures" value={data.seizures} onChange={(v) => handleFieldChange('seizures', v)} />
                    <StatusSelect label="Neck Pain" value={data.neck_pain} onChange={(v) => handleFieldChange('neck_pain', v)} />
                    <StatusSelect label="Dysphagia" value={data.dysphagia} onChange={(v) => handleFieldChange('dysphagia', v)} />
                    <StatusSelect label="Hoarseness" value={data.hoarseness} onChange={(v) => handleFieldChange('hoarseness', v)} />
                    <StatusSelect label="Bruising" value={data.bruising} onChange={(v) => handleFieldChange('bruising', v)} />
                    <StatusSelect label="Ligature Marks" value={data.ligature} onChange={(v) => handleFieldChange('ligature', v)} />
                    <StatusSelect label="Swelling" value={data.swelling} onChange={(v) => handleFieldChange('swelling', v)} />
                    <StatusSelect label="Subconj. Hemorrh." value={data.subconj_hemorrhages} onChange={(v) => handleFieldChange('subconj_hemorrhages', v)} />
                    <StatusSelect label="C-Spine Tenderness" value={data.c_spine_tenderness} onChange={(v) => handleFieldChange('c_spine_tenderness', v)} />
                  </div>
                </div>

                {/* Fractures Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b pb-1">Fractures</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <StatusSelect label="Fractures (Any)" value={data.fractures} onChange={(v) => handleFieldChange('fractures', v)} />
                    <StatusSelect label="C-Spine" value={data.fractures_cspine} onChange={(v) => handleFieldChange('fractures_cspine', v)} />
                    <StatusSelect label="Calvarium" value={data.fractures_calvarium} onChange={(v) => handleFieldChange('fractures_calvarium', v)} />
                    <StatusSelect label="Skull Base" value={data.fractures_skull_base} onChange={(v) => handleFieldChange('fractures_skull_base', v)} />
                    <StatusSelect label="Le Fort" value={data.fractures_leforte} onChange={(v) => handleFieldChange('fractures_leforte', v)} />
                    <StatusSelect label="Hyoid Bone" value={data.fractures_hyoid} onChange={(v) => handleFieldChange('fractures_hyoid', v)} />
                    <StatusSelect label="Larynx" value={data.fractures_larynx} onChange={(v) => handleFieldChange('fractures_larynx', v)} />
                    <StatusSelect label="Cricoid" value={data.fractures_cricoid} onChange={(v) => handleFieldChange('fractures_cricoid', v)} />
                  </div>
                </div>

                {/* Vascular Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b pb-1">Vascular Injury</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <StatusSelect label="Vascular Injury (Any)" value={data.vascular_injury} onChange={(v) => handleFieldChange('vascular_injury', v)} />
                    <StatusSelect label="Carotid" value={data.vessel_carotid} onChange={(v) => handleFieldChange('vessel_carotid', v)} />
                    <StatusSelect label="Vertebral" value={data.vessel_vertebral} onChange={(v) => handleFieldChange('vessel_vertebral', v)} />
                    <StatusSelect label="Internal Jugular" value={data.vessel_internal_jugular} onChange={(v) => handleFieldChange('vessel_internal_jugular', v)} />
                    <StatusSelect label="Other Vessel" value={data.vessel_other} onChange={(v) => handleFieldChange('vessel_other', v)} />
                    
                    {data.vessel_other === 1 && (
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Specify Other</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded text-sm bg-indigo-50 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                                placeholder="e.g. Basilar Artery"
                                value={data.vessel_other_specify}
                                onChange={(e) => handleFieldChange('vessel_other_specify', e.target.value)}
                            />
                        </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Vascular Comments</label>
                    <input 
                        type="text" 
                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                        value={data.vascular_report_comments}
                        onChange={(e) => handleFieldChange('vascular_report_comments', e.target.value)}
                    />
                  </div>
                </div>

                {/* Biffl Grade */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b pb-1">Grading</h4>
                    <div className="grid grid-cols-2 gap-4">
                         <StatusSelect label="Biffl Grading Used" value={data.biffl_grading_used} onChange={(v) => handleFieldChange('biffl_grading_used', v)} />
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Biffl Grade</label>
                             <select 
                                className="w-full p-2 border border-slate-300 rounded text-sm bg-white hover:border-indigo-300 transition-colors focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                                value={data.biffl_grade}
                                onChange={(e) => handleFieldChange('biffl_grade', e.target.value)}
                            >
                                <option value="">Select Grade</option>
                                <option value="I">I</option>
                                <option value="II">II</option>
                                <option value="III">III</option>
                                <option value="IV">IV</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Grading Comments</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                            value={data.biffl_grade_comments || ''}
                            onChange={(e) => handleFieldChange('biffl_grade_comments', e.target.value)}
                        />
                    </div>
                </div>

                 {/* Brain Pathology */}
                 <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b pb-1">Brain Pathology</h4>
                    <div className="grid grid-cols-2 gap-4">
                         <StatusSelect label="Pathology Present" value={data.brain_pathology} onChange={(v) => handleFieldChange('brain_pathology', v)} />
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Details</label>
                            <select 
                                className="w-full p-2 border border-slate-300 rounded text-sm bg-white hover:border-indigo-300 transition-colors focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                                value={data.brain_pathology_details}
                                onChange={(e) => handleFieldChange('brain_pathology_details', parseInt(e.target.value))}
                            >
                                <option value={0}>None (0)</option>
                                <option value={1}>Ischemia (1)</option>
                                <option value={2}>Hemorrhage (2)</option>
                                <option value={3}>N/A (3)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Brain Comments</label>
                    <input 
                        type="text" 
                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                        value={data.brain_pathology_comments}
                        onChange={(e) => handleFieldChange('brain_pathology_comments', e.target.value)}
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

// Helper sub-component for boolean 0/1/2 selection
const StatusSelect: React.FC<{ label: string, value: number, onChange: (v: number) => void }> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
        <div className="flex bg-white rounded-md border border-slate-300 overflow-hidden">
            <button 
                className={`flex-1 py-1 text-xs font-medium transition-colors focus:outline-none focus:bg-indigo-50 ${value === 1 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => onChange(1)}
                title="Yes (1)"
            >
                Yes (1)
            </button>
            <div className="w-px bg-slate-300"></div>
            <button 
                className={`flex-1 py-1 text-xs font-medium transition-colors focus:outline-none focus:bg-slate-100 ${value === 0 ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => onChange(0)}
                title="No (0)"
            >
                No (0)
            </button>
            <div className="w-px bg-slate-300"></div>
             <button 
                className={`flex-1 py-1 text-xs font-medium transition-colors focus:outline-none focus:bg-slate-100 ${value === 2 ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}
                onClick={() => onChange(2)}
                title="Not Applicable (2)"
            >
                N/A (2)
            </button>
        </div>
    </div>
);