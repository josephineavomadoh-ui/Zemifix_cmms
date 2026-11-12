'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers, MapPin, Gauge, AlertTriangle, Activity, History, Shield, Calendar } from 'lucide-react';
import { AssetStatusBadge } from '@/src/components/assets/AssetStatusBadge';
import { MeterReadingModal } from '@/src/components/assets/MeterReadingModal';
import { DowntimeLogModal } from '@/src/components/assets/DowntimeLogModal';

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'telemetry' | 'downtime' | 'maintenance' | 'history'>('overview');

  const [selectedMeter, setSelectedMeter] = useState<any>(null);
  const [isReadingModalOpen, setIsReadingModalOpen] = useState<boolean>(false);
  const [isDowntimeModalOpen, setIsDowntimeModalOpen] = useState<boolean>(false);

  const fetchAssetDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets/${id}`);
      const data = await res.json();
      if (res.ok) {
        setAsset(data.asset);
      }
    } catch (err) {
      console.error('Failed to fetch asset detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetDetail();
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-slate-400 text-sm">Loading asset details...</div>;
  }

  if (!asset) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm space-y-4">
        <div>Asset not found or access restricted.</div>
        <Link href="/dashboard/assets" className="text-brand-orange hover:underline text-xs">
          Return to Asset Register
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <Link href="/dashboard/assets" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Asset Register
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span>{asset.name}</span>
            <span className="text-sm font-mono font-medium text-brand-orange bg-brand-orange/10 px-2.5 py-1 rounded">
              {asset.assetTag}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDowntimeModalOpen(true)}
            className="px-3.5 py-2 text-sm font-medium bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg flex items-center gap-2 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Log Downtime
          </button>
        </div>
      </div>

      {/* Asset Summary Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Status</div>
          <div className="mt-1">
            <AssetStatusBadge status={asset.status} />
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ownership Mode</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">{asset.ownershipType}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Category</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">{asset.category?.name}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Location</div>
          <div className="mt-1 text-sm font-semibold text-slate-200 truncate">
            {asset.location ? asset.location.name : asset.site ? asset.site.name : 'Unplaced'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'overview' ? 'border-brand-orange text-brand-orange font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Overview & Specifications
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'telemetry' ? 'border-brand-orange text-brand-orange font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Telemetry Meters ({asset.meters?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('downtime')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'downtime' ? 'border-brand-orange text-brand-orange font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Downtime Events ({asset.downtimeLogs?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'maintenance' ? 'border-brand-orange text-brand-orange font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Maintenance History ({asset.workOrders?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'history' ? 'border-brand-orange text-brand-orange font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Audit & History Log
        </button>
      </div>

      {/* Tab Content Areas */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Technical Specifications</h3>
            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-slate-500">Manufacturer</dt>
                <dd className="font-medium text-slate-200">{asset.manufacturer ?? 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Model Number</dt>
                <dd className="font-medium text-slate-200">{asset.modelNumber ?? 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Serial Number</dt>
                <dd className="font-mono text-slate-200">{asset.serialNumber ?? 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Criticality Rating</dt>
                <dd className="font-medium text-slate-200">Level {asset.criticality}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Custody & Responsibilities</h3>
            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-slate-500">Custodian</dt>
                <dd className="font-medium text-slate-200">{asset.custodianUser?.name ?? 'Unassigned'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Responsible User</dt>
                <dd className="font-medium text-slate-200">{asset.responsibleUser?.name ?? 'Unassigned'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Responsible Department</dt>
                <dd className="font-medium text-slate-200">{asset.responsibleDepartment?.name ?? 'Unassigned'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Branch</dt>
                <dd className="font-medium text-slate-200">{asset.branch?.name ?? 'N/A'}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'telemetry' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-300">Configured Meters</h3>
          </div>
          {asset.meters?.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-8 text-center text-slate-500 text-sm rounded-xl">
              No telemetry meters configured for this equipment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {asset.meters?.map((m: any) => (
                <div key={m.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-white">{m.name}</div>
                      <div className="text-xs text-slate-500">{m.meterType.replace('_', ' ')}</div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMeter(m);
                        setIsReadingModalOpen(true);
                      }}
                      className="px-3 py-1 text-xs bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange border border-brand-orange/20 rounded-lg transition-colors"
                    >
                      Record Reading
                    </button>
                  </div>
                  <div className="text-2xl font-mono font-bold text-white">
                    {m.currentReading} <span className="text-xs text-slate-400">{m.unitOfMeasure}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'downtime' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-semibold text-sm text-slate-300">Downtime Log History</div>
          {asset.downtimeLogs?.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No downtime logged for this asset.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Started</th>
                  <th className="p-3">Ended</th>
                  <th className="p-3">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {asset.downtimeLogs?.map((dt: any) => (
                  <tr key={dt.id}>
                    <td className="p-3 font-medium text-rose-400">{dt.downtimeType}</td>
                    <td className="p-3 text-slate-300">{dt.reason}</td>
                    <td className="p-3 text-slate-400">{new Date(dt.startedAt).toLocaleString()}</td>
                    <td className="p-3 text-slate-400">{dt.endedAt ? new Date(dt.endedAt).toLocaleString() : 'Open'}</td>
                    <td className="p-3 font-mono text-slate-300">{dt.durationMinutes ? `${dt.durationMinutes} mins` : 'Active'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-semibold text-sm text-slate-300">Completed & Active Work Orders</div>
          {asset.workOrders?.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No maintenance work orders for this asset.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">WO Number</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Assigned Tech</th>
                  <th className="p-3">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {asset.workOrders?.map((wo: any) => (
                  <tr key={wo.id}>
                    <td className="p-3 font-mono font-medium text-brand-orange">
                      <Link href={`/work-orders/${wo.id}`} className="hover:underline">
                        {wo.workOrderNumber}
                      </Link>
                    </td>
                    <td className="p-3 font-medium text-white">{wo.title}</td>
                    <td className="p-3 text-slate-400">{wo.type}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 font-medium">
                        {wo.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{wo.assignedUser?.name ?? 'Unassigned'}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">GHS {wo.totalCost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300">Status History Timeline</h3>
          <div className="space-y-3">
            {asset.statusHistory?.map((sh: any) => (
              <div key={sh.id} className="flex items-center gap-3 text-xs border-b border-slate-800/60 pb-2">
                <span className="text-slate-500 font-mono">{new Date(sh.changedAt).toLocaleString()}</span>
                <span className="text-slate-400">{sh.fromStatus} &rarr;</span>
                <span className="font-semibold text-white">{sh.toStatus}</span>
                <span className="text-slate-500 italic ml-auto">{sh.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedMeter && (
        <MeterReadingModal
          meter={selectedMeter}
          isOpen={isReadingModalOpen}
          onClose={() => setIsReadingModalOpen(false)}
          onSubmitSuccess={fetchAssetDetail}
        />
      )}

      <DowntimeLogModal
        assetId={asset.id}
        assetName={asset.name}
        isOpen={isDowntimeModalOpen}
        onClose={() => setIsDowntimeModalOpen(false)}
        onSubmitSuccess={fetchAssetDetail}
      />
    </div>
  );
}
