'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, History, Loader2, RefreshCw } from 'lucide-react';

const ENTITY_OPTIONS = [
  { id: 'ASSET', name: 'Assets', desc: 'Asset tags, names, categories, branch assignments', sample: 'assetTag,name,category,branchCode\nAST-001,Main Transformer 1,Electrical,HQ-ACC' },
  { id: 'CUSTOMER', name: 'Customers & Sites', desc: 'Customer accounts, contact emails and phone numbers', sample: 'customerNumber,name,email,phone,address\nCUST-001,Accra Mining Ltd,mining@accra.com,0302111222,Ring Road West' },
  { id: 'INVENTORY', name: 'Inventory & Opening Stock', desc: 'Parts catalog, stores and opening WAC stock balances', sample: 'partNumber,name,category,uom,storeCode,openingQty,unitCost\nPART-001,HVAC Filter MERV 13,SPARE_PARTS,PCS,STORE-HQ,50,45.00' },
  { id: 'USER', name: 'Users & Personnel', desc: 'Staff members, email, roles and branch access', sample: 'email,name,roleName,branchCode,phone\nstaff1@zemifix.local,Kwesi Staff,Technician,HQ-ACC,0244000111' },
];

export const ImportView: React.FC = () => {
  const [entityType, setEntityType] = useState<'ASSET' | 'CUSTOMER' | 'INVENTORY' | 'USER'>('ASSET');
  const [fileName, setFileName] = useState('import_data.csv');
  const [csvContent, setCsvContent] = useState('');
  const [validating, setValidating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/import/history');
      const data = await res.json();
      if (data.success) {
        setHistory(data.batches);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const handleSelectEntity = (type: 'ASSET' | 'CUSTOMER' | 'INVENTORY' | 'USER') => {
    setEntityType(type);
    const opt = ENTITY_OPTIONS.find((o) => o.id === type);
    if (opt) setCsvContent(opt.sample);
    setValidationResult(null);
    setExecutionResult(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent((event.target?.result as string) || '');
      setValidationResult(null);
      setExecutionResult(null);
    };
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    setExecutionResult(null);
    try {
      const res = await fetch('/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, fileName, csvContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Validation failed');
      setValidationResult(data);
    } catch (err: any) {
      alert(`Validation error: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  const handleExecute = async () => {
    if (!confirm('Are you sure you want to execute this import into the live PostgreSQL database?')) return;
    setExecuting(true);
    try {
      const res = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, fileName, csvContent, batchId: validationResult?.batchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execution failed');
      setExecutionResult(data);
      void fetchHistory();
    } catch (err: any) {
      alert(`Import execution error: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Data Management</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">Bulk Data Import Engine</h1>
          <p className="mt-1 text-sm text-slate-500">Secure CSV upload, RFC 4180 parsing, validation preflight, and WAC inventory balance initialization.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('import')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold ${activeTab === 'import' ? 'bg-[#FF5B00] text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
          >
            New Import
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold ${activeTab === 'history' ? 'bg-[#FF5B00] text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
          >
            Import History
          </button>
        </div>
      </div>

      {activeTab === 'import' ? (
        <div className="space-y-6">
          {/* Entity Selector */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#FF5B00]">1. Select Entity Type</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ENTITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleSelectEntity(opt.id as any)}
                  className={`rounded-xl border p-4 text-left transition-all ${entityType === opt.id ? 'border-[#FF5B00] bg-orange-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <p className="text-xs font-bold text-[#0B1336]">{opt.name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Upload / CSV Editor */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#FF5B00]">2. CSV Data & Mapping</p>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                <UploadCloud className="h-3.5 w-3.5 text-[#FF5B00]" />
                Upload CSV File
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <textarea
              rows={8}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="w-full font-mono text-xs rounded-lg border border-slate-200 p-3 focus:border-[#FF5B00] focus:outline-none"
              placeholder="Paste RFC 4180 CSV content here..."
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">File: {fileName}</span>
              <button
                onClick={handleValidate}
                disabled={validating || !csvContent.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0B1336] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {validating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Run Validation Preflight
              </button>
            </div>
          </div>

          {/* Validation Results Preview */}
          {validationResult && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#FF5B00]">3. Validation Preview</p>
                  <h3 className="text-sm font-bold text-[#0B1336]">
                    {validationResult.valid ? 'Batch is valid and ready to execute' : 'Validation errors detected'}
                  </h3>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="rounded bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">Total: {validationResult.totalRows}</span>
                  <span className="rounded bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">Valid: {validationResult.successRows}</span>
                  <span className="rounded bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">Errors: {validationResult.errorRows}</span>
                </div>
              </div>

              {/* Error table if any */}
              {validationResult.errorRows > 0 && (
                <div className="overflow-x-auto rounded-lg border border-rose-200 bg-rose-50/30">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-rose-50 text-[10px] uppercase font-bold text-rose-800">
                      <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Data Sample</th><th className="px-3 py-2">Validation Errors</th></tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100">
                      {validationResult.rows.filter((r: any) => r.status === 'ERROR').map((row: any) => (
                        <tr key={row.rowIndex}>
                          <td className="px-3 py-2 font-mono font-bold text-rose-700">{row.rowIndex}</td>
                          <td className="px-3 py-2 font-mono text-slate-600 truncate max-w-xs">{JSON.stringify(row.data)}</td>
                          <td className="px-3 py-2 text-rose-700 font-semibold">{row.errors.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {validationResult.valid && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleExecute}
                    disabled={executing}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#E65200] disabled:opacity-50"
                  >
                    {executing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Execute Import into PostgreSQL
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Execution Result */}
          {executionResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">Import Batch Executed Successfully</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Successfully imported {executionResult.successRows} records with {executionResult.errorRows} errors. Persisted to database and audit log recorded.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History Tab */
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#0B1336]">Import Execution History</h3>
            <button onClick={fetchHistory} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600">
                <tr>
                  <th className="px-3.5 py-2.5">Batch ID</th>
                  <th className="px-3.5 py-2.5">Entity</th>
                  <th className="px-3.5 py-2.5">File Name</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Total</th>
                  <th className="px-3.5 py-2.5 text-right">Success</th>
                  <th className="px-3.5 py-2.5 text-right">Errors</th>
                  <th className="px-3.5 py-2.5">Executed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No import batches recorded yet.</td></tr>
                ) : (
                  history.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-3.5 py-2.5 font-mono text-slate-500">{b.id.slice(0, 8)}...</td>
                      <td className="px-3.5 py-2.5 font-bold text-[#0B1336]">{b.entityType}</td>
                      <td className="px-3.5 py-2.5 text-slate-700">{b.fileName}</td>
                      <td className="px-3.5 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${b.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono">{b.totalRows}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-emerald-600">{b.successRows}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-rose-600">{b.errorRows}</td>
                      <td className="px-3.5 py-2.5 text-slate-500">{new Date(b.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
