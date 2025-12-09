// Search API routes

import { Hono } from 'hono';
import type { VaultIndex } from '../../vault/indexer.js';

type Variables = {
  vaultIndex: VaultIndex;
  vaultPath: string;
};

export const searchRoutes = new Hono<{ Variables: Variables }>();

// Search pages
searchRoutes.get('/', async (c) => {
  const vaultIndex = c.get('vaultIndex');
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '20', 10);
  
  if (!query.trim()) {
    return c.json({ results: [], query: '' });
  }
  
  const results = vaultIndex.search(query, limit);
  
  return c.json({
    query,
    results: results.map(page => ({
      title: page.title,
      slug: page.slug,
      path: page.relativePath,
      aliases: page.aliases,
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

