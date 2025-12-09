# Release Process

This document describes how to create a new release of Obsidigen.

## Prerequisites

Before creating a release, ensure you have:

1. **NPM Token** (optional, for publishing to npm)
   - Go to repository Settings → Secrets and variables → Actions
   - Add a new secret named `NPM_TOKEN`
   - Get your token from https://www.npmjs.com/settings/YOUR_USERNAME/tokens

2. **GitHub Permissions**
   - The GitHub Actions workflows need write permissions for releases
   - This is configured in the workflow file already

## Creating a Release

### Method 1: Git Tag (Recommended)

1. Update version in `package.json`:
   ```bash
   npm version patch  # for 1.0.x
   npm version minor  # for 1.x.0
   npm version major  # for x.0.0
   ```

2. Push the tag:
   ```bash
   git push origin --tags
   ```

3. The workflow will automatically:
   - Build for Linux, macOS, and Windows
   - Create release artifacts (.tar.gz and .zip)
   - Create a GitHub Release with the artifacts
   - Publish to npm (if NPM_TOKEN is configured)

### Method 2: Manual Workflow Dispatch

1. Go to Actions → Release → Run workflow
2. Enter the version (e.g., `v1.0.0`)
3. Click "Run workflow"

This builds the artifacts but does NOT create a release or publish to npm.

## Release Artifacts

Each release includes:

- `obsidigen-vX.Y.Z-Linux-X64.tar.gz` - Linux binary
- `obsidigen-vX.Y.Z-macOS-ARM64.tar.gz` - macOS Apple Silicon
- `obsidigen-vX.Y.Z-macOS-X64.tar.gz` - macOS Intel
- `obsidigen-vX.Y.Z-Windows-X64.zip` - Windows binary

## Version Naming Convention

- `v1.0.0` - Stable release
- `v1.0.0-alpha.1` - Alpha release (marked as pre-release)
- `v1.0.0-beta.1` - Beta release (marked as pre-release)
- `v1.0.0-rc.1` - Release candidate (marked as pre-release)

## CI/CD Workflows

### CI Workflow (`.github/workflows/ci.yml`)
- Runs on every push and pull request
- Tests on multiple OS and Node.js versions
- Ensures the code builds and passes tests

### Release Workflow (`.github/workflows/release.yml`)
- Triggers on version tags (v*)
- Builds for multiple platforms
- Creates GitHub releases
- Publishes to npm

## Troubleshooting

### Release fails to publish to npm
- Check that `NPM_TOKEN` secret is set correctly
- Verify you have permissions to publish the package
- Check that the version isn't already published

### Build fails on specific OS
- Check the CI workflow runs for that OS
- Review the build logs in GitHub Actions
- Test locally on that platform if possible

## Manual Release (Fallback)

If GitHub Actions isn't available:

```bash
# 1. Build
npm ci
npm run build

# 2. Test
npm test

# 3. Create package
npm pack

# 4. Publish
npm publish

# 5. Create GitHub release manually
# Upload the .tgz file as an asset
```

