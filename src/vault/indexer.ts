// Vault indexer - builds page index, aliases, and backlinks

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, basename, extname } from 'path';
import matter from 'gray-matter';
import { extractWikiLinks } from './parser.js';

export interface PageInfo {
  title: string;
  slug: string;
  path: string;
  relativePath: string;
  aliases: string[];
  frontmatter: Record<string, any>;
  lastModified: Date;
}

export interface GraphNode {
  id: string;
  label: string;
  path: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export class VaultIndex {
  private pages: Map<string, PageInfo> = new Map();
  private slugToPath: Map<string, string> = new Map();
  private aliasToSlug: Map<string, string> = new Map();
  private titleToSlug: Map<string, string> = new Map();
  private backlinks: Map<string, Set<string>> = new Map();
  private forwardLinks: Map<string, Set<string>> = new Map();
  
  constructor(public readonly vaultPath: string) {}
  
  /**
   * Build or rebuild the entire index
   */
  async build(): Promise<void> {
    this.pages.clear();
    this.slugToPath.clear();
    this.aliasToSlug.clear();
    this.titleToSlug.clear();
    this.backlinks.clear();
    this.forwardLinks.clear();
    
    // First pass: index all pages
    await this.indexDirectory(this.vaultPath);
    
    // Second pass: build links
    for (const [slug, pageInfo] of this.pages) {
      const content = readFileSync(pageInfo.path, 'utf-8');
      const links = extractWikiLinks(content);
      
      const resolvedLinks = new Set<string>();
      
      for (const linkText of links) {
        const targetSlug = this.getSlug(linkText);
        if (targetSlug) {
          resolvedLinks.add(targetSlug);
          
          // Add backlink
          if (!this.backlinks.has(targetSlug)) {
            this.backlinks.set(targetSlug, new Set());
          }
          this.backlinks.get(targetSlug)!.add(slug);
        }
      }
      
      this.forwardLinks.set(slug, resolvedLinks);
    }
  }
  
  /**
   * Recursively index a directory
   */
  private async indexDirectory(dirPath: string): Promise<void> {
    const entries = readdirSync(dirPath);
    
    for (const entry of entries) {
      // Skip hidden files/directories
      if (entry.startsWith('.')) continue;
      
      const fullPath = join(dirPath, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        await this.indexDirectory(fullPath);
      } else if (entry.endsWith('.md')) {
        await this.indexFile(fullPath);
      }
    }
  }
  
  /**
   * Index a single markdown file
   */
  private async indexFile(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const { data: frontmatter } = matter(content);
      
      const relativePath = relative(this.vaultPath, filePath);
      const fileName = basename(filePath, '.md');
      const slug = this.pathToSlug(relativePath);
      
      // Get title from frontmatter or filename
      const title = frontmatter.title || fileName;
      
      // Get aliases from frontmatter
      const aliases: string[] = [];
      if (frontmatter.aliases) {
        if (Array.isArray(frontmatter.aliases)) {
          aliases.push(...frontmatter.aliases);
        } else if (typeof frontmatter.aliases === 'string') {
          aliases.push(frontmatter.aliases);
        }
      }
      if (frontmatter.alias) {
        if (Array.isArray(frontmatter.alias)) {
          aliases.push(...frontmatter.alias);
        } else if (typeof frontmatter.alias === 'string') {
          aliases.push(frontmatter.alias);
        }
      }
      
      const pageInfo: PageInfo = {
        title,
        slug,
        path: filePath,
        relativePath,
        aliases,
        frontmatter,
        lastModified: statSync(filePath).mtime,
      };
      
      // Register in indexes
      this.pages.set(slug, pageInfo);
      this.slugToPath.set(slug, filePath);
      this.titleToSlug.set(title.toLowerCase(), slug);
      this.titleToSlug.set(fileName.toLowerCase(), slug);
      
      // Register aliases
      for (const alias of aliases) {
        this.aliasToSlug.set(alias.toLowerCase(), slug);
      }
      
    } catch (error) {
      console.error(`Error indexing ${filePath}:`, error);
    }
  }
  
  /**
   * Update index for a single file (after modification)
   */
  async updateFile(filePath: string): Promise<void> {
    // Remove old entry if exists
    const relativePath = relative(this.vaultPath, filePath);
    const oldSlug = this.pathToSlug(relativePath);
    
    if (this.pages.has(oldSlug)) {
      const oldPage = this.pages.get(oldSlug)!;
      
      // Remove old aliases
      for (const alias of oldPage.aliases) {
        this.aliasToSlug.delete(alias.toLowerCase());
      }
      
      // Remove from title index
      this.titleToSlug.delete(oldPage.title.toLowerCase());
      
      // Remove old backlinks
      const oldLinks = this.forwardLinks.get(oldSlug);
      if (oldLinks) {
        for (const targetSlug of oldLinks) {
          this.backlinks.get(targetSlug)?.delete(oldSlug);
        }
      }
    }
    
    // Re-index the file
    await this.indexFile(filePath);
    
    // Rebuild links for this file
    const pageInfo = this.pages.get(oldSlug);
    if (pageInfo) {
      const content = readFileSync(filePath, 'utf-8');
      const links = extractWikiLinks(content);
      
      const resolvedLinks = new Set<string>();
      
      for (const linkText of links) {
        const targetSlug = this.getSlug(linkText);
        if (targetSlug) {
          resolvedLinks.add(targetSlug);
          
          if (!this.backlinks.has(targetSlug)) {
            this.backlinks.set(targetSlug, new Set());
          }
          this.backlinks.get(targetSlug)!.add(oldSlug);
        }
      }
      
      this.forwardLinks.set(oldSlug, resolvedLinks);
    }
  }
  
  /**
   * Remove a file from the index
   */
  removeFile(filePath: string): void {
    const relativePath = relative(this.vaultPath, filePath);
    const slug = this.pathToSlug(relativePath);
    
    const pageInfo = this.pages.get(slug);
    if (!pageInfo) return;
    
    // Remove aliases
    for (const alias of pageInfo.aliases) {
      this.aliasToSlug.delete(alias.toLowerCase());
    }
    
    // Remove from indexes
    this.titleToSlug.delete(pageInfo.title.toLowerCase());
    this.slugToPath.delete(slug);
    this.pages.delete(slug);
    
    // Remove backlinks
    const links = this.forwardLinks.get(slug);
    if (links) {
      for (const targetSlug of links) {
        this.backlinks.get(targetSlug)?.delete(slug);
      }
    }
    this.forwardLinks.delete(slug);
    this.backlinks.delete(slug);
  }
  
  /**
   * Convert relative path to URL slug
   */
  pathToSlug(relativePath: string): string {
    return relativePath
      .replace(/\.md$/, '')
      .replace(/\\/g, '/')
      .split('/')
      .map(part => encodeURIComponent(part))
      .join('/');
  }
  
  /**
   * Resolve a link text to a slug
   */
  getSlug(linkText: string): string | null {
    const normalized = linkText.trim().toLowerCase();
    
    // Check aliases first
    if (this.aliasToSlug.has(normalized)) {
      return this.aliasToSlug.get(normalized)!;
    }
    
    // Check titles
    if (this.titleToSlug.has(normalized)) {
      return this.titleToSlug.get(normalized)!;
    }
    
    // Try to match slug directly
    const possibleSlug = linkText.trim().replace(/\s+/g, '%20');
    if (this.pages.has(possibleSlug)) {
      return possibleSlug;
    }
    
    // Try case-insensitive slug match
    for (const [slug] of this.pages) {
      if (slug.toLowerCase() === possibleSlug.toLowerCase()) {
        return slug;
      }
      // Also check just the filename part
      const fileName = slug.split('/').pop()?.replace(/%20/g, ' ').toLowerCase();
      if (fileName === normalized) {
        return slug;
      }
    }
    
    return null;
  }
  
  /**
   * Get page info by slug
   */
  getPage(slug: string): PageInfo | null {
    // Try direct match
    if (this.pages.has(slug)) {
      return this.pages.get(slug)!;
    }
    
    // Try case-insensitive
    for (const [key, value] of this.pages) {
      if (key.toLowerCase() === slug.toLowerCase()) {
        return value;
      }
    }
    
    // Try resolving as link text
    const resolved = this.getSlug(decodeURIComponent(slug));
    if (resolved && this.pages.has(resolved)) {
      return this.pages.get(resolved)!;
    }
    
    return null;
  }
  
  /**
   * Get all pages
   */
  getAllPages(): PageInfo[] {
    return Array.from(this.pages.values());
  }
  
  /**
   * Get backlinks for a page
   */
  getBacklinks(slug: string): PageInfo[] {
    const backlinks = this.backlinks.get(slug);
    if (!backlinks) return [];
    
    return Array.from(backlinks)
      .map(s => this.pages.get(s))
      .filter((p): p is PageInfo => p !== undefined);
  }
  
  /**
   * Get forward links for a page
   */
  getForwardLinks(slug: string): PageInfo[] {
    const links = this.forwardLinks.get(slug);
    if (!links) return [];
    
    return Array.from(links)
      .map(s => this.pages.get(s))
      .filter((p): p is PageInfo => p !== undefined);
  }
  
  /**
   * Search pages by query
   */
  search(query: string, limit: number = 20): PageInfo[] {
    const normalized = query.toLowerCase().trim();
    const results: Array<{ page: PageInfo; score: number }> = [];
    
    for (const page of this.pages.values()) {
      let score = 0;
      
      // Title match (highest priority)
      if (page.title.toLowerCase().includes(normalized)) {
        score += 100;
        if (page.title.toLowerCase() === normalized) {
          score += 50;
        }
        if (page.title.toLowerCase().startsWith(normalized)) {
          score += 25;
        }
      }
      
      // Alias match
      for (const alias of page.aliases) {
        if (alias.toLowerCase().includes(normalized)) {
          score += 75;
          if (alias.toLowerCase() === normalized) {
            score += 50;
          }
        }
      }
      
      // Path match
      if (page.relativePath.toLowerCase().includes(normalized)) {
        score += 25;
      }
      
      if (score > 0) {
        results.push({ page, score });
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.page);
  }
  
  /**
   * Get graph data for visualization
   */
  getGraphData(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    
    for (const [slug, page] of this.pages) {
      nodes.push({
        id: slug,
        label: page.title,
        path: page.relativePath,
      });
    }
    
    for (const [sourceSlug, targets] of this.forwardLinks) {
      for (const targetSlug of targets) {
        edges.push({
          source: sourceSlug,
          target: targetSlug,
        });
      }
    }
    
    return { nodes, edges };
  }
  
  /**
   * Get recently modified pages
   */
  getRecentPages(limit: number = 10): PageInfo[] {
    return Array.from(this.pages.values())
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, limit);
  }
  
  /**
   * Get page count
   */
  get pageCount(): number {
    return this.pages.size;
  }
}

