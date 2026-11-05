'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScanReportDto } from '@weblume/shared';
import { MonitorSite } from '@/components/report/monitor-site';
import { ReportActions } from '@/components/report/report-actions';
import { ReportView } from '@/components/report/report-view';
import { ScanProgress } from '@/components/report/scan-progress';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getLocalScan, saveLocalScan } from '@/lib/local-scans';
import { useRouteParam } from '@/lib/use-route-param';
import { PageLoader } from '@/components/loading';

const POLL_MS = 2_000;
const GIVE_UP_MS = 5 * 60_000;

type State =
  | { kind: 'loading' }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string }
  | { kind: 'report'; report: ScanReportDto };

export function ScanStatus({ id: routeId }: { id: string }) {
  const id = useRouteParam(routeId);
  const router = useRouter();
  const { user } = useAuth();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [tooSlow, setTooSlow] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedAt = useRef(0);

  const load = useCallback(async (): Promise<ScanReportDto | null | 'error'> => {
    const token = getLocalScan(id)?.scanToken;
    try {
      const { data, error, response } = await api.GET('/v1/scans/{id}', {
        params: { path: { id }, header: token ? { 'x-scan-token': token } : {} },
      });
      if (data) return data as ScanReportDto;
      if (response.status === 404 || response.status === 400) return null;
      setState({ kind: 'error', message: errorMessage(error) });
      return 'error';
    } catch {
      setState({ kind: 'error', message: errorMessage(undefined) });
      return 'error';
    }
  }, [id]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    startedAt.current = Date.now();
    const tick = async () => {
      const result = await load();
      if (cancelled || result === 'error') return;
      if (result === null) {
        setState({ kind: 'not_found' });
        return;
      }
      setState({ kind: 'report', report: result });
      if (result.status === 'queued' || result.status === 'running') {
        if (Date.now() - startedAt.current > GIVE_UP_MS) setTooSlow(true);
        else timer = setTimeout(tick, POLL_MS);
      }
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [load, attempt]);

  async function retry() {
    setRetrying(true);
    setRetryError(null);
    const local = getLocalScan(id);
    try {
      const { data, error } = await api.POST('/v1/scans/{id}/retry', {
        params: {
          path: { id },
          header: local?.scanToken ? { 'x-scan-token': local.scanToken } : {},
        },
      });
      if (!data) {
        setRetryError(errorMessage(error));
        return;
      }
      saveLocalScan({
        id: data.scan.id,
        url: data.scan.normalizedUrl,
        createdAt: data.scan.createdAt,
        scanToken: data.scanToken,
      });
      router.push(`/scan/${data.scan.id}`);
    } catch {
      setRetryError(errorMessage(undefined));
    } finally {
      setRetrying(false);
    }
  }

  if (state.kind === 'loading') {
    return <PageLoader label="Opening your report" />;
  }

  if (state.kind === 'not_found') {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold text-fg">Report not available</h1>
        <p className="mx-auto mt-3 max-w-xl text-fg-muted">
          This report doesn’t exist, has expired, or can’t be opened here. Reports from guest scans
          can only be opened on the device that started them and are kept for 24 hours.
        </p>
        <Link
          href="/scan"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg btn-primary px-5 text-sm font-semibold"
        >
          Start a new scan
        </Link>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div role="alert" className="py-16 text-center">
        <h1 className="text-2xl font-bold text-fg">Couldn’t load this report</h1>
        <p className="mt-3 text-fg-muted">{state.message}</p>
        <button
          type="button"
          onClick={() => {
            setState({ kind: 'loading' });
            setAttempt((a) => a + 1);
          }}
          className="mt-6 min-h-11 rounded-lg btn-primary px-5 text-sm font-semibold"
        >
          Try again
        </button>
      </div>
    );
  }

  const r = state.report;

  if (r.status === 'queued' || r.status === 'running') {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Scanning</p>
        <h1 className="mt-1 break-all text-2xl font-bold text-fg">{r.normalizedUrl}</h1>
        <ScanProgress url={r.normalizedUrl} status={r.status} startedAt={r.createdAt} />
        {tooSlow && (
          <p className="mt-4 text-sm text-fg-muted">
            This is taking longer than expected.{' '}
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="font-medium text-primary underline"
            >
              Check again
            </button>
          </p>
        )}
      </div>
    );
  }

  if (r.status === 'failed') {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-danger">Scan failed</p>
        <h1 className="mt-1 break-all text-2xl font-bold text-fg">{r.normalizedUrl}</h1>
        <div
          role="alert"
          className="mt-6 rounded-lg border border-danger bg-sev-critical-bg p-6 text-sev-critical"
        >
          <p className="font-semibold">{r.failureMessage ?? 'The scan couldn’t be completed.'}</p>
          <p className="mt-2 text-sm">
            No report was produced, and no scores or findings have been estimated.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={retry}
            disabled={retrying}
            className="min-h-11 rounded-lg btn-primary px-5 text-sm font-semibold disabled:opacity-70"
          >
            {retrying ? 'Retrying…' : 'Retry scan'}
          </button>
          <Link
            href="/scan"
            className="inline-flex min-h-11 items-center rounded-lg btn-secondary px-5 text-sm font-semibold"
          >
            Scan a different address
          </Link>
        </div>
        {retryError && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {retryError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 py-12">
      {/* Only scans in the signed-in account have owner actions; guest scans don't. */}
      {user && !getLocalScan(id)?.scanToken && (
        <>
          <ReportActions scanId={r.id} />
          <MonitorSite normalizedUrl={r.normalizedUrl} />
        </>
      )}
      <ReportView report={r} />
    </div>
  );
}
