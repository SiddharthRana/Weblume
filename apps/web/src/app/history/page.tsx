import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { HistorySwitch } from './history-switch';

export const metadata: Metadata = {
  title: 'Scan history',
  robots: { index: false, follow: false },
};

export default function HistoryPage() {
  return (
    <>
      <PageHeader eyebrow="History" title="Your scans">
        Signed in, this lists every saved report in your account. Signed out, it lists scans started
        in this browser.
      </PageHeader>
      <Container className="max-w-3xl py-12">
        <HistorySwitch />
      </Container>
    </>
  );
}
