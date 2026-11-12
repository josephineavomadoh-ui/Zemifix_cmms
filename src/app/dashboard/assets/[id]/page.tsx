'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers, AlertTriangle, Activity } from 'lucide-react';
import { AssetStatusBadge } from '@/src/components/assets/AssetStatusBadge';
import { MeterReadingModal } from '@/src/components/assets/MeterReadingModal';
import { DowntimeLogModal } from '@/src/components/assets/DowntimeLogModal';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { StatusBadge } from '@/src/components/ui/StatusBadge';

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
      if (res.ok) setAsset(data.asset);
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
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white py-16">
        <EmptyState
          icon={Layers}
          title="Asset not found"
          description="This asset may have been removed or you may not have access."
          action={
            <Link
              href="/dashboard/assets"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#F95700]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Asset Register
            </Link>
          }
        />
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview & Specifications' },
    { key: 'telemetry', label: `Telemetry Meters (${asset.meters?.length ?? 0})` },
    { key: 'downtime', label: `Downtime Events (${asset.downtimeLogs?.length ?? 0})` },
    { key: 'maintenance', label: `Maintenance History (${asset.workOrders?.length ?? 0})` },
    { key: 'history', label: 'Audit & History Log' },
  ] as const;

  const thClass = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const tdClass = 'px-4 py-3.5 text-sm';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assets"
        eyebrowIcon={Layers}
        title={asset.name}
        breadcrumbs={[
          { label: 'Asset Register', href: '/dashboard/assets' },
          { label: asset.assetTag },
        ]}
        actions={
          <button
            onClick={() => setIsDowntimeModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100 transition-colors"
          >
            <AlertTriangle className="h-4 w-4" />
            Log Downtime
          </button>
        }
      />

      {/* Asset Summary Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
          <div className="mt-1.5"><AssetStatusBadge status={asset.status} /></div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Ownership Mode</p>
          <p className="mt-1.5 text-sm font-semibold text-slate-700">{asset.ownershipType}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Category</p>
          <p className="mt-1.5 text-sm font-semibold text-slate-700">{asset.category?.name}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Location</p>
          <p className="mt-1.5 text-sm font-semibold text-slate-700 truncate">
            {asset.location ? asset.location.name : asset.site ? asset.site.name : 'Unplaced'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Asset tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? 'border-[#FF5B00] text-[#FF5B00]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Technical Specifications</h3>
            <dl className="grid grid-cols-2 gap-4">
              {[
                { label: 'Manufacturer', value: asset.manufacturer ?? 'N/A' },
                { label: 'Model Number', value: asset.modelNumber ?? 'N/A' },
                { label: 'Serial Number', value: asset.serialNumber ?? 'N/A' },
                { label: 'Criticality Rating', value: `Level ${asset.criticality}` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-[11px] text-slate-400 font-medium">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-700">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Custody & Responsibilities</h3>
            <dl className="grid grid-cols-2 gap-4">
              {[
                { label: 'Custodian', value: asset.custodianUser?.name ?? 'Unassigned' },
                { label: 'Responsible User', value: asset.responsibleUser?.name ?? 'Unassigned' },
                { label: 'Department', value: asset.responsibleDepartment?.name ?? 'Unassigned' },
                { label: 'Branch', value: asset.branch?.name ?? 'N/A' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-[11px] text-slate-400 font-medium">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-700">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {/* Telemetry Meters */}
      {activeTab === 'telemetry' && (
        <div className="space-y-4">
          {!asset.meters?.length ? (
            <div className="rounded-xl border border-slate-200 bg-white py-12">
              <EmptyState icon={Activity} title="No telemetry meters configured" description="Add meters to this equipment to track operating readings." />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {asset.meters.map((m: any) => (
                <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{m.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{m.meterType.replace(/_/g, ' ')}</div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMeter(m);
                        setIsReadingModalOpen(true);
                      }}
                      className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-[#FF5B00] hover:bg-orange-100 transition-colors"
                    >
                      Record Reading
                    </button>
                  </div>
                  <div className="text-2xl font-mono font-bold text-slate-800">
                    {m.currentReading}{' '}
                    <span className="text-sm text-slate-400 font-sans">{m.unitOfMeasure}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Downtime */}
      {activeTab === 'downtime' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-700">Downtime Log History</h3>
          </div>
          {!asset.downtimeLogs?.length ? (
            <EmptyState icon={AlertTriangle} title="No downtime logged" description="No downtime events have been recorded for this asset." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className={thClass}>Type</th>
                    <th className={thClass}>Reason</th>
                    <th className={thClass}>Started</th>
                    <th className={thClass}>Ended</th>
                    <th className={thClass}>Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {asset.downtimeLogs.map((dt: any) => (
                    <tr key={dt.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`${tdClass} font-medium text-rose-700`}>{dt.downtimeType}</td>
                      <td className={`${tdClass} text-slate-600`}>{dt.reason}</td>
                      <td className={`${tdClass} text-slate-500`}>{new Date(dt.startedAt).toLocaleString()}</td>
                      <td className={`${tdClass} text-slate-500`}>{dt.endedAt ? new Date(dt.endedAt).toLocaleString() : 'Open'}</td>
                      <td className={`${tdClass} font-mono text-slate-700`}>{dt.durationMinutes ? `${dt.durationMinutes} mins` : 'Active'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Maintenance History */}
      {activeTab === 'maintenance' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-700">Completed & Active Work Orders</h3>
          </div>
          {!asset.workOrders?.length ? (
            <EmptyState icon={Activity} title="No maintenance work orders" description="No work orders have been created for this asset yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className={thClass}>WO Number</th>
                    <th className={thClass}>Title</th>
                    <th className={thClass}>Type</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Assigned Tech</th>
                    <th className={thClass}>Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {asset.workOrders.map((wo: any) => (
                    <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>
                        <Link href={`/work-orders/${wo.id}`} className="hover:underline">
                          {wo.workOrderNumber}
                        </Link>
                      </td>
                      <td className={`${tdClass} font-medium text-slate-800`}>{wo.title}</td>
                      <td className={`${tdClass} text-slate-500`}>{wo.type}</td>
                      <td className={tdClass}><StatusBadge status={wo.status} /></td>
                      <td className={`${tdClass} text-slate-600`}>{wo.assignedUser?.name ?? 'Unassigned'}</td>
                      <td className={`${tdClass} font-mono font-bold text-emerald-700`}>GHS {wo.totalCost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Status History Timeline</h3>
          {!asset.statusHistory?.length ? (
            <EmptyState icon={AlertTriangle} title="No status history yet" />
          ) : (
            <div className="space-y-2">
              {asset.statusHistory.map((sh: any) => (
                <div key={sh.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs">
                  <span className="font-mono text-slate-400">{new Date(sh.changedAt).toLocaleString()}</span>
                  <span className="text-slate-400">{sh.fromStatus}</span>
                  <span className="text-slate-300">→</span>
                  <span className="font-semibold text-slate-700">{sh.toStatus}</span>
                  {sh.reason && <span className="ml-auto italic text-slate-400">{sh.reason}</span>}
                </div>
              ))}
            </div>
          )}
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
