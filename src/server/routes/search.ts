// Search API routes

import { Hono } from 'hono';
import type { VaultIndex } from '../../vault/indexer.js';

type Variables = {
  vaultIndex: VaultIndex;
  vaultPath: string;
};

export const searchRoutes = new Hono<{ Variables: Variables }>();

// Search pages with enhanced results
searchRoutes.get('/', async (c) => {
  const vaultIndex = c.get('vaultIndex');
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '20', 10);
  
  if (!query.trim()) {
    return c.json({ results: [], query: '' });
  }
  
  const results = vaultIndex.searchWithSnippets(query, limit);
  
  return c.json({
    query,
    results: results.map(result => ({
      title: result.page.title,
      slug: result.page.slug,
      path: result.page.relativePath,
      aliases: result.page.aliases,
      snippet: result.snippet,
      score: result.score,
      lastModified: result.page.lastModified,
      matches: result.matches,
    })),
  });
});

// Get recent pages
searchRoutes.get('/recent', async (c) => {
  const vaultIndex = c.get('vaultIndex');
  const limit = parseInt(c.req.query('limit') || '10', 10);
  
  const recentPages = vaultIndex.getRecentPages(limit);
  
  return c.json({
    results: recentPages.map(page => ({
      title: page.title,
      slug: page.slug,
      path: page.relativePath,
      lastModified: page.lastModified,
      contentExcerpt: page.contentExcerpt,
    })),
  });
});

// Autocomplete for wiki links
searchRoutes.get('/autocomplete', async (c) => {
  const vaultIndex = c.get('vaultIndex');
  const query = c.req.query('q') || '';
  
  if (!query.trim()) {
    return c.json({ suggestions: [] });
  }
  
  const results = vaultIndex.search(query, 10);
  
  return c.json({
    suggestions: results.map(page => ({
      title: page.title,
      slug: page.slug,
    })),
  });
});

