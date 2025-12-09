# Linux Service Management

Obsidigen supports running as a systemd user service on Linux systems.

## Requirements

- Linux with systemd (most modern distributions)
- systemd user services enabled

## Quick Start

```bash
# Navigate to your vault
cd /path/to/vault

# Initialize if not already done
obsidigen init

# Install as a service
obsidigen service install

# Start the service
obsidigen service start
```

## Service Commands

| Command | Description |
|---------|-------------|
| `obsidigen service install` | Install and enable the service |
| `obsidigen service remove` | Disable and remove the service |
| `obsidigen service start` | Start the service now |
| `obsidigen service stop` | Stop the service |
| `obsidigen service list` | Show service status and registered vaults |

## Service Files

The systemd service is installed at:
```
~/.config/systemd/user/obsidigen-daemon.service
```

## Managing the Service Directly

You can also use standard systemd commands:

```bash
# Start
systemctl --user start obsidigen-daemon

# Stop
systemctl --user stop obsidigen-daemon

# Restart
systemctl --user restart obsidigen-daemon

# Enable (auto-start on login)
systemctl --user enable obsidigen-daemon

# Disable
systemctl --user disable obsidigen-daemon

# Status
systemctl --user status obsidigen-daemon
```

## Viewing Logs

```bash
# Follow logs in real-time
journalctl --user -u obsidigen-daemon -f

# View last 50 lines
journalctl --user -u obsidigen-daemon -n 50

# View logs since boot
journalctl --user -u obsidigen-daemon -b
```

## Multiple Vaults

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

## Autostart on Login

The service is automatically configured to start when you log in. If you want to enable/disable this:

```bash
# Enable autostart
systemctl --user enable obsidigen-daemon

# Disable autostart
systemctl --user disable obsidigen-daemon
```

## Troubleshooting

### Service won't start

Check the logs:
```bash
journalctl --user -u obsidigen-daemon -n 50
```

Common issues:
- Port already in use
- Vault directory doesn't exist
- Permissions issues

### Service not loading on login

Make sure user lingering is enabled (allows user services to run without active session):
```bash
loginctl enable-linger $USER
```

### Check if systemd is available

```bash
systemctl --version
```

### Reload systemd after manual changes

```bash
systemctl --user daemon-reload
```

## Uninstalling

To completely remove the service:

```bash
# Remove all registered vaults
cd /path/to/each/vault
obsidigen service remove

# Or manually remove the service
systemctl --user stop obsidigen-daemon
systemctl --user disable obsidigen-daemon
rm ~/.config/systemd/user/obsidigen-daemon.service
systemctl --user daemon-reload
```

## Architecture

The Obsidigen daemon:
1. Reads the global config (`~/.obsidigen/config.json`) for registered vaults
2. Starts a separate Node.js process for each vault
3. Monitors health and restarts crashed vaults
4. Handles graceful shutdown

Each vault runs independently on its configured port.

