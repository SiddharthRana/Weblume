'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { ScanSummaryDto } from '@weblume/shared';
import { ScanList } from '@/components/app/scan-list';
import { FormAlert } from '@/components/auth/form-bits';
import { api, errorMessage } from '@/lib/api';

const PAGE = 20;

/** Signed-in history from the API, with URL search and "load more" pagination. */
export function AccountHistory() {
  const [items, setItems] = useState<ScanSummaryDto[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (search: string, before?: string) => {
    const { data, error: err } = await api.GET('/v1/scans', {
      params: {
        query: { limit: PAGE, ...(search ? { q: search } : {}), ...(before ? { before } : {}) },
      },
    });
    if (!data) throw err ?? new Error('failed');
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    load(query).then(
      (d) => {
        if (!active) return;
        setItems(d.items as ScanSummaryDto[]);
        setCursor(d.nextCursor);
        setError(null);
      },
      (e) => active && setError(errorMessage(e)),
    );
    return () => {
      active = false;
    };
  }, [load, query]);

  async function more() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const d = await load(query, cursor);
      setItems((prev) => [...(prev ?? []), ...(d.items as ScanSummaryDto[])]);
      setCursor(d.nextCursor);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setItems(null);
    setQuery(q.trim());
  }

  return (
    <div className="space-y-4">
      <form role="search" onSubmit={onSearch} className="flex gap-2">
        <label htmlFor="history-q" className="sr-only">
          Search scans by address
        </label>
        <input
          id="history-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by address"
          maxLength={200}
          className="min-h-11 w-full rounded-md border border-border bg-bg px-4 text-fg"
        />
        <button
          type="submit"
          className="min-h-11 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-fg"
        >
          Search
        </button>
      </form>
      <FormAlert>{error}</FormAlert>
      {!items && !error && (
        <p role="status" className="text-fg-muted">
          Loading…
        </p>
      )}
      {items && items.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-semibold text-fg">
            {query ? 'No scans match that search' : 'No saved scans yet'}
          </p>
        </div>
      )}
      {items && items.length > 0 && <ScanList scans={items} />}
      {cursor && (
        <button
          type="button"
          onClick={more}
          disabled={loadingMore}
          className="min-h-11 rounded-md border border-border bg-surface px-5 text-sm font-semibold text-fg disabled:opacity-70"
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
