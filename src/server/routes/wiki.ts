// Wiki page routes

import { Hono } from 'hono';
import { readFileSync } from 'fs';
import matter from 'gray-matter';
import type { VaultIndex } from '../../vault/indexer.js';
import { parseMarkdown } from '../../vault/parser.js';
import { renderPage, renderHomePage, render404Page } from '../../templates/page.js';
import { getVaultConfig } from '../../config/vault.js';

type Variables = {
  vaultIndex: VaultIndex;
  vaultPath: string;
};

export const wikiRoutes = new Hono<{ Variables: Variables }>();

/**
 * Find the landing page for the wiki
 * Priority:
 * 1. Root-level page with "welcome" in title (case-insensitive)
 * 2. First alphabetical root-level page
 */
function findLandingPage(vaultIndex: VaultIndex) {
  const allPages = vaultIndex.getAllPages();
  
  // Get root-level pages only (no "/" in relativePath after removing .md)
  const rootPages = allPages.filter(page => {
    const pathWithoutExt = page.relativePath.replace(/\.md$/, '');
    return !pathWithoutExt.includes('/');
  });
  
  // Look for a page with "welcome" in the title
  const welcomePage = rootPages.find(page => 
    page.title.toLowerCase().includes('welcome')
  );
  
  if (welcomePage) {
    return welcomePage;
  }
  
  // Fall back to first alphabetical root page
  if (rootPages.length > 0) {
    return rootPages.sort((a, b) => a.title.localeCompare(b.title))[0];
  }
  
  return null;
}

// Home page - show landing page or wiki index
wikiRoutes.get('/', async (c) => {
  const vaultIndex = c.get('vaultIndex');
  const vaultPath = c.get('vaultPath');
  const config = getVaultConfig(vaultPath);
  const vaultName = config?.title || config?.name || 'Wiki';
  
  // Find landing page
  const landingPage = findLandingPage(vaultIndex);
  
  if (landingPage) {
    // Render the landing page
    const content = readFileSync(landingPage.path, 'utf-8');
    const { content: markdownContent, data: frontmatter } = matter(content);
    const { html } = await parseMarkdown(markdownContent, vaultIndex);
    
    const backlinks = vaultIndex.getBacklinks(landingPage.slug);
    
    return c.html(renderPage({
      title: landingPage.title,
      content: html,
      frontmatter,
      backlinks,
      slug: landingPage.slug,
      lastModified: landingPage.lastModified,
      isHome: true,
      vaultName,
    }));
  }
  
  // No landing page found, show wiki home with all pages
  const recentPages = vaultIndex.getRecentPages(20);
  const allPages = vaultIndex.getAllPages();
  
  return c.html(renderHomePage({
    pageCount: vaultIndex.pageCount,
    recentPages,
    allPages,
    vaultName,
  }));
});

// Individual wiki pages
wikiRoutes.get('/:slug{.+}', async (c) => {
  const vaultIndex = c.get('vaultIndex');
  const vaultPath = c.get('vaultPath');
  const slug = c.req.param('slug');
  const config = getVaultConfig(vaultPath);
  const vaultName = config?.title || config?.name || 'Wiki';
  
  // Try to find the page
  const page = vaultIndex.getPage(slug);
  
  if (!page) {
    return c.html(render404Page(slug, vaultName), 404);
  }
  
  try {
    // Read and parse the markdown file
    const content = readFileSync(page.path, 'utf-8');
    const { content: markdownContent, data: frontmatter } = matter(content);
    const { html } = await parseMarkdown(markdownContent, vaultIndex);
    
    // Get backlinks
    const backlinks = vaultIndex.getBacklinks(page.slug);
    
    return c.html(renderPage({
      title: page.title,
      content: html,
      frontmatter,
      backlinks,
      slug: page.slug,
      lastModified: page.lastModified,
      vaultName,
    }));
    
  } catch (error) {
    console.error(`Error rendering ${page.path}:`, error);
    return c.html(render404Page(slug, vaultName), 500);
  }
});
