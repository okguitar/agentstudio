#!/bin/bash

# Agent Studio Restore Script
# Restores Agent Studio data from a backup
# Usage: ./restore.sh <backup_directory>

set -e

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
header_log() { echo -e "${PURPLE}[RESTORE]${NC} $1"; }

# Configuration
INSTALL_DIR="$HOME/.agent-studio"
CONFIG_DIR="$HOME/.agent-studio-config"
LOG_DIR="$HOME/.agent-studio-logs"
SLIDES_DIR="$HOME/slides"

# Parse command line arguments
if [ $# -eq 0 ]; then
    error "No backup directory specified"
    echo ""
    echo "Usage: $0 <backup_directory>"
    echo ""
    echo "Example:"
    echo "  $0 ~/.agent-studio-backup-20231010_143022"
    echo "  $0 /tmp/agent-studio-backup"
    echo ""
    echo "To find available backups:"
    echo "  ls -la $HOME/.agent-studio-backup-*"
    exit 1
fi

BACKUP_DIR="$1"

# Validate backup directory
validate_backup() {
    header_log "Validating backup directory..."

    if [ ! -d "$BACKUP_DIR" ]; then
        error "Backup directory does not exist: $BACKUP_DIR"
        exit 1
    fi

    if [ ! -r "$BACKUP_DIR" ]; then
        error "Backup directory is not readable: $BACKUP_DIR"
        exit 1
    fi

    success "Backup directory is valid: $BACKUP_DIR"
}

# Show backup information
show_backup_info() {
    header_log "Backup Information"

    if [ -f "$BACKUP_DIR/backup_info.txt" ]; then
        echo "📄 Backup details:"
        cat "$BACKUP_DIR/backup_info.txt"
        echo ""
    elif [ -f "$BACKUP_DIR/uninstall_backup.txt" ]; then
        echo "📄 Backup details:"
        cat "$BACKUP_DIR/uninstall_backup.txt"
        echo ""
    else
        warn "No backup information file found"
    fi

    # Show what's available in backup
    echo "📦 Backup contents:"
    [ -d "$BACKUP_DIR/config" ] && echo "  ✅ Configuration files"
    [ -d "$BACKUP_DIR/slides" ] && echo "  ✅ Slides directory"
    [ -f "$BACKUP_DIR/package.json" ] && echo "  ✅ Package configuration"
    [ -f "$BACKUP_DIR/.env" ] && echo "  ✅ Environment file"
    echo ""
}

# Check current installation
check_current_installation() {
    header_log "Checking current installation..."

    local has_installation=false
    local components=()

    if [ -d "$INSTALL_DIR" ]; then
        has_installation=true
        components+=("installation directory: $INSTALL_DIR")
    fi

    if [ -d "$CONFIG_DIR" ]; then
        components+=("configuration directory: $CONFIG_DIR")
    fi

    if [ -d "$SLIDES_DIR" ] && [ "$(ls -A $SLIDES_DIR 2>/dev/null)" ]; then
        components+=("slides directory: $SLIDES_DIR")
    fi

    if [ "$has_installation" = "true" ]; then
        warn "Current installation detected:"
        for component in "${components[@]}"; do
            echo "  • $component"
        done
        echo ""
        echo "⚠️  Restoring will overwrite existing files!"
        echo ""
        read -p "Continue with restore? [y/N]: " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Restore cancelled by user"
            exit 0
        fi
    else
        log "No current installation detected, proceeding with restore"
    fi
}

# Restore configurations
restore_configurations() {
    header_log "Restoring configurations..."

    if [ -d "$BACKUP_DIR/config" ]; then
        # Ensure config directory exists
        mkdir -p "$CONFIG_DIR"

        # Backup existing config
        if [ -d "$CONFIG_DIR" ] && [ "$(ls -A $CONFIG_DIR 2>/dev/null)" ]; then
            local config_backup="$CONFIG_DIR.backup.$(date +%Y%m%d_%H%M%S)"
            log "Backing up existing configuration to: $config_backup"
            cp -r "$CONFIG_DIR" "$config_backup"
        fi

        # Restore from backup
        log "Restoring configuration files..."
        cp -r "$BACKUP_DIR/config/"* "$CONFIG_DIR/"

        # Set correct ownership
        chown -R "$(id -u):$(id -g)" "$CONFIG_DIR" 2>/dev/null || true

        success "Configurations restored"
    else
        warn "No configuration files found in backup"
    fi
}

# Restore slides
restore_slides() {
    header_log "Restoring slides..."

    if [ -d "$BACKUP_DIR/slides" ]; then
        # Ensure slides directory exists
        mkdir -p "$SLIDES_DIR"

        # Backup existing slides
        if [ -d "$SLIDES_DIR" ] && [ "$(ls -A $SLIDES_DIR 2>/dev/null)" ]; then
            local slides_backup="$SLIDES_DIR.backup.$(date +%Y%m%d_%H%M%S)"
            log "Backing up existing slides to: $slides_backup"
            cp -r "$SLIDES_DIR" "$slides_backup"
        fi

        # Restore from backup
        log "Restoring slides..."
        cp -r "$BACKUP_DIR/slides/"* "$SLIDES_DIR/"

        # Set correct ownership
        chown -R "$(id -u):$(id -g)" "$SLIDES_DIR" 2>/dev/null || true

        local slide_count=$(find "$SLIDES_DIR" -name "*.html" 2>/dev/null | wc -l)
        success "Slides restored ($slide_count slides)"
    else
        warn "No slides found in backup"
    fi
}

# Restore package files (if Agent Studio is installed)
restore_package_files() {
    header_log "Restoring package files..."

    if [ -d "$INSTALL_DIR" ]; then
        # Restore package.json if exists
        if [ -f "$BACKUP_DIR/package.json" ]; then
            log "Restoring package.json..."
            cp "$BACKUP_DIR/package.json" "$INSTALL_DIR/"
        fi

        # Restore package-lock.json if exists
        if [ -f "$BACKUP_DIR/package-lock.json" ]; then
            log "Restoring package-lock.json..."
            cp "$BACKUP_DIR/package-lock.json" "$INSTALL_DIR/"
        fi

        # Restore pnpm-lock.yaml if exists
        if [ -f "$BACKUP_DIR/pnpm-lock.yaml" ]; then
            log "Restoring pnpm-lock.yaml..."
            cp "$BACKUP_DIR/pnpm-lock.yaml" "$INSTALL_DIR/"
        fi

        # Restore .env if exists
        if [ -f "$BACKUP_DIR/.env" ]; then
            log "Restoring environment file..."
            cp "$BACKUP_DIR/.env" "$INSTALL_DIR/"
        fi

        success "Package files restored"
    else
        warn "Agent Studio installation not found, skipping package files"
    fi
}

# Restart service if running
restart_service() {
    header_log "Checking for running service..."

    # Check if systemd service exists and is running
    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q "agent-studio.service"; then
        if systemctl is-active --quiet agent-studio.service 2>/dev/null; then
            log "Restarting Agent Studio service..."
            sudo systemctl restart agent-studio.service || warn "Failed to restart service"
            success "Service restarted"
        else
            log "Service is not running"
        fi
    elif [ -f "$INSTALL_DIR/start.sh" ] && [ -f "$INSTALL_DIR/stop.sh" ]; then
        # Try to restart using scripts
        log "Restarting using start/stop scripts..."
        "$INSTALL_DIR/stop.sh" 2>/dev/null || true
        sleep 2
        "$INSTALL_DIR/start.sh" 2>/dev/null || warn "Failed to start service"
        success "Service restart attempted"
    else
        log "No service management found, you may need to restart manually"
    fi
}

# Verify restore
verify_restore() {
    header_log "Verifying restore..."

    local restored_items=()

    # Check configurations
    if [ -d "$CONFIG_DIR" ] && [ "$(ls -A $CONFIG_DIR 2>/dev/null)" ]; then
        restored_items+=("Configurations")
    fi

    # Check slides
    if [ -d "$SLIDES_DIR" ] && [ "$(ls -A $SLIDES_DIR 2>/dev/null)" ]; then
        local slide_count=$(find "$SLIDES_DIR" -name "*.html" 2>/dev/null | wc -l)
        restored_items+=("Slides ($slide_count files)")
    fi

    # Check service status
    if command -v curl >/dev/null 2>&1 && curl -s http://localhost:4936/api/health >/dev/null 2>&1; then
        restored_items+=("Service is running")
    fi

    if [ ${#restored_items[@]} -gt 0 ]; then
        success "Restore completed successfully!"
        echo ""
        echo "✅ Restored items:"
        for item in "${restored_items[@]}"; do
            echo "  • $item"
        done
    else
        warn "Some items may not have been restored properly"
    fi
}

# Show next steps
show_next_steps() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║              Restore Complete             ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    echo "🎉 Data has been restored from: $BACKUP_DIR"
    echo ""
    echo "📁 Restored locations:"
    [ -d "$CONFIG_DIR" ] && echo "  • Configuration: $CONFIG_DIR"
    [ -d "$SLIDES_DIR" ] && echo "  • Slides: $SLIDES_DIR"
    echo ""
    echo "🌐 Access Agent Studio:"
    echo "  • Frontend: https://agentstudio-frontend.vercel.app/"
    echo "  • Local API: http://localhost:4936"
    echo ""
    echo "💡 If the service is not running, start it with:"
    if [ -f "$INSTALL_DIR/start.sh" ]; then
        echo "  $INSTALL_DIR/start.sh"
    fi
    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q "agent-studio.service"; then
        echo "  sudo systemctl start agent-studio"
    fi
}

# Main restore function
main() {
    echo "╔══════════════════════════════════════════╗"
    echo "║         Agent Studio Restore Script       ║"
    echo "║                                          ║"
    echo "║  This script will restore Agent Studio    ║"
    echo "║  data from the specified backup.         ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""

    validate_backup
    show_backup_info
    check_current_installation
    restore_configurations
    restore_slides
    restore_package_files
    restart_service
    verify_restore
    show_next_steps
}

# Run main function
main "$@"