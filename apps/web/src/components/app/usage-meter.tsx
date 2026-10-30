const fmt = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

export function UsageMeter({
  used,
  limit,
  resetsAt,
}: {
  used: number;
  limit: number;
  resetsAt: string;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  const remaining = Math.max(0, limit - used);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-semibold text-fg">Scans this period</p>
        <p className="text-sm text-fg-muted">
          <span className="font-semibold text-fg">{used}</span> of {limit} used
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Scans used this period"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-valuetext={`${used} of ${limit} scans used`}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className={`h-full rounded-full ${remaining === 0 ? 'bg-danger' : 'bg-brand-gradient'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-fg-muted">
        {remaining === 0 ? 'No scans left' : `${remaining} left`} · resets{' '}
        {fmt.format(new Date(resetsAt))}
      </p>
    </div>
  );
}
