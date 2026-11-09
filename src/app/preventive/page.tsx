'use client';

import React, { useState } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { mockPMPlans, mockAssets } from '@/src/lib/mockData';
import { PreventivePlan } from '@/src/lib/types';
import {
  CalendarClock,
  Search,
  Filter,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Wrench,
  X,
  ChevronRight,
  List,
  Sparkles,
  Play,
  RotateCcw,
} from 'lucide-react';

export default function PreventiveMaintenancePage() {
  const [plans, setPlans] = useState<PreventivePlan[]>(mockPMPlans);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedPlan, setSelectedPlan] = useState<PreventivePlan | null>(null);

  // New PM Plan Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssetTag, setNewAssetTag] = useState(mockAssets[0]?.tag || 'AST-HVAC-014');
  const [newFrequency, setNewFrequency] = useState<any>('Monthly');
  const [newTrigger, setNewTrigger] = useState('Every 30 Calendar Days');
  const [newTeam, setNewTeam] = useState('HVAC Specialist Group');
  const [newHours, setNewHours] = useState('4.0');
  const [notification, setNotification] = useState<string | null>(null);

  // Filtered Plans
  const filteredPlans = plans.filter((p) => {
    const matchesSearch =
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.assignedTeam.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFreq = frequencyFilter === 'All' || p.frequency === frequencyFilter;
    const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesFreq && matchesCat;
  });

  const totalPlans = plans.length;
  const overdueCount = plans.filter((p) => p.isOverdue).length;
  const upcomingCount = plans.filter((p) => !p.isOverdue).length;

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const asset = mockAssets.find((a) => a.tag === newAssetTag);
    const newPlan: PreventivePlan = {
      id: `pm-plan-${Date.now()}`,
      code: `PM-PLN-00${plans.length + 1}`,
      title: newTitle,
      assetTag: newAssetTag,
      assetName: asset ? asset.name : 'Central Chiller Unit',
      category: asset ? asset.category : 'HVAC',
      frequency: newFrequency,
      triggerCriteria: newTrigger,
      assignedTeam: newTeam,
      estimatedHours: parseFloat(newHours) || 4.0,
      lastDone: '2026-10-15',
      nextDue: '2026-11-25',
      isOverdue: false,
      status: 'Active',
      taskCount: 4,
      checklistItems: [
        'Inspect mechanical linkages and test safety shutoffs',
        'Check fluid levels, grease bearings, and check seals',
        'Record vibration readings and electrical draw (Amps)',
        'Sign off inspection log and replace service tag',
      ],
    };

    setPlans([newPlan, ...plans]);
    setShowCreateModal(false);
    setNewTitle('');
    setNotification(`Preventive plan ${newPlan.code} created and scheduled.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleBatchGenerateWorkOrders = () => {
    setNotification('Cron simulation: 2 Work Orders successfully generated for overdue & imminent PM schedules.');
    setTimeout(() => setNotification(null), 5000);
  };

  // Calendar dates mock (Current Month: November 2026)
  const calendarDays = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <Shell>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1 border border-blue-200">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Domain 05: Preventive & Predictive Maintenance</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0B1336]">
              Preventive Maintenance (PM)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Plan recurring maintenance routines, meter-based intervals, regulatory inspections, and automated Work Order generation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchGenerateWorkOrders}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Play className="h-3.5 w-3.5 text-[#FF5B00]" />
              <span>Generate Due Orders</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E65200] transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create PM Plan</span>
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
            <span className="text-[11px] font-semibold uppercase text-slate-400">Active PM Plans</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-[#0B1336] tabular-nums">{totalPlans}</span>
              <span className="text-[11px] text-slate-500">Automated</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Due in 14 Days</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-blue-600 tabular-nums">{upcomingCount}</span>
              <span className="text-[11px] text-slate-500">Scheduled</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Overdue Tasks</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-rose-600 tabular-nums">{overdueCount}</span>
              <span className="text-[11px] text-rose-600 font-medium">Attention Req.</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">PM Compliance</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-emerald-600 tabular-nums">97.4%</span>
              <span className="text-[11px] text-emerald-600">On Target</span>
            </div>
          </div>
        </div>

        {/* View Switcher & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>List View</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Calendar Matrix</span>
              </button>
            </div>

            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search PM plans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5B00]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>Interval:</span>
              <select
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <option value="All">All Intervals</option>
                <option value="Weekly">Weekly</option>
                <option value="Bi-Weekly">Bi-Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Semi-Annual">Semi-Annual</option>
                <option value="Meter-Based">Meter-Based</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <option value="All">All Categories</option>
                <option value="HVAC">HVAC</option>
                <option value="Electrical">Electrical</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Fire & Safety">Fire & Safety</option>
              </select>
            </div>
          </div>
        </div>

        {/* View 1: List View */}
        {viewMode === 'list' && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="py-3 px-4">Plan Code</th>
                    <th className="py-3 px-4">Maintenance Title & Asset</th>
                    <th className="py-3 px-4">Frequency & Trigger</th>
                    <th className="py-3 px-4">Assigned Crew</th>
                    <th className="py-3 px-4">Est. Hours</th>
                    <th className="py-3 px-4">Next Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPlans.map((plan) => (
                    <tr
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#0B1336] whitespace-nowrap">
                        {plan.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-[#FF5B00] transition-colors">
                          {plan.title}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-slate-600">{plan.assetTag}</span>
                          <span>·</span>
                          <span>{plan.assetName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-medium">{plan.frequency}</div>
                        <div className="text-[10px] text-slate-400">{plan.triggerCriteria}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {plan.assignedTeam}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                        {plan.estimatedHours} hrs
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={plan.isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                          {plan.nextDue}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {plan.isOverdue ? (
                          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                            Overdue
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            Scheduled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center p-1 rounded-md text-slate-400 group-hover:text-[#FF5B00] group-hover:bg-orange-50 transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View 2: Calendar Matrix */}
        {viewMode === 'calendar' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#0B1336]">
                Preventive Maintenance Schedule — November 2026
              </h3>
              <span className="text-xs text-slate-500 font-mono">Today: Nov 8, 2026</span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="text-center font-bold text-[11px] text-slate-400 py-1">
                  {day}
                </div>
              ))}

              {calendarDays.map((day) => {
                const dayPlan = plans.find((p) => {
                  const dayNum = parseInt(p.nextDue.split('-')[2] || '0', 10);
                  return dayNum === day;
                });

                const isToday = day === 8;

                return (
                  <div
                    key={day}
                    className={`min-h-[75px] rounded-lg border p-1.5 text-xs transition-colors ${
                      isToday
                        ? 'border-[#FF5B00] bg-orange-50/20'
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold ${isToday ? 'text-[#FF5B00]' : 'text-slate-700'}`}>
                        {day}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-bold text-[#FF5B00] uppercase">Today</span>
                      )}
                    </div>

                    {dayPlan && (
                      <div
                        onClick={() => setSelectedPlan(dayPlan)}
                        className={`mt-1 p-1 rounded text-[10px] font-medium truncate cursor-pointer transition-colors ${
                          dayPlan.isOverdue
                            ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        }`}
                      >
                        <div className="font-bold truncate">{dayPlan.code}</div>
                        <div className="truncate text-[9px]">{dayPlan.assetTag}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Drawer: PM Plan Details */}
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-in fade-in">
            <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              <div>
                <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#0B1336] bg-slate-200/80 px-2 py-0.5 rounded">
                        {selectedPlan.code}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {selectedPlan.frequency}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-2">
                      {selectedPlan.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Target: {selectedPlan.assetName} ({selectedPlan.assetTag})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6 text-xs">
                  {/* Scheduling Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Trigger Criteria</span>
                      <div className="font-bold text-slate-900">{selectedPlan.triggerCriteria}</div>
                      <div className="text-slate-500 text-[11px]">Est. Duration: {selectedPlan.estimatedHours} hrs</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Team</span>
                      <div className="font-bold text-slate-900">{selectedPlan.assignedTeam}</div>
                      <div className="text-slate-500 text-[11px]">Next Due: {selectedPlan.nextDue}</div>
                    </div>
                  </div>

                  {/* Checklist of Tasks */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Standard Inspection Checklist ({selectedPlan.checklistItems.length} items)
                    </span>
                    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                      {selectedPlan.checklistItems.map((step, idx) => (
                        <div key={idx} className="p-3 flex items-start gap-2.5">
                          <span className="font-mono text-xs font-bold text-[#FF5B00]">{idx + 1}.</span>
                          <span className="text-slate-800 text-xs">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-2">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 text-xs"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedPlan(null);
                    setNotification(`Work Order successfully raised from ${selectedPlan.code}.`);
                    setTimeout(() => setNotification(null), 4000);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#FF5B00] text-white font-bold hover:bg-[#E65200] text-xs flex items-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Execute Plan Now</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Create PM Plan */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#0B1336] flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 text-[#FF5B00]" />
                  <span>Create Preventive Plan</span>
                </h3>
                <button onClick={() => setShowCreateModal(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Maintenance Plan Title *</label>
                  <input
                    required
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Monthly Generator Load Test & Fuel Filter Service"
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
                    <label className="font-semibold text-slate-700">Interval Frequency</label>
                    <select
                      value={newFrequency}
                      onChange={(e) => setNewFrequency(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="Weekly">Weekly</option>
                      <option value="Bi-Weekly">Bi-Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Semi-Annual">Semi-Annual</option>
                      <option value="Meter-Based">Meter-Based (Run-Hours)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Trigger Rule</label>
                    <input
                      type="text"
                      value={newTrigger}
                      onChange={(e) => setNewTrigger(e.target.value)}
                      placeholder="e.g. Every 30 Calendar Days"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Assigned Crew</label>
                    <input
                      type="text"
                      value={newTeam}
                      onChange={(e) => setNewTeam(e.target.value)}
                      placeholder="e.g. Mechanical Crew"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Estimated Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newHours}
                    onChange={(e) => setNewHours(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                  />
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
                    Schedule PM Plan
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
