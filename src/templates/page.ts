// HTML templates for wiki pages - Three-column layout

import type { PageInfo } from '../vault/indexer.js';

interface PageRenderOptions {
  title: string;
  content: string;
  frontmatter?: Record<string, any>;
  backlinks?: PageInfo[];
  slug?: string;
  lastModified?: Date;
  isHome?: boolean;
  vaultName?: string;
  currentSlug?: string;
}

interface HomeRenderOptions {
  pageCount: number;
  recentPages: PageInfo[];
  allPages: PageInfo[];
  vaultName?: string;
}

const styles = `
/* ============================================
   CSS CUSTOM PROPERTIES - THEME SYSTEM
   ============================================ */

:root {
  /* Dark theme (default) */
  --bg-primary: #0f0f0f;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #252525;
  --bg-hover: #2a2a2a;
  --text-primary: #e8e8e8;
  --text-secondary: #a0a0a0;
  --text-muted: #666;
  --accent: #7c9cff;
  --accent-hover: #a0b8ff;
  --accent-subtle: rgba(124, 156, 255, 0.1);
  --border: #333;
  --border-subtle: #262626;
  --link: #7c9cff;
  --link-missing: #ff6b6b;
  --success: #4ade80;
  --warning: #fbbf24;
  --shadow: rgba(0, 0, 0, 0.4);
  --sidebar-width: 280px;
  --backlinks-width: 260px;
  --header-height: 0px;
  --font-mono: 'Berkeley Mono', 'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace;
  --font-sans: 'Söhne', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-serif: 'Newsreader', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  
  /* Mobile-specific variables */
  --floating-btn-size: 48px;
  --floating-offset: 16px;
  --search-bar-height: 52px;
  --modal-backdrop: rgba(0, 0, 0, 0.8);
}

[data-theme="light"] {
  --bg-primary: #fafafa;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f0f0f0;
  --bg-hover: #e8e8e8;
  --text-primary: #1a1a1a;
  --text-secondary: #555;
  --text-muted: #888;
  --accent: #4a6cd4;
  --accent-hover: #3654b8;
  --accent-subtle: rgba(74, 108, 212, 0.08);
  --border: #e0e0e0;
  --border-subtle: #eee;
  --link: #4a6cd4;
  --link-missing: #d94444;
  --success: #22c55e;
  --warning: #f59e0b;
  --shadow: rgba(0, 0, 0, 0.08);
}

/* ============================================
   BASE STYLES
   ============================================ */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 15px;
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.7;
  min-height: 100vh;
  overflow: hidden;
}

/* ============================================
   THREE-COLUMN LAYOUT
   ============================================ */

.wiki-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 800px) var(--backlinks-width);
  justify-content: center;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
}

/* ============================================
   LEFT SIDEBAR
   ============================================ */

.sidebar-left {
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.sidebar-header {
  padding: 1.25rem 1rem;
  flex-shrink: 0;
}

.vault-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  letter-spacing: -0.01em;
}

.vault-title svg {
  width: 20px;
  height: 20px;
  opacity: 0.8;
}

/* Search */
.search-container {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.6rem 0.75rem 0.6rem 2.25rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.search-results {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 320px;
  overflow-y: auto;
  display: none;
  z-index: 1000;
  box-shadow: 0 8px 24px var(--shadow);
}

.search-results.active {
  display: block;
}

.search-result-item {
  display: block;
  padding: 0.65rem 0.85rem;
  text-decoration: none;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.1s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: var(--bg-hover);
}

.search-result-title {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
}

.search-result-path {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-family: var(--font-mono);
  margin-top: 2px;
}

/* Tree Navigation */
.tree-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem 0;
}

.tree-container::-webkit-scrollbar {
  width: 6px;
}

.tree-container::-webkit-scrollbar-track {
  background: transparent;
}

.tree-container::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.tree-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

.tree-list {
  list-style: none;
  padding-left: 0;
}

.tree-list .tree-list {
  padding-left: 1rem;
  border-left: 1px solid var(--border-subtle);
  margin-left: 0.75rem;
}

.tree-item {
  user-select: none;
}

.tree-folder-header {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.75rem;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0;
  transition: color 0.1s;
}

.tree-folder-header:hover {
  color: var(--text-secondary);
}

.tree-page-link {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.75rem;
  cursor: pointer;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.85rem;
  transition: color 0.1s;
  line-height: 1.5;
}

.tree-page-link:hover {
  color: var(--accent);
}

.tree-page-link:hover .tree-name {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.tree-page-link.active {
  color: var(--accent);
}

.tree-page-link.active .tree-name {
  font-weight: 500;
}

.tree-chevron {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  transition: transform 0.15s;
  opacity: 0.4;
}

.tree-chevron.expanded {
  transform: rotate(90deg);
}

.tree-icon {
  display: none;
}

.tree-folder-header .tree-icon {
  display: none;
}

.tree-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-children {
  display: none;
  padding-top: 0.1rem;
  padding-bottom: 0.25rem;
}

.tree-children.expanded {
  display: block;
}

/* ============================================
   MAIN CONTENT AREA
   ============================================ */

.content-area {
  height: 100vh;
  overflow-y: auto;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-subtle);
  border-right: 1px solid var(--border-subtle);
}

.content-area::-webkit-scrollbar {
  width: 8px;
}

.content-area::-webkit-scrollbar-track {
  background: transparent;
}

.content-area::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

.content-area::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

.content-wrapper {
  padding: 2.5rem 3rem;
}

/* Article */
.article {
  /* Clean wiki style - no card */
}

.article-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.article-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-serif);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

/* Markdown Content */
.content {
  font-size: 1rem;
  line-height: 1.75;
}

.content h1 {
  font-size: 1.7rem;
  margin: 2.5rem 0 1rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-serif);
  letter-spacing: -0.02em;
}

.content h2 {
  font-size: 1.4rem;
  margin: 2rem 0 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-serif);
  letter-spacing: -0.01em;
}

.content h3 {
  font-size: 1.2rem;
  margin: 1.75rem 0 0.6rem;
  font-weight: 600;
  color: var(--text-primary);
}

.content h4, .content h5, .content h6 {
  font-size: 1.05rem;
  margin: 1.5rem 0 0.5rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.content p {
  margin-bottom: 1.25rem;
}

.content a {
  color: var(--link);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s;
}

.content a:hover {
  border-bottom-color: var(--link);
}

.content .wiki-link {
  color: var(--accent);
  font-weight: 500;
}

.content .wiki-link-missing {
  color: var(--link-missing);
  font-style: italic;
}

.content ul, .content ol {
  margin: 1rem 0 1rem 1.5rem;
}

.content li {
  margin-bottom: 0.35rem;
}

.content li > ul, .content li > ol {
  margin: 0.35rem 0 0.35rem 1.25rem;
}

.content blockquote {
  border-left: 3px solid var(--accent);
  padding-left: 1.25rem;
  margin: 1.5rem 0;
  color: var(--text-secondary);
  font-style: italic;
}

.content code {
  background: var(--bg-tertiary);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.875em;
}

.content pre {
  background: var(--bg-tertiary);
  padding: 1.25rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5rem 0;
  border: 1px solid var(--border-subtle);
}

.content pre code {
  background: none;
  padding: 0;
  font-size: 0.85rem;
  line-height: 1.5;
}

.content hr {
  border: none;
  height: 1px;
  background: var(--border);
  margin: 2.5rem 0;
}

.content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
  font-size: 0.95rem;
}

.content th, .content td {
  border: 1px solid var(--border);
  padding: 0.75rem;
  text-align: left;
}

.content th {
  background: var(--bg-tertiary);
  font-weight: 600;
}

.content img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1.25rem 0;
}

.content mark {
  background: rgba(251, 191, 36, 0.25);
  color: var(--text-primary);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}

/* Callouts */
.callout {
  margin: 1.5rem 0;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  border-left: 4px solid var(--accent);
  background: var(--bg-tertiary);
}

.callout-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.callout-info { border-left-color: var(--accent); }
.callout-warning { border-left-color: var(--warning); }
.callout-danger { border-left-color: var(--link-missing); }
.callout-success { border-left-color: var(--success); }
.callout-note { border-left-color: var(--text-muted); }

/* ============================================
   RIGHT SIDEBAR - WIDGETS
   ============================================ */

.sidebar-right {
  background: var(--bg-primary);
  height: 100vh;
  overflow-y: auto;
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sidebar-right::-webkit-scrollbar {
  width: 6px;
}

.sidebar-right::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-right::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

/* Widget Base - Clean wiki style */
.widget {
  /* No background/border - clean look */
}

.widget-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.4rem;
  margin-bottom: 0.4rem;
  border-bottom: 1px solid var(--border-subtle);
}

.widget-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.widget-count {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.widget-content {
  max-height: 220px;
  overflow-y: auto;
}

.widget-content::-webkit-scrollbar {
  width: 4px;
}

.widget-content::-webkit-scrollbar-track {
  background: transparent;
}

.widget-content::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.widget-empty {
  color: var(--text-muted);
  font-size: 0.78rem;
  font-style: italic;
}

/* On This Page Widget (TOC) */
.toc-list {
  list-style: none;
}

.toc-item {
  margin: 0;
}

.toc-link {
  display: block;
  padding: 0.2rem 0;
  padding-left: 0.6rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.78rem;
  line-height: 1.45;
  transition: color 0.1s;
  border-left: 1px solid var(--border-subtle);
  margin-left: 0;
}

.toc-link:hover {
  color: var(--accent);
}

.toc-link.active {
  color: var(--accent);
  border-left-color: var(--accent);
}

.toc-link[data-level="2"] {
  padding-left: 0.6rem;
}

.toc-link[data-level="3"] {
  padding-left: 1.1rem;
  font-size: 0.75rem;
}

.toc-link[data-level="4"],
.toc-link[data-level="5"],
.toc-link[data-level="6"] {
  padding-left: 1.6rem;
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Properties Widget */
.properties-table {
  width: 100%;
  font-size: 0.78rem;
}

.properties-table tr {
  border-bottom: 1px solid var(--border-subtle);
}

.properties-table tr:last-child {
  border-bottom: none;
}

.properties-table td {
  padding: 0.3rem 0;
  vertical-align: top;
}

.properties-key {
  color: var(--text-muted);
  font-weight: 500;
  width: 38%;
  padding-right: 0.5rem;
}

.properties-value {
  color: var(--text-secondary);
  word-break: break-word;
}

.properties-value a {
  color: var(--accent);
  text-decoration: none;
}

.properties-value a:hover {
  text-decoration: underline;
}

.properties-tag {
  display: inline-block;
  padding: 0.1rem 0.35rem;
  background: var(--accent-subtle);
  color: var(--accent);
  border-radius: 3px;
  font-size: 0.7rem;
  margin: 0.1rem 0.15rem 0.1rem 0;
}

/* Backlinks Widget */
.backlinks-list {
  list-style: none;
}

.backlinks-list li {
  margin: 0;
}

.backlinks-list a {
  display: block;
  padding: 0.2rem 0;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.78rem;
  transition: color 0.1s;
}

.backlinks-list a:hover {
  color: var(--accent);
}

/* Theme Toggle */
.theme-toggle-container {
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-subtle);
}

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.4rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-family: inherit;
  width: 100%;
  transition: color 0.1s;
}

.theme-toggle:hover {
  color: var(--text-primary);
}

.theme-toggle svg {
  width: 14px;
  height: 14px;
}

/* ============================================
   HOME PAGE
   ============================================ */

.home-header {
  text-align: center;
  margin-bottom: 3rem;
}

.home-title {
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  font-family: var(--font-serif);
  letter-spacing: -0.02em;
}

.home-stats {
  color: var(--text-muted);
}

.page-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.page-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 1rem 1.15rem;
  text-decoration: none;
  transition: all 0.15s;
}

.page-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--shadow);
}

.page-card-title {
  color: var(--text-primary);
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 0.95rem;
}

.page-card-path {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-family: var(--font-mono);
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 2.5rem 0 1rem;
  color: var(--text-secondary);
}

/* ============================================
   404 PAGE
   ============================================ */

.error-page {
  text-align: center;
  padding: 4rem 2rem;
}

.error-code {
  font-size: 5rem;
  font-weight: 700;
  color: var(--text-muted);
  font-family: var(--font-mono);
  opacity: 0.5;
}

.error-message {
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
}

.error-link {
  color: var(--accent);
  text-decoration: none;
}

.error-link:hover {
  text-decoration: underline;
}

/* ============================================
   MOBILE RESPONSIVE
   ============================================ */

.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
  z-index: 1000;
  padding: 0 1rem;
  align-items: center;
  justify-content: space-between;
}

.mobile-menu-btn,
.mobile-backlinks-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.1s, color 0.1s;
}

.mobile-menu-btn:hover,
.mobile-backlinks-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.mobile-menu-btn svg,
.mobile-backlinks-btn svg {
  width: 24px;
  height: 24px;
}

.mobile-title {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-primary);
}

.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  opacity: 0;
  transition: opacity 0.2s;
}

.sidebar-overlay.active {
  display: block;
  opacity: 1;
}

@media (max-width: 1280px) {
  .wiki-layout {
    grid-template-columns: var(--sidebar-width) 1fr var(--backlinks-width);
    justify-content: stretch;
  }
}

@media (max-width: 1024px) {
  .wiki-layout {
    grid-template-columns: var(--sidebar-width) 1fr;
  }
  
  .sidebar-right {
    display: none;
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: var(--backlinks-width);
    z-index: 1001;
    transform: translateX(100%);
    transition: transform 0.25s ease;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border-subtle);
  }
  
  .sidebar-right.mobile-open {
    display: flex;
    flex-direction: column;
    transform: translateX(0);
  }
}

@media (max-width: 768px) {
  body {
    overflow: hidden;
  }
  
  /* Horizontal carousel container */
  .mobile-carousel-wrapper {
    position: fixed;
    inset: 0;
    overflow: hidden;
  }
  
  .mobile-carousel {
    display: flex;
    height: 100vh;
    width: calc(83.33vw + 100vw + 83.33vw); /* left (5/6) + center (full) + right (5/6) */
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    will-change: transform;
  }
  
  .mobile-carousel.transitioning {
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  
  .mobile-carousel.no-transition {
    transition: none;
  }
  
  /* Panel 0: Left Navigation - 5/6 of screen */
  .mobile-carousel .sidebar-left {
    display: flex;
    flex-direction: column;
    width: 83.33vw;
    height: 100vh;
    flex-shrink: 0;
    position: relative;
    transform: none;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-subtle);
  }
  
  /* Panel 1: Main Content - full screen */
  .mobile-carousel .content-area {
    width: 100vw;
    height: 100vh;
    flex-shrink: 0;
    border-left: none;
    border-right: none;
    overflow-y: auto;
    position: relative;
  }
  
  /* Darkened overlay on content when side panels are visible */
  .content-area::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    z-index: 100;
  }
  
  .content-area.dimmed::before {
    opacity: 1;
    pointer-events: auto;
  }
  
  /* Panel 2: Right Widgets - 5/6 of screen */
  .mobile-carousel .sidebar-right {
    display: flex;
    flex-direction: column;
    width: 83.33vw;
    height: 100vh;
    flex-shrink: 0;
    position: relative;
    transform: none;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border-subtle);
  }
  
  .wiki-layout {
    /* Override grid layout on mobile */
    display: contents;
  }
  
  .mobile-header {
    display: none; /* Hidden - using floating buttons instead */
  }
  
  /* Enhanced touch targets for tree navigation */
  .tree-folder-header,
  .tree-page-link {
    padding: 0.75rem;
    min-height: 24px;
    font-size: 0.95rem;
    align-items: center;
  }
  
  .content-wrapper {
    padding: 1.5rem 1.25rem;
    padding-top: calc(var(--floating-btn-size) + var(--floating-offset) + 1rem);
  }
  
  .article-title {
    font-size: 1.75rem;
  }
  
  /* Hide old overlay */
  .sidebar-overlay {
    display: none !important;
  }
}

/* ============================================
   FLOATING MOBILE CONTROLS
   ============================================ */

.floating-nav-btn {
  display: none;
  position: fixed;
  width: var(--floating-btn-size);
  height: var(--floating-btn-size);
  border-radius: 50%;
  background: var(--bg-secondary);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 2px solid var(--border);
  color: var(--text-primary);
  cursor: pointer;
  z-index: 1000;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px var(--shadow), 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.floating-nav-btn:active {
  transform: scale(0.95);
  background: var(--bg-tertiary);
  border-color: var(--accent);
}

.floating-nav-btn svg {
  width: 24px;
  height: 24px;
}

.floating-nav-btn.hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-20px);
}

.floating-nav-btn.faded {
  opacity: 0;
  pointer-events: none;
}

.floating-left-btn {
  top: var(--floating-offset);
  left: var(--floating-offset);
}

.floating-right-btn {
  top: var(--floating-offset);
  right: var(--floating-offset);
}

.floating-search-bar {
  display: none;
  position: fixed;
  bottom: var(--floating-offset);
  left: var(--floating-offset);
  right: var(--floating-offset);
  height: var(--search-bar-height);
  background: var(--bg-secondary);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 2px solid var(--border);
  border-radius: 26px;
  z-index: 1000;
  align-items: center;
  padding: 0 1.25rem;
  gap: 0.75rem;
  cursor: pointer;
  box-shadow: 0 4px 16px var(--shadow), 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.floating-search-bar:active {
  background: var(--bg-tertiary);
  border-color: var(--accent);
}

.floating-search-bar.hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateY(20px);
}

.floating-search-bar.faded {
  opacity: 0;
  pointer-events: none;
}

.floating-search-bar svg {
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.floating-search-bar .search-placeholder {
  color: var(--text-secondary);
  font-size: 0.95rem;
  flex: 1;
}

/* Search Modal */
.search-modal {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--modal-backdrop);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

.search-modal.active {
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.2s ease;
}

.search-modal-content {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
  padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.search-modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.search-modal-input {
  flex: 1;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 0.85rem 1rem 0.85rem 3rem;
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
}

.search-modal-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.search-modal-input::placeholder {
  color: var(--text-muted);
}

.search-modal-header .search-icon {
  position: absolute;
  left: 2rem;
  pointer-events: none;
}

.search-modal-close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.search-modal-close:active {
  background: var(--bg-hover);
}

.search-modal-close svg {
  width: 24px;
  height: 24px;
}

.search-modal-results {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.search-modal-result-item {
  display: block;
  padding: 1rem 1.25rem;
  text-decoration: none;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  transition: all 0.15s;
}

.search-modal-result-item:active {
  background: var(--bg-hover);
  transform: scale(0.98);
}

.search-modal-result-title {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.search-modal-result-path {
  color: var(--text-muted);
  font-size: 0.85rem;
  font-family: var(--font-mono);
}

.search-modal-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 3rem 1rem;
  font-size: 0.95rem;
}

/* Panel Indicators */
.panel-indicators {
  display: none;
  position: fixed;
  bottom: calc(var(--search-bar-height) + var(--floating-offset) + 0.5rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 2px 8px var(--shadow);
  transition: all 0.3s ease;
}

.panel-indicators.hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(10px);
}

.panel-indicators.faded {
  opacity: 0;
  pointer-events: none;
}

.panel-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  opacity: 0.3;
  transition: all 0.3s ease;
}

.panel-indicator.active {
  width: 24px;
  border-radius: 4px;
  background: var(--accent);
  opacity: 1;
}

/* Show floating controls on mobile */
@media (max-width: 768px) {
  .floating-nav-btn,
  .floating-search-bar,
  .panel-indicators {
    display: flex;
  }
}

/* ============================================
   HOVER PREVIEW
   ============================================ */

.page-preview {
  position: fixed;
  max-width: 400px;
  max-height: 300px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 8px 24px var(--shadow);
  z-index: 10000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  overflow: hidden;
  cursor: pointer;
}

.page-preview.active {
  opacity: 1;
  pointer-events: auto;
}

.page-preview:hover {
  border-color: var(--accent);
  box-shadow: 0 8px 32px var(--shadow);
}

.page-preview-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.page-preview-content {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
}

.page-preview-content::-webkit-scrollbar {
  width: 4px;
}

.page-preview-content::-webkit-scrollbar-track {
  background: transparent;
}

.page-preview-content::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

/* Scale down content in preview */
.page-preview-content h1,
.page-preview-content h2,
.page-preview-content h3 {
  font-size: 0.9rem;
  margin: 0.5rem 0 0.25rem;
}

.page-preview-content p {
  margin-bottom: 0.5rem;
}

.page-preview-content ul,
.page-preview-content ol {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.page-preview-content li {
  margin-bottom: 0.25rem;
}

.page-preview-content code {
  font-size: 0.8em;
}

.page-preview-content pre {
  font-size: 0.75rem;
  padding: 0.5rem;
  margin: 0.5rem 0;
}

.page-preview-content a {
  color: var(--text-secondary);
  text-decoration: none;
  border-bottom: none;
  cursor: default;
}

.page-preview-loading {
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  padding: 1rem;
}

/* ============================================
   ANIMATIONS
   ============================================ */

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.content-wrapper {
  animation: fadeIn 0.2s ease;
}
`;

const scripts = `
// ============================================
// TREE NAVIGATION
// ============================================

async function initTree() {
  const container = document.getElementById('tree-nav');
  if (!container) return;
  
  try {
    const res = await fetch('/api/tree');
    const data = await res.json();
    container.innerHTML = renderTree(data.tree);
    
    // Add click handlers for folders
    container.querySelectorAll('.tree-folder-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const item = header.closest('.tree-item');
        const children = item.querySelector('.tree-children');
        const chevron = header.querySelector('.tree-chevron');
        
        if (children) {
          children.classList.toggle('expanded');
          chevron?.classList.toggle('expanded');
        }
      });
    });
    
    // Expand path to current page
    const currentSlug = document.body.dataset.currentSlug;
    if (currentSlug) {
      const activeLink = container.querySelector(\`[href="/\${currentSlug}"]\`);
      if (activeLink) {
        activeLink.classList.add('active');
        // Expand all parent folders
        let parent = activeLink.closest('.tree-children');
        while (parent) {
          parent.classList.add('expanded');
          const header = parent.previousElementSibling;
          header?.querySelector('.tree-chevron')?.classList.add('expanded');
          parent = parent.parentElement?.closest('.tree-children');
        }
      }
    }
  } catch (err) {
    console.error('Failed to load tree:', err);
  }
}

function renderTree(nodes) {
  if (!nodes || nodes.length === 0) return '';
  
  return '<ul class="tree-list">' + nodes.map(node => {
    if (node.isFolder) {
      return \`
        <li class="tree-item">
          <div class="tree-folder-header">
            <svg class="tree-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <svg class="tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="tree-name">\${escapeHtml(node.name)}</span>
          </div>
          <div class="tree-children">
            \${renderTree(node.children)}
          </div>
        </li>
      \`;
    } else {
      return \`
        <li class="tree-item">
          <a href="/\${node.slug}" class="tree-page-link">
            <svg class="tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span class="tree-name">\${escapeHtml(node.name)}</span>
          </a>
        </li>
      \`;
    }
  }).join('') + '</ul>';
}

// ============================================
// SEARCH
// ============================================

function initSearch() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  let debounceTimer;

  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    
    if (!query) {
      searchResults.classList.remove('active');
      return;
    }
    
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(query));
        const data = await res.json();
        
        if (data.results.length > 0) {
          searchResults.innerHTML = data.results.map(r => \`
            <a href="/\${r.slug}" class="search-result-item">
              <div class="search-result-title">\${escapeHtml(r.title)}</div>
              <div class="search-result-path">\${escapeHtml(r.path)}</div>
            </a>
          \`).join('');
          searchResults.classList.add('active');
        } else {
          searchResults.innerHTML = '<div class="search-result-item"><div class="search-result-title">No results found</div></div>';
          searchResults.classList.add('active');
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 150);
  });

  searchInput?.addEventListener('blur', () => {
    setTimeout(() => searchResults?.classList.remove('active'), 200);
  });

  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchResults?.classList.remove('active');
      searchInput.blur();
    }
  });

  // Keyboard shortcut for search
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchInput?.focus();
    }
  });
}

// ============================================
// THEME TOGGLE
// ============================================

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeButton(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeButton(next);
}

function updateThemeButton(theme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  
  const sunIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  const moonIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  
  btn.innerHTML = (theme === 'dark' ? sunIcon : moonIcon) + '<span>' + (theme === 'dark' ? 'Light mode' : 'Dark mode') + '</span>';
}

// ============================================
// MOBILE NAVIGATION
// ============================================

// ============================================
// MOBILE CAROUSEL NAVIGATION
// ============================================

let currentPanel = 1; // 0 = left nav, 1 = content (default), 2 = right widgets
let carousel = null;
let panelIndicators = [];
let contentArea = null;
let justSwiped = false; // Flag to prevent phantom clicks after swipes

function initMobile() {
  carousel = document.querySelector('.mobile-carousel');
  contentArea = document.querySelector('.content-area');
  if (!carousel) return; // Not on mobile
  
  const leftBtn = document.getElementById('floating-left-btn');
  const rightBtn = document.getElementById('floating-right-btn');
  const floatingSearch = document.querySelector('.floating-search-bar');
  const panelIndicatorsEl = document.querySelector('.panel-indicators');
  panelIndicators = Array.from(document.querySelectorAll('.panel-indicator'));
  
  // Initialize - show center panel (content)
  goToPanel(1, false);
  
  // Button handlers
  leftBtn?.addEventListener('click', () => {
    if (currentPanel === 1) {
      goToPanel(0); // From content to left nav
    } else if (currentPanel === 2) {
      goToPanel(1); // From right widgets to content
    }
  });
  
  rightBtn?.addEventListener('click', () => {
    if (currentPanel === 0) {
      goToPanel(1); // From left nav to content
    } else if (currentPanel === 1) {
      goToPanel(2); // From content to right widgets
    }
  });
  
  // Click on dimmed content area to return to center
  contentArea?.addEventListener('click', (e) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fc9b174b-f9cc-4c04-a679-f74cd7c1f0d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.ts:contentAreaClick',message:'Content area clicked',data:{justSwiped,isDimmed:contentArea.classList.contains('dimmed'),currentPanel,isSwiping},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    // Ignore phantom clicks that fire after swipe gestures
    if (justSwiped) {
      return;
    }
    
    if (contentArea.classList.contains('dimmed') && currentPanel !== 1) {
      e.preventDefault();
      e.stopPropagation();
      goToPanel(1);
    }
  });
}

function goToPanel(panelIndex, animate = true) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/fc9b174b-f9cc-4c04-a679-f74cd7c1f0d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.ts:goToPanel',message:'goToPanel called',data:{panelIndex,animate,currentPanelBefore:currentPanel,carouselTransformBefore:carousel?.style.transform},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  if (!carousel || !contentArea) return;
  
  // Clamp to valid range
  panelIndex = Math.max(0, Math.min(2, panelIndex));
  currentPanel = panelIndex;
  
  // Calculate transform based on panel widths
  // Left panel: 83.33vw, Center: 100vw, Right: 83.33vw
  let offset = 0;
  if (panelIndex === 0) {
    offset = 0; // Show left panel (0 to 100vw visible: left panel + 1/6 of center)
  } else if (panelIndex === 1) {
    offset = -83.33; // Show center panel (83.33vw to 183.33vw visible: full center)
  } else if (panelIndex === 2) {
    offset = -(83.33 + 100 - 16.67); // Show right panel (166.67vw to 266.67vw visible: 1/6 of center + right panel)
    // This is -166.67vw, which shows the last 1/6 of center content as a sliver on the left
  }
  
  // Apply transition
  if (animate) {
    carousel.classList.add('transitioning');
    carousel.classList.remove('no-transition');
  } else {
    carousel.classList.add('no-transition');
    carousel.classList.remove('transitioning');
  }
  
  carousel.style.transform = \`translateX(\${offset}vw)\`;
  
  // Update indicators
  panelIndicators.forEach((indicator, index) => {
    indicator.classList.toggle('active', index === panelIndex);
  });
  
  // Dim content area when on side panels
  if (panelIndex === 0 || panelIndex === 2) {
    contentArea.classList.add('dimmed');
  } else {
    contentArea.classList.remove('dimmed');
  }
  
  // Fade floating buttons and indicators on side panels
  const floatingButtons = document.querySelectorAll('.floating-nav-btn');
  const floatingSearch = document.querySelector('.floating-search-bar');
  const panelIndicatorsEl = document.querySelector('.panel-indicators');
  
  if (panelIndex === 0 || panelIndex === 2) {
    floatingButtons.forEach(btn => btn.classList.add('faded'));
    floatingSearch?.classList.add('faded');
    panelIndicatorsEl?.classList.add('faded');
  } else {
    floatingButtons.forEach(btn => btn.classList.remove('faded'));
    floatingSearch?.classList.remove('faded');
    panelIndicatorsEl?.classList.remove('faded');
  }
}

// ============================================
// SWIPE GESTURES FOR CAROUSEL
// ============================================

function initSwipeGestures() {
  if (!carousel) return; // Not on mobile
  
  let touchStartX = 0;
  let touchStartY = 0;
  let touchCurrentX = 0;
  let touchStartTime = 0;
  let isSwiping = false;
  let startTransform = 0;
  let startPanel = 1; // Track which panel we started on
  
  // Swipe anywhere on the document
  document.addEventListener('touchstart', (e) => {
    // Skip if touching the search modal
    if (e.target.closest('.search-modal')) return;
    
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchCurrentX = touchStartX;
    touchStartTime = Date.now();
    isSwiping = false;
    startPanel = currentPanel; // Remember which panel we started on
    
    // Get current transform value
    const transform = carousel.style.transform || 'translateX(-83.33vw)';
    const match = transform.match(/translateX\\(([\\-\\d.]+)vw\\)/);
    startTransform = match ? parseFloat(match[1]) : -83.33;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fc9b174b-f9cc-4c04-a679-f74cd7c1f0d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.ts:touchstart',message:'Touch started',data:{currentPanel,startPanel,rawTransform:carousel.style.transform,parsedTransform:startTransform,matchFound:!!match},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion
    
    // Disable transitions during drag
    carousel.classList.add('no-transition');
    carousel.classList.remove('transitioning');
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    if (!touchStartX || e.target.closest('.search-modal')) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = touchX - touchStartX;
    const diffY = touchY - touchStartY;
    
    // Check if horizontal swipe (more horizontal than vertical)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      // #region agent log
      if (!isSwiping) fetch('http://127.0.0.1:7242/ingest/fc9b174b-f9cc-4c04-a679-f74cd7c1f0d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.ts:touchmove',message:'isSwiping set to true',data:{diffX,startPanel,currentPanel},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      isSwiping = true;
      touchCurrentX = touchX;
      
      // Calculate drag offset as percentage of viewport width
      const dragPercent = (diffX / window.innerWidth) * 100;
      const newTransform = startTransform + dragPercent;
      
      // Apply transform with limits
      // Min: -(83.33 + 100 - 16.67) = -166.67 (right panel)
      // Max: 0 (left panel)
      const minTransform = -(83.33 + 100 - 16.67);
      const maxTransform = 0;
      const clampedTransform = Math.max(minTransform, Math.min(maxTransform, newTransform));
      
      carousel.style.transform = \`translateX(\${clampedTransform}vw)\`;
      
      // Update dim state during drag
      const centerThreshold = -41.665; // halfway to left panel from center
      const rightThreshold = -(83.33 + 50); // halfway from center to right panel
      if (clampedTransform > centerThreshold || clampedTransform < rightThreshold) {
        contentArea?.classList.add('dimmed');
      } else {
        contentArea?.classList.remove('dimmed');
      }
      
      // Prevent default to stop scrolling during swipe
      if (isSwiping) {
        e.preventDefault();
      }
    }
  }, { passive: false });
  
  document.addEventListener('touchend', (e) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fc9b174b-f9cc-4c04-a679-f74cd7c1f0d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.ts:touchend:entry',message:'Touch ended - entry',data:{isSwiping,touchStartX,startPanel,currentPanel},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion
    if (!isSwiping || !touchStartX || e.target.closest('.search-modal')) {
      touchStartX = 0;
      touchStartY = 0;
      return;
    }
    
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX;
    
    // Get current transform to see where we actually dragged to
    const transform = carousel.style.transform || 'translateX(-83.33vw)';
    const match = transform.match(/translateX\\(([\\-\\d.]+)vw\\)/);
    const currentTransform = match ? parseFloat(match[1]) : -83.33;
    
    let newPanel = currentPanel;
    
    // SHORT THRESHOLD: 15% of screen width
    const shortThreshold = window.innerWidth * 0.15;
    
    // BEHAVIOR 1: On middle panel - short swipe triggers panel change
    if (startPanel === 1) {
      if (Math.abs(diffX) > shortThreshold) {
        if (diffX > 0) {
          // Swipe right - open left panel
          newPanel = 0;
        } else {
          // Swipe left - open right panel
          newPanel = 2;
        }
      } else {
        // Not enough distance - stay on middle panel
        newPanel = 1;
      }
    }
    // BEHAVIOR 2: On side panels - follow the swipe gesture, snap to nearest
    else {
      // Calculate distances to each panel position
      const leftPanelPos = 0;
      const centerPanelPos = -83.33;
      const rightPanelPos = -166.67;
      
      const distToLeft = Math.abs(currentTransform - leftPanelPos);
      const distToCenter = Math.abs(currentTransform - centerPanelPos);
      const distToRight = Math.abs(currentTransform - rightPanelPos);
      
      // Snap to nearest panel based on where we dragged to
      if (distToLeft < distToCenter && distToLeft < distToRight) {
        newPanel = 0;
      } else if (distToCenter < distToRight) {
        newPanel = 1;
      } else {
        newPanel = 2;
      }
    }
    
    // Only snap to panel if it actually changed, otherwise re-enable transitions
    const panelChanged = newPanel !== startPanel;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fc9b174b-f9cc-4c04-a679-f74cd7c1f0d2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.ts:touchend:decision',message:'Panel decision made',data:{startPanel,currentPanel,newPanel,panelChanged,diffX,currentTransform},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion
    
    if (panelChanged) {
      goToPanel(newPanel, true);
      
      // Prevent phantom clicks after panel changes
      justSwiped = true;
      setTimeout(() => {
        justSwiped = false;
      }, 400);
    } else {
      // Panel didn't change - just snap back to current position smoothly
      carousel.classList.remove('no-transition');
      carousel.classList.add('transitioning');
      goToPanel(currentPanel, true);
    }
    
    touchStartX = 0;
    touchStartY = 0;
    isSwiping = false;
  }, { passive: true });
}

// ============================================
// SCROLL-BASED UI VISIBILITY
// ============================================

function initScrollBasedUI() {
  const contentArea = document.querySelector('.content-area');
  const floatingButtons = document.querySelectorAll('.floating-nav-btn');
  const floatingSearch = document.querySelector('.floating-search-bar');
  const panelIndicatorsEl = document.querySelector('.panel-indicators');
  
  if (!contentArea) return;
  
  let lastScrollTop = 0;
  let ticking = false;
  const threshold = 10; // Minimum scroll distance to trigger
  
  contentArea.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollTop = contentArea.scrollTop;
        
        // Scrolling down - hide UI
        if (scrollTop > lastScrollTop + threshold && scrollTop > 100) {
          floatingButtons.forEach(btn => btn.classList.add('hidden'));
          floatingSearch?.classList.add('hidden');
          panelIndicatorsEl?.classList.add('hidden');
        }
        // Scrolling up - show UI
        else if (scrollTop < lastScrollTop - threshold || scrollTop < 100) {
          floatingButtons.forEach(btn => btn.classList.remove('hidden'));
          floatingSearch?.classList.remove('hidden');
          panelIndicatorsEl?.classList.remove('hidden');
        }
        
        lastScrollTop = scrollTop;
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ============================================
// SEARCH MODAL
// ============================================

let searchModal = null;
let searchModalInput = null;
let searchModalResults = null;

function initSearchModal() {
  const floatingSearchBar = document.querySelector('.floating-search-bar');
  searchModal = document.getElementById('search-modal');
  searchModalInput = document.getElementById('search-modal-input');
  searchModalResults = document.getElementById('search-modal-results');
  const closeBtn = document.getElementById('search-modal-close');
  
  // Open modal when clicking floating search bar
  floatingSearchBar?.addEventListener('click', openSearchModal);
  
  // Close modal
  closeBtn?.addEventListener('click', closeSearchModal);
  searchModal?.addEventListener('click', (e) => {
    if (e.target === searchModal) {
      closeSearchModal();
    }
  });
  
  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchModal?.classList.contains('active')) {
      closeSearchModal();
    }
  });
  
  // Search functionality
  let debounceTimer;
  searchModalInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    
    if (!query) {
      searchModalResults.innerHTML = '<div class="search-modal-empty">Type to search...</div>';
      return;
    }
    
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(query));
        const data = await res.json();
        
        if (data.results.length > 0) {
          searchModalResults.innerHTML = data.results.map(r => \`
            <a href="/\${r.slug}" class="search-modal-result-item">
              <div class="search-modal-result-title">\${escapeHtml(r.title)}</div>
              <div class="search-modal-result-path">\${escapeHtml(r.path)}</div>
            </a>
          \`).join('');
        } else {
          searchModalResults.innerHTML = '<div class="search-modal-empty">No results found</div>';
        }
      } catch (err) {
        console.error('Search error:', err);
        searchModalResults.innerHTML = '<div class="search-modal-empty">Search error</div>';
      }
    }, 200);
  });
}

function openSearchModal() {
  searchModal?.classList.add('active');
  searchModalInput?.focus();
  document.body.style.overflow = 'hidden';
}

function closeSearchModal() {
  searchModal?.classList.remove('active');
  if (searchModalInput) searchModalInput.value = '';
  if (searchModalResults) searchModalResults.innerHTML = '<div class="search-modal-empty">Type to search...</div>';
  document.body.style.overflow = '';
}

// ============================================
// UTILITIES
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// TABLE OF CONTENTS / SCROLL SPY
// ============================================

function initTOC() {
  const tocContainer = document.getElementById('toc-content');
  const contentArea = document.querySelector('.content-area');
  if (!tocContainer || !contentArea) return;
  
  // Get all headings from the article content
  const article = document.querySelector('.article .content');
  if (!article) return;
  
  const headings = article.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) {
    tocContainer.innerHTML = '<p class="widget-empty">No headings</p>';
    return;
  }
  
  // Build TOC
  let tocHtml = '<ul class="toc-list">';
  headings.forEach((heading, index) => {
    const id = heading.id || 'heading-' + index;
    heading.id = id;
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent || '';
    tocHtml += \`<li class="toc-item"><a href="#\${id}" class="toc-link" data-level="\${level}">\${escapeHtml(text)}</a></li>\`;
  });
  tocHtml += '</ul>';
  tocContainer.innerHTML = tocHtml;
  
  // Update heading count
  const countEl = document.getElementById('toc-count');
  if (countEl) countEl.textContent = headings.length.toString();
  
  // Scroll spy
  const tocLinks = tocContainer.querySelectorAll('.toc-link');
  let ticking = false;
  
  function updateActiveHeading() {
    const scrollTop = contentArea.scrollTop;
    const scrollHeight = contentArea.scrollHeight;
    const clientHeight = contentArea.clientHeight;
    const offset = 100;
    
    // Check if we're at the bottom of the page (within 10px)
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    
    let activeIndex = 0;
    
    if (isAtBottom && headings.length > 0) {
      // If at bottom, highlight the last heading
      activeIndex = headings.length - 1;
    } else {
      headings.forEach((heading, index) => {
        const rect = heading.getBoundingClientRect();
        const contentRect = contentArea.getBoundingClientRect();
        const relativeTop = rect.top - contentRect.top;
        
        if (relativeTop < offset) {
          activeIndex = index;
        }
      });
    }
    
    tocLinks.forEach((link, index) => {
      link.classList.toggle('active', index === activeIndex);
    });
  }
  
  contentArea.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateActiveHeading();
        ticking = false;
      });
      ticking = true;
    }
  });
  
  // Smooth scroll on click
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href')?.slice(1);
      const target = document.getElementById(targetId || '');
      if (target) {
        const contentRect = contentArea.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const scrollTop = contentArea.scrollTop + (targetRect.top - contentRect.top) - 80;
        contentArea.scrollTo({ top: scrollTop, behavior: 'smooth' });
      }
    });
  });
  
  // Initial highlight
  updateActiveHeading();
}

// ============================================
// HOVER PREVIEW
// ============================================

let previewPopover = null;
let previewTimeout = null;
let hideTimeout = null;
let currentPreviewLink = null;
let currentPreviewSlug = null;
let isOverPreview = false;
let isOverLink = false;
const previewCache = new Map();

function initHoverPreview() {
  // Create preview popover element
  previewPopover = document.createElement('div');
  previewPopover.className = 'page-preview';
  previewPopover.innerHTML = '<div class="page-preview-loading">Loading...</div>';
  document.body.appendChild(previewPopover);
  
  // Add hover listeners to all wiki links
  document.addEventListener('mouseover', handleLinkHover);
  document.addEventListener('mouseout', handleLinkOut);
  
  // Handle hovering over the preview itself
  previewPopover.addEventListener('mouseenter', () => {
    isOverPreview = true;
    clearTimeout(hideTimeout);
  });
  
  previewPopover.addEventListener('mouseleave', () => {
    isOverPreview = false;
    scheduleHide();
  });
  
  // Handle clicking the preview
  previewPopover.addEventListener('click', (e) => {
    // Don't navigate if clicking a link inside (we'll prevent that separately)
    if (e.target.tagName === 'A') return;
    
    // Navigate to the page
    if (currentPreviewSlug) {
      window.location.href = '/' + currentPreviewSlug;
    }
  });
}

function handleLinkHover(e) {
  const link = e.target.closest('a[href^="/"]');
  if (!link || link.closest('.page-preview')) return;
  
  // Ignore tree navigation links
  if (link.classList.contains('tree-page-link')) return;
  
  // Ignore if it's a heading anchor
  if (link.getAttribute('href').includes('#')) return;
  
  isOverLink = true;
  currentPreviewLink = link;
  
  // Cancel any pending hide
  clearTimeout(hideTimeout);
  
  // Show preview after delay
  clearTimeout(previewTimeout);
  previewTimeout = setTimeout(() => {
    if (currentPreviewLink === link && isOverLink) {
      showPreview(link);
    }
  }, 300);
}

function handleLinkOut(e) {
  const link = e.target.closest('a[href^="/"]');
  if (link === currentPreviewLink) {
    isOverLink = false;
    clearTimeout(previewTimeout);
    scheduleHide();
  }
}

function scheduleHide() {
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    if (!isOverLink && !isOverPreview) {
      hidePreview();
      currentPreviewLink = null;
      currentPreviewSlug = null;
    }
  }, 200);
}

async function showPreview(link) {
  const href = link.getAttribute('href');
  const slug = href.substring(1); // Remove leading /
  
  if (!slug) return;
  
  currentPreviewSlug = slug;
  
  // Position the preview
  const rect = link.getBoundingClientRect();
  const previewWidth = 400;
  const previewMaxHeight = 300;
  
  // Try to position below the link, but flip if too close to bottom
  let top = rect.bottom + window.scrollY + 8;
  let left = rect.left + window.scrollX;
  
  // Adjust if too close to right edge
  if (left + previewWidth > window.innerWidth) {
    left = window.innerWidth - previewWidth - 20;
  }
  
  // Adjust if too close to bottom
  if (rect.bottom + previewMaxHeight > window.innerHeight) {
    top = rect.top + window.scrollY - previewMaxHeight - 8;
  }
  
  previewPopover.style.left = left + 'px';
  previewPopover.style.top = top + 'px';
  
  // Check cache first
  if (previewCache.has(slug)) {
    const cached = previewCache.get(slug);
    renderPreview(cached, slug);
    previewPopover.classList.add('active');
    return;
  }
  
  // Show loading state
  previewPopover.innerHTML = '<div class="page-preview-loading">Loading...</div>';
  previewPopover.classList.add('active');
  
  try {
    const response = await fetch('/api/preview/' + slug);
    if (!response.ok) throw new Error('Preview not found');
    
    const data = await response.json();
    
    // Cache the result
    previewCache.set(slug, data);
    
    // Only render if we're still hovering the same link
    if (currentPreviewLink && currentPreviewLink.getAttribute('href') === href) {
      renderPreview(data, slug);
    }
  } catch (error) {
    if (currentPreviewLink && currentPreviewLink.getAttribute('href') === href) {
      previewPopover.innerHTML = '<div class="page-preview-loading">Preview not available</div>';
    }
  }
}

function renderPreview(data, slug) {
  previewPopover.innerHTML = \`
    <div class="page-preview-title">\${escapeHtml(data.title)}</div>
    <div class="page-preview-content">\${data.content}</div>
  \`;
  
  // Disable all links inside the preview
  const links = previewPopover.querySelectorAll('a');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    link.style.pointerEvents = 'none';
  });
}

function hidePreview() {
  clearTimeout(previewTimeout);
  previewPopover.classList.remove('active');
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTree();
  initSearch();
  initMobile();
  initTOC();
  initHoverPreview();
  initSwipeGestures();
  initScrollBasedUI();
  initSearchModal();
});
`;

function layout(title: string, content: string, options: { vaultName?: string; currentSlug?: string; backlinks?: PageInfo[]; frontmatter?: Record<string, any>; lastModified?: Date } = {}): string {
  const { vaultName = 'Wiki', currentSlug = '', backlinks = [], frontmatter = {}, lastModified } = options;
  
  const backlinksHtml = backlinks.length > 0
    ? `<ul class="backlinks-list">
        ${backlinks.map(bl => `<li><a href="/${bl.slug}">${escapeHtml(bl.title)}</a></li>`).join('')}
       </ul>`
    : '<p class="widget-empty">No pages link here</p>';
  
  // Build properties widget
  const propertyEntries: Array<{ key: string; value: string }> = [];
  
  // Add last modified if available
  if (lastModified) {
    propertyEntries.push({ 
      key: 'Modified', 
      value: lastModified.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    });
  }
  
  // Process frontmatter
  for (const [key, value] of Object.entries(frontmatter)) {
    if (key === 'title' || key === 'aliases' || key === 'alias') continue; // Skip these
    
    let displayValue = '';
    
    if (key === 'tags' && Array.isArray(value)) {
      displayValue = value.map(tag => `<span class="properties-tag">${escapeHtml(String(tag))}</span>`).join('');
    } else if (Array.isArray(value)) {
      displayValue = value.map(v => {
        const str = String(v);
        return str.includes('[[') ? renderWikiLinks(str) : escapeHtml(str);
      }).join(', ');
    } else if (typeof value === 'object' && value !== null) {
      displayValue = escapeHtml(JSON.stringify(value));
    } else if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    } else {
      const stringValue = String(value);
      // Check if the value contains wiki links and render them
      displayValue = stringValue.includes('[[') 
        ? renderWikiLinks(stringValue) 
        : escapeHtml(stringValue);
    }
    
    // Capitalize first letter of key
    const displayKey = key.charAt(0).toUpperCase() + key.slice(1);
    propertyEntries.push({ key: displayKey, value: displayValue });
  }
  
  const propertiesHtml = propertyEntries.length > 0
    ? `<table class="properties-table">
        ${propertyEntries.map(({ key, value }) => `
          <tr>
            <td class="properties-key">${escapeHtml(key)}</td>
            <td class="properties-value">${value}</td>
          </tr>
        `).join('')}
       </table>`
    : '<p class="widget-empty">No properties</p>';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - ${escapeHtml(vaultName)}</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&display=swap" rel="stylesheet">
  <style>${styles}</style>
</head>
<body data-current-slug="${escapeHtml(currentSlug)}">
  <!-- Floating Navigation Buttons (Mobile) -->
  <button id="floating-left-btn" class="floating-nav-btn floating-left-btn" aria-label="Open navigation">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  </button>
  
  <button id="floating-right-btn" class="floating-nav-btn floating-right-btn" aria-label="Open widgets">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  </button>
  
  <!-- Floating Search Bar (Mobile) -->
  <div class="floating-search-bar">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <span class="search-placeholder">Search...</span>
  </div>
  
  <!-- Search Modal (Mobile) -->
  <div id="search-modal" class="search-modal">
    <div class="search-modal-content">
      <div class="search-modal-header">
        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="search-modal-input" class="search-modal-input" placeholder="Search pages..." autocomplete="off">
        <button id="search-modal-close" class="search-modal-close" aria-label="Close search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="search-modal-results" class="search-modal-results">
        <div class="search-modal-empty">Type to search...</div>
      </div>
    </div>
  </div>
  
  <!-- Sidebar Overlay -->
  <div id="sidebar-overlay" class="sidebar-overlay"></div>
  
  <!-- Panel Indicators (Mobile) -->
  <div class="panel-indicators">
    <div class="panel-indicator"></div>
    <div class="panel-indicator active"></div>
    <div class="panel-indicator"></div>
  </div>
  
  <!-- Mobile Carousel Wrapper -->
  <div class="mobile-carousel-wrapper">
    <div class="mobile-carousel">
      <div class="wiki-layout">
    <!-- Left Sidebar -->
    <aside class="sidebar-left">
      <div class="sidebar-header">
        <div class="vault-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          ${escapeHtml(vaultName)}
        </div>
        <div class="search-container">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="search-input" class="search-input" placeholder="Search... (⌘K)" autocomplete="off">
          <div id="search-results" class="search-results"></div>
        </div>
      </div>
      <nav id="tree-nav" class="tree-container">
        <div style="padding: 1rem; color: var(--text-muted); font-size: 0.85rem;">Loading...</div>
      </nav>
    </aside>
    
    <!-- Main Content -->
    <main class="content-area">
      <div class="content-wrapper">
        ${content}
      </div>
    </main>
    
    <!-- Right Sidebar - Widgets -->
    <aside class="sidebar-right">
      <!-- Properties Widget -->
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Properties</span>
        </div>
        <div class="widget-content">
          ${propertiesHtml}
        </div>
      </div>
      
      <!-- On This Page Widget -->
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">On This Page</span>
          <span class="widget-count" id="toc-count"></span>
        </div>
        <div class="widget-content" id="toc-content">
          <p class="widget-empty">Loading...</p>
        </div>
      </div>
      
      <!-- Backlinks Widget -->
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Backlinks</span>
          <span class="widget-count">${backlinks.length || ''}</span>
        </div>
        <div class="widget-content">
          ${backlinksHtml}
        </div>
      </div>
      
      <div class="theme-toggle-container">
        <button id="theme-toggle" class="theme-toggle" onclick="toggleTheme()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <span>Light mode</span>
        </button>
      </div>
    </aside>
      </div>
    </div>
  </div>
  
  <script>${scripts}</script>
</body>
</html>`;
}

export function renderPage(options: PageRenderOptions): string {
  const { title, content, frontmatter, backlinks = [], slug, lastModified, vaultName } = options;
  
  const articleContent = `
    <article class="article">
      <header class="article-header">
        <h1 class="article-title">${escapeHtml(title)}</h1>
      </header>
      <div class="content">
        ${content}
      </div>
    </article>
  `;
  
  return layout(title, articleContent, { vaultName, currentSlug: slug, backlinks, frontmatter, lastModified });
}

export function renderHomePage(options: HomeRenderOptions): string {
  const { pageCount, recentPages, allPages, vaultName } = options;
  
  // Group pages by folder
  const folders = new Map<string, PageInfo[]>();
  for (const page of allPages) {
    const parts = page.relativePath.split('/');
    const folder = parts.length > 1 ? parts[0] : 'Root';
    if (!folders.has(folder)) {
      folders.set(folder, []);
    }
    folders.get(folder)!.push(page);
  }
  
  const sortedFolders = Array.from(folders.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  
  const content = `
    <div class="home-header">
      <h1 class="home-title">${escapeHtml(vaultName || 'Wiki')}</h1>
      <p class="home-stats">${pageCount} pages</p>
    </div>
    
    <h2 class="section-title">Recently Modified</h2>
    <div class="page-grid">
      ${recentPages.slice(0, 8).map(page => `
        <a href="/${page.slug}" class="page-card">
          <div class="page-card-title">${escapeHtml(page.title)}</div>
          <div class="page-card-path">${escapeHtml(page.relativePath)}</div>
        </a>
      `).join('')}
    </div>
    
    ${sortedFolders.map(([folder, pages]) => `
      <h2 class="section-title">${escapeHtml(folder)}</h2>
      <div class="page-grid">
        ${pages.slice(0, 12).map(page => `
          <a href="/${page.slug}" class="page-card">
            <div class="page-card-title">${escapeHtml(page.title)}</div>
            <div class="page-card-path">${escapeHtml(page.relativePath)}</div>
          </a>
        `).join('')}
        ${pages.length > 12 ? `<div class="page-card" style="opacity: 0.6; text-align: center;">+${pages.length - 12} more</div>` : ''}
      </div>
    `).join('')}
  `;
  
  return layout('Home', content, { vaultName });
}

export function render404Page(slug: string, vaultName?: string): string {
  const content = `
    <div class="error-page">
      <div class="error-code">404</div>
      <p class="error-message">Page not found: <code>${escapeHtml(decodeURIComponent(slug))}</code></p>
      <p>This page doesn't exist yet.</p>
      <p><a href="/" class="error-link">← Back to home</a></p>
    </div>
  `;
  
  return layout('Page Not Found', content, { vaultName });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert wiki links [[Page]] or [[Page|Alias]] to HTML links
 */
function renderWikiLinks(text: string): string {
  // Match [[Page]] or [[Page|Alias]]
  return text.replace(/\[\[([^\]]+?)\]\]/g, (match, content) => {
    const parts = content.split('|');
    const pageName = parts[0].trim();
    const displayText = parts[1] ? parts[1].trim() : pageName;
    
    // Convert page name to slug (simple version - just URL encode)
    const slug = encodeURIComponent(pageName);
    
    return `<a href="/${slug}">${escapeHtml(displayText)}</a>`;
  });
}
