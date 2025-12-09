// Graph API routes

import { Hono } from 'hono';
import type { VaultIndex } from '../../vault/indexer.js';

type Variables = {
  vaultIndex: VaultIndex;
  vaultPath: string;
};

export const graphRoutes = new Hono<{ Variables: Variables }>();

// Get full graph data
graphRoutes.get('/', async (c) => {
  const vaultIndex = c.get('vaultIndex');
  const graphData = vaultIndex.getGraphData();
  
  return c.json(graphData);
});

// Get local graph for a specific page
graphRoutes.get('/local/:slug{.+}', async (c) => {
  const vaultIndex = c.get('vaultIndex');
  const slug = c.req.param('slug');
  const depth = parseInt(c.req.query('depth') || '1', 10);
  
  const page = vaultIndex.getPage(slug);
  if (!page) {
    return c.json({ error: 'Page not found' }, 404);
  }
  
  // Get connected nodes
  const nodes = new Map<string, { id: string; label: string; depth: number }>();
  const edges: Array<{ source: string; target: string }> = [];
  const visited = new Set<string>();
  
  function addNode(nodeSlug: string, currentDepth: number) {
    if (visited.has(nodeSlug) || currentDepth > depth) return;
    visited.add(nodeSlug);
    
    const nodePage = vaultIndex.getPage(nodeSlug);
    if (!nodePage) return;
    
    nodes.set(nodeSlug, {
      id: nodeSlug,
      label: nodePage.title,
      depth: currentDepth,
    });
    
    if (currentDepth < depth) {
      // Add forward links
      const forwardLinks = vaultIndex.getForwardLinks(nodeSlug);
      for (const link of forwardLinks) {
        edges.push({ source: nodeSlug, target: link.slug });
        addNode(link.slug, currentDepth + 1);
      }
      
      // Add backlinks
      const backlinks = vaultIndex.getBacklinks(nodeSlug);
      for (const backlink of backlinks) {
        edges.push({ source: backlink.slug, target: nodeSlug });
        addNode(backlink.slug, currentDepth + 1);
      }
    }
  }
  
  addNode(page.slug, 0);
  
  return c.json({
    nodes: Array.from(nodes.values()),
    edges,
    center: page.slug,
  });
});

// Get stats
graphRoutes.get('/stats', async (c) => {
  const vaultIndex = c.get('vaultIndex');
  const graphData = vaultIndex.getGraphData();
  
  // Calculate some stats
  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.edges.length;
  
  // Find most connected pages
  const connectionCount = new Map<string, number>();
  for (const edge of graphData.edges) {
    connectionCount.set(edge.source, (connectionCount.get(edge.source) || 0) + 1);
    connectionCount.set(edge.target, (connectionCount.get(edge.target) || 0) + 1);
  }
  
  const mostConnected = Array.from(connectionCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([slug, count]) => {
      const page = vaultIndex.getPage(slug);
      return {
        title: page?.title || slug,
        slug,
        connections: count,
      };
    });
  
  // Find orphan pages (no connections)
  const orphans = graphData.nodes
    .filter(node => !connectionCount.has(node.id) || connectionCount.get(node.id) === 0)
    .slice(0, 20)
    .map(node => ({
      title: node.label,
      slug: node.id,
    }));
  
  return c.json({
    nodeCount,
    edgeCount,
    averageConnections: nodeCount > 0 ? (edgeCount * 2 / nodeCount).toFixed(2) : 0,
    mostConnected,
    orphans,
  });
});

