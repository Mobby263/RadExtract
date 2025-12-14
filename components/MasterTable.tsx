// components/MasterTable.tsx
import React from 'react';
import { MergedRecord } from '../types';
import { Edit2, CheckCircle, Clock, AlertCircle, Download, FileText } from 'lucide-react';

interface Props {
  data: MergedRecord[];
  onSelect: (id: string) => void;
  onExport: () => void;
}

export const MasterTable: React.FC<Props> = ({ data, onSelect, onExport }) => {
  
  const getStatusIcon = (row: MergedRecord) => {
    switch (row.extractionStatus) {
      case 'REVIEWED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'EXTRACTED': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default: 
        // If text is present but not extracted, show a document icon indicating "Ready"
        if (row.radiologyReportText) {
            return <FileText className="w-4 h-4 text-indigo-500" />;
        }
        return <Clock className="w-4 h-4 text-slate-300" />;
    }
  };

  // Render raw codes 1, 0, 9, 999 for data sheet clarity
  const renderStatus = (val: number | undefined) => {
    if (val === 1) return <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded text-xs font-mono font-bold">1</span>;
    if (val === 0) return <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded text-xs font-mono">0</span>;
    if (val === 9) return <span className="text-slate-300 font-mono text-xs">9</span>;
    if (val === 999) return <span className="bg-purple-50 text-purple-600 border border-purple-100 px-1 py-0.5 rounded text-xs font-mono">999</span>;
    return <span className="text-slate-200">-</span>;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
        <div>
            <h2 className="text-lg font-semibold text-slate-800">Patient Data Sheet</h2>
            <p className="text-xs text-slate-500">
                {data.length} records • {data.filter(d => d.extractionStatus === 'REVIEWED').length} completed
            </p>
        </div>
        <button 
            onClick={onExport}
            className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
        >
            <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 sticky top-0 z-10 text-xs uppercase font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3 border-b">Status</th>
              <th className="px-4 py-3 border-b">Study ID</th>
              <th className="px-4 py-3 border-b">Patient Name</th>
              <th className="px-4 py-3 border-b">Report File</th>
              <th className="px-4 py-3 border-b">Time to Study</th>
              <th className="px-4 py-3 border-b text-center">Fracture?</th>
              <th className="px-4 py-3 border-b text-center">Vascular?</th>
              <th className="px-4 py-3 border-b text-center">Brain Path?</th>
              <th className="px-4 py-3 border-b text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-indigo-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2" title={row.extractionStatus}>
                    {getStatusIcon(row)}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{row.id}</td>
                <td className="px-4 py-3">{row.name || '-'}</td>
                <td className="px-4 py-3 text-xs font-mono text-slate-500 truncate max-w-[150px]" title={row.reportFilename}>
                    {row.reportFilename || <span className="text-slate-200 italic">No file</span>}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{row.timeToStudy || '-'}</td>
                
                {/* Quick stats columns using renamed variables */}
                <td className="px-4 py-3 text-center">
                    {renderStatus(row.extractedData?.fractures)}
                </td>
                <td className="px-4 py-3 text-center">
                    {renderStatus(row.extractedData?.vascular_injury)}
                </td>
                 <td className="px-4 py-3 text-center">
                    {renderStatus(row.extractedData?.brain_pathology)}
                </td>

                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onSelect(row.id)}
                    className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> {row.extractionStatus === 'PENDING' ? 'Process' : 'Edit'}
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
                <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                        No patients loaded yet. Start by uploading the initial extract.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};