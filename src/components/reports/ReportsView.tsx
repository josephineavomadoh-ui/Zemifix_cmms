'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, Filter, FileBarChart, ArrowRight, Calendar, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { demoPMPlans } from '@/src/lib/demo/preventive';
import { mockTrends } from '@/src/lib/mockData';

const REPORT_CATALOGUE = [
  { category: 'Maintenance', reports: [
    { id: 'work_order_history', name: 'Work Order History', desc: 'Volume, status, actual cost and hours', category: 'maintenance' },
    { id: 'work_order_completion', name: 'Work Order Completion & Overdue', desc: 'Completed vs overdue analysis', category: 'maintenance' },
    { id: 'maintenance_costs', name: 'Maintenance Costs', desc: 'Expenditure by branch and work type', category: 'maintenance' },
    { id: 'pm_compliance', name: 'Preventive Maintenance Compliance', desc: 'Schedules, compliance % and overdue PMs', category: 'maintenance' },
    { id: 'technician_performance', name: 'Technician Performance', desc: 'WOs assigned, hours and cost recorded', category: 'maintenance' },
    { id: 'asset_downtime', name: 'Asset Downtime Report', desc: 'Downtime events, duration and reasons', category: 'maintenance' },
  ]},
  { category: 'Assets', reports: [
    { id: 'master_asset_register', name: 'Master Asset Register', desc: 'Complete equipment register and status', category: 'assets' },
    { id: 'asset_lifecycle', name: 'Asset Lifecycle & Status', desc: 'Installation, warranty and downtime counts', category: 'assets' },
    { id: 'asset_maintenance_history', name: 'Asset Maintenance History', desc: 'Maintenance records by asset', category: 'assets' },
    { id: 'asset_utilization', name: 'Asset Utilization (Meters)', desc: 'Meter readings and utilization metrics', category: 'assets' },
  ]},
  { category: 'Inventory', reports: [
    { id: 'stock_on_hand_valuation', name: 'Stock On Hand Valuation', desc: 'WAC valuation and quantities by store', category: 'inventory' },
    { id: 'low_stock_reorder', name: 'Low Stock & Reorder Report', desc: 'Items at or below reorder levels', category: 'inventory' },
    { id: 'stock_transaction_history', name: 'Stock Transaction History', desc: 'Receipts, issues and ledger movements', category: 'inventory' },
    { id: 'parts_consumption', name: 'Parts Consumption Report', desc: 'Parts issued and cost by item', category: 'inventory' },
    { id: 'inventory_valuation', name: 'Inventory Valuation Summary', desc: 'Valuation summary aggregated by store', category: 'inventory' },
  ]},
  { category: 'Procurement', reports: [
    { id: 'purchase_order_history', name: 'Purchase Order History', desc: 'PO spend, status and supplier history', category: 'procurement' },
    { id: 'outstanding_purchase_orders', name: 'Outstanding Purchase Orders', desc: 'Issued and partially received POs', category: 'procurement' },
    { id: 'vendor_performance', name: 'Vendor Performance Report', desc: 'Supplier ratings, PO count and spend', category: 'procurement' },
    { id: 'goods_received', name: 'Goods Received Notes', desc: 'GRN delivery receipts and warehouse store', category: 'procurement' },
  ]},
  { category: 'Contractor Operations', reports: [
    { id: 'customer_performance', name: 'Customer Performance', desc: 'Customer work orders, invoices and balances', category: 'contractor' },
    { id: 'contract_sla_performance', name: 'Contract & SLA Performance', desc: 'Active contracts, value and site coverage', category: 'contractor' },
    { id: 'billable_work', name: 'Billable Work Orders', desc: 'Customer-linked billable maintenance costs', category: 'contractor' },
    { id: 'quote_conversion', name: 'Quote Conversion Report', desc: 'Quote status and conversion rate', category: 'contractor' },
    { id: 'site_maintenance_history', name: 'Customer Site Maintenance History', desc: 'Maintenance history grouped by client site', category: 'contractor' },
  ]},
  { category: 'Finance', reports: [
    { id: 'commercial_invoice_register', name: 'Commercial Invoice Register', desc: 'Invoices, VAT/NHIL/GETFund and balances', category: 'finance' },
    { id: 'outstanding_receivables', name: 'Outstanding Receivables', desc: 'Unpaid invoices and days overdue', category: 'finance' },
    { id: 'payment_history', name: 'Payment Allocation History', desc: 'Remittances, allocations and unallocated funds', category: 'finance' },
    { id: 'credit_note_register', name: 'Credit Note Register', desc: 'Issued credit notes and reasons', category: 'finance' },
    { id: 'internal_recharge', name: 'Internal Recharge Report', desc: 'Facility mode departmental recharges', category: 'finance' },
  ]},
];

interface ReportDataResponse {
  success: boolean;
  reportId: string;
  title: string;
  totalCount: number;
  page: number;
  pageSize: number;
  summary?: Record<string, any>;
  columns: string[];
  data: (string | number | null)[][];
  error?: string;
}

export const ReportsView: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchId, setBranchId] = useState('');

  const [selectedReport, setSelectedReport] = useState<{ id: string; name: string; category: string; desc: string } | null>(null);
  const [reportResult, setReportResult] = useState<ReportDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const fetchReportData = useCallback(async (reportId: string, category: string, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reports/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          reportId,
          startDate: dateFrom || undefined,
          endDate: dateTo || undefined,
          status: statusFilter || undefined,
          branchId: branchId || undefined,
          page,
          pageSize: 25,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch report');
      }
      setReportResult(data);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message || 'Error executing report query');
      setReportResult(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter, branchId]);

  const handleSelectReport = (r: { id: string; name: string; category: string; desc: string }) => {
    setSelectedReport(r);
    void fetchReportData(r.id, r.category, 1);
  };

  const handleExportCsv = async () => {
    if (!selectedReport) return;
    setExporting(true);
    try {
      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedReport.category,
          reportId: selectedReport.id,
          startDate: dateFrom || undefined,
          endDate: dateTo || undefined,
          status: statusFilter || undefined,
          branchId: branchId || undefined,
        }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport.id}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Reports & Analytics</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">Operational Reports & Dashboards</h1>
          <p className="mt-1 text-sm text-slate-500">Live PostgreSQL database-backed reports, analytics and secure CSV exports across all CMMS modules.</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
        <div className="flex items-center gap-2 text-xs">
          <label className="font-semibold text-slate-600">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-[#FF5B00] focus:outline-none" />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="font-semibold text-slate-600">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-[#FF5B00] focus:outline-none" />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="font-semibold text-slate-600">Status</label>
          <input type="text" placeholder="e.g. COMPLETED" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-[#FF5B00] focus:outline-none" />
        </div>
        {selectedReport && (
          <button onClick={() => void fetchReportData(selectedReport.id, selectedReport.category, 1)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#E65200]">
            <Filter className="h-3.5 w-3.5" />Apply Filters
          </button>
        )}
      </div>

      {/* Active Report Viewer Modal / Drawer if selected */}
      {selectedReport && (
        <div className="rounded-xl border border-orange-200 bg-white p-5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <span className="inline-block rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FF5B00] mb-1">
                {selectedReport.category}
              </span>
              <h2 className="text-lg font-bold text-[#0B1336]">{selectedReport.name}</h2>
              <p className="text-xs text-slate-500">{selectedReport.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                disabled={exporting || loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1336] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Summary Cards if present */}
          {reportResult?.summary && Object.keys(reportResult.summary).length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(reportResult.summary).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                  <p className="text-[10px] font-bold uppercase text-slate-400">{k.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="mt-1 text-base font-bold text-[#0B1336]">{String(v)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Table container */}
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#FF5B00]" />
              <span className="ml-2 text-xs font-semibold text-slate-600">Querying database records...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-rose-50 p-4 text-xs text-rose-800">
              <p className="font-semibold">Failed to execute report</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : reportResult ? (
            <div>
              <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                <span>Showing {reportResult.data.length} of {reportResult.totalCount} records</span>
                <span>Page {reportResult.page} of {Math.ceil(reportResult.totalCount / reportResult.pageSize) || 1}</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600">
                    <tr>
                      {reportResult.columns.map((col, idx) => (
                        <th key={idx} className="px-3.5 py-2.5 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportResult.data.length === 0 ? (
                      <tr>
                        <td colSpan={reportResult.columns.length} className="px-4 py-8 text-center text-slate-400">
                          No matching records found for this filter criteria.
                        </td>
                      </tr>
                    ) : (
                      reportResult.data.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3.5 py-2.5 whitespace-nowrap text-slate-700">
                              {cell !== null && cell !== undefined ? String(cell) : ''}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  disabled={currentPage <= 1 || loading}
                  onClick={() => void fetchReportData(selectedReport.id, selectedReport.category, currentPage - 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <span className="text-xs text-slate-500">Page {currentPage}</span>
                <button
                  disabled={currentPage * reportResult.pageSize >= reportResult.totalCount || loading}
                  onClick={() => void fetchReportData(selectedReport.id, selectedReport.category, currentPage + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Report Catalogue */}
      <div className="space-y-6">
        {REPORT_CATALOGUE.map((cat) => (
          <div key={cat.category} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#FF5B00]">{cat.category} Reports</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cat.reports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectReport(r)}
                  className={`group rounded-xl border p-4 text-left transition-all hover:border-[#FF5B00] hover:shadow-md ${selectedReport?.id === r.id ? 'border-[#FF5B00] bg-orange-50/50' : 'border-slate-200 bg-white'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <FileBarChart className="h-4 w-4 text-slate-400 group-hover:text-[#FF5B00]" />
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#FF5B00]" />
                  </div>
                  <p className="text-xs font-bold text-[#0B1336] group-hover:text-[#FF5B00]">{r.name}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
