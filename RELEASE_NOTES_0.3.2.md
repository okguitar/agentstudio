# AgentStudio v0.3.2 Release Notes

**Release Date**: January 29, 2026  
**Release Type**: Patch Release

## 🎉 What's New

### 🔧 Upgrade Command Improvements

This release significantly improves the upgrade experience with intelligent service detection and automatic restart capabilities.

#### Key Features

1. **🔍 Automatic Command Verification**
   - Verifies `agentstudio` command availability after upgrade
   - Provides clear troubleshooting guidance if command not found
   - Suggests terminal restart or npm path configuration

2. **🔄 System Service Auto-Detection**
   - Detects installed system services automatically
   - Supports macOS launchd and Linux systemd
   - Preserves service configuration during upgrade

3. **⚙️ Configuration Preservation**
   - Maintains port settings during upgrade
   - Preserves data directory configuration
   - No manual reconfiguration needed

4. **🚀 Automatic Service Restart**
   - Automatically reinstalls service with updated executable
   - Restarts service immediately after upgrade
   - Zero-downtime upgrade for service installations

## 📋 Upgrade Flow

```bash
$ agentstudio upgrade
🔄 Checking for updates...
   Current version: 0.3.1
   Latest version:  0.3.2
ℹ️  Detected system service installation

📦 Upgrading to the latest version...
   Running: npm install -g agentstudio@latest

✅ Upgrade completed successfully!

🔍 Verifying installation...
   Command location: /usr/local/bin/agentstudio
   New version: 0.3.2

🔄 Service detected, reloading...
   Port: 4936
   Data directory: /Users/xxx/.agentstudio

🎉 Service has been updated and restarted!
   Access AgentStudio at: http://localhost:4936

   Check service status: agentstudio service status
   View logs: agentstudio service logs
```

## 🐛 Bug Fixes

- **Fixed**: `agentstudio` command not found after upgrade
- **Fixed**: System service not restarting after package upgrade
- **Improved**: Error handling during upgrade process
- **Enhanced**: User feedback during upgrade operations

## 📦 Installation

### Fresh Install

```bash
npm install -g agentstudio@0.3.2
```

### Upgrade from Previous Version

```bash
# Simple upgrade (recommended)
agentstudio upgrade

# Manual upgrade
npm install -g agentstudio@latest
```

## 🔄 Changelog Since 0.3.0

### [0.3.2] - 2026-01-29
- Automatic command verification after upgrade
- System service auto-detection (macOS/Linux)
- Configuration preservation during upgrade
- Automatic service restart after upgrade

### [0.3.1] - 2026-01-28
- **Security**: Upgraded React to 19.2.4 (Critical RCE fix)
- Multi-agent SDK support (claude-code, claude-internal)
- Enhanced CLI with `--sdk` option
- Fixed dynamic port detection

### [0.3.0] - 2026-01-25
- Multi-Agent SDK architecture
- IM integration (Enterprise WeChat)
- Project-level model configuration
- Enhanced CLI startup options

## 📚 Documentation

- [CHANGELOG](../CHANGELOG.md)
- [Claude Internal SDK Guide](../docs/CLAUDE_INTERNAL_SDK.md)
- [User Manual](../docs/USER_MANUAL.md)

## 🔗 Links

- **NPM Package**: https://www.npmjs.com/package/agentstudio
- **GitHub Repository**: https://github.com/okguitar/agentstudio
- **Documentation**: https://github.com/okguitar/agentstudio/blob/main/docs/USER_MANUAL.md
- **Issue Tracker**: https://github.com/okguitar/agentstudio/issues

## 💬 Feedback

We'd love to hear your feedback! Please:
- ⭐ Star us on [GitHub](https://github.com/okguitar/agentstudio)
- 🐛 Report bugs in [Issues](https://github.com/okguitar/agentstudio/issues)
- 💡 Share feature requests
- 📖 Improve our documentation

## 🙏 Acknowledgments

Thank you to all contributors and users who reported issues and provided feedback!

---

**Full Changelog**: https://github.com/okguitar/agentstudio/compare/v0.3.1...v0.3.2
