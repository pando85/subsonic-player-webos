# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-03-28

### Added

- **Zone-based navigation** - Intelligent focus management prevents jumping between sidebar/header and main content
- **TV-specific focus states** - High-visibility focus indicators optimized for 10-foot UI
- **Playwright test suite** - Local TV testing with automated browser-based tests
- **webosbrew manifest** - Support for homebrew installation on webOS TVs
- **160px icon** - Proper icon size for webOS TV displays

### Fixed

#### webOS

- **Focus visibility** - Replaced `:focus` CSS with `.focused` class for reliable TV remote focus detection
- **Focus clipping on album carousel** - Fixed box-shadow being cut off
- **Progress bar visibility** - Improved contrast and visibility on TV screens
- **Build process** - Use `nuxt generate` instead of `nuxt build` for proper static SPA output
- **Authentication persistence** - Restored localStorage-based auth storage for webOS compatibility
- **Logout handling** - Properly clear localStorage on logout
- **Auto-login failures** - Don't clear stored credentials on transient failures

### Changed

#### Upstream Sync

- **Dropdown context menu** - New interaction wrapper with dropdown menu for list layouts
- **Touch device support** - Fixed context menu and track seeker behavior on touch devices
- **Hotkey mappings** - Updated keyboard shortcuts
- **Track title display** - Updates when track is playing

### Dependencies

Updated 40+ dependencies including:

- Nuxt 4.2.2 → 4.3.0
- Vue 3.5.22 → 3.5.27
- TypeScript 5.8.3 → 5.9.3
- Vitest and @vitest/coverage-istanbul (latest)
- @playwright/test 1.56.1 → 1.58.1
- Various security patches (tar, devalue, lodash, etc.)

## [1.0.0] - 2025-03-27

Initial release of webOS TV fork.

### Added

- Initial webOS TV port based on upstream Subsonic Player
- Static SPA build configuration for webOS
- Basic TV remote navigation support
