import { site } from '@/lib/site';

/**
 * Links to the mobile apps. The Android app links to Google Play once it's published there
 * (NEXT_PUBLIC_ANDROID_APP_LIVE=true); until then, and for iPhone, the button says "coming soon".
 */
export function AppLinks({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <ul className="flex flex-wrap gap-3">
      <li>
        <StoreButton
          size={size}
          href={site.apps.android}
          icon={<AndroidIcon />}
          kicker={site.apps.android ? 'Get the app on' : 'Coming soon to'}
          label="Google Play"
        />
      </li>
      <li>
        <StoreButton
          size={size}
          href={site.apps.ios}
          icon={<AppleIcon />}
          kicker={site.apps.ios ? 'Get the app on' : 'Coming soon to'}
          label="the App Store"
        />
      </li>
    </ul>
  );
}

function StoreButton({
  href,
  icon,
  kicker,
  label,
  size,
}: {
  href: string | null;
  icon: React.ReactNode;
  kicker: string;
  label: string;
  size: 'sm' | 'md';
}) {
  const box = `inline-flex items-center gap-3 rounded-xl border px-4 ${size === 'sm' ? 'min-h-11 py-1.5' : 'min-h-14 py-2'}`;
  const text = (
    <span className="flex flex-col text-left leading-tight">
      <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">{kicker}</span>
      <span className={`font-semibold ${size === 'sm' ? 'text-sm' : 'text-base'}`}>{label}</span>
    </span>
  );
  if (!href) {
    return (
      <span
        aria-disabled="true"
        className={`${box} border-dashed border-border bg-surface-muted text-fg-muted`}
      >
        {icon}
        {text}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${box} border-transparent bg-fg text-bg shadow-sm transition-[translate,box-shadow] duration-150 hover:-translate-y-px hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
    >
      {icon}
      {text}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function AndroidIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0" fill="currentColor">
      <path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22a11.4 11.4 0 0 0-9.84 0L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0" fill="currentColor">
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.89 1.15 9.14.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.39-.92-2.4-3.66zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.1 1.76-.96 2.8 1.01.08 2.05-.52 2.68-1.28z" />
    </svg>
  );
}
