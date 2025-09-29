#!/bin/bash

# Agent Studio Backend Installation Script
# This script installs and configures the Agent Studio backend as a system service

set -e

# Configuration
SERVICE_NAME="agent-studio"
INSTALL_DIR="/opt/agent-studio"
USER_NAME="agent-studio"
SERVICE_PORT="4936"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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
        if command -v systemctl >/dev/null 2>&1; then
            SERVICE_MANAGER="systemd"
        else
            SERVICE_MANAGER="manual"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        SERVICE_MANAGER="launchd"
    else
        error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    log "Detected OS: $OS with service manager: $SERVICE_MANAGER"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm/pnpm
    if command -v pnpm >/dev/null 2>&1; then
        PACKAGE_MANAGER="pnpm"
    elif command -v npm >/dev/null 2>&1; then
        PACKAGE_MANAGER="npm"
    else
        error "Neither npm nor pnpm is available"
        exit 1
    fi
    
    success "Dependencies check passed. Using $PACKAGE_MANAGER"
}

# Create user and directories
setup_user_and_dirs() {
    log "Setting up user and directories..."
    
    # Create user if not exists
    if ! id "$USER_NAME" >/dev/null 2>&1; then
        if [[ "$OS" == "linux" ]]; then
            useradd -r -m -s /bin/bash "$USER_NAME"
        elif [[ "$OS" == "macos" ]]; then
            # Create user on macOS
            dscl . -create /Users/$USER_NAME
            dscl . -create /Users/$USER_NAME UserShell /bin/bash
            dscl . -create /Users/$USER_NAME RealName "Agent Studio Service"
            dscl . -create /Users/$USER_NAME UniqueID 501
            dscl . -create /Users/$USER_NAME PrimaryGroupID 20
            dscl . -create /Users/$USER_NAME NFSHomeDirectory /Users/$USER_NAME
            createhomedir -c > /dev/null
        fi
        success "Created user: $USER_NAME"
    else
        log "User $USER_NAME already exists"
    fi
    
    # Create directories
    mkdir -p "$INSTALL_DIR"
    mkdir -p "/var/log/$SERVICE_NAME"
    mkdir -p "/etc/$SERVICE_NAME"
    
    # Create slides directory if it doesn't exist
    if [ ! -d "/opt/slides" ]; then
        mkdir -p "/opt/slides"
        chown "$USER_NAME:$USER_NAME" "/opt/slides"
    fi
    
    success "Directories created"
}

# Install application
install_app() {
    log "Installing application..."
    
    # Copy files to install directory
    cp -r ./* "$INSTALL_DIR/"
    cd "$INSTALL_DIR"
    
    # Install dependencies
    log "Installing dependencies..."
    if [[ "$PACKAGE_MANAGER" == "pnpm" ]]; then
        sudo -u "$USER_NAME" pnpm install --prod
    else
        sudo -u "$USER_NAME" npm install --production
    fi
    
    # Build the application
    log "Building application..."
    if [[ "$PACKAGE_MANAGER" == "pnpm" ]]; then
        sudo -u "$USER_NAME" pnpm run build:backend
    else
        sudo -u "$USER_NAME" npm run build:backend
    fi
    
    # Set permissions
    chown -R "$USER_NAME:$USER_NAME" "$INSTALL_DIR"
    chown -R "$USER_NAME:$USER_NAME" "/var/log/$SERVICE_NAME"
    
    success "Application installed"
}

# Create environment file
create_env_file() {
    log "Creating environment configuration..."
    
    ENV_FILE="/etc/$SERVICE_NAME/config.env"
    
    cat > "$ENV_FILE" << EOF
# Agent Studio Backend Configuration
NODE_ENV=production
PORT=$SERVICE_PORT
SLIDES_DIR=/opt/slides

# AI Provider Configuration (uncomment and configure one)
# OPENAI_API_KEY=your_openai_api_key_here
# ANTHROPIC_API_KEY=your_anthropic_api_key_here

# CORS Configuration (optional)
# CORS_ORIGINS=https://your-frontend.vercel.app,https://custom-domain.com
EOF
    
    chown "$USER_NAME:$USER_NAME" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    
    success "Environment file created at $ENV_FILE"
    warn "Please edit $ENV_FILE to configure your AI API keys"
}

# Install systemd service (Linux)
install_systemd_service() {
    log "Installing systemd service..."
    
    cp "configs/systemd/$SERVICE_NAME.service" "/etc/systemd/system/$SERVICE_NAME.service"
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    success "Systemd service installed and enabled"
}

# Install launchd service (macOS)
install_launchd_service() {
    log "Installing launchd service..."
    
    PLIST_FILE="/Library/LaunchDaemons/com.agent-studio.backend.plist"
    cp "configs/launchd/com.agent-studio.backend.plist" "$PLIST_FILE"
    chown root:wheel "$PLIST_FILE"
    chmod 644 "$PLIST_FILE"
    launchctl load "$PLIST_FILE"
    
    success "Launchd service installed and loaded"
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    if [[ "$OS" == "linux" ]]; then
        cp "configs/logrotate.d/$SERVICE_NAME" "/etc/logrotate.d/$SERVICE_NAME"
    elif [[ "$OS" == "macos" ]]; then
        # Create a simple log rotation script for macOS
        cp "scripts/macos-logrotate.sh" "/usr/local/bin/$SERVICE_NAME-logrotate"
        chmod +x "/usr/local/bin/$SERVICE_NAME-logrotate"
        
        # Add to crontab
        (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/$SERVICE_NAME-logrotate") | crontab -
    fi
    
    success "Log rotation configured"
}

# Install service management script
install_service_script() {
    log "Installing service management script..."
    
    cp "scripts/agent-studio-service" "/usr/local/bin/$SERVICE_NAME"
    chmod +x "/usr/local/bin/$SERVICE_NAME"
    
    success "Service management script installed at /usr/local/bin/$SERVICE_NAME"
}

# Main installation function
main() {
    echo "=== Agent Studio Backend Installation ==="
    echo ""
    
    check_root
    detect_os
    check_dependencies
    setup_user_and_dirs
    install_app
    create_env_file
    
    # Install service based on OS
    if [[ "$SERVICE_MANAGER" == "systemd" ]]; then
        install_systemd_service
    elif [[ "$SERVICE_MANAGER" == "launchd" ]]; then
        install_launchd_service
    fi
    
    setup_log_rotation
    install_service_script
    
    echo ""
    echo "=== Installation Complete ==="
    echo ""
    success "Agent Studio Backend has been installed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Start the service: $SERVICE_NAME start"
    echo "2. Check status: $SERVICE_NAME status"
    echo "3. View logs: $SERVICE_NAME logs"
    echo "4. Optional: Configure API keys: $SERVICE_NAME config"
    echo ""
    echo "The service will be available at: http://localhost:$SERVICE_PORT"
    echo "Logs are stored in: /var/log/$SERVICE_NAME/"
    echo ""
    echo "Service is ready to use! API keys can be configured later if needed."
}

# Run main function
main "$@"