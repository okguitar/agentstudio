#!/bin/bash

# Agent Studio Update Script
# Safely updates Agent Studio while preserving user data and configurations
# Usage: ./update.sh [--force] [--backup-only]

set -e

# Configuration
BASE_DIR="$HOME/.agent-studio"
APP_DIR="$BASE_DIR/app"
CONFIG_DIR="$BASE_DIR/config"
LOGS_DIR="$BASE_DIR/logs"
BACKUP_DIR="$BASE_DIR/backup/backup-$(date +%Y%m%d_%H%M%S)"
DATA_DIR="$BASE_DIR/data"
SLIDES_DIR="$DATA_DIR/slides"
GITHUB_REPO="git-men/agentstudio"
GITHUB_BRANCH="main"

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
header_log() { echo -e "${PURPLE}[UPDATE]${NC} $1"; }

# Parse command line arguments
FORCE_UPDATE=false
BACKUP_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_UPDATE=true
            shift
            ;;
        --backup-only)
            BACKUP_ONLY=true
            shift
            ;;
        --help|-h)
            echo "Agent Studio Update Script"
            echo "Usage: $0 [--force] [--backup-only] [--help]"
            echo ""
            echo "Options:"
            echo "  --force       Force update even if no changes detected"
            echo "  --backup-only Only create backup, don't update"
            echo "  --help, -h    Show this help message"
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

    if [ ! -d "$BASE_DIR" ]; then
        error "Agent Studio is not installed in $BASE_DIR"
        error "Please run the installation script first:"
        echo "  curl -fsSL https://raw.githubusercontent.com/$GITHUB_REPO/$GITHUB_BRANCH/scripts/remote-install.sh | bash"
        exit 1
    fi

    if [ ! -f "$APP_DIR/package.json" ]; then
        error "Invalid Agent Studio installation detected - missing package.json in app directory"
        exit 1
    fi

    success "Agent Studio installation found in $BASE_DIR"
    log "App directory: $APP_DIR"
}

# Create backup of important files
create_backup() {
    header_log "Creating backup..."

    mkdir -p "$BACKUP_DIR"

    # Backup app directory
    if [ -d "$APP_DIR" ]; then
        log "Backing up application..."
        cp -r "$APP_DIR" "$BACKUP_DIR/app"
        success "Application backed up"
    fi

    # Backup configuration files
    if [ -d "$CONFIG_DIR" ]; then
        log "Backing up configuration..."
        cp -r "$CONFIG_DIR" "$BACKUP_DIR/config"
        success "Configuration backed up"
    fi

    # Backup data directory if it exists and is not empty
    if [ -d "$DATA_DIR" ] && [ "$(ls -A $DATA_DIR 2>/dev/null)" ]; then
        log "Backing up data..."
        cp -r "$DATA_DIR" "$BACKUP_DIR/data"
        success "Data backed up"
    fi

    # Create backup info file
    cat > "$BACKUP_DIR/backup_info.txt" << EOF
Backup created: $(date)
Agent Studio version: $(cd "$APP_DIR" && git describe --tags --always 2>/dev/null || echo "unknown")
Backup location: $BACKUP_DIR
Contents:
- App directory (source code)
- Configuration files
- Data directory (slides, etc.)

To restore: ./restore.sh $BACKUP_DIR
EOF

    success "Backup created at $BACKUP_DIR"
}

# Check for updates
check_for_updates() {
    header_log "Checking for updates..."

    cd "$APP_DIR"

    # Fetch latest changes
    git fetch origin

    # Get current and latest commit hashes
    CURRENT_COMMIT=$(git rev-parse HEAD)
    LATEST_COMMIT=$(git rev-parse origin/$GITHUB_BRANCH)

    if [ "$CURRENT_COMMIT" = "$LATEST_COMMIT" ] && [ "$FORCE_UPDATE" = "false" ]; then
        success "Agent Studio is already up to date"
        log "Current version: $(git describe --tags --always 2>/dev/null || echo $CURRENT_COMMIT)"
        echo ""
        log "To force update, run: $0 --force"
        exit 0
    fi

    log "Updates available"
    log "Current version: $(git describe --tags --always 2>/dev/null || echo $CURRENT_COMMIT)"
    log "Latest version: $(git describe --tags --always 2>/dev/null || echo $LATEST_COMMIT)"
}

# Stop running service
stop_service() {
    header_log "Stopping Agent Studio service..."

    # Try to stop systemd service first
    if command -v systemctl >/dev/null 2>&1; then
        if systemctl is-active --quiet agent-studio 2>/dev/null; then
            log "Stopping systemd service..."
            sudo systemctl stop agent-studio || warn "Could not stop systemd service"
        fi
    fi

    # Try to stop using stop script
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

# Update code
update_code() {
    header_log "Updating Agent Studio code..."

    cd "$APP_DIR"

    # Stash any local changes
    if [ -n "$(git status --porcelain)" ]; then
        log "Stashing local changes..."
        git stash push -m "Auto-stash before update $(date)"
        log "Local changes stashed. You can restore them later with:"
        echo "  cd $APP_DIR && git stash pop"
    fi

    # Pull latest changes
    log "Pulling latest changes..."
    git checkout "$GITHUB_BRANCH"
    git pull origin "$GITHUB_BRANCH"

    success "Code updated successfully"
}

# Update dependencies
update_dependencies() {
    header_log "Updating dependencies..."

    cd "$APP_DIR"

    # Check which package manager is available
    if [ -f "pnpm-lock.yaml" ] && command -v pnpm >/dev/null 2>&1; then
        log "Using pnpm..."
        pnpm install
        log "Building backend with pnpm..."
        pnpm run build:backend
    elif command -v npm >/dev/null 2>&1; then
        log "Using npm..."
        npm install
        log "Building backend with npm..."
        npm run build:backend
    else
        error "No package manager found. Please install npm or pnpm."
        exit 1
    fi

    success "Dependencies updated and build completed"
}

# Start service
start_service() {
    header_log "Starting Agent Studio service..."

    if [ -f "$APP_DIR/start.sh" ]; then
        log "Running start script..."
        "$APP_DIR/start.sh"
    else
        error "Start script not found"
        exit 1
    fi

    success "Service started"
}

# Verify update
verify_update() {
    header_log "Verifying update..."

    # Check if service is running
    sleep 3

    if curl -s http://localhost:4936/api/health >/dev/null 2>&1; then
        success "Agent Studio is running and accessible"
    else
        warn "Agent Studio might not be running properly"
        warn "Please check the logs: $LOGS_DIR/ or journalctl -u agent-studio"
    fi

    # Show new version
    cd "$APP_DIR"
    NEW_VERSION=$(git describe --tags --always 2>/dev/null || echo "unknown")
    success "Updated to version: $NEW_VERSION"
}

# Cleanup old backups
cleanup_old_backups() {
    header_log "Cleaning up old backups..."

    # Keep only the last 5 backups
    find "$BACKUP_DIR" -maxdepth 1 -name "backup-*" -type d | sort -r | tail -n +6 | while read -r old_backup; do
        log "Removing old backup: $old_backup"
        rm -rf "$old_backup"
    done

    success "Old backups cleaned up"
}

# Main update function
main() {
    echo "╔══════════════════════════════════════════╗"
    echo "║        Agent Studio Update Script        ║"
    echo "║                                          ║"
    echo "║  This script will safely update Agent    ║"
    echo "║  Studio while preserving your data and    ║"
    echo "║  configurations.                         ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""

    check_installation

    if [ "$BACKUP_ONLY" = "true" ]; then
        create_backup
        success "Backup completed. Use '$0' to perform actual update."
        exit 0
    fi

    create_backup
    check_for_updates
    stop_service
    update_code
    update_dependencies
    start_service
    verify_update
    cleanup_old_backups

    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║              Update Complete             ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    success "Agent Studio has been updated successfully!"
    echo ""
    echo "📁 Backup location: $BACKUP_DIR"
    echo "🌐 Application: https://agentstudio-frontend.vercel.app/"
    echo "🔧 Local API: http://localhost:4936"
    echo ""
    echo "If you encounter any issues, you can restore from backup:"
    echo "  $BACKUP_DIR/restore.sh"
}

# Run main function
main "$@"