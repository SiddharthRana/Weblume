import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { ScanForm } from './scan-form';

export const metadata: Metadata = {
  title: 'Scan a website',
  description: 'Check a web page for performance, SEO, accessibility and technical issues — free.',
  alternates: { canonical: '/scan' },
};

export default function NewScanPage() {
  return (
    <>
      <PageHeader eyebrow="New scan" title="Scan a website">
        Enter the address of a public web page. Results usually take under a minute.
      </PageHeader>
      <Container className="max-w-3xl py-12">
        <ScanForm />
        <p className="mt-6 text-sm text-fg-muted">
          Without an account you can run one free scan per day. Reports from guest scans are kept
          for 24 hours and can only be opened on this device.
        </p>
      </Container>
    </>
  );
}
