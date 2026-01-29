# Changelog

All notable changes to AgentStudio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2026-01-29

### 🔧 Improved

#### Upgrade Command Enhancements
- **Automatic command verification** after upgrade completion
  - Detects if `agentstudio` command is available in PATH
  - Provides troubleshooting hints if command not found
  - Suggests terminal restart or npm global path check
- **System service auto-detection** 
  - Detects installed system services (macOS launchd / Linux systemd)
  - Preserves service configuration during upgrade (port, data directory)
  - Automatically reinstalls and restarts service after upgrade
- **Enhanced upgrade flow output**
  - Clear status messages throughout upgrade process
  - Displays service configuration being preserved
  - Shows verification results and service status

### 🐛 Fixed
- Fixed issue where `agentstudio` command becomes unavailable after upgrade
- Fixed service not restarting after package upgrade

---

## [0.3.1] - 2026-01-28

### 🔒 Security
- **Critical Security Fix**: Upgraded React to 19.2.4 to fix RCE vulnerability (CVE-2024-XXXXX)
  - Addresses arbitrary code execution vulnerability in React SSR
  - All users are strongly recommended to upgrade immediately

### ✨ Added
- **Multi-Agent SDK Support**
  - Support for multiple Claude SDK engines: `claude-code` (default) and `claude-internal`
  - New `--sdk` CLI option to select SDK engine at startup
  - Dynamic SDK selection enables different agent capabilities

### 🔧 Improved
- Enhanced CLI with `--sdk` option for SDK engine selection
- Fixed dynamic port detection for better network compatibility
- Merged feature/multi-agent-sdk-support branch into main

### 📝 Usage
```bash
# Use default claude-code SDK
agentstudio start

# Use claude-internal SDK
agentstudio start --sdk claude-internal

# Specify port and SDK
agentstudio start --port 8080 --sdk claude-internal
```

---

## [0.3.0] - 2026-01-25

### ✨ Added
- **Multi-Agent SDK Architecture**
  - Support for `claude-code` SDK (default)
  - Support for `claude-internal` SDK (experimental)
  - Pluggable SDK system for future extensions

- **IM Integration**
  - Enterprise WeChat (企业微信) integration support
  - Real-time messaging capabilities for agents
  - Bidirectional communication between agents and IM platforms

- **Project-Level Model Configuration**
  - Configure Claude model version per project
  - Support for multiple Claude models (Sonnet, Opus, Haiku)
  - Per-project API key configuration

### 🔧 Improved
- Enhanced CLI startup options
- Better configuration management
- Improved SDK initialization flow

### 📚 Documentation
- Added SDK selection guide
- Updated CLI usage documentation
- Added project configuration examples

---

## Upgrade Guide

### From 0.3.1 to 0.3.2
```bash
# Simply run the upgrade command
agentstudio upgrade

# The upgrade will:
# 1. Check for updates
# 2. Install the latest version
# 3. Verify command availability
# 4. Auto-restart system service (if installed)
```

### From 0.3.0 to 0.3.1
```bash
npm install -g agentstudio@latest

# Or if installed as service:
agentstudio service stop
npm install -g agentstudio@latest
agentstudio service start
```

---

## Breaking Changes

### 0.3.0
- No breaking changes. Fully backward compatible with 0.2.x

### 0.3.1
- No breaking changes

### 0.3.2
- No breaking changes

---

## Links

- [GitHub Repository](https://github.com/okguitar/agentstudio)
- [Documentation](https://github.com/okguitar/agentstudio/blob/main/docs/USER_MANUAL.md)
- [Issue Tracker](https://github.com/okguitar/agentstudio/issues)
- [NPM Package](https://www.npmjs.com/package/agentstudio)
