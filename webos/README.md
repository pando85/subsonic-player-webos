# Subsonic Player - webOS TV App

This directory contains the webOS TV packaging and deployment files for the Subsonic Player.

## 🎯 Overview

This app transforms the Subsonic Player into a production-quality webOS TV application using a **minimal-fork strategy** that maintains upstream compatibility while adding TV-specific optimizations.

## 📋 Prerequisites

- **Node.js**: v20.19.0 or >=22.12.0
- **Yarn**: 1.22.22+ (included)
- **webOS SDK**: For packaging and deployment to TV
  - Install from: https://webostv.developer.lge.com/sdk/installation/
  - Required tools: `ares-package`, `ares-install`, `ares-launch`

## 🚀 Quick Start

### 1. Build for webOS

```bash
# From project root
yarn build:webos
```

This command will:

1. Build the Nuxt app as a static SPA
2. Copy build output to `webos/` directory
3. Create icons from PWA assets
4. Package as `.ipk` file (if webOS SDK is installed)

### 2. Manual Packaging (if script doesn't work)

```bash
# Build the app
yarn build

# Copy files to webOS directory
cp -r .output/public/* webos/

# Package (requires webOS SDK)
ares-package webos --outdir ./

# Install on TV
ares-install com.subsonic.player_1.0.0_all.ipk -d YOUR_TV_NAME
```

### 3. Launch on TV

```bash
# List available devices
ares-device --list

# Add your TV (one-time setup)
ares-setup-device

# Launch the app
ares-launch com.subsonic.player -d YOUR_TV_NAME
```

## 🎮 TV Remote Controls

The app includes built-in DPAD/remote control support:

### Navigation

- **Arrow Keys**: Navigate between UI elements
- **Enter/OK**: Activate focused element
- **Back/Escape**: Navigate back or close modals

### Media Playback

- Uses standard HTML5 Media Session API
- Play/Pause via remote's media controls
- Track navigation with Previous/Next buttons
- Seek with fast-forward/rewind buttons

## 📐 Architecture

### Build Configuration

The app is configured for static SPA deployment:

```typescript
// nuxt.config.ts
{
  ssr: false,           // Disable SSR (webOS doesn't support Node.js runtime)
  nitro: {
    preset: 'static'    // Generate static assets
  }
}
```

### TV-Specific Features

1. **DPAD Navigation Plugin** (`plugins/webos-input.client.ts`)
   - Spatial navigation algorithm
   - Automatic focus management
   - Remote control key mapping
   - Only loads on webOS devices

2. **TV-Optimized CSS** (`assets/css/global/webos-tv.css`)
   - High-visibility focus states (3px blue outline)
   - Larger touch targets (44px minimum)
   - Scaled typography for 10-foot viewing
   - Safe area padding for TV overscan
   - Reduced animations for performance

3. **Audio Playback**
   - Uses standard `HTMLAudioElement`
   - MediaSession API for remote control integration
   - Automatic state persistence via localStorage
   - Graceful error handling for network issues

## 🎨 Customization

### Modify App Metadata

Edit `webos/appinfo.json`:

```json
{
  "id": "com.subsonic.player",
  "version": "1.0.0",
  "title": "Subsonic Player",
  "vendor": "Your Company Name"
}
```

### Adjust Focus Styling

Edit `assets/css/global/webos-tv.css`:

```css
:focus {
  outline: 3px solid #00aaff; /* Change color */
  outline-offset: 4px;
}
```

### Modify Navigation Behavior

Edit `plugins/webos-input.client.ts` to customize:

- Spatial navigation algorithm
- Key mappings
- Focus priorities

## 🔧 Troubleshooting

### App doesn't launch on TV

1. Verify TV is in developer mode:

   ```bash
   ares-setup-device --search
   ```

2. Check if app is installed:

   ```bash
   ares-install --list -d YOUR_TV_NAME
   ```

3. View logs:
   ```bash
   ares-inspect com.subsonic.player -d YOUR_TV_NAME
   ```

### Focus navigation not working

- Ensure `webos-input.client.ts` plugin is loaded
- Check browser console for `[webOS] TV input plugin enabled`
- Verify elements have proper `tabindex` attributes

### Audio doesn't play

webOS has strict autoplay policies:

- Playback must be user-initiated (via Enter/OK button)
- Check codec support (MP3, AAC recommended)
- Verify Subsonic server is accessible from TV

### Styling looks wrong

- Check that `webos-tv.css` is imported in `main.css`
- Verify CSS is not being overridden by specificity issues
- Use browser dev tools to inspect focus states

## 📊 Performance Tips

1. **Reduce Asset Sizes**
   - Optimize images before loading
   - Use appropriate image sizes via Subsonic API
   - Consider lazy loading for large lists

2. **Minimize Animations**
   - TV hardware is less powerful than desktop
   - Use CSS `will-change` sparingly
   - Prefer `transform` and `opacity` for animations

3. **Optimize Bundle Size**
   - Current build is ~140KB gzipped
   - Monitor with `yarn build` output
   - Tree-shake unused dependencies

## 🔄 Maintenance Strategy

### Staying Up-to-Date with Upstream

This webOS adaptation uses a **shallow fork** strategy:

```bash
# Add upstream remote (one-time)
git remote add upstream https://github.com/VD39/subsonic-player.git

# Update from upstream
git fetch upstream
git rebase upstream/main

# Resolve conflicts (if any)
# - Most changes should auto-rebase cleanly
# - Only webOS-specific files may need manual merge
```

### Files Modified from Upstream

**Core Configuration:**

- `nuxt.config.ts` - Added `ssr: false` and `nitro.preset: 'static'`
- `package.json` - Added `build:webos` script
- `assets/css/main.css` - Added webOS CSS import

**webOS-Specific Additions:**

- `plugins/webos-input.client.ts` - TV navigation (new file)
- `assets/css/global/webos-tv.css` - TV styling (new file)
- `webos/*` - Packaging directory (new directory)

### Feature Flags (No Forking Required)

The app detects webOS at runtime:

```typescript
if (typeof window !== 'undefined' && 'webOS' in window) {
  // webOS-specific behavior
}
```

This allows TV-specific UX without breaking desktop/mobile compatibility.

## 📝 Development Workflow

### Local Development

```bash
# Standard web development (no TV needed)
yarn dev

# Test in browser at http://localhost:3000
# Simulate TV with browser dev tools:
# - Set viewport to 1920x1080
# - Use keyboard for navigation (arrow keys = DPAD)
```

### TV Testing

```bash
# Build and deploy to TV
yarn build:webos
ares-install com.subsonic.player_1.0.0_all.ipk -d YOUR_TV_NAME
ares-launch com.subsonic.player -d YOUR_TV_NAME

# Debug on TV
ares-inspect com.subsonic.player -d YOUR_TV_NAME
# Opens Chrome DevTools connected to TV
```

### Production Deployment

1. Update version in `webos/appinfo.json`
2. Build: `yarn build:webos`
3. Test on TV
4. Distribute `.ipk` file to users
5. Users install via `ares-install` or LG Content Store (if published)

## 🎯 Browser Compatibility

The app is optimized for webOS TV browser (Chromium-based):

| Feature          | Support                         |
| ---------------- | ------------------------------- |
| ES2020+          | ✅ Full                         |
| CSS Grid         | ✅ Full                         |
| HTMLAudioElement | ✅ Full                         |
| MediaSession API | ✅ Full                         |
| localStorage     | ✅ Full                         |
| Service Workers  | ⚠️ Disabled (not needed for TV) |
| IndexedDB        | ✅ Available (not used)         |

## 📚 Additional Resources

- [webOS TV Developer Portal](https://webostv.developer.lge.com/)
- [webOS SDK Documentation](https://webostv.developer.lge.com/sdk/tools/)
- [Subsonic API Documentation](http://www.subsonic.org/pages/api.jsp)
- [Nuxt.js Static Deployment](https://nuxt.com/docs/getting-started/deployment#static-hosting)

## 🆘 Support

For webOS-specific issues:

1. Check TV logs: `ares-log -f com.subsonic.player -d YOUR_TV_NAME`
2. Inspect app: `ares-inspect com.subsonic.player -d YOUR_TV_NAME`
3. Review webOS documentation
4. Open GitHub issue with `[webOS]` prefix

For app functionality issues:

- File issue on upstream repo: https://github.com/VD39/subsonic-player/issues

## 📄 License

Same as upstream Subsonic Player project.
