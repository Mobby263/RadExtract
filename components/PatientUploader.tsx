// components/PatientUploader.tsx
import React, { useState, useRef } from 'react';
import { PatientRecord } from '../types';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  onDataLoaded: (data: PatientRecord[]) => void;
}

export const PatientUploader: React.FC<Props> = ({ onDataLoaded }) => {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    onDataLoaded(records);
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

  const handleManualProcess = () => {
    setError(null);
    if (!inputText.trim()) return;
    
    // Simple CSV parser for manual text area
    const lines = inputText.trim().split('\n');
    const rows = lines.map(line => line.split(',').map(c => c.trim()));
    processRawData(rows);
  };

  const loadSample = () => {
    const sample = `StudyID,Name,Patient Date of Birth,Date_time order created,Done Stamp,Gender,Mechanism
101,John Doe,1980-05-12,2024-01-15 08:00,2024-01-15 10:30,M,MVA
102,Jane Smith,1992-11-20,2023-12-10 14:00,2023-12-10 16:45,F,Fall from height
103,Bob Jones,1975-02-15,2024-02-01 09:15,2024-02-01 10:00,M,Assault`;
    setInputText(sample);
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Import Patient Cohort</h2>
      <p className="text-slate-500 mb-8">
        Upload an Excel or CSV file. 
        <br/>Required columns for calculations: 
        <span className="font-mono text-xs bg-slate-100 p-1 rounded mx-1">Patient Date of Birth</span>
        <span className="font-mono text-xs bg-slate-100 p-1 rounded mx-1">Date_time order created</span>
        <span className="font-mono text-xs bg-slate-100 p-1 rounded mx-1">Done Stamp</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Option 1: File Upload */}
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors group cursor-pointer"
             onClick={() => fileInputRef.current?.click()}>
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                <Upload className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Upload File</h3>
            <p className="text-sm text-slate-500 mb-4">.xlsx, .xls, .csv</p>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileUpload}
            />
            <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-md shadow-sm group-hover:border-indigo-300 pointer-events-none">
                Select Spreadsheet
            </button>
        </div>

        {/* Option 2: Paste Text */}
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Or Paste CSV Data
                </label>
                <button onClick={loadSample} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    Load Sample
                </button>
            </div>
            <textarea
                className="flex-1 w-full p-3 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none mb-4"
                placeholder={`StudyID, Name, Patient Date of Birth, Created, Done Stamp...\n101, John Doe, ...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
            />
            <button
                onClick={handleManualProcess}
                disabled={!inputText}
                className="w-full px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 disabled:opacity-50 font-medium transition-colors"
            >
                Process Text
            </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
        </div>
      )}
    </div>
  );
};
