import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { ScanStatus } from './scan-status';

// Reports are private: never index them.
export const metadata: Metadata = {
  title: 'Scan report',
  robots: { index: false, follow: false },
};

export default async function ScanPage({ params }: PageProps<'/scan/[id]'>) {
  const { id } = await params;
  return (
    <Container>
      <ScanStatus id={id} />
    </Container>
  );
}
