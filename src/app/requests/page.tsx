'use client';

import React, { useState } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { mockRequests, mockBranches } from '@/src/lib/mockData';
import { MaintenanceRequestItem, RequestUrgency, RequestStatus } from '@/src/lib/types';
import {
  Inbox,
  Search,
  Filter,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  Phone,
  User,
  MapPin,
  X,
  ChevronRight,
  ArrowRight,
  Wrench,
  ThumbsUp,
  ThumbsDown,
  Building,
} from 'lucide-react';

export default function RequestsPage() {
  const [requests, setRequests] = useState<MaintenanceRequestItem[]>(mockRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [selectedReq, setSelectedReq] = useState<MaintenanceRequestItem | null>(null);

  // New Request Form Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRequester, setNewRequester] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDept, setNewDept] = useState('Facilities & Operations');
  const [newLocation, setNewLocation] = useState('');
  const [newBranch, setNewBranch] = useState('Head Office (Accra)');
  const [newUrgency, setNewUrgency] = useState<RequestUrgency>('Normal');
  const [notification, setNotification] = useState<string | null>(null);

  // Filtered list
  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUrgency = urgencyFilter === 'All' || r.urgency === urgencyFilter;
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesBranch = branchFilter === 'All' || r.branchName === branchFilter;
    return matchesSearch && matchesUrgency && matchesStatus && matchesBranch;
  });

  const submittedCount = requests.filter((r) => r.status === 'Submitted').length;
  const underReviewCount = requests.filter((r) => r.status === 'UnderReview').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const emergencyCount = requests.filter((r) => r.urgency === 'Emergency').length;

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const newReq: MaintenanceRequestItem = {
      id: `req-${Date.now()}`,
      number: `REQ-00${513 + requests.length}`,
      title: newTitle,
      description: newDesc,
      requesterName: newRequester || 'Staff User',
      requesterPhone: newPhone || '+233 24 000 0000',
      department: newDept,
      location: newLocation,
      branchName: newBranch,
      urgency: newUrgency,
      status: 'Submitted',
      submittedAt: 'Just now',
    };

    setRequests([newReq, ...requests]);
    setShowSubmitModal(false);
    setNewTitle('');
    setNewDesc('');
    setNewLocation('');
    setNotification(`Maintenance request ${newReq.number} submitted successfully.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleConvertOrStatus = (targetStatus: RequestStatus, workOrderNumber?: string) => {
    if (!selectedReq) return;
    const updated = requests.map((r) => {
      if (r.id === selectedReq.id) {
        return {
          ...r,
          status: targetStatus,
          convertedWorkOrderId: workOrderNumber || r.convertedWorkOrderId,
        };
      }
      return r;
    });
    setRequests(updated);
    setSelectedReq({
      ...selectedReq,
      status: targetStatus,
      convertedWorkOrderId: workOrderNumber || selectedReq.convertedWorkOrderId,
    });
    setNotification(
      workOrderNumber
        ? `Request converted to Work Order ${workOrderNumber}`
        : `Request status updated to ${targetStatus}`
    );
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1 border border-blue-200">
              <Inbox className="h-3.5 w-3.5" />
              <span>Domain 03: Service Desk & Triage</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0B1336]">
              Maintenance Requests & Triage
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Intake fault reports from facility occupants, triage urgency, and convert approved requests into Work Orders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E65200] transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Submit Request</span>
            </button>
          </div>
        </div>

        {/* Banner Alert */}
        {notification && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)}>
              <X className="h-3.5 w-3.5 text-emerald-600" />
            </button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">New Submissions</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-blue-600 tabular-nums">{submittedCount}</span>
              <span className="text-[11px] text-slate-500">Awaiting Review</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Under Review</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-[#FF5B00] tabular-nums">{underReviewCount}</span>
              <span className="text-[11px] text-amber-600">Investigating</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Approved for WO</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-emerald-600 tabular-nums">{approvedCount}</span>
              <span className="text-[11px] text-emerald-600">Ready to Dispatch</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Emergency Faults</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-rose-600 tabular-nums">{emergencyCount}</span>
              <span className="text-[11px] text-rose-600 font-medium">&lt; 15m Target</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by request #, keyword, requester, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5B00]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>Urgency:</span>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <option value="All">All Urgencies</option>
                <option value="Emergency">Emergency</option>
                <option value="Urgent">Urgent</option>
                <option value="Normal">Normal</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <option value="All">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="UnderReview">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Converted">Converted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Branch:</span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <option value="All">All Branches</option>
                {mockBranches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Request #</th>
                  <th className="py-3 px-4">Fault Summary & Description</th>
                  <th className="py-3 px-4">Location / Branch</th>
                  <th className="py-3 px-4">Requester & Dept</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No maintenance requests match criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedReq(req)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#0B1336] whitespace-nowrap">
                        {req.number}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 group-hover:text-[#FF5B00] transition-colors">
                          {req.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {req.description}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{req.location}</div>
                        <div className="text-[10px] text-slate-400">{req.branchName}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-medium text-slate-900">{req.requesterName}</div>
                        <div className="text-[10px] text-slate-400">{req.department}</div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={req.urgency} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={req.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {req.submittedAt}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center p-1 rounded-md text-slate-400 group-hover:text-[#FF5B00] group-hover:bg-orange-50 transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Triage & Detail Drawer */}
        {selectedReq && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-in fade-in">
            <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              <div>
                <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#0B1336] bg-slate-200/80 px-2 py-0.5 rounded">
                        {selectedReq.number}
                      </span>
                      <StatusBadge status={selectedReq.status} size="sm" />
                      <StatusBadge status={selectedReq.urgency} size="sm" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-2">
                      {selectedReq.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Submitted: {selectedReq.submittedAt}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedReq(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6 text-xs">
                  {/* Detailed Description */}
                  <div className="rounded-lg border border-slate-200 p-4 bg-white space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Fault Description</span>
                    <p className="text-slate-700 text-xs leading-relaxed">{selectedReq.description}</p>
                  </div>

                  {/* Requester Profile */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Requester Contact</span>
                      <div className="font-bold text-slate-900">{selectedReq.requesterName}</div>
                      <div className="text-slate-600 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{selectedReq.requesterPhone}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{selectedReq.department}</div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Location Specifics</span>
                      <div className="font-bold text-slate-900">{selectedReq.location}</div>
                      <div className="text-slate-500 text-[11px]">{selectedReq.branchName}</div>
                    </div>
                  </div>

                  {/* Linked WO Information */}
                  {selectedReq.convertedWorkOrderId && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-1">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Work Order Generated</span>
                      </div>
                      <p className="text-emerald-700 text-xs">
                        This request was converted into Work Order{' '}
                        <strong className="font-mono font-bold">{selectedReq.convertedWorkOrderId}</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Triage Actions */}
              <div className="p-6 border-t border-slate-200 bg-white flex flex-wrap gap-2 justify-end">
                {selectedReq.status === 'Submitted' && (
                  <button
                    onClick={() => handleConvertOrStatus('UnderReview')}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                  >
                    Mark Under Review
                  </button>
                )}
                {selectedReq.status !== 'Converted' && selectedReq.status !== 'Rejected' && (
                  <>
                    <button
                      onClick={() => handleConvertOrStatus('Rejected')}
                      className="px-3.5 py-2 rounded-lg border border-rose-200 text-rose-700 font-semibold text-xs hover:bg-rose-50"
                    >
                      Reject Request
                    </button>
                    <button
                      onClick={() => handleConvertOrStatus('Converted', `WO-00${285 + Math.floor(Math.random() * 50)}`)}
                      className="px-4 py-2 rounded-lg bg-[#FF5B00] text-white font-bold text-xs hover:bg-[#E65200] flex items-center gap-1.5"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      <span>Convert to Work Order</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Submit Request */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#0B1336] flex items-center gap-1.5">
                  <Inbox className="h-4 w-4 text-[#FF5B00]" />
                  <span>Submit Maintenance Request</span>
                </h3>
                <button onClick={() => setShowSubmitModal(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Problem Headline *</label>
                  <input
                    required
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. AC leaking water onto conference table"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Detailed Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Describe symptoms, exact equipment tag if visible, and immediate hazards..."
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Urgency Level</label>
                    <select
                      value={newUrgency}
                      onChange={(e) => setNewUrgency(e.target.value as RequestUrgency)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="Normal">Normal (Routine)</option>
                      <option value="Urgent">Urgent (Degraded operation)</option>
                      <option value="Emergency">Emergency (Safety / Flood hazard)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Branch</label>
                    <select
                      value={newBranch}
                      onChange={(e) => setNewBranch(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      {mockBranches.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Specific Location / Room *</label>
                  <input
                    required
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Tower B / 4th Floor / Server Room 2"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Your Full Name *</label>
                    <input
                      required
                      type="text"
                      value={newRequester}
                      onChange={(e) => setNewRequester(e.target.value)}
                      placeholder="e.g. Ama Serwaa"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Contact Phone *</label>
                    <input
                      required
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+233 24 000 0000"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#FF5B00] px-4 py-2 font-bold text-white hover:bg-[#E65200]"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
