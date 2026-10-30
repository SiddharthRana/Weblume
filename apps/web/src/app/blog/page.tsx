import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { posts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Practical guides to website performance, SEO and accessibility.',
  alternates: { canonical: '/blog' },
};

const fmt = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' });

export default function BlogIndex() {
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <PageHeader eyebrow="Blog" title="Guides for healthier websites" />
      <Container className="py-16">
        <ul className="grid gap-6 md:grid-cols-2">
          {sorted.map((p) => (
            <li key={p.slug} className="card card-hover p-6">
              <time dateTime={p.date} className="text-sm text-fg-muted">
                {fmt.format(new Date(p.date))}
              </time>
              <h2 className="mt-2 text-lg font-semibold text-fg">
                <Link href={`/blog/${p.slug}`} className="hover:underline">
                  {p.title}
                </Link>
              </h2>
              <p className="mt-2 text-fg-muted">{p.description}</p>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
