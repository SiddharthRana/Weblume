import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { EXPORTED_PARAM } from '@/lib/route-param';
import { SharedReport } from './shared-report';

// Shared reports are reachable only by their secret link: never index them, and never send the
// link to other sites in the Referer header.
export const metadata: Metadata = {
  title: 'Shared website report',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

// Exported once for the placeholder; see useRouteParam (src/lib/use-route-param.ts).
export function generateStaticParams() {
  return [{ token: EXPORTED_PARAM }];
}

export default async function SharedReportPage({ params }: PageProps<'/r/[token]'>) {
  const { token } = await params;
  return (
    <Container>
      <SharedReport token={token} />
    </Container>
  );
}
