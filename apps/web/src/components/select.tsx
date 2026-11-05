'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

/**
 * Branded dropdown following the WAI-ARIA "select-only combobox" pattern: arrow keys, Home/End,
 * Enter/Space, Escape and type-to-find work as in a native select, and screen readers announce it
 * as one. Use it instead of <select> so dropdowns look the same on every device.
 */
export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className = '',
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;
  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selected);
  const root = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', at: 0 });

  // Close when clicking or tapping anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Keep the highlighted option in view in long lists.
  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const openList = () => {
    setActive(selected);
    setOpen(true);
  };
  const choose = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    setOpen(false);
    box.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    const move = (i: number) => {
      e.preventDefault();
      if (!open) openList();
      setActive(Math.min(last, Math.max(0, i)));
    };
    switch (e.key) {
      case 'ArrowDown':
        return open ? move(active + 1) : move(selected);
      case 'ArrowUp':
        return open ? move(active - 1) : move(selected);
      case 'Home':
        return move(0);
      case 'End':
        return move(last);
      case 'Enter':
      case ' ':
        e.preventDefault();
        return open ? choose(active) : openList();
      case 'Escape':
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      case 'Tab':
        if (open) choose(active);
        return;
      default:
        // Type-to-find: jump to the first option starting with the typed letters.
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const now = Date.now();
          const t = typed.current;
          t.text = (now - t.at > 600 ? '' : t.text) + e.key.toLowerCase();
          t.at = now;
          const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(t.text));
          if (hit >= 0) move(hit);
        }
    }
  };

  return (
    <div ref={root} className={`relative ${className}`}>
      <span id={labelId} className="block text-sm font-medium text-fg">
        {label}
      </span>
      <div
        ref={box}
        role="combobox"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className="group mt-1 flex min-h-11 min-w-36 cursor-pointer select-none items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 text-sm font-medium text-fg shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-primary/60 aria-expanded:border-primary aria-expanded:ring-3 aria-expanded:ring-primary/15"
      >
        <span className="truncate">{options[selected]?.label}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="shrink-0 text-fg-muted transition-transform duration-200 group-aria-expanded:rotate-180 group-aria-expanded:text-primary"
        >
          <path
            d="M5 8l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-labelledby={labelId}
        tabIndex={-1}
        hidden={!open}
        className="animate-pop absolute left-0 z-30 mt-1.5 max-h-72 w-max min-w-full max-w-[calc(100vw-2rem)] space-y-0.5 overflow-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg"
      >
        {options.map((o, i) => {
          const isSelected = i === selected;
          return (
            <li
              key={String(o.value)}
              id={optionId(i)}
              role="option"
              aria-selected={isSelected}
              data-active={i === active || undefined}
              onPointerEnter={() => setActive(i)}
              onPointerDown={(e) => e.preventDefault()} // keep focus on the combobox
              onClick={() => choose(i)}
              className="flex min-h-10 cursor-pointer items-center justify-between gap-6 rounded-lg px-3 py-2 text-sm leading-snug text-fg transition-colors data-active:bg-primary/10 data-active:text-primary aria-selected:font-semibold"
            >
              {o.label}
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                aria-hidden="true"
                className={isSelected ? 'text-primary' : 'invisible'}
              >
                <path
                  d="M4.5 10.5l3.5 3.5 7.5-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
