'use client';

import { useAuth } from '@/lib/auth-context';
import { AccountHistory } from './account-history';
import { HistoryList } from './history-list';

export function HistorySwitch() {
  const { user, loading, configured } = useAuth();
  if (configured && loading) {
    return (
      <p role="status" className="text-fg-muted">
        Loading…
      </p>
    );
  }
  return user ? <AccountHistory /> : <HistoryList />;
}
