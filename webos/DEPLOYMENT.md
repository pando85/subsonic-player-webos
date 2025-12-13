# Quick Deployment Guide - webOS TV

## 🚀 5-Minute Deployment

### Step 1: Build the App

```bash
cd /path/to/subsonic-player
yarn build:webos
```

**Output:** `com.subsonic.player_1.0.0_all.ipk`

### Step 2: Setup TV (First Time Only)

```bash
# Enable Developer Mode on your TV:
# 1. Press Home 3 times
# 2. Navigate to Developer Mode App
# 3. Enable Dev Mode & restart TV

# Add TV to SDK
ares-setup-device

# Follow prompts:
# - Name: my-tv
# - IP: [TV's IP address]
# - Port: 9922
# - User: prisoner
# - Description: LG webOS TV
```

### Step 3: Install & Launch

```bash
# Install
ares-install com.subsonic.player_1.0.0_all.ipk -d my-tv

# Launch
ares-launch com.subsonic.player -d my-tv
```

## 🎯 That's It!

The app is now running on your TV. Use the remote control to navigate.

---

## 📋 Commands Reference

### Build Commands

```bash
# Standard web build
yarn build

# webOS-specific build & package
yarn build:webos

# Development (browser)
yarn dev
```

### webOS Commands

```bash
# List installed apps
ares-install --list -d my-tv

# View logs
ares-log -f com.subsonic.player -d my-tv

# Debug (opens Chrome DevTools)
ares-inspect com.subsonic.player -d my-tv

# Uninstall
ares-install --remove com.subsonic.player -d my-tv

# List connected TVs
ares-device --list
```

## 🎮 Using the App

### Remote Control Mapping

| Button     | Action           |
| ---------- | ---------------- |
| Arrow Keys | Navigate UI      |
| OK/Enter   | Select/Play      |
| Back       | Previous page    |
| Home       | Close app        |
| Play/Pause | Media control    |
| Next/Prev  | Track navigation |

### First-Time Setup

1. Navigate to Login page
2. Enter Subsonic server details:
   - Server URL (e.g., `http://192.168.1.100:4533`)
   - Username
   - Password
3. Press OK to login
4. Browse music library using arrow keys

## 🔧 Troubleshooting

### Packaging fails with minification error

```bash
# Error: Failed to minify code
# Solution: Use --no-minify flag (Nuxt already minifies)
ares-package webos --outdir ./ --no-minify
```

The build script already includes this flag.

### App won't install

```bash
# Check TV connection
ares-device --list

# Re-setup device
ares-setup-device --modify my-tv
```

### App crashes on launch

```bash
# View crash logs
ares-log -f com.subsonic.player -d my-tv

# Common issues:
# - Server URL not accessible from TV
# - Network firewall blocking connection
# - Invalid server credentials
```

### Navigation not working

- Ensure you're using arrow keys (not mouse)
- Check plugin loaded: `ares-inspect` → Console → look for `[webOS] TV input plugin enabled`
- Try restarting app: `ares-launch -c com.subsonic.player -d my-tv`

### Audio won't play

- First playback MUST be user-initiated (press OK on track)
- Check server URL is accessible from TV network
- Verify audio codec (MP3/AAC recommended)
- Check Subsonic server logs

## 🔄 Updating the App

```bash
# 1. Rebuild
yarn build:webos

# 2. Uninstall old version
ares-install --remove com.subsonic.player -d my-tv

# 3. Install new version
ares-install com.subsonic.player_1.0.0_all.ipk -d my-tv
```

**Note:** User data (login, queue) is preserved in TV localStorage.

## 📊 Performance Tips

### Reduce Image Sizes

Edit `.env` file:

```bash
NUXT_PUBLIC_IMAGE_SIZE=300  # Instead of 500
```

Rebuild after changing.

### Optimize Network

- Use wired Ethernet instead of WiFi
- Ensure Subsonic server has sufficient bandwidth
- Consider transcoding high-bitrate files

### Clear Cache

If app feels sluggish:

```bash
# Clear localStorage via DevTools
ares-inspect com.subsonic.player -d my-tv
# In console: localStorage.clear()
# Restart app
```

## 🆘 Getting Help

1. **Check logs first:**

   ```bash
   ares-log -f com.subsonic.player -d my-tv
   ```

2. **Inspect in browser:**

   ```bash
   ares-inspect com.subsonic.player -d my-tv
   ```

3. **Verify build:**

   ```bash
   # Should complete without errors
   yarn build:webos
   ```

4. **Test in browser first:**
   ```bash
   yarn dev
   # Visit http://localhost:3000
   # Use keyboard for navigation
   ```

## 📚 Additional Resources

- [Full webOS Guide](../WEBOS_GUIDE.md)
- [webOS README](README.md)
- [webOS SDK Docs](https://webostv.developer.lge.com/sdk/)
- [Project Issues](https://github.com/VD39/subsonic-player/issues)

## ✅ Deployment Checklist

Before deploying to production TV:

- [ ] Tested on physical TV hardware
- [ ] Verified all navigation flows
- [ ] Checked audio playback (multiple formats)
- [ ] Tested with real Subsonic server
- [ ] Confirmed login/logout works
- [ ] Verified queue persistence
- [ ] Tested back button behavior
- [ ] Checked focus visibility
- [ ] Reviewed logs for errors
- [ ] Tested network interruption handling

---

**Quick Links:**

- Build: `yarn build:webos`
- Install: `ares-install *.ipk -d my-tv`
- Launch: `ares-launch com.subsonic.player -d my-tv`
- Debug: `ares-inspect com.subsonic.player -d my-tv`
