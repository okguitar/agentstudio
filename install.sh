#!/bin/bash

# Agent Studio Backend Installation Script
# This script installs and configures the Agent Studio backend as a system service

set -e

# Configuration
SERVICE_NAME="agent-studio"
USER_NAME="${SUDO_USER:-$USER}"
USER_HOME=$(eval echo "~$USER_NAME")
INSTALL_DIR="$USER_HOME/.agent-studio"
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

# Create directories
setup_directories() {
    log "Setting up directories..."
    
    # Create directories
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$USER_HOME/.agent-studio-logs"
    mkdir -p "$USER_HOME/.agent-studio-config"
    
    # Create slides directory in user home
    if [ ! -d "$USER_HOME/slides" ]; then
        mkdir -p "$USER_HOME/slides"
    fi
    
    # Set proper ownership to current user
    chown -R "$USER_NAME:staff" "$INSTALL_DIR" 2>/dev/null || chown -R "$USER_NAME" "$INSTALL_DIR"
    chown -R "$USER_NAME:staff" "$USER_HOME/.agent-studio-logs" 2>/dev/null || chown -R "$USER_NAME" "$USER_HOME/.agent-studio-logs"
    chown -R "$USER_NAME:staff" "$USER_HOME/.agent-studio-config" 2>/dev/null || chown -R "$USER_NAME" "$USER_HOME/.agent-studio-config"
    chown -R "$USER_NAME:staff" "$USER_HOME/slides" 2>/dev/null || chown -R "$USER_NAME" "$USER_HOME/slides"
    
    success "Directories created successfully"
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
    
    # Set permissions for user
    log "Setting file ownership..."
    chown -R "$USER_NAME:staff" "$INSTALL_DIR" 2>/dev/null || chown -R "$USER_NAME" "$INSTALL_DIR"
    
    success "Application installed"
}

# Create environment file
create_env_file() {
    log "Creating environment configuration..."
    
    ENV_FILE="$USER_HOME/.agent-studio-config/config.env"
    
    cat > "$ENV_FILE" << EOF
# Agent Studio Backend Configuration
NODE_ENV=production
PORT=$SERVICE_PORT
SLIDES_DIR=$USER_HOME/slides

# AI Provider Configuration (uncomment and configure one)
# OPENAI_API_KEY=your_openai_api_key_here
# ANTHROPIC_API_KEY=your_anthropic_api_key_here

# CORS Configuration (optional)
# CORS_ORIGINS=https://your-frontend.vercel.app,https://custom-domain.com
EOF
    
    # Set permissions for user
    chown "$USER_NAME:staff" "$ENV_FILE" 2>/dev/null || chown "$USER_NAME" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    
    success "Environment file created at $ENV_FILE"
    log "Configuration is optional - service is ready to use"
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
    
    # Create plist with current user settings
    cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.agent-studio.backend</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>backend/dist/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PORT</key>
        <string>$SERVICE_PORT</string>
        <key>SLIDES_DIR</key>
        <string>$USER_HOME/slides</string>
    </dict>
    <key>UserName</key>
    <string>$USER_NAME</string>
    <key>GroupName</key>
    <string>staff</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$USER_HOME/.agent-studio-logs/output.log</string>
    <key>StandardErrorPath</key>
    <string>$USER_HOME/.agent-studio-logs/error.log</string>
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>
EOF
    
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
    
    # Create service script with current user settings
    cat > "/usr/local/bin/$SERVICE_NAME" << 'SCRIPT_EOF'
#!/bin/bash

# Agent Studio Backend Service Management Script
# Auto-generated for current user

SERVICE_NAME="agent-studio"
USER_NAME="USER_NAME_PLACEHOLDER"
USER_HOME="USER_HOME_PLACEHOLDER"
INSTALL_DIR="$USER_HOME/.agent-studio"
CONFIG_FILE="$USER_HOME/.agent-studio-config/config.env"
LOG_DIR="$USER_HOME/.agent-studio-logs"

# Detect operating system and service manager
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
    echo "Unsupported operating system: $OSTYPE"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

show_help() {
    echo "Agent Studio Backend Service Management"
    echo "Usage: $0 {start|stop|restart|status|logs|config|uninstall}"
    echo ""
    echo "Commands:"
    echo "  start      Start the service"
    echo "  stop       Stop the service"
    echo "  restart    Restart the service"
    echo "  status     Show service status"
    echo "  logs       Show service logs (real-time)"
    echo "  config     Edit configuration file"
    echo "  uninstall  Remove the service"
    echo ""
    echo "Environment: $OS with $SERVICE_MANAGER"
}

start_service() {
    log "Starting $SERVICE_NAME..."
    
    if [[ "$SERVICE_MANAGER" == "systemd" ]]; then
        sudo systemctl start "$SERVICE_NAME"
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            success "Service started successfully"
        else
            error "Failed to start service"
            exit 1
        fi
    elif [[ "$SERVICE_MANAGER" == "launchd" ]]; then
        sudo launchctl load "/Library/LaunchDaemons/com.agent-studio.backend.plist"
        sleep 2
        if launchctl list | grep -q "com.agent-studio.backend"; then
            success "Service started successfully"
        else
            error "Failed to start service"
            exit 1
        fi
    else
        error "Manual service management not implemented"
        exit 1
    fi
}

stop_service() {
    log "Stopping $SERVICE_NAME..."
    
    if [[ "$SERVICE_MANAGER" == "systemd" ]]; then
        sudo systemctl stop "$SERVICE_NAME"
        success "Service stopped"
    elif [[ "$SERVICE_MANAGER" == "launchd" ]]; then
        sudo launchctl unload "/Library/LaunchDaemons/com.agent-studio.backend.plist"
        success "Service stopped"
    else
        error "Manual service management not implemented"
        exit 1
    fi
}

restart_service() {
    log "Restarting $SERVICE_NAME..."
    
    if [[ "$SERVICE_MANAGER" == "systemd" ]]; then
        sudo systemctl restart "$SERVICE_NAME"
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            success "Service restarted successfully"
        else
            error "Failed to restart service"
            exit 1
        fi
    elif [[ "$SERVICE_MANAGER" == "launchd" ]]; then
        sudo launchctl unload "/Library/LaunchDaemons/com.agent-studio.backend.plist" 2>/dev/null || true
        sleep 1
        sudo launchctl load "/Library/LaunchDaemons/com.agent-studio.backend.plist"
        sleep 2
        if launchctl list | grep -q "com.agent-studio.backend"; then
            success "Service restarted successfully"
        else
            error "Failed to restart service"
            exit 1
        fi
    else
        error "Manual service management not implemented"
        exit 1
    fi
}

show_status() {
    log "Checking $SERVICE_NAME status..."
    
    if [[ "$SERVICE_MANAGER" == "systemd" ]]; then
        systemctl status "$SERVICE_NAME" --no-pager
    elif [[ "$SERVICE_MANAGER" == "launchd" ]]; then
        if launchctl list | grep -q "com.agent-studio.backend"; then
            echo -e "${GREEN}● Service is running${NC}"
            launchctl list com.agent-studio.backend
        else
            echo -e "${RED}● Service is not running${NC}"
        fi
    fi
    
    # Check if port is listening
    if command -v lsof >/dev/null 2>&1; then
        if lsof -i :4936 >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Port 4936 is listening${NC}"
        else
            echo -e "${RED}✗ Port 4936 is not listening${NC}"
        fi
    fi
}

show_logs() {
    log "Showing $SERVICE_NAME logs..."
    
    if [[ "$SERVICE_MANAGER" == "systemd" ]]; then
        if command -v journalctl >/dev/null 2>&1; then
            journalctl -u "$SERVICE_NAME" -f --no-pager
        else
            tail -f "$LOG_DIR/output.log" "$LOG_DIR/error.log"
        fi
    else
        if [[ -f "$LOG_DIR/output.log" ]] || [[ -f "$LOG_DIR/error.log" ]]; then
            tail -f "$LOG_DIR/output.log" "$LOG_DIR/error.log" 2>/dev/null
        else
            error "Log files not found in $LOG_DIR"
            exit 1
        fi
    fi
}

edit_config() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    log "Opening configuration file: $CONFIG_FILE"
    
    if command -v nano >/dev/null 2>&1; then
        nano "$CONFIG_FILE"
    elif command -v vim >/dev/null 2>&1; then
        vim "$CONFIG_FILE"
    elif command -v vi >/dev/null 2>&1; then
        vi "$CONFIG_FILE"
    else
        echo "No text editor found. Config file location: $CONFIG_FILE"
    fi
}

uninstall_service() {
    log "Uninstalling $SERVICE_NAME..."
    
    # Stop service first
    stop_service 2>/dev/null || true
    
    if [[ "$SERVICE_MANAGER" == "systemd" ]]; then
        sudo systemctl disable "$SERVICE_NAME" 2>/dev/null || true
        sudo rm -f "/etc/systemd/system/$SERVICE_NAME.service"
        sudo systemctl daemon-reload
    elif [[ "$SERVICE_MANAGER" == "launchd" ]]; then
        sudo rm -f "/Library/LaunchDaemons/com.agent-studio.backend.plist"
    fi
    
    # Remove service script
    sudo rm -f "/usr/local/bin/$SERVICE_NAME"
    
    # Ask before removing data
    echo ""
    read -p "Remove application data and logs? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$INSTALL_DIR"
        rm -rf "$LOG_DIR"
        rm -rf "$USER_HOME/.agent-studio-config"
        success "Application data removed"
    else
        log "Application data preserved"
    fi
    
    success "Service uninstalled"
}

# Main command handling
case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    config)
        edit_config
        ;;
    uninstall)
        uninstall_service
        ;;
    *)
        show_help
        exit 1
        ;;
esac
SCRIPT_EOF

    # Replace placeholders with actual values
    sed -i.bak "s|USER_NAME_PLACEHOLDER|$USER_NAME|g" "/usr/local/bin/$SERVICE_NAME"
    sed -i.bak "s|USER_HOME_PLACEHOLDER|$USER_HOME|g" "/usr/local/bin/$SERVICE_NAME"
    rm "/usr/local/bin/$SERVICE_NAME.bak"
    
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
    setup_directories
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