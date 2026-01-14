// Backlinks API routes - returns pages linking to a given page with context snippets

import { Hono } from 'hono';
import type { VaultIndex } from '../../vault/indexer.js';

type Variables = {
  vaultIndex: VaultIndex;
  vaultPath: string;
};

export const backlinksRoutes = new Hono<{ Variables: Variables }>();

// Get backlinks with context snippets for a page
backlinksRoutes.get('/:slug{.*}', async (c) => {
  const vaultIndex = c.get('vaultIndex');
  const slug = c.req.param('slug');
  
  if (!slug) {
    return c.json({ error: 'Slug is required' }, 400);
  }
  
  // Get the target page to find its title/aliases for matching
  const targetPage = vaultIndex.getPage(slug);
  if (!targetPage) {
    return c.json({ slug, backlinks: [] });
  }
  
  // Get backlinks with snippets
  const backlinksWithSnippets = vaultIndex.getBacklinksWithSnippets(slug);
  
  return c.json({
    slug,
    title: targetPage.title,
    backlinks: backlinksWithSnippets.map(bl => ({
      page: {
        title: bl.page.title,
        slug: bl.page.slug,
        path: bl.page.relativePath,
        lastModified: bl.page.lastModified,
      },
      mentions: bl.mentions,
    })),
  });
});

// Get outlinks (forward links) for a page
backlinksRoutes.get('/outlinks/:slug{.*}', async (c) => {
  const vaultIndex = c.get('vaultIndex');
  const slug = c.req.param('slug');
  
  if (!slug) {
    return c.json({ error: 'Slug is required' }, 400);
  }
  
  const outlinks = vaultIndex.getForwardLinks(slug);
  
  return c.json({
    slug,
    outlinks: outlinks.map(page => ({
      title: page.title,
      slug: page.slug,
      path: page.relativePath,
      folder: page.relativePath.includes('/') 
        ? page.relativePath.split('/').slice(0, -1).join('/') 
        : 'Root',
      lastModified: page.lastModified,
    })),
  });
});
