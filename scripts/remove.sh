#!/bin/bash

# Agent Studio Remove Script
# Safely removes Agent Studio while offering to preserve user data
# Usage: ./remove.sh [--keep-data] [--force]

set -e

# Configuration
BASE_DIR="$HOME/.agent-studio"
APP_DIR="$BASE_DIR/app"
CONFIG_DIR="$BASE_DIR/config"
LOGS_DIR="$BASE_DIR/logs"
BACKUP_DIR="$BASE_DIR/backup"
DATA_DIR="$BASE_DIR/data"
SLIDES_DIR="$DATA_DIR/slides"
SERVICE_NAME="agent-studio"

# Legacy compatibility
INSTALL_DIR="$APP_DIR"

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

    if [ -d "$BASE_DIR" ]; then
        log "Found base directory: $BASE_DIR"
        found=true
    fi

    if [ -d "$APP_DIR" ]; then
        log "Found application directory: $APP_DIR"
        found=true
    fi

    if [ -d "$CONFIG_DIR" ]; then
        log "Found configuration directory: $CONFIG_DIR"
        found=true
    fi

    if [ -d "$DATA_DIR" ]; then
        log "Found data directory: $DATA_DIR"
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

    # Base directory
    if [ -d "$BASE_DIR" ]; then
        local size=$(du -sh "$BASE_DIR" 2>/dev/null | cut -f1 || echo "unknown")
        echo "  📁 Base directory: $BASE_DIR ($size)"
        echo "     ├─ app/          (Application files)"
        echo "     ├─ config/       (Configuration files)"
        echo "     ├─ logs/         (Log files)"
        echo "     ├─ backup/       (Backup files)"
        echo "     └─ data/         (User data including slides)"
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
        echo "  📊 All user data and backups in $BASE_DIR"
        echo "  ⚙️  Configuration files in $CONFIG_DIR"
        echo "  📋 Log files in $LOGS_DIR"
    else
        echo "The following will be REMOVED (unless --keep-data is used):"
        echo "  📊 All data including slides in $DATA_DIR"
        echo "  ⚙️  All configurations in $CONFIG_DIR"
        echo "  📋 All logs in $LOGS_DIR"
        echo "  💾 All backups in $BACKUP_DIR"
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

    if [ "$KEEP_DATA" = "false" ] && [ -d "$DATA_DIR" ] && [ "$(ls -A $DATA_DIR 2>/dev/null)" ]; then
        warn "This will also remove all your slides and data!"
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
    FINAL_BACKUP_DIR="$BACKUP_DIR/uninstall-backup-$(date +%Y%m%d_%H%M%S)"

    # Backup configurations
    if [ -d "$CONFIG_DIR" ]; then
        log "Backing up configurations..."
        cp -r "$CONFIG_DIR" "$FINAL_BACKUP_DIR/config"
    fi

    # Backup data directory (includes slides)
    if [ -d "$DATA_DIR" ] && [ "$(ls -A $DATA_DIR 2>/dev/null)" ]; then
        log "Backing up data..."
        cp -r "$DATA_DIR" "$FINAL_BACKUP_DIR/data"
    fi

    # Create backup info
    cat > "$FINAL_BACKUP_DIR/uninstall_backup.txt" << EOF
Backup created during Agent Studio removal: $(date)
This backup contains your configurations and data.
To restore these files, use the restore script:
  ./restore.sh $FINAL_BACKUP_DIR
EOF

    success "Final backup created at $FINAL_BACKUP_DIR"
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
    if [ -f "$APP_DIR/stop.sh" ]; then
        log "Running stop script..."
        "$APP_DIR/stop.sh" || warn "Stop script encountered an error"
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

    if [ "$KEEP_DATA" = "true" ]; then
        # Only remove app directory, keep everything else
        if [ -d "$APP_DIR" ]; then
            log "Removing application directory only (keeping data)..."
            rm -rf "$APP_DIR"
        fi
    else
        # Remove entire base directory
        if [ -d "$BASE_DIR" ]; then
            log "Removing entire Agent Studio directory..."
            rm -rf "$BASE_DIR"
        fi
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

    if [ "$KEEP_DATA" = "true" ]; then
        # Check if only app directory was removed
        if [ -d "$APP_DIR" ]; then
            warn "Application directory still exists: $APP_DIR"
            remaining=true
        fi
        # Base directory should still exist with data
        if [ ! -d "$BASE_DIR" ]; then
            warn "Base directory was unexpectedly removed"
        fi
    else
        # Check if entire base directory was removed
        if [ -d "$BASE_DIR" ]; then
            warn "Agent Studio directory still exists: $BASE_DIR"
            remaining=true
        fi
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
        echo "📁 Preserved data in $BASE_DIR:"
        echo "  • Configuration: $CONFIG_DIR"
        echo "  • Logs: $LOGS_DIR"
        echo "  • Data (including slides): $DATA_DIR"
        echo "  • Backups: $BACKUP_DIR"
        echo ""
        echo "To completely remove everything, run:"
        echo "  $0 --force"
    else
        success "Agent Studio has been completely removed"
        if [ -n "$FINAL_BACKUP_DIR" ]; then
            echo ""
            echo "📦 Final backup created at: $FINAL_BACKUP_DIR"
            echo "   This contains your configurations and data"
            echo "   To restore: ./restore.sh $FINAL_BACKUP_DIR"
        fi
    fi

    echo ""
    echo "To reinstall Agent Studio in the future:"
    echo "  curl -fsSL https://raw.githubusercontent.com/okguitar/agentstudio/main/scripts/remote-install.sh | bash"
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