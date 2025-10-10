#!/bin/bash

# Agent Studio Remote Installation Script
# This script detects the operating system and calls the appropriate platform-specific installer
# Usage: curl -fsSL https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/remote-install.sh | bash

set -e

# Configuration
GITHUB_REPO="git-men/agentstudio"
GITHUB_BRANCH="main"
SCRIPT_BASE_URL="https://raw.githubusercontent.com/$GITHUB_REPO/$GITHUB_BRANCH/scripts"

# Detect if running via pipe (for non-interactive mode)
if [ -p /dev/stdin ] || [ ! -t 0 ]; then
    PIPED_INSTALL="true"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

header_log() {
    echo -e "${PURPLE}[INSTALLER]${NC} $1"
}

# Detect operating system
detect_os() {
    header_log "Detecting operating system..."

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if command -v apt-get >/dev/null 2>&1; then
            DISTRO="debian"
        elif command -v yum >/dev/null 2>&1; then
            DISTRO="redhat"
        elif command -v pacman >/dev/null 2>&1; then
            DISTRO="arch"
        elif command -v dnf >/dev/null 2>&1; then
            DISTRO="fedora"
        elif command -v zypper >/dev/null 2>&1; then
            DISTRO="suse"
        else
            DISTRO="unknown"
        fi

        # Get distribution info if available
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            DISTRO_NAME="$PRETTY_NAME"
        else
            DISTRO_NAME="Unknown Linux Distribution"
        fi

    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        DISTRO="macos"
        DISTRO_NAME="macOS $(sw_vers -productVersion)"
        ARCH=$(uname -m)
        case "$ARCH" in
            "arm64")
                ARCH_NAME="Apple Silicon"
                ;;
            "x86_64")
                ARCH_NAME="Intel"
                ;;
            *)
                ARCH_NAME="$ARCH"
                ;;
        esac
    else
        error "Unsupported operating system: $OSTYPE"
        error "Supported operating systems: Linux (various distributions), macOS"
        exit 1
    fi

    success "Detected $OS: $DISTRO_NAME"
    if [ "$OS" = "macos" ]; then
        log "Architecture: $ARCH_NAME ($ARCH)"
    fi
}

# Check if curl is available
check_curl() {
    if ! command -v curl >/dev/null 2>&1; then
        error "curl is required but not found. Please install curl first."
        error "Installation instructions:"
        error "  Ubuntu/Debian: sudo apt-get install curl"
        error "  RedHat/CentOS: sudo yum install curl"
        error "  macOS: brew install curl"
        exit 1
    fi
}

# Execute platform-specific installer
execute_platform_installer() {
    header_log "Executing platform-specific installer..."

    local script_name=""

    case "$OS" in
        "linux")
            script_name="install-linux.sh"
            header_log "Using Linux installer"
            ;;
        "macos")
            script_name="install-macos.sh"
            header_log "Using macOS installer"
            ;;
        *)
            error "Unsupported operating system: $OS"
            exit 1
            ;;
    esac

    # Check if script exists in current directory (scripts folder)
    local script_path="./scripts/$script_name"
    if [ -f "$script_path" ]; then
        log "Using local script: $script_path"
    else
        # Fallback to downloading from remote
        local temp_script="/tmp/agent-studio-platform-installer-$(date +%s).sh"
        local script_url="$SCRIPT_BASE_URL/$script_name"

        log "Downloading $script_name from $script_url..."
        if ! curl -fsSL "$script_url" -o "$temp_script"; then
            error "Failed to download platform-specific installer: $script_name"
            error "Please check your internet connection and try again."
            error "You can also download the script manually from: $script_url"
            exit 1
        fi

        script_path="$temp_script"
        chmod +x "$script_path"
        success "Platform-specific installer downloaded successfully"
    fi

    # Execute the platform-specific script
    header_log "Executing platform-specific installer..."
    log "Running: $script_path"

    # Pass through the piped installation flag if set
    if [ -n "$PIPED_INSTALL" ]; then
        export PIPED_INSTALL="$PIPED_INSTALL"
    fi

    # Execute the script
    if bash "$script_path"; then
        success "Installation completed successfully!"

        # Clean up temporary script if we downloaded it
        if [ -f "$temp_script" ]; then
            rm -f "$temp_script"
        fi
    else
        error "Platform-specific installer failed"
        if [ -f "$temp_script" ]; then
            rm -f "$temp_script"
        fi
        exit 1
    fi
}

# Show installation banner
show_banner() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              Agent Studio Remote Installer                    ║"
    echo "║                                                                ║"
    echo "║  This installer will automatically detect your operating      ║"
    echo "║  system and run the appropriate platform-specific installer.  ║"
    echo "║                                                                ║"
    echo "║  Supported platforms:                                         ║"
    echo "║  • Linux (Ubuntu, Debian, RedHat, CentOS, Fedora, Arch, SUSE)║"
    echo "║  • macOS (Intel and Apple Silicon)                           ║"
    echo "║                                                                ║"
    echo "║  What will be installed:                                      ║"
    echo "║  • Agent Studio Backend (user-local)                         ║"
    echo "║  • Node.js (if not available)                                ║"
    echo "║  • Dependencies (npm/pnpm)                                   ║"
    echo "║  • Start/Stop scripts                                        ║"
    echo "║  • Configuration files                                       ║"
    echo "║  • System service (Linux, optional)                          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

# Handle script interruption
cleanup() {
    header_log "Installation interrupted"
    header_log "Cleaning up temporary files..."
    rm -f /tmp/agent-studio-platform-installer-*.sh 2>/dev/null || true
    success "Cleanup completed"
}

# Main installation function
main() {
    show_banner

    header_log "Starting Agent Studio installation process..."

    detect_os
    check_curl
    execute_platform_installer

    echo ""
    echo "🎉 Agent Studio Installation Complete!"
    echo ""
    echo "Thank you for installing Agent Studio!"
    echo ""
    echo "For support and documentation, visit:"
    echo "  https://github.com/$GITHUB_REPO"
    echo ""
    echo "If you encounter any issues, please report them at:"
    echo "  https://github.com/$GITHUB_REPO/issues"
    echo ""
}

# Handle script interruption
trap cleanup INT TERM

# Run main function
main "$@"