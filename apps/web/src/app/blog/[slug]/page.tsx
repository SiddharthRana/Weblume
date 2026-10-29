import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/components/container';
import { getPost, posts } from '@/lib/blog';

export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.date,
    },
  };
}

const fmt = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' });

export default async function BlogPost({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const { default: Content } = await import(`@/content/blog/${slug}.mdx`);
  return (
    <Container className="py-12">
      <article className="prose mx-auto">
        <p className="text-sm text-fg-muted">
          <time dateTime={post.date}>{fmt.format(new Date(post.date))}</time>
        </p>
        <Content />
      </article>
    </Container>
  );
}
