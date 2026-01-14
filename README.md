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
- **Docker Support** - Production-ready containerized deployment
- **Cloudflare Tunnel** - Secure public access via tunnels
- **Cloudflare Access** - Zero-trust authentication
- **Boot Service** - Run as a system service (macOS & Linux)
- **Multi-Platform** - Deploy to AWS, GCP, DigitalOcean, Fly.io, Railway, and more

## Installation

### From npm (Recommended)

```bash
npm install -g obsidigen
```

### From Source

```bash
git clone https://github.com/yourusername/obsidigen.git
cd obsidigen
npm install
npm run build
npm link
```

### With Docker

Perfect for production deployments and self-hosting:

```bash
# Pull from Docker Hub
docker pull calebmsmith/obsidigen:latest

# Run with your vault
docker run -d \
  -p 4000:4000 \
  -v /path/to/your/vault:/vault:ro \
  --name obsidigen \
  calebmsmith/obsidigen:latest
```

Or use Docker Compose. See [DOCKER.md](DOCKER.md) for complete Docker documentation.

### Requirements

**For npm/source installation:**
- Node.js 18 or higher
- npm or yarn

**For Docker:**
- Docker 20.10 or higher
- Docker Compose (optional, for easier management)

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

## Docker Deployment

Run Obsidigen in a Docker container for production deployments, VPS hosting, or cloud platforms.

### Quick Start with Docker

**1. Pull the image:**
```bash
docker pull calebmsmith/obsidigen:latest
```

**2. Run with your vault:**
```bash
docker run -d \
  --name obsidigen \
  -p 4000:4000 \
  -v /path/to/your/vault:/vault:ro \
  --restart unless-stopped \
  calebmsmith/obsidigen:latest
```

**3. Visit:** `http://localhost:4000`

### Docker Compose (Recommended)

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  obsidigen:
    image: calebmsmith/obsidigen:latest
    container_name: obsidigen
    restart: unless-stopped
    ports:
      - "4000:4000"
    volumes:
      - ./your-vault:/vault:ro
      - ./config:/app/.obsidigen
    environment:
      - PORT=4000
```

Then run:
```bash
docker compose up -d
```

### Volume Mounts

| Path | Description | Required |
|------|-------------|----------|
| `/vault` | Your Obsidian vault directory | ✅ Yes |
| `/app/.obsidigen` | Configuration persistence | Optional |

**Important:** Mount your vault as read-only (`:ro`) for safety, unless you need Obsidigen to write to it.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `OBSIDIGEN_TITLE` | Custom wiki title | Vault name |
| `NODE_ENV` | Node environment | `production` |

### Docker Examples

**Basic deployment:**
```bash
docker run -d \
  -p 4000:4000 \
  -v ~/my-vault:/vault:ro \
  calebmsmith/obsidigen:latest
```

**With custom title and port:**
```bash
docker run -d \
  -p 8080:8080 \
  -e PORT=8080 \
  -e OBSIDIGEN_TITLE="My Knowledge Base" \
  -v ~/my-vault:/vault:ro \
  calebmsmith/obsidigen:latest
```

**Multiple vaults:**
```yaml
version: '3.8'

services:
  wiki1:
    image: calebmsmith/obsidigen:latest
    ports:
      - "4000:4000"
    volumes:
      - ./vault1:/vault:ro
  
  wiki2:
    image: calebmsmith/obsidigen:latest
    ports:
      - "4001:4000"
    volumes:
      - ./vault2:/vault:ro
```

### Platform-Specific Deployments

#### DigitalOcean / VPS

```bash
# SSH into your server
ssh user@your-server.com

# Install Docker (if not installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone your vault or sync it
git clone https://github.com/yourusername/your-vault.git

# Run Obsidigen
docker run -d \
  --name obsidigen \
  -p 80:4000 \
  -v ~/your-vault:/vault:ro \
  --restart always \
  calebmsmith/obsidigen:latest
```

#### AWS ECS / Google Cloud Run

Deploy directly using the image: `calebmsmith/obsidigen:latest`

Mount your vault via:
- **AWS ECS:** EFS volume mount
- **Google Cloud Run:** Cloud Storage FUSE mount

#### Fly.io

Create `fly.toml`:
```toml
app = "my-obsidigen-wiki"
primary_region = "sjc"

[build]
  image = "calebmsmith/obsidigen:latest"

[[services]]
  http_checks = []
  internal_port = 4000
  protocol = "tcp"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[[mounts]]
  source = "obsidigen_vault"
  destination = "/vault"
```

Deploy:
```bash
fly volumes create obsidigen_vault --size 1
fly deploy
```

#### Railway / Render

1. Connect your GitHub repository
2. Set Docker image: `calebmsmith/obsidigen:latest`
3. Add volume mount for `/vault`
4. Set port: `4000`
5. Deploy!

### Building Locally

To build your own image:

```bash
# Clone the repository
git clone https://github.com/fyresmith/obsidigen.git
cd obsidigen

# Build the image
docker build -t obsidigen:local .

# Run your custom build
docker run -d \
  -p 4000:4000 \
  -v ~/my-vault:/vault:ro \
  obsidigen:local
```

### Health Checks

The Docker image includes automatic health checks:
- Endpoint: `http://localhost:4000/health`
- Interval: 30 seconds
- Timeout: 3 seconds
- Retries: 3

Monitor with:
```bash
docker ps  # Shows health status
docker inspect obsidigen | grep Health  # Detailed health info
```

### Troubleshooting

**Container won't start:**
```bash
# Check logs
docker logs obsidigen

# Common issues:
# - Vault path doesn't exist
# - Port already in use
# - Insufficient permissions
```

**File changes not reflecting:**
```bash
# Ensure live reload is working
docker logs obsidigen | grep "Watching"

# If using network mounts (NFS, etc.), file watching might not work
# Consider using polling mode (future feature)
```

**Performance issues:**
```bash
# Increase memory limit
docker run -d \
  --memory="1g" \
  --cpus="1.5" \
  -p 4000:4000 \
  -v ~/vault:/vault:ro \
  calebmsmith/obsidigen:latest
```

### Security Best Practices

1. **Read-only vaults:** Always mount as `:ro` unless write access is needed
2. **Non-root user:** The image runs as non-root user `nodejs` (UID 1001)
3. **Network isolation:** Use Docker networks for multi-container setups
4. **Secrets:** Use Docker secrets or environment variables for sensitive config
5. **Updates:** Regularly pull latest image for security patches

```bash
# Update to latest version
docker pull calebmsmith/obsidigen:latest
docker stop obsidigen
docker rm obsidigen
docker run -d ... calebmsmith/obsidigen:latest
```

## Run on Boot

Obsidigen can run as a system service on both macOS and Linux, automatically starting your wiki(s) on login. **If your vault has a Cloudflare Tunnel configured, it will automatically start with the tunnel.**

### Quick Start

```bash
cd /path/to/vault
obsidigen service install
obsidigen service start
```

**With Cloudflare Tunnel:**
```bash
# Configure tunnel first
obsidigen tunnel create --domain wiki.example.com

# Then install service (tunnel will start automatically)
obsidigen service install
obsidigen service start
```

### Service Commands

| Command | Description |
|---------|-------------|
| `obsidigen service install` | Register vault for autostart |
| `obsidigen service remove` | Unregister vault |
| `obsidigen service start` | Start the daemon |
| `obsidigen service stop` | Stop the daemon |
| `obsidigen service list` | Show registered vaults and status |

### Platform-Specific Details

#### macOS (launchd)

**Service file location:**
```
~/Library/LaunchAgents/com.obsidigen.daemon.plist
```

**View logs:**
```bash
tail -f ~/.obsidigen/daemon.log
```

#### Linux (systemd)

**Requirements:**
- Linux with systemd (most modern distributions)
- systemd user services enabled

**Service file location:**
```
~/.config/systemd/user/obsidigen-daemon.service
```

**Direct systemd commands:**
```bash
# Start/stop/restart
systemctl --user start obsidigen-daemon
systemctl --user stop obsidigen-daemon
systemctl --user restart obsidigen-daemon

# Enable/disable autostart
systemctl --user enable obsidigen-daemon
systemctl --user disable obsidigen-daemon

# Check status
systemctl --user status obsidigen-daemon
```

**View logs:**
```bash
# Follow logs in real-time
journalctl --user -u obsidigen-daemon -f

# View last 50 lines
journalctl --user -u obsidigen-daemon -n 50

# View logs since boot
journalctl --user -u obsidigen-daemon -b
```

### Multiple Vaults

You can register multiple vaults to run simultaneously:

```bash
# Register first vault
cd /path/to/vault1
obsidigen init --name "Vault 1" --port 4000
obsidigen service install

# Register second vault
cd /path/to/vault2
obsidigen init --name "Vault 2" --port 4001
obsidigen service install

# Start the daemon (runs all vaults)
obsidigen service start

# List all registered vaults
obsidigen service list
```

### Tunnel Support

The daemon **automatically detects** if your vault has a Cloudflare Tunnel configured and starts it along with the server:

```bash
# Setup vault with tunnel
cd /path/to/vault
obsidigen init --name "My Wiki" --port 4000
obsidigen tunnel create --domain wiki.example.com

# Install service (will start both server and tunnel)
obsidigen service install
obsidigen service start
```

**What happens:**
- If `tunnel` is configured in `.obsidigen/config.json`, the daemon starts both the server and cloudflared
- If no tunnel is configured, it only starts the local server
- Tunnel connections are automatically restarted if they fail
- Both server and tunnel logs are visible in the daemon logs

**Check tunnel status:**
```bash
# macOS - watch the logs
tail -f ~/.obsidigen/daemon.log

# Linux - watch the logs
journalctl --user -u obsidigen-daemon -f

# You should see: "Started MyWiki on port 4000 with Cloudflare Tunnel"
# And: "Public URL: https://wiki.example.com"
```

### Troubleshooting

#### Service won't start

Check the logs:
```bash
# macOS
cat ~/.obsidigen/daemon.log

# Linux
journalctl --user -u obsidigen-daemon -n 50
```

Common issues:
- Port already in use
- Vault directory doesn't exist
- Permissions issues
- Tunnel credentials missing (recreate with `obsidigen tunnel create`)

#### Linux: Service not loading on login

Enable user lingering (allows services to run without active session):
```bash
loginctl enable-linger $USER
```

#### Uninstalling the service

```bash
# Remove all registered vaults
cd /path/to/each/vault
obsidigen service remove

# Or manually (Linux)
systemctl --user stop obsidigen-daemon
systemctl --user disable obsidigen-daemon
rm ~/.config/systemd/user/obsidigen-daemon.service
systemctl --user daemon-reload
```

### Architecture

The Obsidigen daemon:
1. Reads the global config (`~/.obsidigen/config.json`) for registered vaults
2. Starts a separate Node.js process for each vault
3. Monitors health and restarts crashed vaults
4. Handles graceful shutdown

Each vault runs independently on its configured port.

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/obsidigen.git`
3. Create a branch: `git checkout -b feature/your-feature`
4. Make your changes and commit: `git commit -am 'Add some feature'`
5. Push to the branch: `git push origin feature/your-feature`
6. Submit a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features (when test suite is available)
- Update documentation for user-facing changes
- Keep commits focused and write clear commit messages

## Publishing

For maintainers publishing to npm and Docker Hub, see [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

Quick publish:

```bash
# Bump version and publish to npm AND Docker Hub automatically
npm run release:patch  # For bug fixes (2.2.1 → 2.2.2)
npm run release:minor  # For new features (2.2.1 → 2.3.0)
npm run release:major  # For breaking changes (2.2.1 → 3.0.0)
```

This will automatically:
- ✅ Publish to npm
- ✅ Build and push Docker images (multi-arch: amd64, arm64)
- ✅ Create GitHub release with downloadable artifacts

## License

MIT - see [LICENSE](LICENSE) file for details

