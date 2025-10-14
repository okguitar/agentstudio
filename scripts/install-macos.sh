#!/bin/bash

# Agent Studio macOS Installation Script with launchd Support
# Optimized for macOS with Apple Silicon support and user-level service management

set -e

# Configuration
GITHUB_REPO="git-men/agentstudio"
GITHUB_BRANCH="main"
SERVICE_NAME="com.agentstudio.daemon"
SERVICE_PORT="4936"

# Detect if running via pipe (for non-interactive mode)
if [ -p /dev/stdin ] || [ ! -t 0 ]; then
    PIPED_INSTALL="true"
fi

# Always use current user for macOS installation
ACTUAL_USER="$USER"
USER_HOME="$HOME"
ACTUAL_UID=$(id -u)
ACTUAL_GID=$(id -g)

# Unified storage structure - all files in ~/.agent-studio
BASE_DIR="$USER_HOME/.agent-studio"
APP_DIR="$BASE_DIR/app"
CONFIG_DIR="$BASE_DIR/config"
LOGS_DIR="$BASE_DIR/logs"
BACKUP_DIR="$BASE_DIR/backup"
DATA_DIR="$BASE_DIR/data"

# Legacy compatibility - INSTALL_DIR now points to app directory
INSTALL_DIR="$APP_DIR"
LAUNCHD_DIR="$USER_HOME/Library/LaunchAgents"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
macos_log() {
    echo -e "${BLUE}[MACOS]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Display header
display_header() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║    Agent Studio macOS Installer         ║${NC}"
    echo -e "${PURPLE}║                                          ║${NC}"
    echo -e "${PURPLE}║  Features:                              ║${NC}"
    echo -e "${PURPLE}║  • Apple Silicon and Intel Macs         ║${NC}"
    echo -e "${PURPLE}║  • User-level installation              ║${NC}"
    echo -e "${PURPLE}║  • launchd service management           ║${NC}"
    echo -e "${PURPLE}║  • Homebrew package management          ║${NC}"
    echo -e "${PURPLE}║  • Auto-start at login                  ║${NC}"
    echo -e "${PURPLE}║  • Xcode Command Line Tools             ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# Validate directory paths
validate_paths() {
    macos_log "Validating installation paths..."

    if [ -z "$USER_HOME" ] || [ "$USER_HOME" = "/" ]; then
        error "Invalid user home directory: $USER_HOME"
        exit 1
    fi

    if [ -z "$BASE_DIR" ]; then
        error "Base directory path is empty"
        exit 1
    fi

    macos_log "User home: $USER_HOME"
    macos_log "Base directory: $BASE_DIR"
    macos_log "App directory: $APP_DIR"
    success "Path validation completed"
}

# Detect macOS system information
detect_system_info() {
    macos_log "Detecting macOS system information..."

    # Get macOS version
    MACOS_VERSION=$(sw_vers -productVersion)
    ARCH=$(uname -m)

    if [[ "$ARCH" == "arm64" ]]; then
        ARCH_NAME="Apple Silicon"
    else
        ARCH_NAME="Intel"
    fi

    macos_log "Architecture: $ARCH_NAME ($ARCH)"
    macos_log "macOS Version: $MACOS_VERSION"
    macos_log "Installing Agent Studio to unified directory: $BASE_DIR"
    macos_log "Target user: $ACTUAL_USER (UID: $ACTUAL_UID)"
    macos_log "App directory: $APP_DIR"
    macos_log "Config directory: $CONFIG_DIR"
    macos_log "Logs directory: $LOGS_DIR"
    macos_log "Backup directory: $BACKUP_DIR"
}

# Check if Xcode Command Line Tools are installed
check_xcode_tools() {
    macos_log "Checking for Xcode Command Line Tools..."

    if xcode-select -p >/dev/null 2>&1; then
        success "Xcode Command Line Tools are installed"
    else
        warn "Xcode Command Line Tools not found. Installing..."
        xcode-select --install

        # Wait for user to complete installation
        macos_log "Waiting for Xcode Command Line Tools installation..."
        macos_log "Press Enter when installation is complete, or wait 30 seconds..."
        read -t 30 || true

        # Check again
        if ! xcode-select -p >/dev/null 2>&1; then
            error "Xcode Command Line Tools installation failed or incomplete"
            macos_log "Please install manually with: xcode-select --install"
            exit 1
        fi
        success "Xcode Command Line Tools installed successfully"
    fi
}

# Install Homebrew if not present
install_homebrew() {
    macos_log "Checking for Homebrew..."

    if command -v brew >/dev/null 2>&1; then
        success "Homebrew is installed: $(brew --version | head -n1)"
        return 0
    fi

    warn "Homebrew not found. Installing Homebrew..."

    # Install Homebrew
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add Homebrew to PATH for current session
    if [[ "$ARCH" == "arm64" ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        eval "$(/usr/local/bin/brew shellenv)"
    fi

    success "Homebrew installed successfully"
}

# Install Node.js using Homebrew or NVM fallback
install_nodejs() {
    macos_log "Checking for Node.js..."

    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        success "Node.js is installed: $NODE_VERSION"

        # Check if version is adequate (need Node 18+)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 18 ]; then
            warn "Node.js version $NODE_VERSION is too old. Installing newer version..."
            install_nodejs_fresh
        fi
        return 0
    fi

    install_nodejs_fresh
}

install_nodejs_fresh() {
    macos_log "Installing Node.js..."

    # Try Homebrew first
    if command -v brew >/dev/null 2>&1; then
        macos_log "Installing Node.js via Homebrew..."
        brew install node

        if command -v node >/dev/null 2>&1; then
            success "Node.js installed via Homebrew: $(node --version)"
            return 0
        fi
    fi

    # Fallback to NVM
    install_nvm_and_node
}

install_nvm_and_node() {
    macos_log "Installing Node.js via NVM (fallback method)..."

    # Install NVM
    NVM_DIR="$USER_HOME/.nvm"

    # Create NVM directory
    mkdir -p "$NVM_DIR"

    # Download and install NVM
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

    # Source NVM
    export NVM_DIR="$NVM_DIR"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

    # Install latest LTS Node.js
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        . "$NVM_DIR/nvm.sh"
        nvm install --lts
        nvm use --lts

        if command -v node >/dev/null 2>&1; then
            success "Node.js installed via NVM: $(node --version)"
            return 0
        fi
    fi

    error "Failed to install Node.js via NVM"
    exit 1
}

# Install pnpm
install_pnpm() {
    macos_log "Installing pnpm..."

    if command -v pnpm >/dev/null 2>&1; then
        success "pnpm is already installed: $(pnpm --version)"
        return 0
    fi

    # Install pnpm using npm
    if command -v npm >/dev/null 2>&1; then
        npm install -g pnpm

        if command -v pnpm >/dev/null 2>&1; then
            success "pnpm installed successfully: $(pnpm --version)"
            return 0
        fi
    fi

    # Fallback: install using curl
    curl -fsSL https://get.pnpm.io/install.sh | sh -

    # Add pnpm to PATH for current session
    PNPM_HOME="$USER_HOME/.local/share/pnpm"
    export PATH="$PNPM_HOME:$PATH"

    if command -v pnpm >/dev/null 2>&1; then
        success "pnpm installed via curl: $(pnpm --version)"
        return 0
    fi

    warn "pnpm installation may have failed - will use npm as fallback"
}

# Cleanup function
cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        macos_log "Cleaning up temporary files..."
        rm -rf "$TEMP_DIR"
        success "Cleanup completed"
    fi
}

# Download Agent Studio directly to app directory
download_agent_studio() {
    macos_log "Downloading Agent Studio directly to $APP_DIR..."

    # Create app directory
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"

    # Download the repository directly to app directory
    if command -v git >/dev/null 2>&1; then
        git clone "https://github.com/$GITHUB_REPO.git" .
        git checkout "$GITHUB_BRANCH"
        success "Repository cloned via Git to $APP_DIR"
    else
        # Fallback to downloading zip file
        macos_log "Git not found, downloading zip file..."
        TEMP_DOWNLOAD="/tmp/agent-studio-download-$(date +%s)"
        mkdir -p "$TEMP_DOWNLOAD"
        cd "$TEMP_DOWNLOAD"
        curl -L "https://github.com/$GITHUB_REPO/archive/refs/heads/$GITHUB_BRANCH.zip" -o agentstudio.zip
        unzip -q agentstudio.zip
        mv "agentstudio-$GITHUB_BRANCH"/* .
        cp -r ./* "$APP_DIR/"
        cd "$APP_DIR"
        rm -rf "$TEMP_DOWNLOAD" agentstudio.zip
        success "Repository downloaded via curl to $APP_DIR"
    fi
}

# Run installation
run_installation() {
    macos_log "Installing Agent Studio with unified structure..."

    # Create unified directory structure
    macos_log "Creating unified directory structure..."
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$LOGS_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$DATA_DIR/slides"
    mkdir -p "$LAUNCHD_DIR"

    # Change to app directory
    cd "$APP_DIR"

    # Install dependencies
    macos_log "Installing dependencies..."

    # Use appropriate package manager
    if command -v pnpm >/dev/null 2>&1; then
        pnpm install
    elif command -v npm >/dev/null 2>&1; then
        npm install
    else
        error "No package manager found (npm or pnpm)"
        exit 1
    fi

    # Build the application
    macos_log "Building Agent Studio..."
    if command -v pnpm >/dev/null 2>&1; then
        # Build backend
        macos_log "Building backend..."
        if pnpm run build:backend 2>/dev/null; then
            macos_log "Backend build successful"

            # Build frontend
            macos_log "Building frontend..."
            if pnpm run build:frontend 2>/dev/null; then
                success "Full build successful - both backend and frontend ready"
            else
                warn "Frontend build failed - only backend will be available"
            fi
        else
            error "Backend build failed"
            exit 1
        fi
    else
        # Build backend
        macos_log "Building backend..."
        if npm run build:backend 2>/dev/null; then
            macos_log "Backend build successful"

            # Build frontend
            macos_log "Building frontend..."
            if npm run build:frontend 2>/dev/null; then
                success "Full build successful - both backend and frontend ready"
            else
                warn "Frontend build failed - only backend will be available"
            fi
        else
            error "Backend build failed"
            exit 1
        fi
    fi

    # Create launchd service
    create_launchd_service

    # Create management scripts
    create_management_scripts

    # Create configuration
    create_config

    success "Agent Studio installed successfully!"
}

# Create launchd service configuration
create_launchd_service() {
    macos_log "Creating launchd service configuration..."

    # Create launchd plist file
    cat > "$LAUNCHD_DIR/$SERVICE_NAME.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$SERVICE_NAME</string>

    <key>ProgramArguments</key>
    <array>
        <string>$APP_DIR/start.sh</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$APP_DIR</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>$LOGS_DIR/agent-studio-out.log</string>

    <key>StandardErrorPath</key>
    <string>$LOGS_DIR/agent-studio-err.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>

    <key>ProcessType</key>
    <string>Interactive</string>

    <key>UserName</key>
    <string>$ACTUAL_USER</string>

    <key>HomeDirectory</key>
    <string>$USER_HOME</string>
</dict>
</plist>
EOF

    # Create the start script for launchd
    cat > "$INSTALL_DIR/start.sh" << 'EOF'
#!/bin/bash

# Agent Studio start script for launchd
# This script is called by launchd

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment
export NODE_ENV=production
export PORT=${PORT:-4936}
export SLIDES_DIR="$HOME/.agent-studio/data/slides"

# Add common paths
export PATH="$PATH:/usr/local/bin:/usr/bin:/bin"

# Add user-specific Node.js paths (for fnm and pnpm)
export PATH="$HOME/Library/pnpm:$PATH"
export PATH="$HOME/.local/share/pnpm:$PATH"

# Dynamic fnm Node.js version detection
add_fnm_node_paths() {
    local fnm_dir="$HOME/.local/share/fnm/node-versions"
    if [ -d "$fnm_dir" ]; then
        # Find all Node.js versions, sort by version number (latest first)
        for version_dir in $(ls -1r "$fnm_dir" 2>/dev/null); do
            local bin_dir="$fnm_dir/$version_dir/installation/bin"
            if [ -d "$bin_dir" ] && [ -x "$bin_dir/node" ]; then
                export PATH="$bin_dir:$PATH"
                break  # Use the first (latest) version found
            fi
        done
    fi
}

# Try to add fnm paths
add_fnm_node_paths

# Detect Node.js paths
if [ -f "/opt/homebrew/bin/node" ]; then
    export PATH="/opt/homebrew/bin:$PATH"
elif [ -f "/usr/local/bin/node" ]; then
    export PATH="/usr/local/bin:$PATH"
fi

# Add NVM paths if available
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    . "$HOME/.nvm/nvm.sh"
fi

# Try to initialize fnm if available
if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --use-on-cd)"
elif [ -f "$HOME/.fnm/fnm" ]; then
    eval "$($HOME/.fnm/fnm env --use-on-cd)"
fi

# Set Node.js options based on architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
    export NODE_OPTIONS="--max-old-space-size=4096"
else
    export NODE_OPTIONS="--max-old-space-size=2048"
fi

echo "🍎 Starting Agent Studio Backend on macOS (Production Mode)..."
echo "📂 Working directory: $(pwd)"
echo "🌐 Backend port: 4936"
echo "📑 Slides directory: $HOME/.agent-studio/data/slides"
echo ""
echo "✨ Access the application at:"
echo "   http://localhost:4936/ (Full application with frontend)"
echo "   https://agentstudio-frontend.vercel.app/ (External frontend alternative)"
echo ""
echo "💡 Local installation provides complete application with:"
echo "   • Frontend interface at http://localhost:4936/"
echo "   • Backend API at http://localhost:4936/api/*"
echo "   • Slides static files at http://localhost:4936/slides/*"
echo ""

# Start the application
if command -v pnpm >/dev/null 2>&1; then
    if [ -f "backend/dist/index.js" ]; then
        exec pnpm start
    else
        exec pnpm run dev:backend
    fi
elif command -v npm >/dev/null 2>&1; then
    if [ -f "backend/dist/index.js" ]; then
        exec npm start
    else
        exec npm run dev:backend
    fi
else
    echo "Error: Neither pnpm nor npm found in PATH" >&2
    exit 1
fi
EOF

    chmod +x "$APP_DIR/start.sh"

    success "launchd service configuration created"
}

# Create management scripts
create_management_scripts() {
    macos_log "Creating management scripts..."

    # Create status script
    cat > "$INSTALL_DIR/status.sh" << 'EOF'
#!/bin/bash

# Agent Studio status script

SERVICE_NAME="com.agentstudio.daemon"

if launchctl list | grep -q "$SERVICE_NAME"; then
    echo "Agent Studio service is loaded"

    # Get PID if available
    PID=$(launchctl list | grep "$SERVICE_NAME" | awk '{print $1}')
    if [ "$PID" != "-" ] && [ -n "$PID" ]; then
        echo "Process ID: $PID"
        if ps -p "$PID" >/dev/null 2>&1; then
            echo "Status: Running"
            PORT=${PORT:-4936}
            if lsof -i ":$PORT" >/dev/null 2>&1; then
                echo "Listening on port: $PORT"
                echo "Web interface: http://localhost:$PORT"
            else
                echo "Warning: Not listening on expected port $PORT"
            fi
        else
            echo "Status: Process not found (may be restarting)"
        fi
    else
        echo "Status: Starting..."
    fi
else
    echo "Agent Studio service is not loaded"
fi

echo ""
echo "Service management commands:"
echo "  Load service:   launchctl load ~/Library/LaunchAgents/com.agentstudio.daemon.plist"
echo "  Unload service: launchctl unload ~/Library/LaunchAgents/com.agentstudio.daemon.plist"
echo "  Start service:  launchctl start com.agentstudio.daemon"
echo "  Stop service:   launchctl stop com.agentstudio.daemon"
echo "  Restart:        launchctl kickstart -k gui/$(id -u)/com.agentstudio.daemon"
EOF

    # Create management aliases
    cat > "$INSTALL_DIR/agent-studio" << 'EOF'
#!/bin/bash

# Agent Studio management script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="com.agentstudio.daemon"

case "$1" in
    start)
        echo "Starting Agent Studio service..."
        launchctl load ~/Library/LaunchAgents/com.agentstudio.daemon.plist
        launchctl start "$SERVICE_NAME"
        echo "Service started"
        ;;
    stop)
        echo "Stopping Agent Studio service..."
        launchctl stop "$SERVICE_NAME"
        echo "Service stopped"
        ;;
    restart)
        echo "Restarting Agent Studio service..."
        launchctl kickstart -k "gui/$(id -u)/$SERVICE_NAME"
        echo "Service restarted"
        ;;
    status)
        "$SCRIPT_DIR/status.sh"
        ;;
    reload)
        echo "Reloading Agent Studio service configuration..."
        launchctl unload ~/Library/LaunchAgents/"$SERVICE_NAME".plist
        launchctl load ~/Library/LaunchAgents/"$SERVICE_NAME".plist
        echo "Service configuration reloaded"
        ;;
    logs)
        echo "Agent Studio logs:"
        echo "Standard output:"
        tail -f ~/.agent-studio/logs/agent-studio-out.log
        ;;
    errors)
        echo "Agent Studio error logs:"
        echo "Standard error:"
        tail -f ~/.agent-studio/logs/agent-studio-err.log
        ;;
    uninstall)
        echo "Uninstalling Agent Studio service..."
        launchctl unload ~/Library/LaunchAgents/"$SERVICE_NAME".plist 2>/dev/null || true
        rm -f ~/Library/LaunchAgents/"$SERVICE_NAME".plist
        echo "Service uninstalled"
        ;;
    *)
        echo "Agent Studio Management Script"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|reload|logs|errors|uninstall}"
        echo ""
        echo "Commands:"
        echo "  start     - Start the service"
        echo "  stop      - Stop the service"
        echo "  restart   - Restart the service"
        echo "  status    - Show service status"
        echo "  reload    - Reload service configuration"
        echo "  logs      - Follow standard output logs"
        echo "  errors    - Follow error logs"
        echo "  uninstall - Remove the service"
        ;;
esac
EOF

    # Make scripts executable
    chmod +x "$INSTALL_DIR/status.sh"
    chmod +x "$INSTALL_DIR/agent-studio"

    # Create symlink for easy access
    mkdir -p "$USER_HOME/.local/bin"
    ln -sf "$INSTALL_DIR/agent-studio" "$USER_HOME/.local/bin/agent-studio"

    success "Management scripts created"
}

# Create configuration file
create_config() {
    macos_log "Creating configuration files..."

    # Create default configuration
    cat > "$CONFIG_DIR/config.json" << EOF
{
    "port": $SERVICE_PORT,
    "host": "0.0.0.0",
    "logLevel": "info",
    "slidesDir": "$DATA_DIR/slides",
    "maxFileSize": "10MB",
    "allowedFileTypes": [".txt", ".md", ".js", ".ts", ".json", ".html", ".css"],
    "macosOptimizations": {
        "appleSilicon": true,
        "memoryLimit": "4GB",
        "cpuOptimization": true,
        "launchdManaged": true
    },
    "service": {
        "name": "$SERVICE_NAME",
        "autoStart": true,
        "keepAlive": true
    }
}
EOF

    success "Configuration created successfully"
}

# Load the launchd service
load_service() {
    macos_log "Loading Agent Studio service into launchd..."

    # Load the service
    launchctl load "$LAUNCHD_DIR/$SERVICE_NAME.plist"

    if [ $? -eq 0 ]; then
        success "Service loaded successfully"

        # Start the service
        launchctl start "$SERVICE_NAME"

        if [ $? -eq 0 ]; then
            success "Service started successfully"
        else
            warn "Service loaded but failed to start. Check logs for details."
        fi
    else
        error "Failed to load service"
        return 1
    fi
}

# Display installation summary
display_summary() {
    echo
    success "🎉 Agent Studio installation completed successfully!"
    echo
    info "Installation Details:"
    info "  • Base directory: $BASE_DIR"
    info "  • User: $ACTUAL_USER"
    info "  • Architecture: $ARCH_NAME"
    info "  • Service: $SERVICE_NAME"
    info "  • App directory: $APP_DIR"
    info "  • Configuration: $CONFIG_DIR/config.json"
    info "  • Logs: $LOGS_DIR/"
    info "  • Slides directory: $DATA_DIR/slides"
    info "  • Launch agent: $LAUNCHD_DIR/$SERVICE_NAME.plist"
    echo
    info "🔧 Service Management:"
    info "  • Start service:     launchctl start $SERVICE_NAME"
    info "  • Stop service:      launchctl stop $SERVICE_NAME"
    info "  • Restart service:   launchctl kickstart -k gui/$(id -u)/$SERVICE_NAME"
    info "  • Check status:      launchctl list | grep $SERVICE_NAME"
    info "  • View logs:         tail -f $LOGS_DIR/agent-studio-out.log"
    info "  • View errors:       tail -f $LOGS_DIR/agent-studio-err.log"
    echo
    info "🛠️  Management Script:"
    info "  • Quick management:  $APP_DIR/agent-studio {start|stop|restart|status|logs}"
    info "  • Or symlink:        $USER_HOME/.local/bin/agent-studio"
    echo
    info "🌐 Web Interface:"
    info "  • URL: http://localhost:$SERVICE_PORT"
    echo
    warn "Notes:"
    warn "  • Service will auto-start at login"
    warn "  • Service runs in user space (no sudo required)"
    warn "  • Logs are stored in $LOGS_DIR/"
    warn "  • Make sure port $SERVICE_PORT is available"
    echo

    # Show current status
    if [ -z "$PIPED_INSTALL" ]; then
        info "Checking service status..."
        sleep 2
        "$APP_DIR/status.sh"
    else
        info "To check service status, run:"
        info "  $APP_DIR/agent-studio status"
    fi
}

# Main installation flow
main() {
    # Set up error handling
    trap cleanup EXIT

    display_header
    validate_paths
    detect_system_info
    check_xcode_tools
    install_homebrew
    install_nodejs
    install_pnpm
    download_agent_studio
    run_installation

    # Load the service
    if load_service; then
        display_summary
    else
        error "Installation completed but service failed to load"
        info "You can manually load the service with:"
        info "  launchctl load $LAUNCHD_DIR/$SERVICE_NAME.plist"
        info "  launchctl start $SERVICE_NAME"
    fi
}

# Check if script is being sourced or executed
if [ "${BASH_SOURCE[0]}" = "${0}" ] || [ -n "$PIPED_INSTALL" ]; then
    main "$@"
fi