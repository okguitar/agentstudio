#!/bin/bash

# Agent Studio Remote Installation Script
# This script downloads and installs Agent Studio backend with all dependencies
# Usage: curl -fsSL https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/remote-install.sh | sudo bash

set -e

# Configuration
GITHUB_REPO="git-men/agentstudio"
GITHUB_BRANCH="main"
TEMP_DIR="/tmp/agent-studio-install"
SERVICE_NAME="agent-studio"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "Please run this script as root (use sudo)"
        exit 1
    fi
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if command -v apt-get >/dev/null 2>&1; then
            DISTRO="debian"
        elif command -v yum >/dev/null 2>&1; then
            DISTRO="redhat"
        elif command -v pacman >/dev/null 2>&1; then
            DISTRO="arch"
        else
            DISTRO="unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        DISTRO="macos"
    else
        error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    log "Detected OS: $OS ($DISTRO)"
}

# Install Node.js
install_nodejs() {
    log "Installing Node.js..."
    
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            success "Node.js $(node --version) is already installed"
            return
        else
            warn "Node.js version is too old: $(node --version). Installing latest..."
        fi
    fi
    
    if [[ "$OS" == "linux" ]]; then
        # Install Node.js using NodeSource repository (works for most Linux distros)
        log "Adding NodeSource repository..."
        curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
        
        if [[ "$DISTRO" == "debian" ]]; then
            apt-get install -y nodejs
        elif [[ "$DISTRO" == "redhat" ]]; then
            yum install -y nodejs npm
        elif [[ "$DISTRO" == "arch" ]]; then
            pacman -S --noconfirm nodejs npm
        else
            error "Unsupported Linux distribution"
            exit 1
        fi
    elif [[ "$OS" == "macos" ]]; then
        # Install Node.js using Homebrew on macOS
        if ! command -v brew >/dev/null 2>&1; then
            log "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install node
    fi
    
    success "Node.js $(node --version) installed successfully"
}

# Install pnpm
install_pnpm() {
    log "Installing pnpm..."
    
    if command -v pnpm >/dev/null 2>&1; then
        success "pnpm is already installed"
        return
    fi
    
    # Install pnpm globally
    npm install -g pnpm
    success "pnpm installed successfully"
}

# Install git if not present
install_git() {
    if command -v git >/dev/null 2>&1; then
        return
    fi
    
    log "Installing git..."
    
    if [[ "$DISTRO" == "debian" ]]; then
        apt-get update && apt-get install -y git curl
    elif [[ "$DISTRO" == "redhat" ]]; then
        yum install -y git curl
    elif [[ "$DISTRO" == "arch" ]]; then
        pacman -S --noconfirm git curl
    elif [[ "$OS" == "macos" ]]; then
        # Git is usually pre-installed on macOS
        if ! command -v git >/dev/null 2>&1; then
            xcode-select --install
        fi
    fi
    
    success "Git installed successfully"
}

# Download and extract Agent Studio
download_agent_studio() {
    log "Downloading Agent Studio..."
    
    # Clean up any existing temp directory
    rm -rf "$TEMP_DIR"
    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"
    
    # Download the repository
    if command -v git >/dev/null 2>&1; then
        git clone "https://github.com/$GITHUB_REPO.git" .
        git checkout "$GITHUB_BRANCH"
    else
        # Fallback to downloading tarball
        curl -fsSL "https://github.com/$GITHUB_REPO/archive/$GITHUB_BRANCH.tar.gz" | tar -xz --strip-components=1
    fi
    
    success "Agent Studio downloaded successfully"
}

# Run the main installation
run_installation() {
    log "Running Agent Studio installation..."
    
    cd "$TEMP_DIR"
    
    # Debug: Show current directory contents
    log "Current directory: $(pwd)"
    log "Files in directory:"
    ls -la
    
    # Check if install.sh exists
    if [ ! -f "install.sh" ]; then
        error "install.sh not found in downloaded repository"
        exit 1
    fi
    
    chmod +x install.sh
    chmod +x scripts/agent-studio-service 2>/dev/null || true
    chmod +x scripts/macos-logrotate.sh 2>/dev/null || true
    
    ./install.sh
    
    success "Agent Studio installation completed"
}

# Cleanup temp files
cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    success "Cleanup completed"
}

# Service configuration (optional)
configure_service() {
    echo ""
    echo "=== Service Configuration ==="
    echo ""
    success "Agent Studio Backend is ready to use!"
    echo ""
    echo "The service can run without additional configuration."
    echo "API keys can be added later if needed by editing:"
    echo "  /etc/$SERVICE_NAME/config.env"
}

# Start the service
start_service() {
    echo ""
    read -p "Would you like to start the Agent Studio service now? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Starting Agent Studio service..."
        
        if command -v agent-studio >/dev/null 2>&1; then
            agent-studio start
            
            # Wait a moment and check status
            sleep 3
            agent-studio status
        else
            error "Service command not found. Please check the installation."
        fi
    else
        echo ""
        echo "To start the service later, run:"
        echo "  agent-studio start"
    fi
}

# Main installation function
main() {
    echo "╔══════════════════════════════════════════╗"
    echo "║       Agent Studio Remote Installer      ║"
    echo "║                                          ║"
    echo "║  This will install:                      ║"
    echo "║  • Node.js 18+ (if not installed)       ║"
    echo "║  • pnpm package manager                  ║"
    echo "║  • Agent Studio Backend                  ║"
    echo "║  • System service (ready to use)        ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    
    check_root
    detect_os
    install_git
    install_nodejs
    install_pnpm
    download_agent_studio
    run_installation
    configure_service
    start_service
    cleanup
    
    echo ""
    echo "🎉 Installation Complete!"
    echo ""
    echo "Agent Studio Backend is now installed and configured."
    echo ""
    echo "Useful commands:"
    echo "  agent-studio start      # Start the service"
    echo "  agent-studio stop       # Stop the service"
    echo "  agent-studio status     # Check service status"
    echo "  agent-studio logs       # View logs"
    echo "  agent-studio config     # Edit configuration"
    echo ""
    echo "The service will be available at: http://localhost:4936"
    echo ""
    echo "For more information, visit:"
    echo "  https://github.com/$GITHUB_REPO"
    echo ""
}

# Handle script interruption
trap cleanup EXIT INT TERM

# Run main function
main "$@"