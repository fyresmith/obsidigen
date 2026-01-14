# Deployment Guide

This guide is for maintainers who need to set up automated deployments for Obsidigen.

## Overview

Obsidigen uses GitHub Actions to automatically:
- ✅ Build and test on every push/PR
- 📦 Publish to npm on version tags
- 🐳 Build and push Docker images to Docker Hub
- 📝 Create GitHub releases with downloadable artifacts

## Prerequisites

You need accounts and access tokens for:
1. **npm** - For package publishing
2. **Docker Hub** - For Docker image hosting
3. **GitHub** - Repository admin access (for secrets)

## Initial Setup

### 1. npm Setup

**Create an Automation Token:**

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Go to: Settings → Access Tokens
3. Click "Generate New Token" → "Automation"
4. Copy the token (starts with `npm_...`)

**Add to GitHub Secrets:**

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: Your npm token
5. Click "Add secret"

### 2. Docker Hub Setup

**Create an Access Token:**

1. Log in to [Docker Hub](https://hub.docker.com/)
2. Go to: Account Settings → Security → Access Tokens
3. Click "New Access Token"
4. Description: "GitHub Actions - Obsidigen"
5. Permissions: "Read, Write, Delete"
6. Copy the token

**Add to GitHub Secrets:**

1. Go to repository Settings → Secrets and variables → Actions
2. Add two secrets:

**Secret 1:**
- Name: `DOCKER_USERNAME`
- Value: Your Docker Hub username (e.g., `fyresmith`)

**Secret 2:**
- Name: `DOCKER_TOKEN`
- Value: Your Docker Hub access token

### 3. Verify Setup

Check that all secrets are configured:

```
Repository Settings → Secrets and variables → Actions → Repository secrets
```

You should see:
- ✅ `NPM_TOKEN`
- ✅ `DOCKER_USERNAME`
- ✅ `DOCKER_TOKEN`
- ✅ `GITHUB_TOKEN` (automatically provided)

## Publishing a Release

### Automated Method (Recommended)

Use the npm scripts to automate the entire process:

```bash
# For bug fixes (2.2.1 → 2.2.2)
npm run release:patch

# For new features (2.2.1 → 2.3.0)
npm run release:minor

# For breaking changes (2.2.1 → 3.0.0)
npm run release:major
```

**What happens:**
1. ✅ Bumps version in `package.json`
2. ✅ Creates git commit and tag
3. ✅ Pushes tag to GitHub
4. ✅ Triggers GitHub Actions workflow
5. ✅ Builds project on multiple platforms
6. ✅ Publishes to npm
7. ✅ Builds multi-arch Docker images
8. ✅ Pushes to Docker Hub
9. ✅ Creates GitHub release with artifacts

### Manual Method

If you need more control:

```bash
# 1. Update version
npm version patch  # or minor/major

# 2. Commit and push
git push origin main

# 3. Push the tag
git push origin --tags

# 4. Wait for GitHub Actions to complete
```

### Pre-release Versions

For alpha, beta, or release candidate versions:

```bash
# Create pre-release version
npm version prepatch --preid=alpha  # 2.2.1 → 2.2.2-alpha.0
npm version preminor --preid=beta   # 2.2.1 → 2.3.0-beta.0
npm version prerelease              # 2.2.1-alpha.0 → 2.2.1-alpha.1

# Push the tag
git push origin --tags
```

Pre-releases will be marked as "Pre-release" on GitHub.

## Workflow Details

### CI Workflow (`ci.yml`)

**Triggers:** Every push to `main`/`develop`, all pull requests

**Actions:**
- Runs on Node.js 18 and 20
- Tests on Linux, macOS, Windows
- Builds TypeScript
- Runs linter (if configured)

### Release Workflow (`release.yml`)

**Triggers:** Git tags matching `v*.*.*` (e.g., `v2.2.1`)

**Jobs:**

1. **build-and-release** (parallel, 3 runners)
   - Builds on Linux, macOS, Windows
   - Creates platform-specific archives
   - Uploads artifacts

2. **create-release** (depends on build)
   - Downloads all artifacts
   - Creates GitHub Release
   - Attaches downloadable files
   - Generates release notes

3. **publish-npm** (depends on build)
   - Builds project
   - Publishes to npm registry
   - Uses `NPM_TOKEN` secret

4. **publish-docker** (depends on build)
   - Sets up Docker Buildx
   - Builds multi-arch images (amd64, arm64)
   - Pushes to Docker Hub
   - Tags: `latest`, `2.2`, `2.2.1`
   - Uses `DOCKER_USERNAME` and `DOCKER_TOKEN`

## Docker Image Tags

After a successful release, the following tags are created:

| Tag | Example | Description |
|-----|---------|-------------|
| `latest` | `calebmsmith/obsidigen:latest` | Always points to latest stable |
| Major.Minor.Patch | `calebmsmith/obsidigen:2.2.1` | Specific version |
| Major.Minor | `calebmsmith/obsidigen:2.2` | Latest patch in series |
| Major | `calebmsmith/obsidigen:2` | Latest minor in series |

**Architectures:**
- `linux/amd64` (Intel/AMD x86-64)
- `linux/arm64` (ARM 64-bit, e.g., Apple M1, AWS Graviton)

## Monitoring Deployments

### Check Workflow Status

1. Go to: Repository → Actions
2. Click on the latest "Release" workflow
3. Monitor job progress

### Verify npm Publication

```bash
npm view obsidigen version
npm info obsidigen
```

### Verify Docker Images

```bash
# Check Docker Hub
open https://hub.docker.com/r/calebmsmith/obsidigen/tags

# Pull and test
docker pull calebmsmith/obsidigen:latest
docker run --rm calebmsmith/obsidigen:latest node dist/cli.js --version
```

### Check GitHub Release

1. Go to: Repository → Releases
2. Verify release notes generated
3. Verify artifacts attached

## Troubleshooting

### npm Publish Failed

**Error:** `401 Unauthorized`
- **Fix:** Regenerate `NPM_TOKEN` and update GitHub secret

**Error:** `403 Forbidden`
- **Fix:** Ensure token has "Automation" permissions

**Error:** `Version already exists`
- **Fix:** Version was already published, bump version again

### Docker Push Failed

**Error:** `unauthorized: authentication required`
- **Fix:** Verify `DOCKER_USERNAME` and `DOCKER_TOKEN` are correct

**Error:** `denied: requested access to the resource is denied`
- **Fix:** Ensure Docker Hub token has "Read, Write, Delete" permissions

**Error:** `repository does not exist`
- **Fix:** Create repository on Docker Hub first: https://hub.docker.com/repository/create

### Build Failed

**Check logs:**
1. Go to: Actions → Failed workflow
2. Click on failed job
3. Expand failed step
4. Review error messages

**Common issues:**
- TypeScript compilation errors
- Missing dependencies
- Test failures (if tests exist)

## Rolling Back a Release

If a release has issues:

### 1. Deprecate npm Version

```bash
npm deprecate obsidigen@2.2.1 "This version has issues, use 2.2.2"
```

### 2. Remove Docker Tags (if needed)

Docker Hub doesn't allow tag deletion easily. Instead:
1. Push a fixed version immediately
2. Update `latest` tag to the working version

### 3. Delete GitHub Release

1. Go to: Repository → Releases
2. Find the problematic release
3. Click "Delete"

### 4. Delete Git Tag

```bash
# Delete locally
git tag -d v2.2.1

# Delete remotely
git push origin :refs/tags/v2.2.1
```

## Security Notes

### Token Security

- ✅ **Never commit tokens to repository**
- ✅ **Use repository secrets only**
- ✅ **Rotate tokens every 90 days**
- ✅ **Limit token permissions** (use "Automation" for npm, not "Publish")

### Token Rotation

Recommended schedule: Every 3 months

1. Generate new token
2. Update GitHub secret
3. Delete old token
4. Test with a pre-release

### Branch Protection

Ensure `main` branch is protected:
1. Settings → Branches → Branch protection rules
2. Enable: "Require status checks to pass before merging"
3. Select: CI workflow checks

## Manual Docker Build (Development)

For testing Docker builds locally:

```bash
# Build for current platform
docker build -t obsidigen:test .

# Build multi-arch (requires buildx)
docker buildx create --use
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t obsidigen:test \
  --load \
  .

# Test the image
docker run -p 4000:4000 -v ~/vault:/vault:ro obsidigen:test
```

## Support

For issues with the deployment process:
1. Check workflow logs in GitHub Actions
2. Verify all secrets are configured correctly
3. Ensure npm and Docker Hub accounts are in good standing
4. Create an issue if automated deployment fails consistently

## Checklist for New Maintainers

- [ ] npm account with publishing rights
- [ ] Docker Hub account created
- [ ] Docker Hub repository created (`username/obsidigen`)
- [ ] `NPM_TOKEN` secret configured
- [ ] `DOCKER_USERNAME` secret configured
- [ ] `DOCKER_TOKEN` secret configured
- [ ] Test release with pre-release version
- [ ] Verify npm package installs: `npm install -g obsidigen@latest`
- [ ] Verify Docker image runs: `docker run calebmsmith/obsidigen:latest`
