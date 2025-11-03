#!/bin/bash

# Agent Studio Linux Installation Script
# Optimized for Linux distributions with enhanced package manager support

set -e

# Configuration
GITHUB_REPO="okguitar/agentstudio"
GITHUB_BRANCH="main"
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

# Unified storage structure - all files in ~/.agent-studio
BASE_DIR="$USER_HOME/.agent-studio"
APP_DIR="$BASE_DIR/app"
CONFIG_DIR="$BASE_DIR/config"
LOGS_DIR="$BASE_DIR/logs"
BACKUP_DIR="$BASE_DIR/backup"
DATA_DIR="$BASE_DIR/data"

# Legacy compatibility - INSTALL_DIR now points to app directory
INSTALL_DIR="$APP_DIR"

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

# Validate directory paths
validate_paths() {
    linux_log "Validating installation paths..."

    if [ -z "$USER_HOME" ] || [ "$USER_HOME" = "/" ]; then
        error "Invalid user home directory: $USER_HOME"
        exit 1
    fi

    if [ -z "$BASE_DIR" ]; then
        error "Base directory path is empty"
        exit 1
    fi

    linux_log "User home: $USER_HOME"
    linux_log "Base directory: $BASE_DIR"
    linux_log "App directory: $APP_DIR"
    success "Path validation completed"
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
    linux_log "Installing Agent Studio to unified directory: $BASE_DIR"
    linux_log "Target user: $ACTUAL_USER (UID: $ACTUAL_UID)"
    linux_log "App directory: $APP_DIR"
    linux_log "Config directory: $CONFIG_DIR"
    linux_log "Logs directory: $LOGS_DIR"
    linux_log "Backup directory: $BACKUP_DIR"

    # Create unified directory structure
    mkdir -p "$BASE_DIR"

    # Check if previous installation exists and clean up
    if [ -d "$APP_DIR" ]; then
        linux_log "Found existing app directory, cleaning up..."
        rm -rf "$APP_DIR"
    fi

    # Ensure parent directory exists and has correct permissions
    mkdir -p "$USER_HOME"
    if [ "$ACTUAL_USER" != "root" ] && [ "$EUID" -eq 0 ]; then
        chown -R "$ACTUAL_UID:$ACTUAL_GID" "$BASE_DIR"
    fi
}

# Download and extract Agent Studio directly to app directory
download_agent_studio() {
    linux_log "Downloading Agent Studio directly to $APP_DIR..."

    # Check if app directory exists and handle accordingly
    if [ -d "$APP_DIR" ] && [ "$(ls -A "$APP_DIR" 2>/dev/null)" ]; then
        linux_log "App directory already exists. Checking if it's a git repository..."
        
        if [ -d "$APP_DIR/.git" ]; then
            linux_log "Existing git repository found. Updating..."
            cd "$APP_DIR"
            git fetch origin
            git checkout "$GITHUB_BRANCH"
            git pull origin "$GITHUB_BRANCH"
            success "Repository updated via Git"
        else
            warn "App directory exists but is not a git repository. Backing up..."
            mkdir -p "$BACKUP_DIR"
            BACKUP_NAME="app-backup-$(date +%Y%m%d-%H%M%S)"
            mv "$APP_DIR" "$BACKUP_DIR/$BACKUP_NAME"
            success "Existing app backed up to $BACKUP_DIR/$BACKUP_NAME"
            
            # Create fresh app directory
            mkdir -p "$APP_DIR"
            cd "$APP_DIR"
            
            if command -v git >/dev/null 2>&1; then
                git clone "https://github.com/$GITHUB_REPO.git" .
                git checkout "$GITHUB_BRANCH"
                success "Agent Studio cloned via Git to $APP_DIR"
            fi
        fi
    else
        # Create app directory
        mkdir -p "$APP_DIR"
        cd "$APP_DIR"

        # Download the repository directly to app directory
        if command -v git >/dev/null 2>&1; then
            git clone "https://github.com/$GITHUB_REPO.git" .
            git checkout "$GITHUB_BRANCH"
            success "Agent Studio cloned via Git to $APP_DIR"
        fi
    fi
    
    # Fallback to tarball download if git clone failed or git is not available
    if [ ! -f "$APP_DIR/package.json" ]; then
        # Fallback to downloading tarball
        linux_log "Git clone failed or git not available, downloading tarball..."
        TEMP_DOWNLOAD="/tmp/agent-studio-download-$(date +%s)"
        mkdir -p "$TEMP_DOWNLOAD"
        cd "$TEMP_DOWNLOAD"
        curl -fsSL "https://github.com/$GITHUB_REPO/archive/$GITHUB_BRANCH.tar.gz" | tar -xz --strip-components=1
        cp -r ./* "$APP_DIR/"
        cd "$APP_DIR"
        rm -rf "$TEMP_DOWNLOAD"
        success "Agent Studio downloaded via curl to $APP_DIR"
    fi

    # Set correct ownership if running as root
    if [ "$ACTUAL_USER" != "root" ] && [ "$EUID" -eq 0 ]; then
        chown -R "$ACTUAL_UID:$ACTUAL_GID" "$APP_DIR"
    fi
}

# Run the main installation
run_installation() {
    linux_log "Installing Agent Studio with unified structure..."

    # Create unified directory structure
    linux_log "Creating unified directory structure..."
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$LOGS_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$DATA_DIR/slides"

    # Change to app directory
    cd "$APP_DIR"

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
            linux_log "Backend build successful"

            # Try to build frontend with increased memory
            linux_log "Attempting to build frontend..."
            export NODE_OPTIONS="--max-old-space-size=4096"
            if pnpm run build:frontend 2>/dev/null; then
                BUILD_SUCCESS=true
                success "Full build successful - will run in production mode"
            else
                linux_log "Frontend build failed - will run in production mode with backend only"
                BUILD_SUCCESS=true
            fi
        else
            linux_log "Backend build failed or skipped - will run in development mode"
            BUILD_SUCCESS=false
        fi
    else
        linux_log "Using npm for installation..."

        # Install all dependencies (including dev dependencies)
        npm install

        # Try to build backend - if it fails, continue with development mode
        linux_log "Attempting to build backend..."
        if npm run build:backend 2>/dev/null; then
            linux_log "Backend build successful"

            # Try to build frontend with increased memory
            linux_log "Attempting to build frontend..."
            export NODE_OPTIONS="--max-old-space-size=4096"
            if npm run build:frontend 2>/dev/null; then
                BUILD_SUCCESS=true
                success "Full build successful - will run in production mode"
            else
                linux_log "Frontend build failed - will run in production mode with backend only"
                BUILD_SUCCESS=true
            fi
        else
            linux_log "Backend build failed or skipped - will run in development mode"
            BUILD_SUCCESS=false
        fi
    fi

    # Create start script optimized for Linux
    linux_log "Creating Linux-optimized start script..."
    
    # Common function definitions for start script
    local COMMON_FUNCTIONS='
# Function to get port from config.json
get_config_port() {
    local config_file="$HOME/.agent-studio/config/config.json"
    if [ -f "$config_file" ]; then
        # Try to extract port from config.json using common tools
        if command -v python3 >/dev/null 2>&1; then
            python3 -c "import json; print(json.load(open('"'"'$config_file'"'"')).get('"'"'port'"'"', 4936))" 2>/dev/null
        elif command -v python >/dev/null 2>&1; then
            python -c "import json; print(json.load(open('"'"'$config_file'"'"')).get('"'"'port'"'"', 4936))" 2>/dev/null
        elif command -v jq >/dev/null 2>&1; then
            jq -r ".port // 4936" "$config_file" 2>/dev/null
        else
            # Fallback to grep/sed
            grep -o "\"port\":[[:space:]]*[0-9]*" "$config_file" 2>/dev/null | sed "s/.*://; s/[[:space:]]*//" || echo "4936"
        fi
    else
        echo "4936"
    fi
}

# Get port - use environment variable if set, otherwise get from config
get_actual_port() {
    if [ -n "$PORT" ]; then
        echo "$PORT"
    else
        get_config_port
    fi
}
'

    # Common header for both modes
    local COMMON_HEADER='#!/bin/bash

# Linux Agent Studio Startup Script
# Load NVM if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Add Node.js paths
if command -v nvm >/dev/null 2>&1; then
    export PATH="$HOME/.nvm/versions/node/$(nvm current 2>/dev/null || echo '"'"'system'"'"')/bin:$PATH" 2>/dev/null || true
fi
export PATH="/usr/local/bin:/usr/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"
'

    if [ "$BUILD_SUCCESS" = true ]; then
        # Production mode
        cat > "$INSTALL_DIR/start.sh" << EOF
$COMMON_HEADER
$COMMON_FUNCTIONS

echo "🐧 Starting Agent Studio Backend on Linux (Production Mode)..."
cd "\$HOME/.agent-studio/app"
export NODE_ENV=production
export SLIDES_DIR="\$HOME/.agent-studio/data/slides"

# Set port from config if not already set
if [ -z "\$PORT" ]; then
    export PORT=\$(get_config_port)
fi

ACTUAL_PORT=\$(get_actual_port)

echo "📂 Working directory: \$(pwd)"
echo "🌐 Backend port: \$ACTUAL_PORT"
echo "📑 Slides directory: \$HOME/.agent-studio/data/slides"
echo "🖥️  Distribution: $DISTRO_NAME"
echo "🏗️  Architecture: $ARCH_NAME"
echo ""
echo "✨ Access the application at:"
echo "   http://localhost:\$ACTUAL_PORT/ (Full application with frontend)"
echo "   https://agentstudio-frontend.vercel.app/ (External frontend alternative)"
echo ""
echo "💡 Local installation provides complete application with:"
echo "   • Frontend interface at http://localhost:\$ACTUAL_PORT/"
echo "   • Backend API at http://localhost:\$ACTUAL_PORT/api/*"
echo "   • Slides static files at http://localhost:\$ACTUAL_PORT/slides/*"
echo ""
node backend/dist/index.js
EOF
    else
        # Development mode
        cat > "$INSTALL_DIR/start.sh" << EOF
$COMMON_HEADER
$COMMON_FUNCTIONS

echo "🐧 Starting Agent Studio Backend on Linux (Development Mode)..."
cd "\$HOME/.agent-studio/app"
export NODE_ENV=development
export SLIDES_DIR="\$HOME/.agent-studio/data/slides"

# Set port from config if not already set
if [ -z "\$PORT" ]; then
    export PORT=\$(get_config_port)
fi

ACTUAL_PORT=\$(get_actual_port)

echo "📂 Working directory: \$(pwd)"
echo "🌐 Backend port: \$ACTUAL_PORT"
echo "📑 Slides directory: \$HOME/.agent-studio/data/slides"
echo "🖥️  Distribution: $DISTRO_NAME"
echo "🏗️  Architecture: $ARCH_NAME"
echo ""
echo "✨ Access the application at:"
echo "   https://agentstudio-frontend.vercel.app/"
echo ""
echo "💡 Configure the backend URL in the web interface:"
echo "   Settings → API Configuration → http://localhost:\$ACTUAL_PORT"
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
    cat > "$CONFIG_DIR/config.env" << EOF
# Agent Studio Configuration for Linux
NODE_ENV=production
PORT=$SERVICE_PORT
SLIDES_DIR=$DATA_DIR/slides

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
    # Only clean up temporary downloads, not the main installation
    rm -rf /tmp/agent-studio-download-* 2>/dev/null || true
    success "Cleanup completed"
}

# Install systemd service (Linux only)
install_systemd_service() {
    if [ "$EUID" -ne 0 ]; then
        return 0
    fi

    # Check if systemd is available
    if ! command -v systemctl >/dev/null 2>&1; then
        linux_log "systemd is not available on this system, skipping service installation"
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
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=$SERVICE_PORT
Environment=SLIDES_DIR=$DATA_DIR/slides
ExecStart=/bin/bash $APP_DIR/start.sh
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
    echo "  $CONFIG_DIR/config.env"
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

# ========== 更新功能：开始 ==========

# 检测是否已安装
is_already_installed() {
    if [ -d "$APP_DIR" ] && [ -d "$APP_DIR/.git" ] && [ -f "$APP_DIR/package.json" ]; then
        return 0  # 已安装
    else
        return 1  # 未安装
    fi
}

# 获取配置的端口
get_configured_port() {
    local CONFIG_FILE="$CONFIG_DIR/config.json"
    if [ -f "$CONFIG_FILE" ]; then
        if command -v python3 >/dev/null 2>&1; then
            python3 -c "import json; print(json.load(open('$CONFIG_FILE')).get('port', 4936))" 2>/dev/null || echo "4936"
        elif command -v python >/dev/null 2>&1; then
            python -c "import json; print(json.load(open('$CONFIG_FILE')).get('port', 4936))" 2>/dev/null || echo "4936"
        elif command -v jq >/dev/null 2>&1; then
            jq -r '.port // 4936' "$CONFIG_FILE" 2>/dev/null || echo "4936"
        else
            grep -o '"port":[[:space:]]*[0-9]*' "$CONFIG_FILE" 2>/dev/null | sed 's/.*://; s/[[:space:]]*//' || echo "4936"
        fi
    else
        echo "4936"
    fi
}

# 创建更新备份
create_update_backup() {
    linux_log "创建更新备份..."
    
    local BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    local UPDATE_BACKUP="$BACKUP_DIR/backup-$BACKUP_TIMESTAMP"
    
    mkdir -p "$UPDATE_BACKUP"
    
    # 备份配置
    if [ -d "$CONFIG_DIR" ] && [ "$(ls -A $CONFIG_DIR 2>/dev/null)" ]; then
        cp -r "$CONFIG_DIR" "$UPDATE_BACKUP/config"
    fi
    
    # 备份数据
    if [ -d "$DATA_DIR" ] && [ "$(ls -A $DATA_DIR 2>/dev/null)" ]; then
        cp -r "$DATA_DIR" "$UPDATE_BACKUP/data"
    fi
    
    # 记录版本信息
    cd "$APP_DIR"
    cat > "$UPDATE_BACKUP/version_info.txt" << EOF
更新时间: $(date)
更新前版本: $(git describe --tags --always 2>/dev/null || echo "unknown")
更新前提交: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
备份位置: $UPDATE_BACKUP
EOF
    
    success "备份已创建: $UPDATE_BACKUP"
}

# 停止运行的服务
stop_running_service() {
    linux_log "停止现有服务..."
    
    local SERVICE_STOPPED=false
    
    # 尝试 systemd
    if command -v systemctl >/dev/null 2>&1; then
        if systemctl is-active --quiet agent-studio 2>/dev/null; then
            linux_log "通过 systemd 停止服务..."
            if [ "$EUID" -eq 0 ]; then
                systemctl stop agent-studio 2>/dev/null && SERVICE_STOPPED=true
            else
                sudo systemctl stop agent-studio 2>/dev/null && SERVICE_STOPPED=true
            fi
        fi
    fi
    
    # 尝试 stop.sh
    if [ "$SERVICE_STOPPED" = "false" ] && [ -f "$APP_DIR/stop.sh" ]; then
        linux_log "通过 stop.sh 停止服务..."
        "$APP_DIR/stop.sh" 2>/dev/null && SERVICE_STOPPED=true
    fi
    
    # 最后手段：pkill
    if [ "$SERVICE_STOPPED" = "false" ]; then
        linux_log "使用进程终止..."
        pkill -f "agent-studio" 2>/dev/null || true
    fi
    
    # 检查端口是否释放
    local PORT=$(get_configured_port)
    if command -v lsof >/dev/null 2>&1; then
        if lsof -i :$PORT >/dev/null 2>&1; then
            warn "端口 $PORT 仍在使用，等待释放..."
            sleep 3
            
            # 如果还在使用，强制终止
            if lsof -i :$PORT >/dev/null 2>&1; then
                warn "强制终止端口 $PORT 上的进程..."
                lsof -ti :$PORT | xargs kill -15 2>/dev/null || true
                sleep 2
            fi
        fi
    fi
    
    success "服务已停止"
}

# 从 Git 更新代码
update_code_from_git() {
    linux_log "更新代码..."
    
    cd "$APP_DIR"
    
    # 保存本地修改
    if [ -n "$(git status --porcelain)" ]; then
        warn "检测到本地修改，正在保存..."
        if ! git stash push -m "Auto-stash before update $(date)"; then
            error "无法保存本地修改"
            error "请手动处理: cd $APP_DIR && git status"
            exit 1
        fi
        log "本地修改已保存，更新后可用 'git stash pop' 恢复"
    fi
    
    # 更新代码
    if ! git fetch origin; then
        error "无法从远程仓库获取更新"
        exit 1
    fi
    
    if ! git checkout "$GITHUB_BRANCH"; then
        error "无法切换到分支 $GITHUB_BRANCH"
        exit 1
    fi
    
    if ! git pull origin "$GITHUB_BRANCH"; then
        error "无法拉取最新代码"
        exit 1
    fi
    
    local NEW_VERSION=$(git describe --tags --always 2>/dev/null || echo "unknown")
    success "代码已更新到: $NEW_VERSION"
}

# 执行更新
perform_update() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║      开始更新 Agent Studio               ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    
    # 1. 创建备份
    create_update_backup
    
    # 2. 停止服务
    stop_running_service
    
    # 3. 更新代码
    update_code_from_git
    
    # 4. 更新依赖和构建
    run_installation
    
    # 5. 配置服务（如果需要）
    configure_service
    
    # 6. 启动服务
    start_service
    
    # 7. 显示成功信息
    display_update_success
}

# 显示更新成功信息
display_update_success() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║        更新成功完成！                     ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    
    cd "$APP_DIR"
    local NEW_VERSION=$(git describe --tags --always 2>/dev/null || echo "unknown")
    local PORT=$(get_configured_port)
    
    success "Agent Studio 已更新到版本: $NEW_VERSION"
    echo ""
    log "🌐 访问应用: http://localhost:$PORT"
    log "📁 安装位置: $APP_DIR"
    log "⚙️  配置文件: $CONFIG_DIR/config.json"
    log "📋 日志目录: $LOGS_DIR/"
    echo ""
    log "服务管理命令:"
    if [ "$EUID" -eq 0 ] && [ -f "/etc/systemd/system/agent-studio.service" ]; then
        log "  sudo systemctl {start|stop|restart|status} agent-studio"
    fi
    log "  $APP_DIR/start.sh    # 启动服务"
    log "  $APP_DIR/stop.sh     # 停止服务"
    echo ""
}

# ========== 更新功能：结束 ==========

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

        if [ -f "$APP_DIR/start.sh" ]; then
            linux_log "Running start script..."
            # Use nohup to detach from terminal and redirect output to logs
            nohup bash "$APP_DIR/start.sh" > "$LOGS_DIR/agent-studio.log" 2>&1 </dev/null &
            
            # Disown the process to prevent it from being killed when shell exits
            disown

            # Wait a moment and check if service started
            sleep 5
            # Try to get port from config, fallback to default
            if [ -f "$CONFIG_DIR/config.json" ]; then
                ACTUAL_PORT=$(grep -o '"port":[[:space:]]*[0-9]*' "$CONFIG_DIR/config.json" 2>/dev/null | sed 's/.*://; s/[[:space:]]*//' || echo "4936")
            else
                ACTUAL_PORT="$SERVICE_PORT"
            fi
            if curl -s http://localhost:$ACTUAL_PORT/api/health >/dev/null 2>&1; then
                success "Backend started successfully!"
                echo ""
                echo "✨ Access the application at:"
                echo "   https://agentstudio-frontend.vercel.app/"
                echo ""
                echo "💡 Configure the backend URL in the web interface:"
                echo "   Settings → API Configuration → http://localhost:$ACTUAL_PORT"
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
        echo "  $APP_DIR/start.sh"
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
    
    # ========== 检测更新模式 ==========
    if is_already_installed; then
        echo ""
        echo "╔══════════════════════════════════════════╗"
        echo "║    检测到已安装的 Agent Studio           ║"
        echo "╚══════════════════════════════════════════╝"
        echo ""
        
        cd "$APP_DIR"
        CURRENT_VERSION=$(git describe --tags --always 2>/dev/null || echo "unknown")
        CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
        
        log "安装位置: $APP_DIR"
        log "当前版本: $CURRENT_VERSION"
        echo ""
        
        # 检查是否有更新
        linux_log "检查更新..."
        if git fetch origin --quiet 2>/dev/null; then
            LATEST_COMMIT=$(git rev-parse origin/$GITHUB_BRANCH 2>/dev/null || echo "unknown")
            
            if [ "$LATEST_COMMIT" = "$CURRENT_COMMIT" ]; then
                success "✅ 已是最新版本！"
            else
                warn "🔔 发现新版本可用"
                local COMMITS_BEHIND=$(git rev-list --count HEAD..origin/$GITHUB_BRANCH 2>/dev/null || echo "0")
                if [ "$COMMITS_BEHIND" != "0" ]; then
                    log "落后 $COMMITS_BEHIND 个提交"
                fi
            fi
        else
            warn "⚠️  无法检查更新（网络问题或仓库问题）"
        fi
        
        echo ""
        if [ ! -t 0 ] || [ -n "$PIPED_INSTALL" ]; then
            linux_log "非交互模式，自动执行更新..."
        else
            read -p "是否继续执行更新？(Y/n): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Nn]$ ]]; then
                log "取消更新"
                exit 0
            fi
        fi
        
        # 执行更新
        perform_update
        exit 0
    fi
    # ========== 更新模式检测结束 ==========
    
    # 全新安装流程
    log "执行全新安装..."
    validate_paths
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
    echo "Agent Studio is now installed with unified structure in: $BASE_DIR"
    echo "├── app/          - Application source code"
    echo "├── config/       - Configuration files"
    echo "├── logs/         - Log files"
    echo "├── backup/       - Backup files"
    echo "└── data/         - User data (slides, etc.)"
    echo ""
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
    echo "  $APP_DIR/start.sh    # Start the backend"
    echo "  $APP_DIR/stop.sh     # Stop the backend"
    echo ""
    echo "⚙️  Configuration file:"
    echo "  $CONFIG_DIR/config.env"
    echo ""
    echo "✨ Access the application at:"
    echo "   https://agentstudio.cc/dashboard"
    echo ""
    echo "💡 After starting the backend, configure the backend URL in the web interface:"
    echo "   Settings → API Configuration → http://localhost:$ACTUAL_PORT"
    echo ""
    echo "📁 Slides directory: $DATA_DIR/slides"
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