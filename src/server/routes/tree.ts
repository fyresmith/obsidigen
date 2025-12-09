// Tree API routes - hierarchical page structure

import { Hono } from 'hono';
import type { VaultIndex, PageInfo } from '../../vault/indexer.js';

type Variables = {
  vaultIndex: VaultIndex;
  vaultPath: string;
};

export interface TreeNode {
  name: string;
  slug?: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
}

/**
 * Build a hierarchical tree from flat page list
 */
function buildTree(pages: PageInfo[]): TreeNode[] {
  const root: TreeNode = {
    name: 'root',
    path: '',
    isFolder: true,
    children: [],
  };

  for (const page of pages) {
    const parts = page.relativePath.replace(/\.md$/, '').split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      let child = current.children.find(c => c.name === part);

      if (!child) {
        child = {
          name: part,
          path: currentPath,
          isFolder: !isLast,
          slug: isLast ? page.slug : undefined,
          children: [],
        };
        current.children.push(child);
      }

      // If this is the last part and we found an existing folder,
      // it might be a folder that also has an index page
      if (isLast && child.isFolder) {
        child.slug = page.slug;
      }

      current = child;
    }
  }

  // Sort children: folders first, then alphabetically
  const sortChildren = (node: TreeNode): void => {
    node.children.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortChildren);
  };

  sortChildren(root);

  return root.children;
}

export const treeRoutes = new Hono<{ Variables: Variables }>();

// Get tree structure
treeRoutes.get('/', async (c) => {
  const vaultIndex = c.get('vaultIndex');
  const pages = vaultIndex.getAllPages();
  const tree = buildTree(pages);

  return c.json({ tree });
});

