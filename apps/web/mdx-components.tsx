import type { MDXComponents } from 'mdx/types';

// Required by @next/mdx for the App Router. Styling comes from the `.prose` class in globals.css.
const components: MDXComponents = {};

export function useMDXComponents(): MDXComponents {
  return components;
}
