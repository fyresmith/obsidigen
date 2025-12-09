// Link resolver utility

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import type { VaultIndex } from './indexer.js';

export interface ResolvedLink {
  href: string;
  title: string;
  exists: boolean;
  isExternal: boolean;
}

/**
 * Resolve various link formats to URLs
 */
export function resolveLink(
  linkText: string,
  currentPageSlug: string,
  vaultIndex: VaultIndex
): ResolvedLink {
  // Check for external URLs
  if (linkText.match(/^https?:\/\//)) {
    return {
      href: linkText,
      title: linkText,
      exists: true,
      isExternal: true,
    };
  }
  
  // Handle header links (Page#Header)
  const [pagePart, headerPart] = linkText.split('#');
  let targetSlug: string | null = null;
  
  if (pagePart) {
    // Link to another page
    targetSlug = vaultIndex.getSlug(pagePart);
  } else {
    // Link to header in current page
    targetSlug = currentPageSlug;
  }
  
  const page = targetSlug ? vaultIndex.getPage(targetSlug) : null;
  
  let href = '/';
  if (targetSlug) {
    href = `/${targetSlug}`;
  } else {
    // Page doesn't exist, create a slug from the link text
    href = '/' + encodeURIComponent(pagePart.toLowerCase().replace(/\s+/g, '-'));
  }
  
  // Add header anchor if present
  if (headerPart) {
    const anchor = headerPart
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
    href += `#${anchor}`;
  }
  
  return {
    href,
    title: page?.title || pagePart || linkText,
    exists: page !== null,
    isExternal: false,
  };
}

/**
 * Resolve embed links (![[Page]] or ![[image.png]])
 */
export function resolveEmbed(
  embedText: string,
  currentPagePath: string,
  vaultPath: string,
  vaultIndex: VaultIndex
): { type: 'page' | 'image' | 'unknown'; path: string; exists: boolean } {
  // Check if it's an image
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  const isImage = imageExtensions.some(ext => 
    embedText.toLowerCase().endsWith(ext)
  );
  
  if (isImage) {
    // Look for image in vault
    const possiblePaths = [
      join(dirname(currentPagePath), embedText),
      join(vaultPath, embedText),
      join(vaultPath, 'attachments', embedText),
      join(vaultPath, 'images', embedText),
      join(vaultPath, 'assets', embedText),
    ];
    
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return {
          type: 'image',
          path: path,
          exists: true,
        };
      }
    }
    
    return {
      type: 'image',
      path: embedText,
      exists: false,
    };
  }
  
  // It's a page embed
  const slug = vaultIndex.getSlug(embedText);
  const page = slug ? vaultIndex.getPage(slug) : null;
  
  return {
    type: 'page',
    path: page?.path || embedText,
    exists: page !== null,
  };
}

/**
 * Generate breadcrumb navigation from a slug
 */
export function generateBreadcrumbs(
  slug: string,
  vaultIndex: VaultIndex
): Array<{ title: string; href: string }> {
  const parts = slug.split('/');
  const breadcrumbs: Array<{ title: string; href: string }> = [
    { title: 'Home', href: '/' },
  ];
  
  let currentPath = '';
  for (let i = 0; i < parts.length; i++) {
    currentPath += (i > 0 ? '/' : '') + parts[i];
    const page = vaultIndex.getPage(currentPath);
    
    breadcrumbs.push({
      title: page?.title || decodeURIComponent(parts[i]),
      href: '/' + currentPath,
    });
  }
  
  return breadcrumbs;
}

