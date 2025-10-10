#!/bin/bash

# Agent Studio macOS Installation Script
# Optimized for macOS with Apple Silicon support and enhanced error handling

set -e

# Configuration
GITHUB_REPO="git-men/agentstudio"
GITHUB_BRANCH="main"
TEMP_DIR="/tmp/agent-studio-macos-$(date +%s)"
SERVICE_NAME="agent-studio"
SERVICE_PORT="4936"

# Detect if running via pipe (for non-interactive mode)
if [ -p /dev/stdin ] || [ ! -t 0 ]; then
    PIPED_INSTALL="true"
fi

# Detect if running as root or with sudo
if [ -n "$SUDO_USER" ] && [ "$EUID" -eq 0 ]; then
    # Running with sudo - use the original user's home
    ACTUAL_USER="$SUDO_USER"
    USER_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
    ACTUAL_UID=$(id -u "$SUDO_USER")
    ACTUAL_GID=$(id -g "$SUDO_USER")
elif [ "$EUID" -eq 0 ]; then
    # Running as root directly - ask for target user
    ACTUAL_USER="root"
    USER_HOME="/root"
    ACTUAL_UID=0
    ACTUAL_GID=0
else
    # Running as normal user
    ACTUAL_USER="$USER"
    USER_HOME="$HOME"
    ACTUAL_UID=$(id -u)
    ACTUAL_GID=$(id -g)
fi

INSTALL_DIR="$USER_HOME/.agent-studio"

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

macos_log() {
    echo -e "${PURPLE}[MACOS]${NC} $1"
}

# Detect macOS architecture and version
detect_macos_info() {
    macos_log "Detecting macOS system information..."

    # Architecture detection
    ARCH=$(uname -m)
    case "$ARCH" in
        "arm64")
            ARCH_NAME="Apple Silicon"
            HOMEBREW_PREFIX="/opt/homebrew"
            ;;
        "x86_64")
            ARCH_NAME="Intel"
            HOMEBREW_PREFIX="/usr/local"
            ;;
        *)
            error "Unsupported macOS architecture: $ARCH"
            exit 1
            ;;
    esac

    # macOS version detection
    MACOS_VERSION=$(sw_vers -productVersion)
    MACOS_MAJOR=$(echo "$MACOS_VERSION" | cut -d. -f1)
    MACOS_MINOR=$(echo "$MACOS_VERSION" | cut -d. -f2)

    macos_log "Architecture: $ARCH_NAME ($ARCH)"
    macos_log "macOS Version: $MACOS_VERSION"

    # Check minimum macOS version (10.15 Catalina)
    if [ "$MACOS_MAJOR" -lt 10 ] || ([ "$MACOS_MAJOR" -eq 10 ] && [ "$MACOS_MINOR" -lt 15 ]); then
        error "macOS $MACOS_VERSION is not supported. Requires macOS 10.15 (Catalina) or later."
        exit 1
    fi
}

# Check if Xcode Command Line Tools are installed
check_xcode_tools() {
    macos_log "Checking for Xcode Command Line Tools..."

    if xcode-select -p >/dev/null 2>&1; then
        success "Xcode Command Line Tools are installed"
        return 0
    else
        warn "Xcode Command Line Tools are not installed"

        # Check if we're running in non-interactive mode
        if [ ! -t 0 ] || [ -n "$PIPED_INSTALL" ]; then
            macos_log "Non-interactive mode detected - installing Xcode Command Line Tools automatically"
            log "Note: You may need to accept the license agreement manually"
            xcode-select --install
            log "Waiting for Xcode Command Line Tools installation..."
            log "If the installation hangs, please run 'xcode-select --install' manually and continue"

            # Wait for installation (max 5 minutes)
            for i in {1..30}; do
                if xcode-select -p >/dev/null 2>&1; then
                    success "Xcode Command Line Tools installed successfully"
                    return 0
                fi
                log "Waiting for installation... ($i/30)"
                sleep 10
            done

            error "Xcode Command Line Tools installation timed out"
            error "Please install manually with: xcode-select --install"
            return 1
        else
            read -p "Would you like to install Xcode Command Line Tools? (Y/n): " -n 1 -r
            echo ""

            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                xcode-select --install
                log "Please accept the license agreement and press any key to continue..."
                read -n 1 -s

                # Wait for installation
                while ! xcode-select -p >/dev/null 2>&1; do
                    log "Waiting for Xcode Command Line Tools installation..."
                    sleep 5
                done

                success "Xcode Command Line Tools installed successfully"
                return 0
            else
                error "Xcode Command Line Tools are required for compilation"
                exit 1
            fi
        fi
    fi
}

# Setup Homebrew environment
setup_homebrew_env() {
    macos_log "Setting up Homebrew environment..."

    # Add Homebrew to PATH based on architecture
    if [ "$ARCH" = "arm64" ]; then
        export PATH="$HOMEBREW_PREFIX/bin:$PATH"
        if [ -d "$HOMEBREW_PREFIX/sbin" ]; then
            export PATH="$HOMEBREW_PREFIX/sbin:$PATH"
        fi
    else
        export PATH="$HOMEBREW_PREFIX/bin:$PATH"
    fi

    # Source bash profile if exists
    [ -f "$USER_HOME/.bash_profile" ] && source "$USER_HOME/.bash_profile" 2>/dev/null || true
    [ -f "$USER_HOME/.zprofile" ] && source "$USER_HOME/.zprofile" 2>/dev/null || true
}

# Check and install Homebrew
check_homebrew() {
    macos_log "Checking Homebrew installation..."

    # Setup environment first
    setup_homebrew_env

    if command -v brew >/dev/null 2>&1 && brew --version >/dev/null 2>&1; then
        success "Homebrew is available ($(brew --version | head -n1))"
        return 0
    else
        warn "Homebrew is not installed or not working properly"

        # Check if we're running in non-interactive mode
        if [ ! -t 0 ] || [ -n "$PIPED_INSTALL" ]; then
            macos_log "Non-interactive mode detected - installing Homebrew automatically"
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        else
            read -p "Would you like to install Homebrew? (Y/n): " -n 1 -r
            echo ""

            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                macos_log "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            else
                macos_log "Skipping Homebrew installation, will use NVM instead"
                return 1
            fi
        fi

        # Setup environment after installation
        setup_homebrew_env

        if command -v brew >/dev/null 2>&1 && brew --version >/dev/null 2>&1; then
            success "Homebrew installed successfully"
            return 0
        else
            warn "Homebrew installation failed, will use NVM instead"
            return 1
        fi
    fi
}

# Refresh shell environment for macOS
refresh_shell_env() {
    macos_log "Refreshing shell environment..."

    # Source common profile files (macOS typically uses these)
    [ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc" 2>/dev/null || true
    [ -f "$HOME/.bash_profile" ] && source "$HOME/.bash_profile" 2>/dev/null || true
    [ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc" 2>/dev/null || true
    [ -f "$HOME/.zprofile" ] && source "$HOME/.zprofile" 2>/dev/null || true
    [ -f "$HOME/.profile" ] && source "$HOME/.profile" 2>/dev/null || true

    # Setup Homebrew environment
    setup_homebrew_env

    # Source NVM if available
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" 2>/dev/null || true
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" 2>/dev/null || true

    # Update PATH to include common Node.js installation paths
    if command -v nvm >/dev/null 2>&1; then
        export PATH="$HOME/.nvm/versions/node/$(nvm current 2>/dev/null || echo 'system')/bin:$PATH" 2>/dev/null || true
    fi
    export PATH="$HOMEBREW_PREFIX/bin:$PATH"
    export PATH="$HOME/.local/bin:$PATH"
}

# Install Node.js via Homebrew (preferred for macOS)
install_nodejs_homebrew() {
    macos_log "Installing Node.js via Homebrew..."

    # Ensure Homebrew is up to date
    macos_log "Updating Homebrew..."
    brew update

    # Install Node.js (Homebrew typically provides the latest stable version)
    if brew install node; then
        success "Node.js installed successfully via Homebrew"
        return 0
    else
        error "Failed to install Node.js via Homebrew"
        return 1
    fi
}

# Install Node.js via NVM (fallback)
install_nodejs_nvm() {
    macos_log "Installing Node.js via NVM..."

    # Check if curl is available
    if ! command -v curl >/dev/null 2>&1; then
        error "curl is required but not found. Please install curl first."
        return 1
    fi

    # Download and install NVM
    macos_log "Downloading NVM..."
    if ! curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash; then
        error "Failed to download or install NVM"
        return 1
    fi

    # Source NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

    # Check if NVM was installed successfully
    if ! command -v nvm >/dev/null 2>&1; then
        error "NVM installation failed"
        return 1
    fi

    # Install latest LTS version
    macos_log "Installing Node.js LTS version..."
    if ! nvm install --lts; then
        error "Failed to install Node.js via NVM"
        return 1
    fi

    nvm use --lts
    nvm alias default node

    success "Node.js installed successfully via NVM"
}

# Auto-install Node.js on macOS
auto_install_nodejs() {
    echo ""
    macos_log "Node.js is required but not found on your system."

    # Check if we're running in a non-interactive environment
    if [ ! -t 0 ] || [ -n "$PIPED_INSTALL" ]; then
        macos_log "Non-interactive mode detected - proceeding with automatic Node.js installation"
    else
        read -p "Would you like to install Node.js automatically? (Y/n): " -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Nn]$ ]]; then
            error "Node.js is required to continue. Please install Node.js 18 or later first."
            error "Visit: https://nodejs.org/ or install via Homebrew: brew install node"
            exit 1
        fi
    fi

    # Try Homebrew first (preferred for macOS)
    if check_homebrew; then
        macos_log "Using Homebrew to install Node.js..."
        if install_nodejs_homebrew; then
            return 0
        else
            warn "Homebrew installation failed, trying NVM..."
        fi
    fi

    # Fallback to NVM
    if install_nodejs_nvm; then
        return 0
    else
        error "All Node.js installation methods failed"
        error "Please install Node.js manually:"
        error "  1. Via Homebrew: brew install node"
        error "  2. Via download: https://nodejs.org/"
        exit 1
    fi
}

# Check Node.js installation
check_nodejs() {
    macos_log "Checking Node.js installation..."

    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        NODE_MAJOR_VERSION=$(echo "$NODE_VERSION" | cut -d'v' -f2 | cut -d'.' -f1)

        if [ "$NODE_MAJOR_VERSION" -ge 18 ]; then
            success "Node.js $NODE_VERSION is available"
            return 0
        else
            warn "Node.js version is too old: $NODE_VERSION. Need version 18 or later."
            auto_install_nodejs
        fi
    else
        macos_log "Node.js is not installed."
        auto_install_nodejs
    fi
}

# Install pnpm
install_pnpm() {
    macos_log "Installing pnpm..."

    if command -v npm >/dev/null 2>&1; then
        npm install -g pnpm
        success "pnpm installed successfully"
    else
        error "npm is not available, cannot install pnpm"
        return 1
    fi
}

# Check pnpm installation
check_pnpm() {
    if command -v pnpm >/dev/null 2>&1; then
        success "pnpm is available"
        return 0
    fi

    echo ""

    # Check if we're running in a non-interactive environment
    if [ ! -t 0 ] || [ -n "$PIPED_INSTALL" ]; then
        macos_log "Non-interactive mode detected - installing pnpm automatically"
        install_pnpm
        refresh_shell_env
        if ! command -v pnpm >/dev/null 2>&1; then
            warn "pnpm installation failed, will use npm instead"
        fi
    else
        read -p "pnpm not found. Would you like to install it for faster package management? (Y/n): " -n 1 -r
        echo ""

        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            install_pnpm
            refresh_shell_env
            if ! command -v pnpm >/dev/null 2>&1; then
                warn "pnpm installation failed, will use npm instead"
            fi
        else
            macos_log "Will use npm instead of pnpm"
        fi
    fi
}

# Check git installation
check_git() {
    if command -v git >/dev/null 2>&1; then
        success "Git is available"
        return 0
    fi

    error "Git is not installed. Please install git first."
    error "You can install it via Homebrew: brew install git"
    exit 1
}

# Check installation environment
check_environment() {
    macos_log "Installing Agent Studio to user directory: $INSTALL_DIR"
    macos_log "Target user: $ACTUAL_USER (UID: $ACTUAL_UID)"

    # Check if previous installation exists and is writable
    if [ -d "$INSTALL_DIR" ]; then
        macos_log "Found existing installation directory..."
        macos_log "Cleaning existing installation..."
        rm -rf "$INSTALL_DIR"
        success "Cleanup completed"
    fi

    # Ensure parent directory exists and has correct permissions
    mkdir -p "$USER_HOME"
    if [ "$ACTUAL_USER" != "root" ] && [ "$EUID" -eq 0 ]; then
        chown -R "$ACTUAL_UID:$ACTUAL_GID" "$USER_HOME"
    fi
}

# Download and extract Agent Studio
download_agent_studio() {
    macos_log "Downloading Agent Studio..."

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
    macos_log "Installing Agent Studio to user directory..."

    # Create directories
    macos_log "Creating directories..."
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$USER_HOME/.agent-studio-logs"
    mkdir -p "$USER_HOME/.agent-studio-config"
    mkdir -p "$USER_HOME/slides"

    # Copy files
    macos_log "Copying application files..."
    cd "$TEMP_DIR"
    cp -r ./* "$INSTALL_DIR/"

    # Set correct ownership if running as root
    if [ "$ACTUAL_USER" != "root" ] && [ "$EUID" -eq 0 ]; then
        chown -R "$ACTUAL_UID:$ACTUAL_GID" "$INSTALL_DIR"
    fi

    cd "$INSTALL_DIR"

    # Install dependencies and try to build
    macos_log "Installing dependencies..."
    BUILD_SUCCESS=false

    # Set CI environment variable to handle TTY issues
    export CI=true

    if command -v pnpm >/dev/null 2>&1; then
        macos_log "Using pnpm for installation..."

        # Install all dependencies (including dev dependencies)
        pnpm install

        # Try to build backend - if it fails, continue with development mode
        macos_log "Attempting to build backend..."
        if pnpm run build:backend 2>/dev/null; then
            BUILD_SUCCESS=true
            success "Build successful - will run in production mode"
        else
            macos_log "Build failed or skipped - will run in development mode"
            BUILD_SUCCESS=false
        fi
    else
        macos_log "Using npm for installation..."

        # Install all dependencies (including dev dependencies)
        npm install

        # Try to build backend - if it fails, continue with development mode
        macos_log "Attempting to build backend..."
        if npm run build:backend 2>/dev/null; then
            BUILD_SUCCESS=true
            success "Build successful - will run in production mode"
        else
            macos_log "Build failed or skipped - will run in development mode"
            BUILD_SUCCESS=false
        fi
    fi

    # Create start script optimized for macOS
    macos_log "Creating macOS-optimized start script..."
    if [ "$BUILD_SUCCESS" = true ]; then
        # Production mode
        cat > "$INSTALL_DIR/start.sh" << EOF
#!/bin/bash

# macOS Agent Studio Startup Script
# Load NVM if available
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && \. "\$NVM_DIR/nvm.sh"

# Setup Homebrew environment based on architecture
if [[ \$(uname -m) == "arm64" ]]; then
    export PATH="/opt/homebrew/bin:\$PATH"
    if [ -d "/opt/homebrew/sbin" ]; then
        export PATH="/opt/homebrew/sbin:\$PATH"
    fi
else
    export PATH="/usr/local/bin:\$PATH"
fi

# Add Node.js paths
if command -v nvm >/dev/null 2>&1; then
    export PATH="\$HOME/.nvm/versions/node/\$(nvm current 2>/dev/null || echo 'system')/bin:\$PATH" 2>/dev/null || true
fi
export PATH="\$HOME/.local/bin:\$PATH"

echo "🍎 Starting Agent Studio Backend on macOS (Production Mode)..."
cd "\$HOME/.agent-studio"
export NODE_ENV=production
export PORT=4936
export SLIDES_DIR="\$HOME/slides"
echo "📂 Working directory: \$(pwd)"
echo "🌐 Backend port: 4936"
echo "📑 Slides directory: \$HOME/slides"
echo "🖥️  Architecture: \$(uname -m)"
echo ""
echo "✨ Access the application at:"
echo "   https://agentstudio-frontend.vercel.app/"
echo ""
echo "💡 Configure the backend URL in the web interface:"
echo "   Settings → API Configuration → http://localhost:4936"
echo ""
node backend/dist/index.js
EOF
    else
        # Development mode
        cat > "$INSTALL_DIR/start.sh" << EOF
#!/bin/bash

# macOS Agent Studio Startup Script
# Load NVM if available
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && \. "\$NVM_DIR/nvm.sh"

# Setup Homebrew environment based on architecture
if [[ \$(uname -m) == "arm64" ]]; then
    export PATH="/opt/homebrew/bin:\$PATH"
    if [ -d "/opt/homebrew/sbin" ]; then
        export PATH="/opt/homebrew/sbin:\$PATH"
    fi
else
    export PATH="/usr/local/bin:\$PATH"
fi

# Add Node.js paths
if command -v nvm >/dev/null 2>&1; then
    export PATH="\$HOME/.nvm/versions/node/\$(nvm current 2>/dev/null || echo 'system')/bin:\$PATH" 2>/dev/null || true
fi
export PATH="\$HOME/.local/bin:\$PATH"

echo "🍎 Starting Agent Studio Backend on macOS (Development Mode)..."
cd "\$HOME/.agent-studio"
export NODE_ENV=development
export PORT=4936
export SLIDES_DIR="\$HOME/slides"
echo "📂 Working directory: \$(pwd)"
echo "🌐 Backend port: 4936"
echo "📑 Slides directory: \$HOME/slides"
echo "🖥️  Architecture: \$(uname -m)"
echo ""
echo "✨ Access the application at:"
echo "   https://agentstudio-frontend.vercel.app/"
echo ""
echo "💡 Configure the backend URL in the web interface:"
echo "   Settings → API Configuration → http://localhost:4936"
echo ""
if command -v pnpm >/dev/null 2>&1; then
    pnpm run dev:backend
else
    npm run dev:backend
fi
EOF
    fi

    chmod +x "$INSTALL_DIR/start.sh"

    # Create stop script
    cat > "$INSTALL_DIR/stop.sh" << 'EOF'
#!/bin/bash
echo "🛑 Stopping Agent Studio Backend on macOS..."
pkill -f "node backend" || echo "No production process running"
pkill -f "tsx backend" || echo "No development process running"
EOF

    chmod +x "$INSTALL_DIR/stop.sh"

    # Create macOS-specific config file
    macos_log "Creating macOS configuration file..."
    cat > "$USER_HOME/.agent-studio-config/config.env" << EOF
# Agent Studio Configuration for macOS
NODE_ENV=production
PORT=$SERVICE_PORT
SLIDES_DIR=$USER_HOME/slides

# macOS-specific settings
MACOS_ARCH=$ARCH
MACOS_VERSION=$MACOS_VERSION

# Optional: AI Provider API Keys
# OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here
EOF

    success "Agent Studio installation completed"

    if [ "$BUILD_SUCCESS" = true ]; then
        success "Build successful - will run in production mode"
    else
        warn "Build failed - will run in development mode (slower startup)"
    fi
}

# Cleanup temp files
cleanup() {
    macos_log "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    success "Cleanup completed"
}

# Service configuration for macOS
configure_service() {
    echo ""
    echo "=== macOS Service Configuration ==="
    echo ""
    success "Agent Studio Backend is ready to use on macOS!"
    echo ""
    echo "The service will run as a user process and can be managed with the provided scripts."
    echo "API keys can be added later if needed by editing:"
    echo "  $USER_HOME/.agent-studio-config/config.env"
    echo ""
    echo "🍎 macOS-specific features:"
    echo "  ✅ Optimized for $ARCH_NAME"
    echo "  ✅ Compatible with macOS $MACOS_VERSION"
    echo "  ✅ Supports both Homebrew and NVM installations"
    echo ""
}

# Start the service
start_service() {
    echo ""

    # Check if we're running in a non-interactive environment
    if [ ! -t 0 ] || [ -n "$PIPED_INSTALL" ]; then
        macos_log "Non-interactive mode detected - starting backend automatically"
        START_SERVICE=true
    else
        read -p "Would you like to start the Agent Studio backend now? (y/N): " -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            START_SERVICE=true
        else
            START_SERVICE=false
        fi
    fi

    if [ "$START_SERVICE" = true ]; then
        macos_log "Starting Agent Studio backend on macOS..."

        if [ -f "$INSTALL_DIR/start.sh" ]; then
            macos_log "Running start script..."
            "$INSTALL_DIR/start.sh" &

            # Wait a moment and check if service started
            sleep 5
            if curl -s http://localhost:4936/api/health >/dev/null 2>&1; then
                success "Backend started successfully!"
                echo ""
                echo "✨ Access the application at:"
                echo "   https://agentstudio-frontend.vercel.app/"
                echo ""
                echo "💡 Configure the backend URL in the web interface:"
                echo "   Settings → API Configuration → http://localhost:4936"
                echo ""
                echo "🍎 Running on macOS $ARCH_NAME"
            else
                warn "Backend may still be starting up..."
                macos_log "You can check the status by running the start script again"
            fi
        else
            error "Start script not found. Please check the installation."
        fi
    else
        echo ""
        echo "To start the backend later, run:"
        echo "  $INSTALL_DIR/start.sh"
    fi
}

# Main installation function
main() {
    echo "╔══════════════════════════════════════════╗"
    echo "║    Agent Studio macOS Installer         ║"
    echo "║                                          ║"
    echo "║  Optimized for macOS with support for:  ║"
    echo "║  • Apple Silicon and Intel Macs         ║"
    echo "║  • Homebrew package management          ║"
    echo "║  • NVM fallback support                 ║"
    echo "║  • Xcode Command Line Tools             ║"
    echo "║  • macOS-specific optimizations         ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""

    if [ -n "$SUDO_USER" ] && [ "$EUID" -eq 0 ] && [ "$ACTUAL_USER" != "root" ]; then
        warn "Running with sudo - installing for user: $ACTUAL_USER"
        echo ""
    elif [ "$EUID" -eq 0 ] && [ "$ACTUAL_USER" = "root" ]; then
        warn "Running as root - installing for root user"
        echo ""
    fi

    detect_macos_info
    check_environment
    check_xcode_tools
    check_git
    check_nodejs
    check_pnpm
    download_agent_studio
    run_installation
    configure_service
    start_service

    echo ""
    echo "🎉 macOS Installation Complete!"
    echo ""
    echo "Agent Studio Backend is now installed in: $INSTALL_DIR"
    echo "Target user: $ACTUAL_USER"
    echo "macOS Version: $MACOS_VERSION ($ARCH_NAME)"
    echo ""
    echo "🚀 macOS Startup Commands:"
    echo "  $INSTALL_DIR/start.sh    # Start the backend"
    echo "  $INSTALL_DIR/stop.sh     # Stop the backend"
    echo ""
    echo "⚙️  Configuration file:"
    echo "  $USER_HOME/.agent-studio-config/config.env"
    echo ""
    echo "✨ Access the application at:"
    echo "   https://agentstudio-frontend.vercel.app/"
    echo ""
    echo "💡 After starting the backend, configure the backend URL in the web interface:"
    echo "   Settings → API Configuration → http://localhost:4936"
    echo ""
    echo "📁 Slides directory: $USER_HOME/slides"
    echo ""
    echo "🍎 macOS-specific notes:"
    echo "  • Uses Homebrew by default when available"
    echo "  • Supports both Apple Silicon and Intel Macs"
    echo "  • Xcode Command Line Tools are required for compilation"
    echo "  • NVM is used as fallback if Homebrew fails"
    echo ""
    echo "For more information, visit:"
    echo "  https://github.com/$GITHUB_REPO"
    echo ""

    # Clean up temp files at the end
    cleanup
}

# Handle script interruption
trap cleanup INT TERM

# Run main function
main "$@"