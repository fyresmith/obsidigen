// Page preview API route

import { Hono } from 'hono';
import { readFileSync } from 'fs';
import matter from 'gray-matter';
import type { VaultIndex } from '../../vault/indexer.js';
import { parseMarkdown } from '../../vault/parser.js';

type Variables = {
  vaultIndex: VaultIndex;
  vaultPath: string;
};

export const previewRoutes = new Hono<{ Variables: Variables }>();

// Get page preview
previewRoutes.get('/:slug{.+}', async (c) => {
  const vaultIndex = c.get('vaultIndex');
  const slug = c.req.param('slug');
  
  // Try to find the page
  const page = vaultIndex.getPage(slug);
  
  if (!page) {
    return c.json({ error: 'Page not found' }, 404);
  }
  
  try {
    // Read and parse the markdown file
    const content = readFileSync(page.path, 'utf-8');
    const { content: markdownContent, data: frontmatter } = matter(content);
    const { html } = await parseMarkdown(markdownContent, vaultIndex);
    
    // Extract first 300 characters of text content for preview
    const textContent = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 300);
    
    return c.json({
      title: page.title,
      slug: page.slug,
      content: html,
      excerpt: textContent,
      frontmatter,
      lastModified: page.lastModified,
    });
    
  } catch (error) {
    console.error(`Error fetching preview for ${page.path}:`, error);
    return c.json({ error: 'Failed to load preview' }, 500);
  }
});

