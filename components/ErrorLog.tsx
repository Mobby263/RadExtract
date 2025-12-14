// components/ErrorLog.tsx
import React from 'react';
import { MergedRecord } from '../types';
import { X, RefreshCw, AlertTriangle, Bug, ServerCrash, Clock, ShieldAlert, CheckCircle } from 'lucide-react';

interface Props {
  errors: MergedRecord[];
  onClose: () => void;
  onRetry: () => void;
}

export const ErrorLog: React.FC<Props> = ({ errors, onClose, onRetry }) => {
  // Helper to categorize errors for easier debugging
  const getErrorType = (msg: string): { type: string, icon: React.ReactNode, color: string } => {
    const m = msg.toLowerCase();
    
    if (m.includes('429') || m.includes('quota') || m.includes('exhausted')) {
        return { type: 'Rate Limit / Quota', icon: <Clock className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    if (m.includes('503') || m.includes('overloaded') || m.includes('service unavailable')) {
        return { type: 'Server Overload', icon: <ServerCrash className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700 border-orange-200' };
    }
    if (m.includes('api key') || m.includes('permission') || m.includes('403')) {
        return { type: 'Auth / Permission', icon: <ShieldAlert className="w-4 h-4" />, color: 'bg-red-100 text-red-700 border-red-200' };
    }
    if (m.includes('json') || m.includes('syntax') || m.includes('parse')) {
        return { type: 'Response Parse Error', icon: <Bug className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700 border-purple-200' };
    }
    if (m.includes('candidate') || m.includes('safety') || m.includes('blocked')) {
        return { type: 'Content Safety Block', icon: <ShieldAlert className="w-4 h-4" />, color: 'bg-rose-100 text-rose-700 border-rose-200' };
    }
    
    return { type: 'General Error', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/50 rounded-t-xl">
            <div className="flex items-center gap-4">
                <div className="bg-red-100 p-3 rounded-full border border-red-200 shadow-sm">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Batch Analysis Issues</h2>
                    <p className="text-sm text-slate-600 mt-0.5">
                        {errors.length} records failed to process. Review the types below to resolve issues.
                    </p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full border border-transparent hover:border-slate-200 transition-all">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-50/50">
            {errors.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <CheckCircle className="w-12 h-12 mb-2 text-green-500" />
                    <p>No errors found.</p>
                </div>
            ) : (
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-100 sticky top-0 shadow-sm z-10 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                        <tr>
                            <th className="px-6 py-4 border-b border-slate-200">Study ID</th>
                            <th className="px-6 py-4 border-b border-slate-200">Error Type</th>
                            <th className="px-6 py-4 border-b border-slate-200 w-1/2">Log Message</th>
                            <th className="px-6 py-4 border-b border-slate-200 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {errors.map(err => {
                            const { type, icon, color } = getErrorType(err.extractionError || '');
                            return (
                                <tr key={err.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-medium text-slate-700">
                                        {err.id}
                                        <div className="text-xs text-slate-400 font-sans mt-0.5 truncate max-w-[150px]">
                                            {err.reportFilename}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${color}`}>
                                            {icon}
                                            {type}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 break-all max-h-24 overflow-y-auto">
                                            {err.extractionError || 'Unknown error occurred'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Action Needed</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-white rounded-b-xl">
            <div className="text-xs text-slate-500 px-2">
                <strong>Tip:</strong> Rate limit errors (429) usually resolve automatically on retry.
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors border border-transparent"
                >
                    Close Log
                </button>
                <button 
                    onClick={onRetry}
                    className="px-5 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow flex items-center gap-2 transition-all active:scale-95"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry {errors.length} Failed Items
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};