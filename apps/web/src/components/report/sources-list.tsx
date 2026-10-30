import {
  describeSourceStatus,
  SOURCE_LABELS,
  SOURCE_ORDER,
  type SourcesMap,
} from '@weblume/shared';

export function SourcesList({ sources }: { sources: SourcesMap }) {
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {SOURCE_ORDER.filter((k) => sources[k]).map((k) => {
        const s = sources[k]!;
        const ok = s.status === 'ok';
        return (
          <li key={k} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className={
                ok ? 'text-success' : s.status === 'failed' ? 'text-danger' : 'text-fg-muted'
              }
            >
              {ok ? '✓' : s.status === 'failed' ? '✕' : '–'}
            </span>
            <span className="text-fg-muted">
              <span className="text-fg">{SOURCE_LABELS[k]}</span> — {describeSourceStatus(s)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
