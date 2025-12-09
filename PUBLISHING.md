# Publishing Guide

This guide explains how to publish Obsidigen to npm.

## Prerequisites

1. **npm account**: Create one at https://www.npmjs.com/signup
2. **npm login**: Run `npm login` and enter your credentials
3. **Git repository**: Make sure your code is pushed to GitHub
4. **Clean build**: Ensure the project builds without errors

## Pre-Publishing Checklist

- [ ] Update version in `package.json` (or use `npm version`)
- [ ] Update `CHANGELOG.md` with changes
- [ ] Update `README.md` if needed
- [ ] Run `npm run build` to ensure it compiles
- [ ] Test the package locally with `npm link`
- [ ] Update repository URLs in `package.json` (replace `yourusername`)
- [ ] Commit all changes
- [ ] Create a git tag for the version

## Publishing Steps

### 1. Update Package Information

Update `package.json` with your GitHub username:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YOURUSERNAME/obsidigen.git"
  },
  "bugs": {
    "url": "https://github.com/YOURUSERNAME/obsidigen/issues"
  },
  "homepage": "https://github.com/YOURUSERNAME/obsidigen#readme"
}
```

### 2. Choose Version Number

Follow [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH` (e.g., 1.0.0)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### 3. Version Bump

Use npm's version command:

```bash
# For bug fixes (1.0.0 -> 1.0.1)
npm version patch

# For new features (1.0.0 -> 1.1.0)
npm version minor

# For breaking changes (1.0.0 -> 2.0.0)
npm version major
```

Or use the convenient scripts:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

These scripts will:
1. Bump the version
2. Create a git tag
3. Push tags to origin (triggers GitHub Actions)

### 4. Test Package

Before publishing, test the package:

```bash
# Build
npm run build

# Pack it (creates a .tgz file)
npm pack

# Test install from tarball
npm install -g ./obsidigen-1.0.0.tgz

# Test the CLI
obsidigen --help
```

### 5. Publish to npm

```bash
# Dry run (see what would be published)
npm publish --dry-run

# Actually publish
npm publish
```

For first-time publishing, you may need:

```bash
npm publish --access public
```

### 6. Verify Publication

1. Check on npm: https://www.npmjs.com/package/obsidigen
2. Test installation: `npm install -g obsidigen`
3. Verify it works: `obsidigen --version`

## Using GitHub Actions (Automated)

The project includes GitHub Actions workflows for automated releases.

### Setup

1. **Add npm token to GitHub secrets:**
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Create a new "Automation" token
   - Go to GitHub repository → Settings → Secrets → Actions
   - Add secret named `NPM_TOKEN` with your token value

2. **Trigger a release:**

```bash
# Create and push a version tag
npm run release:patch

# Or manually
git tag v1.0.1
git push origin v1.0.1
```

The GitHub Action will:
- Build for multiple platforms
- Run tests
- Create GitHub Release
- Publish to npm automatically

## Post-Publishing

1. **Announce**: Share on Twitter, Reddit, forums
2. **Monitor**: Watch for issues on GitHub
3. **Update docs**: Keep README up to date
4. **Respond**: Answer questions and fix bugs promptly

## Unpublishing (Emergency Only)

If you need to unpublish within 72 hours:

```bash
npm unpublish obsidigen@1.0.0
```

**Note**: Unpublishing is discouraged. Use deprecation instead:

```bash
npm deprecate obsidigen@1.0.0 "This version has a critical bug, please upgrade"
```

## Versioning Strategy

Recommended approach:

- **0.x.x**: Pre-release, unstable API
- **1.0.0**: First stable release
- **1.x.x**: Backward-compatible additions
- **2.0.0+**: Breaking changes

## Testing Checklist

Before each release, test:

- [ ] `obsidigen init` - Creates config correctly
- [ ] `obsidigen start` - Server starts without errors
- [ ] `obsidigen config --set title="Test"` - Config commands work
- [ ] `obsidigen service install` - Service management works (platform-specific)
- [ ] Tree navigation displays correctly
- [ ] Search works
- [ ] Hover previews show up
- [ ] Theme toggle works
- [ ] Mobile view is responsive
- [ ] Favicon loads if present
- [ ] Backlinks populate correctly

## Troubleshooting

### "You do not have permission to publish"

Make sure you're logged in: `npm whoami`

### "Package name already exists"

The name is taken. You'll need to:
1. Choose a different name, or
2. Publish under a scope: `@yourusername/obsidigen`

### "prepublishOnly script failed"

The build is failing. Check TypeScript errors:

```bash
npm run build
```

### Files missing from package

Check your `package.json` `files` field and `.npmignore`.

List what will be included:

```bash
npm pack --dry-run
```

## Resources

- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [npm Docs](https://docs.npmjs.com/)

