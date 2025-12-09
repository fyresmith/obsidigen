# Obsidigen

Render your Obsidian vaults as beautiful web wikis with Cloudflare Tunnel integration.

## Features

- **Full Obsidian Support** - Wiki links, backlinks, aliases, frontmatter
- **Search** - Fast, fuzzy search across all pages
- **Backlinks** - Automatic backlink tracking
- **Cloudflare Tunnel** - Secure public access via tunnels
- **Cloudflare Access** - Zero-trust authentication
- **Live Reload** - Automatic updates when files change
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

## Commands

### Basic Commands

| Command | Description |
|---------|-------------|
| `obsidigen init` | Initialize current directory as wiki |
| `obsidigen start` | Start local server |
| `obsidigen start -d` | Start as background daemon |
| `obsidigen stop` | Stop the server |
| `obsidigen status` | Show server status |
| `obsidigen config` | View/edit configuration |

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

## Configuration

Configuration is stored in `.obsidigen/config.json`:

```json
{
  "name": "my-wiki",
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
- Wiki links `[[Page]]`
- Wiki links with aliases `[[Page|Display Text]]`
- Frontmatter aliases
- YAML frontmatter
- Headers and anchors
- Highlights `==text==`
- Callouts `> [!note]`
- Code blocks
- Tables
- Images

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

