// Markdown parser with Obsidian wiki link support

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import { visit } from 'unist-util-visit';
import { readFileSync } from 'fs';
import matter from 'gray-matter';
import type { Root, Text, Parent } from 'mdast';
import type { VaultIndex } from './indexer.js';

// Wiki link regex: [[Page Name]] or [[Page Name|Display Text]]
const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// Embed regex: ![[Page Name]]
const EMBED_REGEX = /!\[\[([^\]|]+)\]\]/g;

// Highlight regex: ==text==
const HIGHLIGHT_REGEX = /==([^=]+)==/g;

// Callout regex: > [!type] title
const CALLOUT_REGEX = /^\[!(\w+)\]\s*(.*)?$/;

interface RemarkWikiLinksOptions {
  resolveLink: (linkText: string) => { href: string; exists: boolean };
}

interface RemarkEmbedsOptions {
  resolveEmbed: (linkText: string) => Promise<{ html: string; exists: boolean }>;
}

/**
 * Remark plugin to transform Obsidian wiki links to HTML links
 */
function remarkWikiLinks(options: RemarkWikiLinksOptions) {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      
      const text = node.value;
      const matches = [...text.matchAll(WIKI_LINK_REGEX)];
      
      if (matches.length === 0) return;
      
      // Build new nodes by splitting text around wiki links
      const newNodes: any[] = [];
      let lastIndex = 0;
      
      for (const match of matches) {
        const [fullMatch, linkTarget, displayText] = match;
        const matchIndex = match.index!;
        
        // Add text before the match
        if (matchIndex > lastIndex) {
          newNodes.push({
            type: 'text',
            value: text.slice(lastIndex, matchIndex),
          });
        }
        
        // Resolve the link
        const { href, exists } = options.resolveLink(linkTarget);
        const display = displayText || linkTarget;
        
        // Add the link as HTML
        newNodes.push({
          type: 'html',
          value: `<a href="${href}" class="wiki-link${exists ? '' : ' wiki-link-missing'}">${escapeHtml(display)}</a>`,
        });
        
        lastIndex = matchIndex + fullMatch.length;
      }
      
      // Add remaining text
      if (lastIndex < text.length) {
        newNodes.push({
          type: 'text',
          value: text.slice(lastIndex),
        });
      }
      
      // Replace the original node with new nodes
      parent.children.splice(index, 1, ...newNodes);
    });
  };
}

/**
 * Remark plugin to transform ==highlights== to <mark> tags
 */
function remarkHighlights() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      
      const text = node.value;
      const matches = [...text.matchAll(HIGHLIGHT_REGEX)];
      
      if (matches.length === 0) return;
      
      const newNodes: any[] = [];
      let lastIndex = 0;
      
      for (const match of matches) {
        const [fullMatch, highlightText] = match;
        const matchIndex = match.index!;
        
        if (matchIndex > lastIndex) {
          newNodes.push({
            type: 'text',
            value: text.slice(lastIndex, matchIndex),
          });
        }
        
        newNodes.push({
          type: 'html',
          value: `<mark>${escapeHtml(highlightText)}</mark>`,
        });
        
        lastIndex = matchIndex + fullMatch.length;
      }
      
      if (lastIndex < text.length) {
        newNodes.push({
          type: 'text',
          value: text.slice(lastIndex),
        });
      }
      
      parent.children.splice(index, 1, ...newNodes);
    });
  };
}

/**
 * Remark plugin to transform Obsidian embeds
 */
function remarkEmbeds(options: RemarkEmbedsOptions) {
  return async (tree: Root) => {
    const promises: Promise<void>[] = [];
    
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      
      const text = node.value;
      const matches = [...text.matchAll(EMBED_REGEX)];
      
      if (matches.length === 0) return;
      
      // Build new nodes by splitting text around embeds
      const newNodes: any[] = [];
      let lastIndex = 0;
      
      for (const match of matches) {
        const [fullMatch, linkTarget] = match;
        const matchIndex = match.index!;
        
        // Add text before the match
        if (matchIndex > lastIndex) {
          newNodes.push({
            type: 'text',
            value: text.slice(lastIndex, matchIndex),
          });
        }
        
        // Create placeholder for embed that will be resolved
        const embedPromise = options.resolveEmbed(linkTarget).then(({ html, exists }) => {
          const embedHtml = exists
            ? `<div class="embed-container" data-embed="${escapeHtml(linkTarget)}">
                <div class="embed-header">
                  <span class="embed-icon">📄</span>
                  <span class="embed-title">${escapeHtml(linkTarget)}</span>
                </div>
                <div class="embed-content">${html}</div>
              </div>`
            : `<div class="embed-container embed-missing" data-embed="${escapeHtml(linkTarget)}">
                <div class="embed-header">
                  <span class="embed-icon">❌</span>
                  <span class="embed-title">${escapeHtml(linkTarget)}</span>
                </div>
                <div class="embed-content">Page not found</div>
              </div>`;
          
          return {
            type: 'html',
            value: embedHtml,
          };
        });
        
        promises.push(
          embedPromise.then(node => {
            newNodes.push(node);
          })
        );
        
        lastIndex = matchIndex + fullMatch.length;
      }
      
      // Add remaining text
      if (lastIndex < text.length) {
        newNodes.push({
          type: 'text',
          value: text.slice(lastIndex),
        });
      }
      
      // Wait for all embeds to resolve before replacing
      Promise.all(promises).then(() => {
        parent.children.splice(index, 1, ...newNodes);
      });
    });
    
    await Promise.all(promises);
  };
}

/**
 * Remark plugin to transform Obsidian callouts
 */
function remarkCallouts() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: any, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (!node.children || node.children.length === 0) return;
      
      // Check if first child is a paragraph starting with [!type]
      const firstChild = node.children[0];
      if (firstChild.type !== 'paragraph') return;
      if (!firstChild.children || firstChild.children.length === 0) return;
      
      const firstText = firstChild.children[0];
      if (firstText.type !== 'text') return;
      
      const match = firstText.value.match(CALLOUT_REGEX);
      if (!match) return;
      
      const [, calloutType, title] = match;
      const calloutTitle = title || calloutType.charAt(0).toUpperCase() + calloutType.slice(1);
      
      // Remove the callout marker from the text
      firstText.value = firstText.value.replace(CALLOUT_REGEX, '').trim();
      if (firstText.value === '' && firstChild.children.length === 1) {
        node.children.shift();
      }
      
      // Wrap in callout HTML
      const calloutClass = `callout callout-${calloutType.toLowerCase()}`;
      
      // Convert blockquote to HTML wrapper
      const contentHtml = node.children.map((child: any) => {
        // Simple conversion - we'll let rehype handle the rest
        return '';
      });
      
      // Mark this node for special handling
      (node as any).data = {
        hName: 'div',
        hProperties: {
          className: [calloutClass],
          'data-callout': calloutType.toLowerCase(),
        },
      };
      
      // Add title as first child
      node.children.unshift({
        type: 'html',
        value: `<div class="callout-title"><span class="callout-icon"></span>${escapeHtml(calloutTitle)}</div><div class="callout-content">`,
      });
      
      node.children.push({
        type: 'html',
        value: '</div>',
      });
    });
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface ParseResult {
  html: string;
  links: string[];
}

/**
 * Parse markdown content with Obsidian syntax support
 */
export async function parseMarkdown(
  content: string,
  vaultIndex: VaultIndex
): Promise<ParseResult> {
  const links: string[] = [];
  
  const resolveLink = (linkText: string): { href: string; exists: boolean } => {
    // Normalize the link text
    const normalized = linkText.trim();
    links.push(normalized);
    
    // Try to find in index
    const slug = vaultIndex.getSlug(normalized);
    const exists = slug !== null;
    
    return {
      href: `/${slug || encodeURIComponent(normalized.toLowerCase().replace(/\s+/g, '-'))}`,
      exists,
    };
  };
  
  const resolveEmbed = async (linkText: string): Promise<{ html: string; exists: boolean }> => {
    // Normalize the link text
    const normalized = linkText.trim();
    
    // Try to find in index
    const slug = vaultIndex.getSlug(normalized);
    if (!slug) {
      return { html: '', exists: false };
    }
    
    const page = vaultIndex.getPage(slug);
    if (!page) {
      return { html: '', exists: false };
    }
    
    try {
      // Read the file content
      const fileContent = readFileSync(page.path, 'utf-8');
      const { content: embeddedContent } = matter(fileContent);
      
      // Parse the embedded page content (but prevent recursive embeds to avoid infinite loops)
      const contentWithoutEmbeds = embeddedContent.replace(EMBED_REGEX, '');
      const result = await parseMarkdown(contentWithoutEmbeds, vaultIndex);
      
      return {
        html: result.html,
        exists: true,
      };
    } catch (error) {
      return { html: '', exists: false };
    }
  };
  
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm) // GitHub Flavored Markdown (tables, task lists, strikethrough, footnotes)
    .use(remarkMath) // Math support
    .use(remarkWikiLinks, { resolveLink })
    .use(remarkHighlights)
    .use(remarkEmbeds, { resolveEmbed })
    .use(remarkCallouts)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex) // Render math with KaTeX
    .use(rehypeHighlight) // Syntax highlighting
    .use(rehypeStringify);
  
  const result = await processor.process(content);
  
  return {
    html: String(result),
    links,
  };
}

/**
 * Extract wiki links from content without full parsing
 */
export function extractWikiLinks(content: string): string[] {
  const links: string[] = [];
  const matches = content.matchAll(WIKI_LINK_REGEX);
  
  for (const match of matches) {
    links.push(match[1].trim());
  }
  
  return links;
}

