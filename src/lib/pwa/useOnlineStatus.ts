import { useEffect, useState } from 'react';
import { flushOfflineSyncQueue } from './offlineSyncManager';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-flush outbox queue when network connection returns
      flushOfflineSyncQueue().catch((err) => console.error('Auto-sync failed:', err));
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
