'use client';

import React, { useState } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { mockWorkOrders, mockBranches, mockAssets } from '@/src/lib/mockData';
import { WorkOrderSummary, WorkOrderStatus, WorkOrderPriority } from '@/src/lib/types';
import {
  Wrench,
  Search,
  Filter,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  MapPin,
  X,
  ChevronRight,
  DollarSign,
  CheckSquare,
  Square,
  ArrowRight,
  FileText,
  Building,
  Sparkles,
} from 'lucide-react';

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrderSummary[]>(mockWorkOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [selectedWO, setSelectedWO] = useState<WorkOrderSummary | null>(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssetTag, setNewAssetTag] = useState(mockAssets[0]?.tag || 'AST-HVAC-014');
  const [newPriority, setNewPriority] = useState<WorkOrderPriority>('Medium');
  const [newAssignedTo, setNewAssignedTo] = useState('Kwesi Mensah');
  const [newDueDate, setNewDueDate] = useState('Nov 14, 2026');
  const [newEstHours, setNewEstHours] = useState('4.0');
  const [newEstCost, setNewEstCost] = useState('3200');
  const [newBranch, setNewBranch] = useState('Tema Industrial Region');
  const [notification, setNotification] = useState<string | null>(null);

  // Filtered orders
  const filteredOrders = workOrders.filter((wo) => {
    const matchesSearch =
      wo.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.assignedToName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || wo.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || wo.priority === priorityFilter;
    const matchesBranch = branchFilter === 'All' || wo.branchName === branchFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesBranch;
  });

  // KPI Metrics
  const totalActive = workOrders.filter((w) => w.status !== 'Closed' && w.status !== 'Cancelled').length;
  const inProgressCount = workOrders.filter((w) => w.status === 'InProgress').length;
  const openCount = workOrders.filter((w) => w.status === 'Open' || w.status === 'Assigned').length;
  const urgentCount = workOrders.filter((w) => w.priority === 'Urgent' || w.priority === 'High').length;
  const completedCount = workOrders.filter((w) => w.status === 'Completed' || w.status === 'Verified').length;

  const handleCreateWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const asset = mockAssets.find((a) => a.tag === newAssetTag);
    const newOrder: WorkOrderSummary = {
      id: `wo-${Date.now()}`,
      number: `WO-00${285 + workOrders.length}`,
      title: newTitle,
      assetName: asset ? asset.name : 'Central Chiller Unit',
      assetTag: newAssetTag,
      location: asset ? asset.location : 'Plant Room A',
      branchName: newBranch,
      priority: newPriority,
      status: 'Open',
      assignedToName: newAssignedTo,
      dueDate: newDueDate,
      estimatedHours: parseFloat(newEstHours) || 4.0,
      actualHours: 0,
      estimatedCost: parseFloat(newEstCost) || 2500,
      actualCost: 0,
      slaBreached: false,
      checklists: [
        { id: '1', title: 'Lockout/Tagout (LOTO) energy isolation check', completed: false },
        { id: '2', title: 'Component physical inspection & teardown', completed: false },
        { id: '3', title: 'Reassemble, test run & record vibration levels', completed: false },
      ],
    };

    setWorkOrders([newOrder, ...workOrders]);
    setShowCreateModal(false);
    setNewTitle('');
    setNotification(`Work order ${newOrder.number} created successfully.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUpdateStatus = (targetStatus: WorkOrderStatus) => {
    if (!selectedWO) return;
    const updated = workOrders.map((wo) => {
      if (wo.id === selectedWO.id) {
        return { ...wo, status: targetStatus };
      }
      return wo;
    });
    setWorkOrders(updated);
    setSelectedWO({ ...selectedWO, status: targetStatus });
    setNotification(`Work Order ${selectedWO.number} transitioned to ${targetStatus}`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggleChecklist = (taskId: string) => {
    if (!selectedWO) return;
    const currentList = selectedWO.checklists || [
      { id: '1', title: 'Lockout/Tagout (LOTO) energy isolation check', completed: true },
      { id: '2', title: 'Inspect gasket seating and torque to spec (85 Nm)', completed: false },
      { id: '3', title: 'Commission chiller circuit and verify 4.2 Bar pressure', completed: false },
    ];

    const updatedList = currentList.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    const updatedWO = { ...selectedWO, checklists: updatedList };
    setSelectedWO(updatedWO);
    setWorkOrders(workOrders.map((w) => (w.id === updatedWO.id ? updatedWO : w)));
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1 border border-blue-200">
              <Wrench className="h-3.5 w-3.5" />
              <span>Domain 02: Maintenance Operations</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0B1336]">
              Work Order Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Execute, track, and verify corrective and scheduled maintenance work orders across all branches.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E65200] transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create Work Order</span>
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

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Active Orders</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-[#0B1336] tabular-nums">{totalActive}</span>
              <span className="text-[11px] text-slate-500">In Pipeline</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">In Progress</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-[#FF5B00] tabular-nums">{inProgressCount}</span>
              <span className="text-[11px] text-amber-600">On-Site Techs</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Open & Assigned</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-blue-600 tabular-nums">{openCount}</span>
              <span className="text-[11px] text-slate-500">Pending Start</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">High / Urgent</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-rose-600 tabular-nums">{urgentCount}</span>
              <span className="text-[11px] text-rose-600 font-medium">SLA Priority</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Completed (Month)</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-emerald-600 tabular-nums">129</span>
              <span className="text-[11px] text-emerald-600 font-medium">96.4% on SLA</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by WO#, title, asset, technician..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5B00]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Assigned">Assigned</option>
                <option value="InProgress">In Progress</option>
                <option value="OnHold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <option value="All">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
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

        {/* Work Order Data Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">WO Number</th>
                  <th className="py-3 px-4">Title & Asset</th>
                  <th className="py-3 px-4">Location / Branch</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Cost (GH₵)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No work orders matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((wo) => (
                    <tr
                      key={wo.id}
                      onClick={() => setSelectedWO(wo)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#0B1336] whitespace-nowrap">
                        {wo.number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-[#FF5B00] transition-colors">
                          {wo.title}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-slate-600">{wo.assetTag}</span>
                          <span>·</span>
                          <span>{wo.assetName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{wo.location}</div>
                        <div className="text-[10px] text-slate-400">{wo.branchName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={wo.priority} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={wo.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>{wo.assignedToName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{wo.dueDate}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {wo.estimatedCost.toLocaleString()}
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

        {/* Slide-over Drawer for Work Order Details */}
        {selectedWO && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-in fade-in">
            <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div>
                <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#0B1336] bg-slate-200/80 px-2 py-0.5 rounded">
                        {selectedWO.number}
                      </span>
                      <StatusBadge status={selectedWO.status} size="sm" />
                      <StatusBadge status={selectedWO.priority} size="sm" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-2">
                      {selectedWO.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>{selectedWO.location} · {selectedWO.branchName}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedWO(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Status Progression Lifecycle */}
                <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between text-[11px] overflow-x-auto">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Lifecycle:</span>
                  <div className="flex items-center gap-1 font-medium text-slate-600">
                    <span className={selectedWO.status === 'Open' ? 'text-[#FF5B00] font-bold' : ''}>Open</span>
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                    <span className={selectedWO.status === 'Assigned' ? 'text-[#FF5B00] font-bold' : ''}>Assigned</span>
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                    <span className={selectedWO.status === 'InProgress' ? 'text-[#FF5B00] font-bold' : ''}>In Progress</span>
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                    <span className={selectedWO.status === 'Completed' ? 'text-emerald-600 font-bold' : ''}>Completed</span>
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                    <span className={selectedWO.status === 'Verified' || selectedWO.status === 'Closed' ? 'text-emerald-700 font-bold' : ''}>Verified</span>
                  </div>
                </div>

                {/* Detail Body */}
                <div className="p-6 space-y-6 text-xs">
                  {/* Equipment & Schedule */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Target Asset</span>
                      <div className="font-bold text-slate-900">{selectedWO.assetName}</div>
                      <div className="font-mono text-slate-600 text-[11px]">{selectedWO.assetTag}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Lead</span>
                      <div className="font-bold text-slate-900">{selectedWO.assignedToName}</div>
                      <div className="text-slate-500 text-[11px]">Due: {selectedWO.dueDate}</div>
                    </div>
                  </div>

                  {/* Task Checklist */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckSquare className="h-4 w-4 text-[#FF5B00]" />
                        <span>Work Order Checklist & Sign-Off</span>
                      </h4>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {((selectedWO.checklists || []).filter((c) => c.completed).length / Math.max(1, (selectedWO.checklists || []).length) * 100).toFixed(0)}% Done
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                      {(selectedWO.checklists || [
                        { id: '1', title: 'Lockout/Tagout (LOTO) energy isolation verification', completed: true },
                        { id: '2', title: 'Disassemble housing and inspect gasket seating', completed: true },
                        { id: '3', title: 'Install replacement seal kit & torque to manufacturer spec', completed: false },
                        { id: '4', title: 'Conduct pressure test (4.5 Bar) and log test manometer readings', completed: false },
                      ]).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleToggleChecklist(item.id)}
                          className="flex items-start gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <button className="mt-0.5 text-[#FF5B00]">
                            {item.completed ? (
                              <CheckSquare className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                          <div className="flex-1">
                            <span className={item.completed ? 'line-through text-slate-400' : 'text-slate-800'}>
                              {item.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Labor & Parts Costing */}
                  <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Cost Summary & Estimations</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400">Est. Labor</span>
                        <div className="font-bold text-slate-800 font-mono">{selectedWO.estimatedHours} hrs</div>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400">Est. Cost</span>
                        <div className="font-bold text-slate-800 font-mono">GH₵ {selectedWO.estimatedCost.toLocaleString()}</div>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400">Actual Cost</span>
                        <div className="font-bold text-emerald-700 font-mono">GH₵ {(selectedWO.actualCost || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="p-6 border-t border-slate-200 bg-white flex flex-wrap gap-2 justify-end">
                {selectedWO.status !== 'InProgress' && selectedWO.status !== 'Completed' && (
                  <button
                    onClick={() => handleUpdateStatus('InProgress')}
                    className="px-4 py-2 rounded-lg bg-[#FF5B00] text-white font-bold text-xs hover:bg-[#E65200] transition-colors"
                  >
                    Start Work Order
                  </button>
                )}
                {selectedWO.status === 'InProgress' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus('OnHold')}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                    >
                      Put On Hold
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('Completed')}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700"
                    >
                      Complete Work Order
                    </button>
                  </>
                )}
                {selectedWO.status === 'Completed' && (
                  <button
                    onClick={() => handleUpdateStatus('Verified')}
                    className="px-4 py-2 rounded-lg bg-[#0B1336] text-white font-bold text-xs hover:bg-slate-900"
                  >
                    Verify & Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Create Work Order */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#0B1336] flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-[#FF5B00]" />
                  <span>Create Work Order</span>
                </h3>
                <button onClick={() => setShowCreateModal(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateWorkOrder} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Work Order Title *</label>
                  <input
                    required
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Compressor Head Gasket Replacement"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Target Asset</label>
                    <select
                      value={newAssetTag}
                      onChange={(e) => setNewAssetTag(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      {mockAssets.map((a) => (
                        <option key={a.id} value={a.tag}>
                          {a.tag} - {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Priority Level</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as WorkOrderPriority)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Operating Branch</label>
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
                  <div>
                    <label className="font-semibold text-slate-700">Assigned Technician</label>
                    <input
                      required
                      type="text"
                      value={newAssignedTo}
                      onChange={(e) => setNewAssignedTo(e.target.value)}
                      placeholder="Technician or Team"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Due Date</label>
                    <input
                      type="text"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Est. Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newEstHours}
                      onChange={(e) => setNewEstHours(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Est. Cost (GH₵)</label>
                    <input
                      type="number"
                      step="100"
                      value={newEstCost}
                      onChange={(e) => setNewEstCost(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#FF5B00] px-4 py-2 font-bold text-white hover:bg-[#E65200]"
                  >
                    Create Work Order
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
