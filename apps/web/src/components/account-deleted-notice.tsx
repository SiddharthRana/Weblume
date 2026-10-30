'use client';

import { useSearchParams } from 'next/navigation';
import { Container } from './container';

export function AccountDeletedNotice() {
  const status = useSearchParams().get('accountDeleted');
  if (!status) return null;
  return (
    <Container className="pt-6">
      <p role="status" className="rounded-md bg-surface-muted p-4 text-sm text-fg">
        {status === 'deleted'
          ? 'Your account and its data have been deleted.'
          : 'Your account data has been deleted. Your sign-in record will be removed shortly.'}
      </p>
    </Container>
  );
}
