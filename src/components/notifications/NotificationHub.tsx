'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, ChevronLeft, Settings2 } from 'lucide-react';

type Realm = 'staff' | 'portal';
type NotificationItem = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
};
type Preference = {
  eventType: string;
  label: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
};

const paths = {
  staff: '/api/notifications',
  portal: '/api/portal/notifications',
};

export function NotificationHub({ realm, dark = false }: { realm: Realm; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const base = paths[realm];
  const buttonClass = dark
    ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50';
  const panelClass = dark
    ? 'border-slate-700 bg-slate-950 text-slate-100'
    : 'border-slate-200 bg-white text-slate-900';

  const refresh = async () => {
    try {
      const response = await fetch(base);
      if (!response.ok) throw new Error('Unable to load notifications.');
      const data = await response.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load notifications.');
    }
  };

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [base]);

  const loadPreferences = async () => {
    try {
      const response = await fetch(`${base}/preferences`);
      if (!response.ok) throw new Error('Unable to load preferences.');
      const data = await response.json();
      setPreferences(data.preferences ?? []);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load preferences.');
    }
  };

  const markRead = async (id: string) => {
    const response = await fetch(`${base}/${id}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
    if (!response.ok) {
      setError('Unable to mark the notification as read.');
      return;
    }
    await refresh();
  };

  const markAllRead = async () => {
    const response = await fetch(`${base}/read-all`, { method: 'POST' });
    if (!response.ok) {
      setError('Unable to mark notifications as read.');
      return;
    }
    await refresh();
  };

  const savePreference = async (preference: Preference, channel: 'inAppEnabled' | 'emailEnabled') => {
    const updated = { ...preference, [channel]: !preference[channel] };
    const response = await fetch(`${base}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!response.ok) {
      setError('Unable to save the notification preference.');
      return;
    }
    setPreferences((current) => current.map((item) => item.eventType === updated.eventType ? updated : item));
  };

  return (
    <div className="relative">
      <button
        type="button"
        title="Notifications"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setShowPreferences(false);
          refresh();
        }}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${buttonClass}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-4 text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className={`absolute right-0 z-[70] mt-2 w-[min(90vw,24rem)] overflow-hidden rounded-xl border shadow-2xl ${panelClass}`}>
          <header className="flex items-center justify-between border-b border-slate-500/20 px-4 py-3">
            <div className="flex items-center gap-2">
              {showPreferences && (
                <button
                  type="button"
                  aria-label="Back to notifications"
                  onClick={() => setShowPreferences(false)}
                  className="rounded p-1 hover:bg-slate-500/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <h2 className="text-sm font-semibold">
                {showPreferences ? 'Notification preferences' : 'Notifications'}
              </h2>
              {!showPreferences && unreadCount > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {!showPreferences ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Notification preferences"
                  onClick={() => {
                    setShowPreferences(true);
                    loadPreferences();
                  }}
                  className="rounded p-1.5 hover:bg-slate-500/10"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={!unreadCount}
                  onClick={markAllRead}
                  className="rounded px-2 py-1 text-[11px] font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-40"
                >
                  Mark all read
                </button>
              </div>
            ) : null}
          </header>

          {error && <p role="alert" className="px-4 py-2 text-xs text-rose-600">{error}</p>}

          {showPreferences ? (
            <div className="max-h-[65vh] overflow-y-auto p-3">
              {preferences.length === 0 ? (
                <p className="p-3 text-xs text-slate-500">No notification types are configured.</p>
              ) : preferences.map((preference) => (
                <div key={preference.eventType} className="border-b border-slate-500/10 py-3 last:border-0">
                  <p className="mb-2 text-xs font-medium">{preference.label}</p>
                  <div className="flex gap-4 text-[11px]">
                    {(['inAppEnabled', 'emailEnabled'] as const).map((channel) => (
                      <label key={channel} className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={preference[channel]}
                          onChange={() => savePreference(preference, channel)}
                        />
                        {channel === 'inAppEnabled' ? 'In-app' : 'Email'}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-500">You are all caught up.</p>
          ) : (
            <ul className="max-h-[65vh] divide-y divide-slate-500/10 overflow-y-auto">
              {notifications.map((item) => (
                <li key={item.id} className={`px-4 py-3 ${item.readAt ? '' : 'bg-orange-500/5'}`}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      {item.link ? (
                        <Link
                          href={item.link}
                          onClick={() => {
                            if (!item.readAt) void markRead(item.id);
                            setOpen(false);
                          }}
                          className="text-xs font-semibold hover:text-orange-600"
                        >
                          {item.title}
                        </Link>
                      ) : <p className="text-xs font-semibold">{item.title}</p>}
                      <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{item.body}</p>
                      <time className="mt-1 block text-[10px] text-slate-400" dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleString()}
                      </time>
                    </div>
                    {!item.readAt && (
                      <button
                        type="button"
                        title="Mark as read"
                        aria-label={`Mark ${item.title} as read`}
                        onClick={() => markRead(item.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-500/10 hover:text-emerald-600"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
