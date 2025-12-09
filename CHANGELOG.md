# Changelog

All notable changes to Obsidigen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-09

### Added

#### User Interface
- Three-column wiki layout with navigation tree, content area, and widgets panel
- Collapsible tree navigation with automatic expansion to current page
- Smart widgets panel:
  - Properties widget displaying frontmatter metadata
  - On This Page widget with scroll spy and clickable table of contents
  - Backlinks widget showing incoming links
- Hover previews for wiki links (Obsidian-style)
  - 300ms delay before showing
  - Clickable preview to navigate
  - Scrollable content
  - Disabled links inside previews
- Light/dark theme toggle with localStorage persistence
- Responsive mobile design with slide-out panels
- Live search with keyboard shortcuts (⌘K / Ctrl+K)
- Custom favicon support (multiple formats: .ico, .png, .svg, .jpg, .gif)
- Custom site title configuration

#### Obsidian Features
- Full wiki link support `[[Page]]` and `[[Page|Alias]]`
- Wiki links in frontmatter properties
- Backlink tracking (bidirectional links)
- Frontmatter aliases and metadata display
- YAML frontmatter parsing
- Automatic header anchor links
- Highlights `==text==`
- Callouts with multiple types
- Code blocks with syntax highlighting
- Table support
- Image handling
- Tag display from frontmatter

#### Core Features
- Vault initialization (`obsidigen init`)
- Local development server
- Background daemon mode
- Live file watching and hot reload
- Configuration management with CLI commands
- Welcome page detection or alphabetical landing page
- Page preview API endpoint

#### Deployment
- System service support (macOS with launchd)
- System service support (Linux with systemd)
- Multiple vault support via daemon
- Auto-restart on failure
- Health monitoring

#### Cloudflare Integration
- Cloudflare Tunnel support
- Cloudflare Access authentication
- Tunnel management commands

#### Developer Experience
- TypeScript codebase
- Hono web framework
- Command-line interface with Commander.js
- Comprehensive documentation
- GitHub Actions workflows for CI/CD
- Cross-platform support (macOS, Linux, Windows)

### Technical Details
- Built with Node.js 18+
- ES Modules throughout
- Unified/Remark for markdown parsing
- Chokidar for file watching
- Gray-matter for frontmatter parsing

## [Unreleased]

### Planned Features
- Embeds `![[Page]]`
- Canvas file support
- Mermaid diagram rendering
- Math (LaTeX) support
- Graph view visualization
- Advanced search filters
- Keyboard navigation
- Page templates
- Export functionality

---

## Version History

- **1.0.0** - Initial stable release with full wiki interface and Obsidian feature support

