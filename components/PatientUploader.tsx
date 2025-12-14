// components/PatientUploader.tsx
import React, { useState, useRef } from 'react';
import { PatientRecord, MergedRecord } from '../types';
import { Upload, FileText, AlertCircle, FolderInput, CheckCircle, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  onDataLoaded: (data: PatientRecord[]) => void;
  // Optional: pass existing data back in to merge reports against
  existingData?: PatientRecord[];
}

export const PatientUploader: React.FC<Props> = ({ onDataLoaded, existingData }) => {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [localRecords, setLocalRecords] = useState<PatientRecord[]>(existingData || []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Helper to calculate age
  const calculateAge = (dobInput: any, examInput: any): number | string => {
    if (!dobInput || !examInput) return '';
    const dob = new Date(dobInput);
    const exam = new Date(examInput);
    if (isNaN(dob.getTime()) || isNaN(exam.getTime())) return '';
    
    let age = exam.getFullYear() - dob.getFullYear();
    const m = exam.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && exam.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : ''; 
  };

  const calculateTimeToStudy = (startInput: any, endInput: any): string => {
    if (!startInput || !endInput) return '';
    const start = new Date(startInput);
    const end = new Date(endInput);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return 'Error';

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  // Common processor for data from File (Excel/CSV) or Text Area
  const processRawData = (rows: any[][]) => {
    if (rows.length < 2) {
        setError("File appears empty or missing header row.");
        return;
    }

    // Row 0 is assumed to be headers
    const headers = rows[0].map((h: any) => String(h).trim());
    
    const records: PatientRecord[] = rows.slice(1).map((row, idx) => {
      const record: PatientRecord = {
        id: `Unknown-${idx}`,
        name: 'Unknown',
        age: '',
        createdDate: '',
        examDate: '',
        timeToStudy: ''
      };

      let dobVal = null;
      let createdVal = null;
      let doneVal = null;

      headers.forEach((h: string, i: number) => {
        if (row[i] !== undefined && row[i] !== null) {
            const val = row[i];
            const headerLower = h.toLowerCase();
            
            // Smart mapping for specific columns
            if (headerLower === 'id' || headerLower === 'study id' || headerLower === 'mrn' || headerLower === 'studyid') {
                record.id = String(val);
            } else if (headerLower.includes('name') && !headerLower.includes('file')) {
                record.name = String(val);
            } else {
                // Keep all other columns dynamically
                record[h] = val; 
            }

            // Capture dates for calculation
            
            // 1. DOB
            if (headerLower.includes('dob') || headerLower.includes('birth')) {
                dobVal = val;
                record.dob = String(val);
            }
            
            // 2. Created Stamp (Start of study process)
            if (
                headerLower.includes('created') || 
                (headerLower.includes('order') && !headerLower.includes('done') && !headerLower.includes('exam'))
            ) {
                createdVal = val;
                record.createdDate = String(val);
            }

            // 3. Done Stamp (End of study process, used for Age calculation)
            if (
                headerLower.includes('done') || 
                headerLower.includes('exam') || 
                headerLower.includes('study date') || 
                headerLower.includes('finalized')
            ) {
                doneVal = val;
                record.examDate = String(val);
            }
        }
      });
      
      // Calculate Age (using DOB and Done Stamp)
      const calculatedAge = calculateAge(dobVal, doneVal);
      if (calculatedAge !== '') {
          record.age = calculatedAge;
      } else if (record['Age'] || record['age']) {
          record.age = record['Age'] || record['age'];
      }

      // Calculate Time to Study (Done Stamp - Created Stamp)
      const calculatedTime = calculateTimeToStudy(createdVal, doneVal);
      if (calculatedTime) {
          record.timeToStudy = calculatedTime;
      }

      // Fallback: If ID wasn't found in a column named "id", assume first column is ID
      if (record.id.startsWith('Unknown-') && row[0]) {
          record.id = String(row[0]);
      }
      
      return record;
    });

    // UPDATED: MERGE logic instead of replace
    setLocalRecords(prev => {
        const combined = [...prev];
        records.forEach(newRec => {
            const idx = combined.findIndex(c => c.id === newRec.id);
            if (idx !== -1) {
                // Update existing info
                combined[idx] = { ...combined[idx], ...newRec };
            } else {
                // Add new
                combined.push(newRec);
            }
        });
        return combined;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = evt.target?.result;
            // Read the file buffer with cellDates: true to handle Excel dates correctly
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            // Get first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            // Convert to JSON array of arrays (header: 1)
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            processRawData(json);
        } catch (err) {
            console.error(err);
            setError("Failed to parse file. Please ensure it is a valid Excel or CSV file.");
        }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- Folder Upload Logic ---
  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (localRecords.length === 0) {
        setError("Please upload a Patient List (Step 1) before uploading reports.");
        return;
    }
    
    setError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const updatedRecords = [...localRecords] as MergedRecord[];

    // Iterate through all files in the folder
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Skip non-text files for now (PDF parsing requires heavier libraries)
        if (!file.name.endsWith('.txt') && !file.type.includes('text')) {
            continue;
        }

        const textContent = await file.text();
        
        // Try to match file to a patient
        // HEURISTIC: Does the filename contain the Patient ID?
        const matchIndex = updatedRecords.findIndex(r => 
            file.name.includes(r.id) || (r.id.length > 3 && file.name.includes(r.id))
        );

        if (matchIndex !== -1) {
            updatedRecords[matchIndex].radiologyReportText = textContent;
            updatedRecords[matchIndex].reportFilename = file.name;
        }
    }

    setLocalRecords(updatedRecords);
  };

  const finalizeUpload = () => {
    onDataLoaded(localRecords);
  };

  const handleManualProcess = () => {
    setError(null);
    if (!inputText.trim()) return;
    
    const lines = inputText.trim().split('\n');
    const rows = lines.map(line => line.split(',').map(c => c.trim()));
    processRawData(rows);
  };
  
  const handleClear = () => {
      if (confirm("Are you sure you want to clear the upload list? This will remove all loaded patients from this preview.")) {
        setLocalRecords([]);
        setError(null);
      }
  };

  const loadSample = () => {
    const sample = `StudyID,Name,Patient Date of Birth,Date_time order created,Done Stamp,Gender,Mechanism
101,John Doe,1980-05-12,2024-01-15 08:00,2024-01-15 10:30,M,MVA
102,Jane Smith,1992-11-20,2023-12-10 14:00,2023-12-10 16:45,F,Fall from height
103,Bob Jones,1975-02-15,2024-02-01 09:15,2024-02-01 10:00,M,Assault`;
    setInputText(sample);
  };

  // Calculate stats
  const reportsLinked = (localRecords as MergedRecord[]).filter(r => r.radiologyReportText).length;

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Import Data</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        
        {/* Step 1: Patient List */}
        <div>
             <div className="flex justify-between items-center mb-3">
                 <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <span className="bg-slate-200 text-slate-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                    Patient Cohort
                 </h3>
                 {localRecords.length > 0 && (
                     <button onClick={handleClear} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                         <Trash2 className="w-3 h-3" /> Clear List
                     </button>
                 )}
             </div>
             
             {localRecords.length === 0 ? (
                <>
                <p className="text-sm text-slate-500 mb-4">Upload Excel/CSV with Study ID and dates.</p>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors group cursor-pointer"
                     onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-8 h-8 text-indigo-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700">Select List File</p>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        onChange={handleFileUpload}
                    />
                </div>
                {/* Manual Text Fallback */}
                <div className="mt-4">
                    <button onClick={loadSample} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium float-right mb-1">
                        Load Sample
                    </button>
                    <textarea
                        className="w-full h-24 p-2 border border-slate-300 rounded text-xs font-mono"
                        placeholder="Or paste CSV data..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />
                    <button onClick={handleManualProcess} disabled={!inputText} className="mt-2 w-full text-xs py-1 bg-slate-100 border border-slate-300 rounded">
                        Process Text
                    </button>
                </div>
                </>
             ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                        <CheckCircle className="w-5 h-5" />
                        {localRecords.length} Patients Loaded
                    </div>
                    <p className="text-xs text-green-600">
                        You can upload another CSV to <b>append</b> more patients to this list.
                    </p>
                    <div className="mt-3">
                         <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-white border border-green-200 text-green-700 px-2 py-1 rounded shadow-sm hover:bg-green-50">
                            + Add More Patients
                         </button>
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                            onChange={handleFileUpload}
                        />
                    </div>
                </div>
             )}
        </div>

        {/* Step 2: Report Folder */}
        <div className={`transition-opacity ${localRecords.length === 0 ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="bg-slate-200 text-slate-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                Radiology Reports
            </h3>
            <p className="text-sm text-slate-500 mb-4">
                Upload a folder of <strong>.txt</strong> files.<br/>
                Filenames must contain the Study ID to match.
            </p>
            
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors group cursor-pointer"
                 onClick={() => folderInputRef.current?.click()}>
                <FolderInput className="w-8 h-8 text-amber-400 mb-2" />
                <p className="text-sm font-medium text-slate-700">Select Folder</p>
                <input 
                    type="file" 
                    ref={folderInputRef} 
                    className="hidden"
                    // @ts-ignore - webkitdirectory is standard in modern browsers but missing in some React types
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFolderUpload}
                />
            </div>
            
            <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-200">
                 <div className="flex justify-between items-center text-sm font-medium text-slate-700 mb-1">
                    <span>Reports Matched:</span>
                    <span className={reportsLinked > 0 ? "text-green-600" : "text-slate-400"}>
                        {reportsLinked} / {localRecords.length}
                    </span>
                 </div>
                 <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: localRecords.length > 0 ? `${(reportsLinked / localRecords.length) * 100}%` : '0%' }}
                    ></div>
                 </div>
                 <p className="text-xs text-slate-400 mt-2">
                    Upload multiple folders if reports are split across directories.
                 </p>
            </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
        </div>
      )}

      {localRecords.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={finalizeUpload}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg shadow-sm hover:bg-indigo-700 font-medium transition-colors"
              >
                  Finish & View Data
              </button>
          </div>
      )}
    </div>
  );
};