#!/bin/bash

# Agent Studio Remove Script
# Safely removes Agent Studio while offering to preserve user data
# Usage: ./remove.sh [--keep-data] [--force]

set -e

# Configuration
INSTALL_DIR="$HOME/.agent-studio"
CONFIG_DIR="$HOME/.agent-studio-config"
LOG_DIR="$HOME/.agent-studio-logs"
SLIDES_DIR="$HOME/slides"
SERVICE_NAME="agent-studio"
BACKUP_DIR="$HOME/.agent-studio-backup-$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
header_log() { echo -e "${PURPLE}[REMOVE]${NC} $1"; }

# Parse command line arguments
KEEP_DATA=false
FORCE_REMOVE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --keep-data)
            KEEP_DATA=true
            shift
            ;;
        --force)
            FORCE_REMOVE=true
            shift
            ;;
        --help|-h)
            echo "Agent Studio Remove Script"
            echo "Usage: $0 [--keep-data] [--force] [--help]"
            echo ""
            echo "Options:"
            echo "  --keep-data    Preserve user data (slides, configurations)"
            echo "  --force        Remove without confirmation prompts"
            echo "  --help, -h     Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check if Agent Studio is installed
check_installation() {
    header_log "Checking Agent Studio installation..."

    local found=false

    if [ -d "$INSTALL_DIR" ]; then
        log "Found installation directory: $INSTALL_DIR"
        found=true
    fi

    if [ -d "$CONFIG_DIR" ]; then
        log "Found configuration directory: $CONFIG_DIR"
        found=true
    fi

    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q "$SERVICE_NAME.service"; then
        log "Found systemd service: $SERVICE_NAME.service"
        found=true
    fi

    if [ "$found" = "false" ]; then
        warn "No Agent Studio installation found"
        exit 0
    fi

    success "Agent Studio installation detected"
}

# Show what will be removed
show_removal_plan() {
    header_log "Removal Plan"

    echo "The following will be removed:"
    echo ""

    # Installation directory
    if [ -d "$INSTALL_DIR" ]; then
        local size=$(du -sh "$INSTALL_DIR" 2>/dev/null | cut -f1 || echo "unknown")
        echo "  📁 Installation directory: $INSTALL_DIR ($size)"
    fi

    # Configuration directory
    if [ -d "$CONFIG_DIR" ]; then
        local size=$(du -sh "$CONFIG_DIR" 2>/dev/null | cut -f1 || echo "unknown")
        echo "  ⚙️  Configuration directory: $CONFIG_DIR ($size)"
    fi

    # Log directory
    if [ -d "$LOG_DIR" ]; then
        local size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1 || echo "unknown")
        echo "  📋 Log directory: $LOG_DIR ($size)"
    fi

    # Systemd service
    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q "$SERVICE_NAME.service"; then
        echo "  🔧 Systemd service: $SERVICE_NAME.service"
    fi

    # Service management script
    if [ -f "/usr/local/bin/$SERVICE_NAME" ]; then
        echo "  📜 Service script: /usr/local/bin/$SERVICE_NAME"
    fi

    echo ""
    if [ "$KEEP_DATA" = "true" ]; then
        echo "The following will be PRESERVED:"
        if [ -d "$SLIDES_DIR" ] && [ "$(ls -A $SLIDES_DIR 2>/dev/null)" ]; then
            local slide_count=$(find "$SLIDES_DIR" -name "*.html" 2>/dev/null | wc -l)
            echo "  📊 Slides directory: $SLIDES_DIR ($slide_count slides)"
        fi
        echo "  💾 All backups in $HOME/.agent-studio-backup-*"
    else
        echo "The following will be REMOVED (unless --keep-data is used):"
        if [ -d "$SLIDES_DIR" ] && [ "$(ls -A $SLIDES_DIR 2>/dev/null)" ]; then
            local slide_count=$(find "$SLIDES_DIR" -name "*.html" 2>/dev/null | wc -l)
            echo "  📊 Slides directory: $SLIDES_DIR ($slide_count slides)"
        fi
    fi
}

# Ask for confirmation
ask_confirmation() {
    if [ "$FORCE_REMOVE" = "true" ]; then
        return 0
    fi

    echo ""
    read -p "Are you sure you want to remove Agent Studio? [y/N]: " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Removal cancelled by user"
        exit 0
    fi

    if [ "$KEEP_DATA" = "false" ] && [ -d "$SLIDES_DIR" ] && [ "$(ls -A $SLIDES_DIR 2>/dev/null)" ]; then
        warn "This will also remove all your slides!"
        read -p "Are you absolutely sure? [y/N]: " -n 1 -r
        echo ""

        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Removal cancelled by user"
            exit 0
        fi
    fi
}

# Create backup before removal (if not keeping data)
create_backup() {
    if [ "$KEEP_DATA" = "true" ]; then
        return 0
    fi

    header_log "Creating final backup..."

    mkdir -p "$BACKUP_DIR"

    # Backup configurations
    if [ -d "$CONFIG_DIR" ]; then
        log "Backing up configurations..."
        cp -r "$CONFIG_DIR" "$BACKUP_DIR/config"
    fi

    # Backup slides
    if [ -d "$SLIDES_DIR" ] && [ "$(ls -A $SLIDES_DIR 2>/dev/null)" ]; then
        log "Backing up slides..."
        cp -r "$SLIDES_DIR" "$BACKUP_DIR/slides"
    fi

    # Create backup info
    cat > "$BACKUP_DIR/uninstall_backup.txt" << EOF
Backup created during Agent Studio removal: $(date)
This backup contains your configurations and slides.
To restore these files, manually copy them back:
  cp -r $BACKUP_DIR/config/* $CONFIG_DIR/
  cp -r $BACKUP_DIR/slides/* $SLIDES_DIR/
EOF

    success "Final backup created at $BACKUP_DIR"
}

# Stop running service
stop_service() {
    header_log "Stopping Agent Studio service..."

    # Try systemd service first
    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q "$SERVICE_NAME.service"; then
        if systemctl is-active --quiet "$SERVICE_NAME.service" 2>/dev/null; then
            log "Stopping systemd service..."
            sudo systemctl stop "$SERVICE_NAME.service" || warn "Could not stop systemd service"
        fi

        # Disable and remove service
        log "Disabling systemd service..."
        sudo systemctl disable "$SERVICE_NAME.service" 2>/dev/null || warn "Could not disable systemd service"

        log "Removing systemd service file..."
        sudo rm -f "/etc/systemd/system/$SERVICE_NAME.service"
        sudo systemctl daemon-reload
    fi

    # Try stop script
    if [ -f "$INSTALL_DIR/stop.sh" ]; then
        log "Running stop script..."
        "$INSTALL_DIR/stop.sh" || warn "Stop script encountered an error"
    fi

    # Kill any remaining processes
    if command -v pkill >/dev/null 2>&1; then
        pkill -f "agent-studio" 2>/dev/null || true
    fi

    success "Service stopped"
}

# Remove installation files
remove_installation() {
    header_log "Removing installation files..."

    # Remove installation directory
    if [ -d "$INSTALL_DIR" ]; then
        log "Removing installation directory..."
        rm -rf "$INSTALL_DIR"
    fi

    # Remove configuration directory (unless keeping data)
    if [ -d "$CONFIG_DIR" ] && [ "$KEEP_DATA" = "false" ]; then
        log "Removing configuration directory..."
        rm -rf "$CONFIG_DIR"
    fi

    # Remove log directory
    if [ -d "$LOG_DIR" ]; then
        log "Removing log directory..."
        rm -rf "$LOG_DIR"
    fi

    # Remove slides directory (unless keeping data)
    if [ -d "$SLIDES_DIR" ] && [ "$KEEP_DATA" = "false" ]; then
        log "Removing slides directory..."
        rm -rf "$SLIDES_DIR"
    fi

    success "Installation files removed"
}

# Remove service management script
remove_service_script() {
    header_log "Removing service management script..."

    if [ -f "/usr/local/bin/$SERVICE_NAME" ]; then
        log "Removing service script..."
        sudo rm -f "/usr/local/bin/$SERVICE_NAME"
    fi

    success "Service script removed"
}

# Cleanup additional files
cleanup_additional_files() {
    header_log "Cleaning up additional files..."

    # Remove log rotation config
    if [ -f "/etc/logrotate.d/$SERVICE_NAME" ]; then
        log "Removing log rotation configuration..."
        sudo rm -f "/etc/logrotate.d/$SERVICE_NAME"
    fi

    # Remove any temporary files
    log "Removing temporary files..."
    rm -rf /tmp/agent-studio-* 2>/dev/null || true

    success "Additional files cleaned up"
}

# Verify removal
verify_removal() {
    header_log "Verifying removal..."

    local remaining=false

    if [ -d "$INSTALL_DIR" ]; then
        warn "Installation directory still exists: $INSTALL_DIR"
        remaining=true
    fi

    if [ -d "$CONFIG_DIR" ] && [ "$KEEP_DATA" = "false" ]; then
        warn "Configuration directory still exists: $CONFIG_DIR"
        remaining=true
    fi

    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q "$SERVICE_NAME.service"; then
        warn "Systemd service still exists: $SERVICE_NAME.service"
        remaining=true
    fi

    if [ "$remaining" = "false" ]; then
        success "Agent Studio has been completely removed"
    else
        warn "Some components may still exist. You may need to remove them manually."
    fi
}

# Show summary
show_summary() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║              Removal Complete             ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""

    if [ "$KEEP_DATA" = "true" ]; then
        success "Agent Studio removed while preserving user data"
        echo ""
        echo "📁 Preserved data:"
        if [ -d "$SLIDES_DIR" ]; then
            echo "  • Slides: $SLIDES_DIR"
        fi
        if [ -d "$CONFIG_DIR" ]; then
            echo "  • Configuration: $CONFIG_DIR"
        fi
        echo ""
        echo "To completely remove everything, run:"
        echo "  $0 --force"
    else
        success "Agent Studio has been completely removed"
        if [ -n "$BACKUP_DIR" ]; then
            echo ""
            echo "📦 Final backup created at: $BACKUP_DIR"
            echo "   This contains your slides and configurations"
        fi
    fi

    echo ""
    echo "To reinstall Agent Studio in the future:"
    echo "  curl -fsSL https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/remote-install.sh | bash"
}

# Main removal function
main() {
    echo "╔══════════════════════════════════════════╗"
    echo "║         Agent Studio Remove Script        ║"
    echo "║                                          ║"
    echo "║  This script will safely remove Agent     ║"
    echo "║  Studio while offering to preserve data.  ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""

    check_installation
    show_removal_plan
    ask_confirmation
    create_backup
    stop_service
    remove_installation
    remove_service_script
    cleanup_additional_files
    verify_removal
    show_summary
}

# Run main function
main "$@"