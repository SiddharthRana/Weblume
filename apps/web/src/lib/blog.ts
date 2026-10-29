export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
}

/** Blog index. Add an entry here and a matching src/content/blog/<slug>.mdx file to publish a post. */
export const posts: PostMeta[] = [
  {
    slug: 'what-is-largest-contentful-paint',
    title: 'What is Largest Contentful Paint, and how do you improve it?',
    description:
      'A plain-language guide to the Core Web Vital that measures how fast your main content appears.',
    date: '2026-10-20',
  },
  {
    slug: 'writing-good-alt-text',
    title: 'Writing good alt text: a practical guide for site owners',
    description: 'How to describe images so everyone can use your website — with examples.',
    date: '2026-10-27',
  },
];

export function getPost(slug: string): PostMeta | undefined {
  return posts.find((p) => p.slug === slug);
}
