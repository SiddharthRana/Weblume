import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { ReportView } from '@/components/report/report-view';
import { sampleReport } from '@/content/sample-report';

export const metadata: Metadata = {
  title: 'Sample report',
  description: 'An illustrative Weblume report showing scores, prioritised findings and fixes.',
  alternates: { canonical: '/sample-report' },
};

export default function SampleReportPage() {
  return (
    <Container className="py-12">
      <div
        role="note"
        className="mb-8 rounded-lg border border-accent bg-sev-medium-bg p-4 text-sm text-sev-medium"
      >
        <strong>Illustrative example.</strong> This report describes a fictional website on a
        reserved test domain. It shows the layout of a Weblume report and is not the result of
        scanning a real site.
      </div>
      <ReportView report={sampleReport} />
    </Container>
  );
}
