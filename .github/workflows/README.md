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

### For npm Publishing

1. Get npm token: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Add to GitHub: Settings → Secrets → `NPM_TOKEN`

### For Releases

No additional setup needed! The `GITHUB_TOKEN` is provided automatically.

## Quick Release Guide

1. Make your changes
2. Commit and push to main
3. Run release script:
   ```bash
   npm run release:patch
   ```
4. GitHub Actions will handle the rest!

## Artifact Downloads

Release artifacts can be downloaded from:
- GitHub Releases page
- npm: `npm install -g obsidigen`
- Direct download from release assets

## Platform Support

| Platform | Architecture | Format |
|----------|-------------|---------|
| Linux | x64 | .tar.gz |
| macOS | x64, ARM64 | .tar.gz |
| Windows | x64 | .zip |

