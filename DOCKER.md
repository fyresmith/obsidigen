# Docker Quick Start Guide

Deploy Obsidigen with Docker in minutes.

## Quick Start

```bash
# Pull the image
docker pull calebmsmith/obsidigen:latest

# Run with your vault
docker run -d \
  --name obsidigen \
  -p 4000:4000 \
  -v /path/to/your/vault:/vault:ro \
  --restart unless-stopped \
  calebmsmith/obsidigen:latest

# Visit http://localhost:4000
```

## Using Docker Compose

1. Create `docker-compose.yml`:

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
    environment:
      - PORT=4000
```

2. Start:

```bash
docker compose up -d
```

3. View logs:

```bash
docker compose logs -f
```

4. Stop:

```bash
docker compose down
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VAULT_PATH` | `/vault` | Path to Obsidian vault inside container |
| `PORT` | `4000` | Server port |

### Volume Mounts

**Required:**
- `/vault` - Your Obsidian vault directory

**Recommended:** Mount as read-only (`:ro`) for safety.

### Port Mapping

The container exposes port `4000` by default. Map it to any host port:

```bash
# Map to port 8080 on host
docker run -p 8080:4000 ...

# Or change the internal port
docker run -p 8080:8080 -e PORT=8080 ...
```

## Examples

### Basic Usage

```bash
docker run -d \
  -p 4000:4000 \
  -v ~/my-vault:/vault:ro \
  calebmsmith/obsidigen:latest
```

### Custom Port

```bash
docker run -d \
  -p 8080:8080 \
  -e PORT=8080 \
  -v ~/my-vault:/vault:ro \
  calebmsmith/obsidigen:latest
```

### Multiple Vaults

```yaml
version: '3.8'

services:
  personal-wiki:
    image: calebmsmith/obsidigen:latest
    ports:
      - "4000:4000"
    volumes:
      - ~/personal-vault:/vault:ro
  
  work-wiki:
    image: calebmsmith/obsidigen:latest
    ports:
      - "4001:4000"
    volumes:
      - ~/work-vault:/vault:ro
```

### Behind Nginx Proxy

```yaml
version: '3.8'

services:
  obsidigen:
    image: calebmsmith/obsidigen:latest
    expose:
      - "4000"
    volumes:
      - ./vault:/vault:ro
    networks:
      - web
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - web
    depends_on:
      - obsidigen

networks:
  web:
```

## Platform-Specific Instructions

### DigitalOcean Droplet

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Upload or clone your vault
git clone https://github.com/yourusername/your-vault.git

# Run Obsidigen
docker run -d \
  --name obsidigen \
  -p 80:4000 \
  -v ~/your-vault:/vault:ro \
  --restart always \
  calebmsmith/obsidigen:latest

# Configure firewall
ufw allow 80/tcp
```

### AWS ECS

1. Create task definition with image: `calebmsmith/obsidigen:latest`
2. Add EFS volume for vault
3. Mount EFS to `/vault` in container
4. Expose port 4000
5. Deploy service

### Google Cloud Run

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/obsidigen

# Deploy
gcloud run deploy obsidigen \
  --image gcr.io/PROJECT_ID/obsidigen \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Fly.io

Create `fly.toml`:

```toml
app = "my-wiki"
primary_region = "sjc"

[build]
  image = "calebmsmith/obsidigen:latest"

[[services]]
  internal_port = 4000
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[[mounts]]
  source = "wiki_data"
  destination = "/vault"
```

Deploy:

```bash
fly volumes create wiki_data --size 1
fly deploy
```

## Troubleshooting

### Container starts but page doesn't load

**Check if vault is mounted correctly:**

```bash
docker exec obsidigen ls -la /vault
```

**Check logs:**

```bash
docker logs obsidigen
```

### Health check failing

Test the health endpoint:

```bash
docker exec obsidigen curl http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok",
  "uptime": 123.456,
  "pages": 42,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Port already in use

Change the host port:

```bash
docker run -p 8080:4000 ...  # Use port 8080 instead
```

### File changes not detected

If using network storage (NFS, SMB), file watching may not work. This is a known limitation of file system watchers with network mounts.

**Workaround:** Restart the container after updating files:

```bash
docker restart obsidigen
```

### Permission issues

Ensure the vault directory is readable:

```bash
chmod -R 755 /path/to/vault
```

The container runs as user `nodejs` (UID 1001), not root.

## Building Locally

To build your own image:

```bash
# Clone repository
git clone https://github.com/fyresmith/obsidigen.git
cd obsidigen

# Build image
docker build -t obsidigen:local .

# Run your custom build
docker run -d \
  -p 4000:4000 \
  -v ~/vault:/vault:ro \
  obsidigen:local
```

## Multi-Architecture Support

The official images support:
- `linux/amd64` (Intel/AMD x86-64)
- `linux/arm64` (ARM 64-bit: Raspberry Pi 4, Apple M1/M2, AWS Graviton)

Docker automatically pulls the correct architecture for your platform.

## Security

### Best Practices

1. **Read-only vaults:** Always mount as `:ro` unless write access is needed
2. **Non-root user:** Container runs as `nodejs` user (UID 1001)
3. **Network isolation:** Use Docker networks for multi-container setups
4. **Keep updated:** Regularly pull latest image for security patches

### Updating

```bash
# Pull latest version
docker pull calebmsmith/obsidigen:latest

# Recreate container
docker stop obsidigen
docker rm obsidigen
docker run -d ... calebmsmith/obsidigen:latest
```

Or with Docker Compose:

```bash
docker compose pull
docker compose up -d
```

## Monitoring

### Check container status

```bash
docker ps
```

### View logs

```bash
# Follow logs
docker logs -f obsidigen

# Last 100 lines
docker logs --tail 100 obsidigen
```

### Resource usage

```bash
docker stats obsidigen
```

### Health status

```bash
docker inspect obsidigen | grep -A 5 Health
```

## Support

For issues specific to Docker deployment:
- Check logs: `docker logs obsidigen`
- Verify mounts: `docker inspect obsidigen`
- Test health: `docker exec obsidigen curl localhost:4000/health`

For general Obsidigen issues, see the main [README.md](README.md).
