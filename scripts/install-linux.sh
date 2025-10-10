#!/bin/bash

# Agent Studio Linux Installation Script
# Optimized for Linux distributions with enhanced package manager support

set -e

# Configuration
GITHUB_REPO="git-men/agentstudio"
GITHUB_BRANCH="main"
TEMP_DIR="/tmp/agent-studio-linux-$(date +%s)"
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
ORANGE='\033[0;33m'
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

linux_log() {
    echo -e "${ORANGE}[LINUX]${NC} $1"
}

# Detect Linux distribution and architecture
detect_linux_info() {
    linux_log "Detecting Linux system information..."

    # Architecture detection
    ARCH=$(uname -m)
    case "$ARCH" in
        "x86_64")
            ARCH_NAME="x86_64"
            ;;
        "aarch64" | "arm64")
            ARCH_NAME="ARM64"
            ;;
        "armv7l")
            ARCH_NAME="ARM32"
            ;;
        *)
            warn "Unsupported architecture: $ARCH, but will attempt installation"
            ARCH_NAME="$ARCH"
            ;;
    esac

    # Distribution detection
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO="$ID"
        DISTRO_VERSION="$VERSION_ID"
        DISTRO_NAME="$PRETTY_NAME"
    elif [ -f /etc/redhat-release ]; then
        DISTRO="rhel"
        DISTRO_VERSION=$(cat /etc/redhat-release | grep -oE '[0-9]+\.[0-9]+' | head -1)
        DISTRO_NAME="Red Hat Enterprise Linux"
    elif [ -f /etc/debian_version ]; then
        DISTRO="debian"
        DISTRO_VERSION=$(cat /etc/debian_version)
        DISTRO_NAME="Debian"
    else
        DISTRO="unknown"
        DISTRO_VERSION="unknown"
        DISTRO_NAME="Unknown Linux Distribution"
    fi

    # Package manager detection
    if command -v apt-get >/dev/null 2>&1; then
        PKG_MANAGER="apt"
        PKG_UPDATE="apt-get update"
        PKG_INSTALL="apt-get install -y"
    elif command -v yum >/dev/null 2>&1; then
        PKG_MANAGER="yum"
        PKG_UPDATE="yum update -y"
        PKG_INSTALL="yum install -y"
    elif command -v dnf >/dev/null 2>&1; then
        PKG_MANAGER="dnf"
        PKG_UPDATE="dnf update -y"
        PKG_INSTALL="dnf install -y"
    elif command -v pacman >/dev/null 2>&1; then
        PKG_MANAGER="pacman"
        PKG_UPDATE="pacman -Sy --noconfirm"
        PKG_INSTALL="pacman -S --noconfirm"
    elif command -v zypper >/dev/null 2>&1; then
        PKG_MANAGER="zypper"
        PKG_UPDATE="zypper refresh -y"
        PKG_INSTALL="zypper install -y"
    else
        PKG_MANAGER="unknown"
        warn "Unknown package manager, will use NVM for Node.js installation"
    fi

    linux_log "Architecture: $ARCH_NAME ($ARCH)"
    linux_log "Distribution: $DISTRO_NAME ($DISTRO $DISTRO_VERSION)"
    linux_log "Package Manager: $PKG_MANAGER"
}

# Check GLIBC version and determine compatible Node.js version
check_glibc_version() {
    # Check GLIBC version - using more portable regex, redirect logs to stderr
    local GLIBC_VERSION=$(ldd --version 2>/dev/null | head -n1 | sed -n 's/.*[^0-9]\([0-9][0-9]*\.[0-9][0-9]*\)$/\1/p')
    if [ -z "$GLIBC_VERSION" ]; then
        GLIBC_VERSION="0.0"
    fi
    local GLIBC_MAJOR=$(echo "$GLIBC_VERSION" | cut -d. -f1)
    local GLIBC_MINOR=$(echo "$GLIBC_VERSION" | cut -d. -f2)

    # Output logs to stderr to avoid mixing with return value
    linux_log "Detected GLIBC version: $GLIBC_VERSION" >&2

    # Node.js version requirements:
    # v22+: GLIBC 2.28+
    # v20+: GLIBC 2.28+
    # v18: GLIBC 2.27+
    # v16: GLIBC 2.17+

    if [ "$GLIBC_MAJOR" -gt 2 ] || ([ "$GLIBC_MAJOR" -eq 2 ] && [ "$GLIBC_MINOR" -ge 28 ]); then
        # GLIBC 2.28+: Use latest LTS (Node.js 22)
        linux_log "GLIBC version is sufficient for latest Node.js LTS" >&2
        echo "lts/*"
    elif [ "$GLIBC_MAJOR" -eq 2 ] && [ "$GLIBC_MINOR" -ge 27 ]; then
        # GLIBC 2.27: Use Node.js 18
        warn "GLIBC version requires Node.js 18 (older LTS)" >&2
        echo "18"
    elif [ "$GLIBC_MAJOR" -eq 2 ] && [ "$GLIBC_MINOR" -ge 17 ]; then
        # GLIBC 2.17-2.26: Use Node.js 16
        warn "GLIBC version requires Node.js 16 (older LTS)" >&2
        echo "16"
    else
        # Very old GLIBC: warn user
        error "GLIBC version $GLIBC_VERSION is too old for modern Node.js" >&2
        error "Please upgrade your system or use a newer distribution" >&2
        return 1
    fi
}

# Check if we have sudo access or are running as root
check_sudo_access() {
    if [ "$EUID" -eq 0 ]; then
        return 0  # Already root
    elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
        return 0  # Have sudo access
    else
        return 1  # No sudo access
    fi
}

# Install system dependencies
install_system_deps() {
    linux_log "Installing system dependencies..."

    if [ "$PKG_MANAGER" = "unknown" ]; then
        linux_log "Unknown package manager, skipping system dependencies"
        return 0
    fi

    # Check if we can install packages
    if ! check_sudo_access; then
        warn "No sudo access available, skipping system dependencies installation"
        return 0
    fi

    case "$PKG_MANAGER" in
        "apt")
            linux_log "Installing dependencies with apt..."
            if [ "$EUID" -eq 0 ]; then
                $PKG_UPDATE
                $PKG_INSTALL curl wget gnupg2 build-essential
            else
                sudo $PKG_UPDATE
                sudo $PKG_INSTALL curl wget gnupg2 build-essential
            fi
            ;;
        "yum"|"dnf")
            linux_log "Installing dependencies with $PKG_MANAGER..."
            if [ "$EUID" -eq 0 ]; then
                $PKG_UPDATE
                $PKG_INSTALL curl wget gcc-c++ make
            else
                sudo $PKG_UPDATE
                sudo $PKG_INSTALL curl wget gcc-c++ make
            fi
            ;;
        "pacman")
            linux_log "Installing dependencies with pacman..."
            if [ "$EUID" -eq 0 ]; then
                $PKG_UPDATE
                $PKG_INSTALL curl wget base-devel
            else
                sudo $PKG_UPDATE
                sudo $PKG_INSTALL curl wget base-devel
            fi
            ;;
        "zypper")
            linux_log "Installing dependencies with zypper..."
            if [ "$EUID" -eq 0 ]; then
                $PKG_UPDATE
                $PKG_INSTALL curl wget gcc-c++ make
            else
                sudo $PKG_UPDATE
                sudo $PKG_INSTALL curl wget gcc-c++ make
            fi
            ;;
    esac

    success "System dependencies installed"
}

# Refresh shell environment for Linux
refresh_shell_env() {
    linux_log "Refreshing shell environment..."

    # Source common profile files
    [ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc" 2>/dev/null || true
    [ -f "$HOME/.bash_profile" ] && source "$HOME/.bash_profile" 2>/dev/null || true
    [ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc" 2>/dev/null || true
    [ -f "$HOME/.profile" ] && source "$HOME/.profile" 2>/dev/null || true

    # Source NVM if available
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" 2>/dev/null || true
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" 2>/dev/null || true

    # Update PATH to include common Node.js installation paths
    if command -v nvm >/dev/null 2>&1; then
        export PATH="$HOME/.nvm/versions/node/$(nvm current 2>/dev/null || echo 'system')/bin:$PATH" 2>/dev/null || true
    fi
    export PATH="/usr/local/bin:/usr/bin:$PATH"
    export PATH="$HOME/.local/bin:$PATH"
}

# Install Node.js via package manager
install_nodejs_pkg_manager() {
    linux_log "Installing Node.js via $PKG_MANAGER..."

    if [ "$PKG_MANAGER" = "unknown" ]; then
        error "Unknown package manager"
        return 1
    fi

    # Check GLIBC and determine compatible Node.js version
    local NODE_VERSION=$(check_glibc_version)
    if [ -z "$NODE_VERSION" ]; then
        error "Cannot determine compatible Node.js version"
        return 1
    fi

    # If not latest LTS, warn user and fall back to NVM
    if [ "$NODE_VERSION" != "lts/*" ]; then
        warn "System requires Node.js $NODE_VERSION due to GLIBC constraints"
        warn "Using NVM for precise version control..."
        return 1
    fi

    case "$PKG_MANAGER" in
        "apt")
            linux_log "Using apt package manager..."
            # Add NodeSource repository
            if [ "$EUID" -eq 0 ]; then
                if ! curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -; then
                    error "Failed to add NodeSource repository"
                    return 1
                fi
                if ! apt-get install -y nodejs; then
                    error "Failed to install Node.js via apt"
                    return 1
                fi
            else
                if ! curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -; then
                    error "Failed to add NodeSource repository"
                    return 1
                fi
                if ! sudo apt-get install -y nodejs; then
                    error "Failed to install Node.js via apt"
                    return 1
                fi
            fi
            ;;
        "yum"|"dnf")
            linux_log "Using $PKG_MANAGER package manager..."
            # Add NodeSource repository
            if [ "$EUID" -eq 0 ]; then
                if ! curl -fsSL https://rpm.nodesource.com/setup_lts.x | bash -; then
                    error "Failed to add NodeSource repository"
                    return 1
                fi
                if command -v dnf >/dev/null 2>&1; then
                    if ! dnf install -y nodejs npm; then
                        error "Failed to install Node.js via dnf"
                        return 1
                    fi
                else
                    if ! yum install -y nodejs npm; then
                        error "Failed to install Node.js via yum"
                        return 1
                    fi
                fi
            else
                if ! curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -; then
                    error "Failed to add NodeSource repository"
                    return 1
                fi
                if command -v dnf >/dev/null 2>&1; then
                    if ! sudo dnf install -y nodejs npm; then
                        error "Failed to install Node.js via dnf"
                        return 1
                    fi
                else
                    if ! sudo yum install -y nodejs npm; then
                        error "Failed to install Node.js via yum"
                        return 1
                    fi
                fi
            fi
            ;;
        "pacman")
            linux_log "Using pacman package manager..."
            if [ "$EUID" -eq 0 ]; then
                if ! pacman -S --noconfirm nodejs npm; then
                    error "Failed to install Node.js via pacman"
                    return 1
                fi
            else
                if ! sudo pacman -S --noconfirm nodejs npm; then
                    error "Failed to install Node.js via pacman"
                    return 1
                fi
            fi
            ;;
        "zypper")
            linux_log "Using zypper package manager..."
            # Add NodeSource repository for SUSE
            if [ "$EUID" -eq 0 ]; then
                if ! zypper ar -f https://rpm.nodesource.com/setup_lts.x nodesource; then
                    error "Failed to add NodeSource repository"
                    return 1
                fi
                if ! zypper install -y nodejs npm; then
                    error "Failed to install Node.js via zypper"
                    return 1
                fi
            else
                if ! sudo zypper ar -f https://rpm.nodesource.com/setup_lts.x nodesource; then
                    error "Failed to add NodeSource repository"
                    return 1
                fi
                if ! sudo zypper install -y nodejs npm; then
                    error "Failed to install Node.js via zypper"
                    return 1
                fi
            fi
            ;;
        *)
            error "Unsupported package manager: $PKG_MANAGER"
            return 1
            ;;
    esac

    success "Node.js installed successfully via $PKG_MANAGER"
}

# Install Node.js via NVM
install_nodejs_nvm() {
    linux_log "Installing Node.js via NVM..."

    # Check if curl is available
    if ! command -v curl >/dev/null 2>&1; then
        error "curl is required but not found. Please install curl first."
        return 1
    fi

    # Download and install NVM
    linux_log "Downloading NVM..."
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

    # Determine compatible Node.js version based on GLIBC
    local NODE_VERSION=$(check_glibc_version)
    if [ -z "$NODE_VERSION" ]; then
        return 1
    fi

    # Install determined Node.js version
    linux_log "Installing Node.js $NODE_VERSION..."
    if ! nvm install "$NODE_VERSION"; then
        error "Failed to install Node.js via NVM"
        return 1
    fi

    nvm use "$NODE_VERSION"
    nvm alias default "$NODE_VERSION"

    success "Node.js installed successfully via NVM"
}

# Auto-install Node.js on Linux
auto_install_nodejs() {
    echo ""
    linux_log "Node.js is required but not found on your system."

    # Check if we're running in a non-interactive environment
    if [ ! -t 0 ] || [ -n "$PIPED_INSTALL" ]; then
        linux_log "Non-interactive mode detected - proceeding with automatic Node.js installation"
    else
        read -p "Would you like to install Node.js automatically? (Y/n): " -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Nn]$ ]]; then
            error "Node.js is required to continue. Please install Node.js 18 or later first."
            error "Visit: https://nodejs.org/ or install via your package manager"
            exit 1
        fi
    fi

    # Try package manager first if we have sudo access
    if [ "$PKG_MANAGER" != "unknown" ] && check_sudo_access; then
        linux_log "Trying package manager installation..."
        if install_nodejs_pkg_manager; then
            return 0
        else
            warn "Package manager installation failed, trying NVM..."
        fi
    else
        linux_log "Cannot use system package manager, using NVM..."
    fi

    # Fallback to NVM
    if install_nodejs_nvm; then
        return 0
    else
        error "All Node.js installation methods failed"
        error "Please install Node.js manually using your package manager or from https://nodejs.org/"
        exit 1
    fi
}

# Check Node.js installation
check_nodejs() {
    linux_log "Checking Node.js installation..."

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
        linux_log "Node.js is not installed."
        auto_install_nodejs
    fi
}

# Install pnpm
install_pnpm() {
    linux_log "Installing pnpm..."

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
        linux_log "Non-interactive mode detected - installing pnpm automatically"
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
            linux_log "Will use npm instead of pnpm"
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
    if [ "$PKG_MANAGER" != "unknown" ] && check_sudo_access; then
        error "You can install it with: "
        case "$PKG_MANAGER" in
            "apt")
                error "  sudo apt-get install git"
                ;;
            "yum"|"dnf")
                error "  sudo $PKG_MANAGER install git"
                ;;
            "pacman")
                error "  sudo pacman -S git"
                ;;
            "zypper")
                error "  sudo zypper install git"
                ;;
        esac
    fi
    exit 1
}

# Check installation environment
check_environment() {
    linux_log "Installing Agent Studio to user directory: $INSTALL_DIR"
    linux_log "Target user: $ACTUAL_USER (UID: $ACTUAL_UID)"

    # Check if previous installation exists and is writable
    if [ -d "$INSTALL_DIR" ]; then
        linux_log "Found existing installation directory..."
        linux_log "Cleaning existing installation..."
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
    linux_log "Downloading Agent Studio..."

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
    linux_log "Installing Agent Studio to user directory..."

    # Create directories
    linux_log "Creating directories..."
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$USER_HOME/.agent-studio-logs"
    mkdir -p "$USER_HOME/.agent-studio-config"
    mkdir -p "$USER_HOME/slides"

    # Copy files
    linux_log "Copying application files..."
    cd "$TEMP_DIR"
    cp -r ./* "$INSTALL_DIR/"

    # Set correct ownership if running as root
    if [ "$ACTUAL_USER" != "root" ] && [ "$EUID" -eq 0 ]; then
        chown -R "$ACTUAL_UID:$ACTUAL_GID" "$INSTALL_DIR"
    fi

    cd "$INSTALL_DIR"

    # Install dependencies and try to build
    linux_log "Installing dependencies..."
    BUILD_SUCCESS=false

    # Set CI environment variable to handle TTY issues
    export CI=true

    if command -v pnpm >/dev/null 2>&1; then
        linux_log "Using pnpm for installation..."

        # Install all dependencies (including dev dependencies)
        pnpm install

        # Try to build backend - if it fails, continue with development mode
        linux_log "Attempting to build backend..."
        if pnpm run build:backend 2>/dev/null; then
            BUILD_SUCCESS=true
            success "Build successful - will run in production mode"
        else
            linux_log "Build failed or skipped - will run in development mode"
            BUILD_SUCCESS=false
        fi
    else
        linux_log "Using npm for installation..."

        # Install all dependencies (including dev dependencies)
        npm install

        # Try to build backend - if it fails, continue with development mode
        linux_log "Attempting to build backend..."
        if npm run build:backend 2>/dev/null; then
            BUILD_SUCCESS=true
            success "Build successful - will run in production mode"
        else
            linux_log "Build failed or skipped - will run in development mode"
            BUILD_SUCCESS=false
        fi
    fi

    # Create start script optimized for Linux
    linux_log "Creating Linux-optimized start script..."
    if [ "$BUILD_SUCCESS" = true ]; then
        # Production mode
        cat > "$INSTALL_DIR/start.sh" << EOF
#!/bin/bash

# Linux Agent Studio Startup Script
# Load NVM if available
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && \. "\$NVM_DIR/nvm.sh"

# Add Node.js paths
if command -v nvm >/dev/null 2>&1; then
    export PATH="\$HOME/.nvm/versions/node/\$(nvm current 2>/dev/null || echo 'system')/bin:\$PATH" 2>/dev/null || true
fi
export PATH="/usr/local/bin:/usr/bin:\$PATH"
export PATH="\$HOME/.local/bin:\$PATH"

echo "🐧 Starting Agent Studio Backend on Linux (Production Mode)..."
cd "\$HOME/.agent-studio"
export NODE_ENV=production
export PORT=4936
export SLIDES_DIR="\$HOME/slides"
echo "📂 Working directory: \$(pwd)"
echo "🌐 Backend port: 4936"
echo "📑 Slides directory: \$HOME/slides"
echo "🖥️  Distribution: $DISTRO_NAME"
echo "🏗️  Architecture: $ARCH_NAME"
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

# Linux Agent Studio Startup Script
# Load NVM if available
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && \. "\$NVM_DIR/nvm.sh"

# Add Node.js paths
if command -v nvm >/dev/null 2>&1; then
    export PATH="\$HOME/.nvm/versions/node/\$(nvm current 2>/dev/null || echo 'system')/bin:\$PATH" 2>/dev/null || true
fi
export PATH="/usr/local/bin:/usr/bin:\$PATH"
export PATH="\$HOME/.local/bin:\$PATH"

echo "🐧 Starting Agent Studio Backend on Linux (Development Mode)..."
cd "\$HOME/.agent-studio"
export NODE_ENV=development
export PORT=4936
export SLIDES_DIR="\$HOME/slides"
echo "📂 Working directory: \$(pwd)"
echo "🌐 Backend port: 4936"
echo "📑 Slides directory: \$HOME/slides"
echo "🖥️  Distribution: $DISTRO_NAME"
echo "🏗️  Architecture: $ARCH_NAME"
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
echo "🛑 Stopping Agent Studio Backend on Linux..."
pkill -f "node backend" || echo "No production process running"
pkill -f "tsx backend" || echo "No development process running"
EOF

    chmod +x "$INSTALL_DIR/stop.sh"

    # Create Linux-specific config file
    linux_log "Creating Linux configuration file..."
    cat > "$USER_HOME/.agent-studio-config/config.env" << EOF
# Agent Studio Configuration for Linux
NODE_ENV=production
PORT=$SERVICE_PORT
SLIDES_DIR=$USER_HOME/slides

# Linux-specific settings
LINUX_DISTRO=$DISTRO
LINUX_VERSION=$DISTRO_VERSION
LINUX_ARCH=$ARCH

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
    linux_log "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    success "Cleanup completed"
}

# Install systemd service (Linux only)
install_systemd_service() {
    if [ "$EUID" -ne 0 ]; then
        return 0
    fi

    echo ""
    echo "=== Systemd Service Configuration ==="
    echo ""

    # Check if we're running in a non-interactive environment
    if [ ! -t 0 ] || [ -n "$PIPED_INSTALL" ]; then
        linux_log "Non-interactive mode detected - installing systemd service automatically"
    else
        read -p "Would you like to install Agent Studio as a system service? (y/N): " -n 1 -r
        echo ""

        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi

    linux_log "Installing systemd service..."

    # Create systemd service file
    local SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Agent Studio Backend
After=network.target

[Service]
Type=simple
User=$ACTUAL_USER
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
Environment=PORT=$SERVICE_PORT
Environment=SLIDES_DIR=$USER_HOME/slides
ExecStart=/bin/bash $INSTALL_DIR/start.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME.service"

    success "Systemd service installed and enabled"
    echo ""
    echo "Service commands:"
    echo "  sudo systemctl start $SERVICE_NAME"
    echo "  sudo systemctl stop $SERVICE_NAME"
    echo "  sudo systemctl restart $SERVICE_NAME"
    echo "  sudo systemctl status $SERVICE_NAME"
    echo "  sudo journalctl -u $SERVICE_NAME -f"
    echo ""

    # Check if we're running in a non-interactive environment
    if [ ! -t 0 ] || [ -n "$PIPED_INSTALL" ]; then
        linux_log "Non-interactive mode detected - starting systemd service automatically"
        systemctl start "$SERVICE_NAME"
        sleep 3
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            success "Service started successfully!"
        else
            error "Service failed to start. Check logs: journalctl -u $SERVICE_NAME"
        fi
    else
        read -p "Would you like to start the service now? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            systemctl start "$SERVICE_NAME"
            sleep 3
            if systemctl is-active --quiet "$SERVICE_NAME"; then
                success "Service started successfully!"
            else
                error "Service failed to start. Check logs: journalctl -u $SERVICE_NAME"
            fi
        fi
    fi
}

# Service configuration for Linux
configure_service() {
    echo ""
    echo "=== Linux Service Configuration ==="
    echo ""
    success "Agent Studio Backend is ready to use on Linux!"
    echo ""
    echo "The service can run without additional configuration."
    echo "API keys can be added later if needed by editing:"
    echo "  $USER_HOME/.agent-studio-config/config.env"
    echo ""
    echo "🐧 Linux-specific features:"
    echo "  ✅ Optimized for $DISTRO_NAME"
    echo "  ✅ Supports multiple package managers"
    echo "  ✅ GLIBC compatibility checking"
    echo "  ✅ Systemd service integration"
    echo "  ✅ Multi-architecture support ($ARCH_NAME)"
    echo ""

    # Offer systemd service installation on Linux with root privileges
    if [ "$EUID" -eq 0 ]; then
        install_systemd_service
    fi
}

# Start the service
start_service() {
    # Skip if systemd service was already started
    if [ "$EUID" -eq 0 ] && [ -f "/etc/systemd/system/$SERVICE_NAME.service" ] && systemctl is-active --quiet "$SERVICE_NAME"; then
        return 0
    fi

    echo ""

    # Check if we're running in a non-interactive environment
    if [ ! -t 0 ] || [ -n "$PIPED_INSTALL" ]; then
        linux_log "Non-interactive mode detected - starting backend automatically"
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
        linux_log "Starting Agent Studio backend on Linux..."

        if [ -f "$INSTALL_DIR/start.sh" ]; then
            linux_log "Running start script..."
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
                echo "🐧 Running on $DISTRO_NAME ($ARCH_NAME)"
            else
                warn "Backend may still be starting up..."
                linux_log "You can check the status by running the start script again"
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
    echo "║    Agent Studio Linux Installer          ║"
    echo "║                                          ║"
    echo "║  Optimized for Linux with support for:   ║"
    echo "║  • Multiple distributions                ║"
    echo "║  • Various package managers              ║"
    echo "║  • GLIBC compatibility                   ║"
    echo "║  • Systemd service integration           ║"
    echo "║  • Multi-architecture support            ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""

    if [ -n "$SUDO_USER" ] && [ "$EUID" -eq 0 ] && [ "$ACTUAL_USER" != "root" ]; then
        warn "Running with sudo - installing for user: $ACTUAL_USER"
        echo ""
    elif [ "$EUID" -eq 0 ] && [ "$ACTUAL_USER" = "root" ]; then
        warn "Running as root - installing for root user"
        echo ""
    fi

    detect_linux_info
    check_environment
    install_system_deps
    check_git
    check_nodejs
    check_pnpm
    download_agent_studio
    run_installation
    configure_service
    start_service

    echo ""
    echo "🎉 Linux Installation Complete!"
    echo ""
    echo "Agent Studio Backend is now installed in: $INSTALL_DIR"
    echo "Target user: $ACTUAL_USER"
    echo "Distribution: $DISTRO_NAME ($DISTRO $DISTRO_VERSION)"
    echo "Architecture: $ARCH_NAME"
    echo "Package Manager: $PKG_MANAGER"
    echo ""

    # Check if systemd service was installed
    if [ "$EUID" -eq 0 ] && [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
        echo "🔧 System Service Installed:"
        echo "   ✅ Systemd service configured and enabled"
        echo "   ✅ Service will start automatically on boot"
        echo ""
        echo "🚀 Service Management Commands:"
        echo "   sudo systemctl start $SERVICE_NAME      # Start the service"
        echo "   sudo systemctl stop $SERVICE_NAME       # Stop the service"
        echo "   sudo systemctl restart $SERVICE_NAME    # Restart the service"
        echo "   sudo systemctl status $SERVICE_NAME     # Check service status"
        echo "   sudo journalctl -u $SERVICE_NAME -f     # View service logs"
        echo ""
        echo "📝 If the service is not already running, start it with:"
        echo "   sudo systemctl start $SERVICE_NAME"
        echo ""
    elif [ "$EUID" -eq 0 ]; then
        echo "🔧 System Service Available:"
        echo "   sudo systemctl start $SERVICE_NAME"
        echo "   sudo systemctl status $SERVICE_NAME"
        echo ""
    fi

    echo "🚀 Manual Startup Commands:"
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
    echo "🐧 Linux-specific notes:"
    echo "  • Uses system package manager when available"
    echo "  • Supports apt, yum, dnf, pacman, and zypper"
    echo "  • GLIBC compatibility checking ensures Node.js works"
    echo "  • Systemd service available for root users"
    echo "  • Supports x86_64, ARM64, and ARM32 architectures"
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