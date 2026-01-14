# GitHub Actions Workflows

This directory contains automated workflows for Obsidigen.

## Workflows

### 🚀 Release (`release.yml`)

**Triggers:**
- When you push a version tag (e.g., `v1.0.0`)
- Manual workflow dispatch

**What it does:**
1. Builds the project on Linux, macOS, and Windows
2. Creates distribution packages (.tar.gz / .zip)
3. Creates a GitHub Release with all artifacts
4. Publishes to npm (if configured)
5. Builds and publishes multi-arch Docker images to Docker Hub

**Usage:**
```bash
npm run release:patch  # 1.0.0 → 1.0.1
npm run release:minor  # 1.0.0 → 1.1.0
npm run release:major  # 1.0.0 → 2.0.0
```

### ✅ CI (`ci.yml`)

**Triggers:**
- Every push to `main` or `develop`
- Every pull request

**What it does:**
1. Tests on Node.js 18 and 20
2. Tests on Linux, macOS, and Windows
3. Builds the TypeScript code
4. Runs linter (if configured)

**Purpose:**
Ensures code quality and cross-platform compatibility.

## Setup

### Required Secrets

Configure these in GitHub Settings → Secrets and variables → Actions:

#### For npm Publishing

1. Create an npm token:
   - Visit: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Create "Automation" token
2. Add secret: `NPM_TOKEN`

#### For Docker Hub Publishing

1. Create Docker Hub access token:
   - Visit: https://hub.docker.com/settings/security
   - Create "New Access Token"
2. Add secrets:
   - `DOCKER_USERNAME` - Your Docker Hub username
   - `DOCKER_TOKEN` - Your Docker Hub access token

#### For GitHub Releases

No setup needed! The `GITHUB_TOKEN` is provided automatically.

## Quick Release Guide

1. Make your changes
2. Commit and push to main
3. Run release script:
   ```bash
   npm run release:patch
   ```
4. GitHub Actions will handle the rest!

## Artifact Downloads

Release artifacts are published to multiple platforms:

### npm Package
```bash
npm install -g obsidigen
```

### Docker Images
```bash
# Latest version
docker pull calebmsmith/obsidigen:latest

# Specific version
docker pull calebmsmith/obsidigen:2.2.1
```

### GitHub Releases
- Platform-specific archives (.tar.gz / .zip)
- Download from: https://github.com/fyresmith/obsidigen/releases

## Platform Support

### Native Binaries

| Platform | Architecture | Format |
|----------|-------------|---------|
| Linux | x64 | .tar.gz |
| macOS | x64, ARM64 | .tar.gz |
| Windows | x64 | .zip |

### Docker Images

| Platform | Architecture |
|----------|-------------|
| Linux | amd64, arm64 |

Multi-architecture images are built automatically for broad compatibility.


