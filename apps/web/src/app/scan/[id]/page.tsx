import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { EXPORTED_PARAM } from '@/lib/route-param';
import { ScanStatus } from './scan-status';

// Reports are private: never index them.
export const metadata: Metadata = {
  title: 'Scan report',
  robots: { index: false, follow: false },
};

// Exported once for the placeholder; see useRouteParam (src/lib/use-route-param.ts).
export function generateStaticParams() {
  return [{ id: EXPORTED_PARAM }];
}

export default async function ScanPage({ params }: PageProps<'/scan/[id]'>) {
  const { id } = await params;
  return (
    <Container>
      <ScanStatus id={id} />
    </Container>
  );
}
