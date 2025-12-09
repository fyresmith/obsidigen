# Obsidigen

Render your Obsidian vaults as beautiful web wikis with Cloudflare Tunnel integration.

## Features

### Wiki Interface
- **Three-Column Layout** - Navigation tree, content, and widgets panel
- **Tree Navigation** - Collapsible folder structure with current page highlighting
- **Smart Widgets** - Properties display, table of contents with scroll spy, backlinks
- **Hover Previews** - Preview page content by hovering over any wiki link
- **Responsive Design** - Mobile-friendly with slide-out navigation panels
- **Live Search** - Fast search with keyboard shortcuts (⌘K / Ctrl+K)

### Obsidian Integration
- **Full Obsidian Support** - Wiki links, backlinks, aliases, frontmatter
- **Backlink Tracking** - Automatic bidirectional links between pages
- **Properties Display** - View frontmatter metadata including tags
- **Live Reload** - Automatic updates when files change

### Customization
- **Custom Title** - Set a custom display title via config
- **Custom Favicon** - Place any favicon image in vault root
- **Theme Toggle** - Light/dark mode with localStorage persistence

### Deployment
- **Cloudflare Tunnel** - Secure public access via tunnels
- **Cloudflare Access** - Zero-trust authentication
- **Boot Service** - Run as a system service (macOS & Linux)

## Installation

```bash
# Clone and install
git clone <repo>
cd obsidigen
npm install
npm run build
npm link
```

Or, once published to npm:

```bash
npm install -g obsidigen
```

## Quick Start

```bash
# Navigate to your Obsidian vault
cd /path/to/your/vault

# Initialize Obsidigen
obsidigen init

# Start the server
obsidigen start
```

Visit `http://localhost:4000` to view your wiki.

**Landing Page:** The home page (`/`) automatically displays:
1. A root-level page with "welcome" in the title (case-insensitive), or
2. The first alphabetically-sorted root-level page, or
3. A generated index of all pages

## User Interface

Obsidigen features a clean, three-column wiki layout:

### Left Sidebar - Navigation
- **Vault Title** - Displays your vault name at the top
- **Search Bar** - Quick search with live results (keyboard shortcut: ⌘K / Ctrl+K)
- **Tree View** - Collapsible folder structure
  - Click folders to expand/collapse
  - Current page highlighted
  - Automatically expands to show active page

### Center - Content
- Clean, centered reading experience (max 800px width)
- Full markdown rendering
- Syntax highlighting for code blocks
- Responsive tables and images

### Right Sidebar - Widgets

**Properties Widget**
- Displays page frontmatter metadata
- Shows last modified date
- Tags displayed as colored badges

**On This Page Widget**
- Automatic table of contents from headings
- Scroll spy - highlights current section as you read
- Click to jump to any section

**Backlinks Widget**
- Lists all pages that link to the current page
- Click to navigate to linking pages

### Theme Toggle
- Light/dark mode switcher at the bottom of the right sidebar
- Preference saved in localStorage
- Respects system theme preference on first visit

### Hover Previews
- Hover over any wiki link to see a preview of the page (except tree navigation)
- 300ms delay before preview appears
- Preview shows page title and content
- Hover over the preview to keep it open and scroll through content
- Click anywhere on the preview to navigate to that page
- Links inside previews are disabled (click preview to navigate)
- Cached for instant subsequent previews
- Automatically positioned to stay on screen
- Border highlights on hover

### Mobile Experience
- Hamburger menu for navigation (left)
- Backlinks button for widgets (right)
- Only one sidebar open at a time
- Full touch support

## Commands

### Basic Commands

| Command | Description |
|---------|-------------|
| `obsidigen init` | Initialize current directory as wiki |
| `obsidigen start` | Start local server |
| `obsidigen start -d` | Start as background daemon |
| `obsidigen stop` | Stop the server |
| `obsidigen status` | Show server status |
| `obsidigen config` | View configuration |
| `obsidigen config --edit` | Edit configuration in editor |
| `obsidigen config --set key=value` | Set configuration value |
| `obsidigen config --get key` | Get configuration value |

#### Configuration Examples

```bash
# Set a custom title for your wiki
obsidigen config --set title="My Personal Wiki"

# Change the port
obsidigen config --set port=4001

# Get the current title
obsidigen config --get title
```

### Cloudflare Tunnel

| Command | Description |
|---------|-------------|
| `obsidigen tunnel login` | Authenticate with Cloudflare |
| `obsidigen tunnel create` | Create tunnel for this vault |
| `obsidigen tunnel start` | Start server + tunnel |
| `obsidigen tunnel status` | Show tunnel status |

### Cloudflare Access

| Command | Description |
|---------|-------------|
| `obsidigen access setup` | Configure access policies |
| `obsidigen access status` | Show access status |

### System Service (macOS)

| Command | Description |
|---------|-------------|
| `obsidigen service install` | Register vault with boot service |
| `obsidigen service remove` | Unregister from service |
| `obsidigen service start` | Start the daemon |
| `obsidigen service stop` | Stop the daemon |
| `obsidigen service list` | List registered vaults |

## Customization

### Custom Title

Set a custom display title for your wiki (different from the vault name):

```bash
obsidigen config --set title="My Personal Knowledge Base"
```

The title appears in:
- Browser tab title
- Site header
- Page titles

If not set, defaults to the vault name (folder name).

### Custom Favicon

Place a favicon file in your vault's root directory with one of these names:
- `favicon.ico` (recommended)
- `favicon.png`
- `favicon.svg`
- `favicon.jpg`
- `favicon.jpeg`
- `favicon.gif`

The favicon will automatically be detected and served. Supported formats:
- **ICO**: Standard favicon format, works everywhere
- **PNG**: Modern format with transparency support
- **SVG**: Scalable vector graphics (great for simple logos)
- **JPG/JPEG**: Photo-based favicons
- **GIF**: Animated favicons (if you're feeling adventurous!)

**Example:**
```bash
# Copy your favicon to the vault root
cp ~/my-logo.png /path/to/vault/favicon.png

# Restart the server to see changes
obsidigen stop
obsidigen start
```

## Configuration

Configuration is stored in `.obsidigen/config.json`:

```json
{
  "name": "my-wiki",
  "title": "My Personal Wiki",
  "port": 4000,
  "vaultPath": "/path/to/vault",
  "tunnel": {
    "name": "my-wiki",
    "hostname": "wiki.example.com"
  },
  "access": {
    "enabled": true,
    "allowedEmails": ["me@example.com"]
  }
}
```

**Configuration Fields:**
- `name` - Internal identifier (usually folder name)
- `title` - Display title shown in UI and browser (optional, defaults to `name`)
- `port` - Local server port
- `vaultPath` - Absolute path to vault directory
- `tunnel` - Cloudflare Tunnel configuration (optional)
- `access` - Cloudflare Access configuration (optional)

## Cloudflare Setup

### 1. Install cloudflared

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux - see https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

### 2. Authenticate

```bash
obsidigen tunnel login
```

### 3. Create Tunnel

```bash
# Basic (uses auto-generated hostname)
obsidigen tunnel create

# With custom domain
obsidigen tunnel create --domain wiki.yourdomain.com
```

### 4. Start with Tunnel

```bash
obsidigen tunnel start
```

### 5. (Optional) Add Access Protection

```bash
obsidigen access setup
```

## Run on Boot

Register your vault(s) to start automatically on login (supports macOS and Linux):

```bash
cd /path/to/vault
obsidigen service install
```

### Service Management

| Command | Description |
|---------|-------------|
| `obsidigen service install` | Register vault for autostart |
| `obsidigen service remove` | Unregister vault |
| `obsidigen service start` | Start the daemon |
| `obsidigen service stop` | Stop the daemon |
| `obsidigen service list` | Show registered vaults and status |

**Platform Support:**
- **macOS**: Uses launchd (`~/Library/LaunchAgents/com.obsidigen.daemon.plist`)
- **Linux**: Uses systemd (`~/.config/systemd/user/obsidigen-daemon.service`)

**View Logs:**
```bash
# macOS
tail -f ~/.obsidigen/daemon.log

# Linux
journalctl --user -u obsidigen-daemon -f
```

## Supported Obsidian Features

**Implemented:**
- Wiki links `[[Page]]` with automatic resolution
- Wiki links with aliases `[[Page|Display Text]]`
- Wiki links in frontmatter properties
- Hover previews for wiki links (Obsidian-style)
- Frontmatter aliases and metadata
- YAML frontmatter with full property display
- Headers with automatic anchor links
- Table of contents generation from headings
- Highlights `==text==`
- Callouts `> [!note]`, `> [!warning]`, etc.
- Code blocks with syntax highlighting
- Tables with responsive layout
- Images with automatic sizing
- Backlink tracking (bidirectional links)
- Tag display from frontmatter

**Planned:**
- Embeds `![[Page]]`
- Canvas files
- Mermaid diagrams
- Math (LaTeX)

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Test locally
npm link
obsidigen --help
```

## License

MIT

