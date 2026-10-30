import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { SharedReport } from './shared-report';

// Shared reports are reachable only by their secret link: never index them, and never send the
// link to other sites in the Referer header.
export const metadata: Metadata = {
  title: 'Shared website report',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function SharedReportPage({ params }: PageProps<'/r/[token]'>) {
  const { token } = await params;
  return (
    <Container>
      <SharedReport token={token} />
    </Container>
  );
}
