'use client';

import { useAuth } from '@/lib/auth-context';
import { AccountHistory } from './account-history';
import { HistoryList } from './history-list';
import { ListSkeleton } from '@/components/loading';

export function HistorySwitch() {
  const { user, loading, configured } = useAuth();
  if (configured && loading) {
    return <ListSkeleton rows={4} label="Loading your scans" />;
  }
  return user ? <AccountHistory /> : <HistoryList />;
}
