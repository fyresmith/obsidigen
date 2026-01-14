// Vault indexer - builds page index, aliases, and backlinks

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, basename, extname } from 'path';
import matter from 'gray-matter';
import Fuse, { FuseResult } from 'fuse.js';
import { extractWikiLinks } from './parser.js';

interface SearchData {
  slug: string;
  title: string;
  aliases: string;
  path: string;
  content: string;
  contentExcerpt: string;
}

export interface PageInfo {
  title: string;
  slug: string;
  path: string;
  relativePath: string;
  aliases: string[];
  frontmatter: Record<string, any>;
  lastModified: Date;
  contentExcerpt?: string;
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
  private pageContent: Map<string, string> = new Map();
  private fuse: Fuse<SearchData> | null = null;
  
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
    this.pageContent.clear();
    
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
    
    // Initialize Fuse.js for fuzzy search
    this.initializeFuse();
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
      const rawContent = readFileSync(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(rawContent);
      
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
      
      // Extract content excerpt (first 500 chars of clean text)
      const contentExcerpt = this.extractExcerpt(content);
      
      // Store full content for search
      this.pageContent.set(slug, content);
      
      const pageInfo: PageInfo = {
        title,
        slug,
        path: filePath,
        relativePath,
        aliases,
        frontmatter,
        lastModified: statSync(filePath).mtime,
        contentExcerpt,
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
   * Extract clean text excerpt from markdown content
   */
  private extractExcerpt(content: string, maxLength: number = 500): string {
    // Remove frontmatter if any (shouldn't be present after matter() but just in case)
    let clean = content.replace(/^---[\s\S]*?---\s*/, '');
    
    // Remove markdown syntax
    clean = clean
      .replace(/^#{1,6}\s+/gm, '') // Headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic
      .replace(/_(.+?)_/g, '$1') // Italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
      .replace(/\[\[(.+?)\]\]/g, '$1') // Wiki links
      .replace(/`(.+?)`/g, '$1') // Inline code
      .replace(/^```[\s\S]*?```$/gm, '') // Code blocks
      .replace(/^>\s+/gm, '') // Blockquotes
      .replace(/^[-*+]\s+/gm, '') // Lists
      .replace(/^\d+\.\s+/gm, '') // Numbered lists
      .replace(/==(.+?)==/g, '$1') // Highlights
      .replace(/\n{3,}/g, '\n\n') // Multiple newlines
      .trim();
    
    // Truncate to max length
    if (clean.length > maxLength) {
      clean = clean.substring(0, maxLength).trim() + '...';
    }
    
    return clean;
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
      
      // Remove old content
      this.pageContent.delete(oldSlug);
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
    
    // Reinitialize Fuse with updated data
    this.initializeFuse();
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
    this.pageContent.delete(slug);
    
    // Remove backlinks
    const links = this.forwardLinks.get(slug);
    if (links) {
      for (const targetSlug of links) {
        this.backlinks.get(targetSlug)?.delete(slug);
      }
    }
    this.forwardLinks.delete(slug);
    this.backlinks.delete(slug);
    
    // Reinitialize Fuse with updated data
    this.initializeFuse();
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
   * Normalize a slug that may have been URL-decoded by the web framework
   * Returns the correctly encoded slug if it exists in the index
   */
  private normalizeSlug(slug: string): string | null {
    // Try direct match first
    if (this.pages.has(slug)) {
      return slug;
    }
    
    // Try case-insensitive
    const lowerSlug = slug.toLowerCase();
    for (const [key] of this.pages) {
      if (key.toLowerCase() === lowerSlug) {
        return key;
      }
    }
    
    // If slug appears to be decoded, try re-encoding it
    const reencoded = slug
      .split('/')
      .map(part => encodeURIComponent(part))
      .join('/');
    
    if (reencoded !== slug) {
      if (this.pages.has(reencoded)) {
        return reencoded;
      }
      
      // Try case-insensitive match with re-encoded version
      const lowerReencoded = reencoded.toLowerCase();
      for (const [key] of this.pages) {
        if (key.toLowerCase() === lowerReencoded) {
          return key;
        }
      }
    }
    
    return null;
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
    // Try to normalize the slug first
    const normalized = this.normalizeSlug(slug);
    if (normalized) {
      return this.pages.get(normalized)!;
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
    const normalized = this.normalizeSlug(slug) || slug;
    const backlinks = this.backlinks.get(normalized);
    if (!backlinks) return [];
    
    return Array.from(backlinks)
      .map(s => this.pages.get(s))
      .filter((p): p is PageInfo => p !== undefined);
  }
  
  /**
   * Get forward links for a page (only existing pages)
   */
  getForwardLinks(slug: string): PageInfo[] {
    const normalized = this.normalizeSlug(slug) || slug;
    const links = this.forwardLinks.get(normalized);
    if (!links) return [];
    
    return Array.from(links)
      .map(s => this.pages.get(s))
      .filter((p): p is PageInfo => p !== undefined);
  }
  
  /**
   * Get all outlinks from a page, including links to non-existent pages
   */
  getAllOutlinks(slug: string): Array<{
    title: string;
    slug: string | null;
    path: string;
    folder: string;
    exists: boolean;
  }> {
    const normalized = this.normalizeSlug(slug) || slug;
    const content = this.pageContent.get(normalized);
    if (!content) return [];
    
    // Extract all wiki links from content
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const seenLinks = new Set<string>();
    const outlinks: Array<{
      title: string;
      slug: string | null;
      path: string;
      folder: string;
      exists: boolean;
    }> = [];
    
    let match;
    while ((match = wikiLinkRegex.exec(content)) !== null) {
      const linkTarget = match[1].trim();
      const displayText = match[2]?.trim();
      
      // Skip if we've already processed this link text
      const normalizedLink = linkTarget.toLowerCase();
      if (seenLinks.has(normalizedLink)) continue;
      seenLinks.add(normalizedLink);
      
      // Try to resolve the link to an existing page
      const targetSlug = this.getSlug(linkTarget);
      const targetPage = targetSlug ? this.pages.get(targetSlug) : null;
      
      if (targetPage) {
        // Link to existing page
        const folder = targetPage.relativePath.includes('/') 
          ? targetPage.relativePath.split('/').slice(0, -1).join('/') 
          : 'Root';
        
        outlinks.push({
          title: targetPage.title,
          slug: targetPage.slug,
          path: targetPage.relativePath,
          folder,
          exists: true,
        });
      } else {
        // Link to non-existent page
        outlinks.push({
          title: displayText || linkTarget,
          slug: null,
          path: linkTarget,
          folder: 'Not found',
          exists: false,
        });
      }
    }
    
    // Sort: existing pages first, then by title
    outlinks.sort((a, b) => {
      if (a.exists !== b.exists) return a.exists ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
    
    return outlinks;
  }
  
  /**
   * Get backlinks with context snippets showing where the link appears
   */
  getBacklinksWithSnippets(slug: string): Array<{
    page: PageInfo;
    mentions: Array<{
      snippet: string;
      highlightStart: number;
      highlightEnd: number;
      section?: string;
    }>;
  }> {
    const normalized = this.normalizeSlug(slug) || slug;
    const backlinkSlugs = this.backlinks.get(normalized);
    if (!backlinkSlugs) return [];
    
    // Get the target page to find all possible link texts
    const targetPage = this.pages.get(normalized);
    if (!targetPage) return [];
    
    // Build list of possible link texts (title, filename, aliases)
    const possibleLinkTexts = new Set<string>();
    possibleLinkTexts.add(targetPage.title.toLowerCase());
    
    // Add filename without extension
    const filename = targetPage.relativePath.split('/').pop()?.replace('.md', '') || '';
    possibleLinkTexts.add(filename.toLowerCase());
    
    // Add aliases
    for (const alias of targetPage.aliases) {
      possibleLinkTexts.add(alias.toLowerCase());
    }
    
    const results: Array<{
      page: PageInfo;
      mentions: Array<{
        snippet: string;
        highlightStart: number;
        highlightEnd: number;
        section?: string;
      }>;
    }> = [];
    
    for (const backlinkSlug of backlinkSlugs) {
      const backlinkPage = this.pages.get(backlinkSlug);
      if (!backlinkPage) continue;
      
      const content = this.pageContent.get(backlinkSlug) || '';
      const mentions = this.extractLinkMentions(content, possibleLinkTexts);
      
      if (mentions.length > 0) {
        results.push({
          page: backlinkPage,
          mentions,
        });
      }
    }
    
    // Sort by page title
    results.sort((a, b) => a.page.title.localeCompare(b.page.title));
    
    return results;
  }
  
  /**
   * Extract all mentions of wiki links to a target page with context
   */
  private extractLinkMentions(
    content: string,
    targetLinkTexts: Set<string>
  ): Array<{
    snippet: string;
    highlightStart: number;
    highlightEnd: number;
    section?: string;
  }> {
    const mentions: Array<{
      snippet: string;
      highlightStart: number;
      highlightEnd: number;
      section?: string;
    }> = [];
    
    // Find all wiki links in content
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let match;
    
    // Track current section for context
    let currentSection = '';
    const lines = content.split('\n');
    let charIndex = 0;
    const lineStarts: number[] = [];
    
    for (const line of lines) {
      lineStarts.push(charIndex);
      // Check if this line is a heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        currentSection = headingMatch[2].trim();
      }
      charIndex += line.length + 1; // +1 for newline
    }
    
    while ((match = wikiLinkRegex.exec(content)) !== null) {
      const linkText = match[1].trim().toLowerCase();
      
      // Check if this link points to our target
      if (targetLinkTexts.has(linkText)) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;
        
        // Find which section this is in
        let section = '';
        let currentLineIndex = 0;
        for (let i = 0; i < lineStarts.length; i++) {
          if (lineStarts[i] <= matchStart) {
            currentLineIndex = i;
          } else {
            break;
          }
        }
        
        // Look backwards for the most recent heading
        for (let i = currentLineIndex; i >= 0; i--) {
          const line = lines[i];
          const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
          if (headingMatch) {
            section = headingMatch[2].trim();
            break;
          }
        }
        
        // Generate snippet with context
        const contextChars = 80;
        const snippetStart = Math.max(0, matchStart - contextChars);
        const snippetEnd = Math.min(content.length, matchEnd + contextChars);
        
        let snippet = content.substring(snippetStart, snippetEnd);
        
        // Calculate highlight position within snippet
        const highlightStart = matchStart - snippetStart;
        const highlightEnd = highlightStart + match[0].length;
        
        // Clean up the snippet
        snippet = snippet.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Add ellipsis if truncated
        let adjustedHighlightStart = highlightStart;
        let adjustedHighlightEnd = highlightEnd;
        
        if (snippetStart > 0) {
          snippet = '...' + snippet;
          adjustedHighlightStart += 3;
          adjustedHighlightEnd += 3;
        }
        if (snippetEnd < content.length) {
          snippet = snippet + '...';
        }
        
        mentions.push({
          snippet,
          highlightStart: adjustedHighlightStart,
          highlightEnd: adjustedHighlightEnd,
          section: section || undefined,
        });
      }
    }
    
    return mentions;
  }
  
  /**
   * Initialize Fuse.js for fuzzy search
   */
  private initializeFuse(): void {
    const searchData = Array.from(this.pages.values()).map(page => ({
      slug: page.slug,
      title: page.title,
      aliases: page.aliases.join(' '),
      path: page.relativePath,
      content: this.pageContent.get(page.slug) || '',
      contentExcerpt: page.contentExcerpt || '',
    }));
    
    this.fuse = new Fuse(searchData, {
      keys: [
        { name: 'title', weight: 0.5 },
        { name: 'aliases', weight: 0.3 },
        { name: 'path', weight: 0.1 },
        { name: 'content', weight: 0.1 },
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }
  
  /**
   * Search pages by query using fuzzy matching
   */
  search(query: string, limit: number = 20): PageInfo[] {
    const trimmed = query.trim();
    if (!trimmed || !this.fuse) {
      return [];
    }
    
    const results = this.fuse.search(trimmed, { limit });
    return results.map((result: FuseResult<SearchData>) => this.pages.get(result.item.slug)!).filter(Boolean);
  }
  
  /**
   * Enhanced search with snippets and match context
   */
  searchWithSnippets(query: string, limit: number = 20): Array<{
    page: PageInfo;
    score: number;
    snippet: string;
    matches: Array<{ key: string; value: string; indices: number[][] }>;
  }> {
    const trimmed = query.trim();
    if (!trimmed || !this.fuse) {
      return [];
    }
    
    const results = this.fuse.search(trimmed, { limit });
    
    return results.map((result: FuseResult<SearchData>) => {
      const page = this.pages.get(result.item.slug)!;
      const matches = result.matches || [];
      
      // Generate snippet from best match
      let snippet = page.contentExcerpt || '';
      const contentMatch = matches.find((m: any) => m.key === 'content');
      
      if (contentMatch && contentMatch.indices && contentMatch.indices.length > 0) {
        const content = this.pageContent.get(page.slug) || '';
        snippet = this.generateSnippet(content, contentMatch.indices[0], query);
      } else if (matches.length > 0 && matches[0].value) {
        snippet = matches[0].value;
      }
      
      return {
        page,
        score: result.score || 0,
        snippet,
        matches: matches.map((m: any) => ({
          key: m.key || '',
          value: m.value || '',
          indices: m.indices || [],
        })),
      };
    });
  }
  
  /**
   * Generate a snippet with context around a match
   */
  private generateSnippet(content: string, matchIndices: number[], query: string, contextChars: number = 80): string {
    const [start, end] = matchIndices;
    const snippetStart = Math.max(0, start - contextChars);
    const snippetEnd = Math.min(content.length, end + contextChars);
    
    let snippet = content.substring(snippetStart, snippetEnd).trim();
    
    // Add ellipsis if truncated
    if (snippetStart > 0) snippet = '...' + snippet;
    if (snippetEnd < content.length) snippet = snippet + '...';
    
    // Clean up whitespace and newlines
    snippet = snippet.replace(/\s+/g, ' ').trim();
    
    return snippet;
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

