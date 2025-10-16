#!/bin/bash

# Agent Studio Update Script
# Safely updates Agent Studio while preserving user data and configurations
# Usage: ./update.sh [--force] [--backup-only]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$HOME/.agent-studio"
APP_DIR="$BASE_DIR/app"
CONFIG_DIR="$BASE_DIR/config"
LOGS_DIR="$BASE_DIR/logs"
BACKUP_DIR="$BASE_DIR/backup/backup-$(date +%Y%m%d_%H%M%S)"
DATA_DIR="$BASE_DIR/data"
SLIDES_DIR="$DATA_DIR/slides"
GITHUB_REPO="okguitar/agentstudio"
GITHUB_BRANCH="main"

# Legacy compatibility
INSTALL_DIR="$APP_DIR"

# Get configured port from user config
get_configured_port() {
    # Default port
    local DEFAULT_PORT=4936

    # Try to read from config.json
    if [ -f "$CONFIG_DIR/config.json" ]; then
        local PORT="$DEFAULT_PORT"

        # Try Python3 first
        if command -v python3 >/dev/null 2>&1; then
            PORT=$(python3 -c "import json; print(json.load(open('$CONFIG_DIR/config.json')).get('port', $DEFAULT_PORT))" 2>/dev/null || echo "$DEFAULT_PORT")
        # Try Python as fallback
        elif command -v python >/dev/null 2>&1; then
            PORT=$(python -c "import json; print(json.load(open('$CONFIG_DIR/config.json')).get('port', $DEFAULT_PORT))" 2>/dev/null || echo "$DEFAULT_PORT")
        # Fallback to grep/sed for systems without Python
        else
            PORT=$(grep -o '"port":[[:space:]]*[0-9]*' "$CONFIG_DIR/config.json" | sed 's/.*://; s/[[:space:]]*//' 2>/dev/null || echo "$DEFAULT_PORT")
        fi

        # Validate port number
        if [[ "$PORT" =~ ^[0-9]+$ ]] && [ "$PORT" -gt 0 ] && [ "$PORT" -le 65535 ]; then
            echo "$PORT"
            return 0
        fi
    fi

    # Fallback to environment variable or default
    echo "${PORT:-$DEFAULT_PORT}"
}

# Get the configured port
CONFIGURED_PORT=$(get_configured_port)

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
RESTART_SERVICE=false

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
        --restart)
            RESTART_SERVICE=true
            shift
            ;;
        --help|-h)
            echo "Agent Studio Update Script"
            echo "Usage: $0 [--force] [--backup-only] [--restart] [--help]"
            echo ""
            echo "Options:"
            echo "  --force       Force update even if no changes detected"
            echo "  --backup-only Only create backup, don't update"
            echo "  --restart     Restart service after update/check"
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

    # Skip app directory backup (managed by Git)
    log "Skipping app directory backup (managed by Git)"
    log "Application code will be updated directly from Git repository"

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

      # Record current version information
    cd "$APP_DIR"
    CURRENT_VERSION=$(git describe --tags --always 2>/dev/null || echo "unknown")
    CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    COMMIT_MESSAGE=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "No commit message")
    COMMIT_DATE=$(git log -1 --pretty=format:"%cd" --date=short 2>/dev/null || echo "unknown")

    # Create backup info file
    cat > "$BACKUP_DIR/backup_info.txt" << EOF
Backup created: $(date)
Agent Studio version: $CURRENT_VERSION
Git commit: $CURRENT_COMMIT
Commit message: $COMMIT_MESSAGE
Commit date: $COMMIT_DATE
Backup location: $BACKUP_DIR
Contents:
- Configuration files (user settings)
- User data directory (slides, etc.)

Note: Application code is tracked in Git, use 'git log' for full history
EOF

    # Create a simple restore script
    cat > "$BACKUP_DIR/restore.sh" << EOF
#!/bin/bash
# Agent Studio Configuration Restore Script
# Restores configuration and data from backup

BACKUP_DIR="\$(dirname "\$0")"
BASE_DIR="\$HOME/.agent-studio"

echo "Restoring Agent Studio configuration and data..."
echo "Backup location: \$BACKUP_DIR"
echo "Target directory: \$BASE_DIR"
echo ""

# Restore configuration
if [ -d "\$BACKUP_DIR/config" ]; then
    echo "Restoring configuration files..."
    cp -r "\$BACKUP_DIR/config/"* "\$BASE_DIR/config/"
    echo "✅ Configuration restored"
else
    echo "⚠️  No configuration files found in backup"
fi

# Restore user data
if [ -d "\$BACKUP_DIR/data" ]; then
    echo "Restoring user data..."
    cp -r "\$BACKUP_DIR/data/"* "\$BASE_DIR/data/"
    echo "✅ User data restored"
else
    echo "⚠️  No user data found in backup"
fi

echo ""
echo "✨ Restore completed!"
echo "Note: Application code is managed by Git, use update script to restore"
EOF

    chmod +x "$BACKUP_DIR/restore.sh"

    success "Lightweight backup created at $BACKUP_DIR"
    log "✅ Configuration and user data backed up"
    log "✅ Version info recorded: $CURRENT_VERSION"
    log "✅ Application code skipped (managed by Git)"
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

        # Check if restart is requested
        if [ "$RESTART_SERVICE" = "true" ]; then
            log "Restart requested, checking service status on port $CONFIGURED_PORT..."
            if curl -s "http://localhost:$CONFIGURED_PORT/api/health" >/dev/null 2>&1; then
                log "Service is running, restarting..."
                stop_service
                start_service
                verify_update
            else
                log "Service is not running, starting..."
                start_service
                verify_update
            fi
        else
            # Check if service is running
            if curl -s "http://localhost:$CONFIGURED_PORT/api/health" >/dev/null 2>&1; then
                success "Agent Studio is running and accessible on port $CONFIGURED_PORT"
                log "Use '$0 --restart' to restart the service"
            else
                warn "Agent Studio is not running"
                log "Use '$0 --restart' to start the service"
            fi
        fi
        exit 0
    fi

    log "Updates available"
    log "Current version: $(git describe --tags --always 2>/dev/null || echo $CURRENT_COMMIT)"
    log "Latest version: $(git describe --tags --always 2>/dev/null || echo $LATEST_COMMIT)"
}

# Stop running service
stop_service() {
    header_log "Stopping Agent Studio service..."

    local SERVICE_STOPPED=false

    # Try to stop using agent-studio management script first (preferred method)
    if [ -f "$APP_DIR/agent-studio" ]; then
        log "Stopping service using agent-studio management script..."
        if "$APP_DIR/agent-studio" stop >/dev/null 2>&1; then
            log "Service stopped via agent-studio script"
            SERVICE_STOPPED=true
        else
            warn "agent-studio script failed to stop service"
        fi
    fi

    # Try launchctl service management (macOS)
    if [[ "$OSTYPE" == "darwin"* ]] && [ "$SERVICE_STOPPED" = "false" ]; then
        if launchctl list | grep -q "com.agentstudio.daemon"; then
            log "Stopping launchctl service..."
            if launchctl stop "com.agentstudio.daemon" 2>/dev/null; then
                log "Service stopped via launchctl"
                SERVICE_STOPPED=true
            else
                warn "Could not stop launchctl service"
            fi
        else
            log "No launchctl service found"
        fi
    fi

    # Try systemd service management (Linux)
    if command -v systemctl >/dev/null 2>&1 && [ "$SERVICE_STOPPED" = "false" ]; then
        if systemctl is-active --quiet agent-studio 2>/dev/null; then
            log "Stopping systemd service..."
            if sudo systemctl stop agent-studio 2>/dev/null; then
                log "Service stopped via systemd"
                SERVICE_STOPPED=true
            else
                warn "Could not stop systemd service"
            fi
        fi
    fi

    # Try legacy service script
    if [ -f "$SCRIPT_DIR/service.sh" ] && [ "$SERVICE_STOPPED" = "false" ]; then
        log "Trying legacy service script..."
        if "$SCRIPT_DIR/service.sh" stop 2>/dev/null; then
            log "Service stopped via legacy script"
            SERVICE_STOPPED=true
        fi
    fi

    # Try stop.sh script
    if [ -f "$APP_DIR/stop.sh" ] && [ "$SERVICE_STOPPED" = "false" ]; then
        log "Trying stop.sh script..."
        if "$APP_DIR/stop.sh" 2>/dev/null; then
            log "Service stopped via stop.sh"
            SERVICE_STOPPED=true
        fi
    fi

    # Only use kill as last resort
    if [ "$SERVICE_STOPPED" = "false" ]; then
        log "No service management succeeded, using process termination as last resort..."
        if command -v pkill >/dev/null 2>&1; then
            pkill -f "agent-studio" 2>/dev/null || true
        fi
    fi

    # Wait for service to stop and verify port is released
    log "Waiting for service to fully stop on port $CONFIGURED_PORT..."
    local WAIT_COUNT=0
    local MAX_WAIT=20

    while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
        if ! curl -s "http://localhost:$CONFIGURED_PORT/api/health" >/dev/null 2>&1 && ! lsof -i :$CONFIGURED_PORT >/dev/null 2>&1; then
            success "Service stopped successfully on port $CONFIGURED_PORT"
            return 0
        fi

        # Force kill if still responding after 15 seconds
        if [ $WAIT_COUNT -eq 15 ] && [ "$SERVICE_STOPPED" = "false" ]; then
            warn "Service still responding after 15 seconds, force killing processes on port $CONFIGURED_PORT..."
            if command -v lsof >/dev/null 2>&1; then
                PIDS=$(lsof -ti :$CONFIGURED_PORT 2>/dev/null)
                if [ -n "$PIDS" ]; then
                    echo "$PIDS" | xargs kill -9 2>/dev/null || true
                fi
            fi
        fi

        sleep 1
        WAIT_COUNT=$((WAIT_COUNT + 1))
    done

    warn "Service may not have fully stopped on port $CONFIGURED_PORT after $MAX_WAIT seconds"
}

# Stop service for restart (quiet version)
stop_service_for_restart() {
    log "Stopping service for restart on port $CONFIGURED_PORT..."

    # Try to stop using agent-studio management script first (preferred method)
    if [ -f "$APP_DIR/agent-studio" ]; then
        "$APP_DIR/agent-studio" stop >/dev/null 2>&1 || true
    fi

    # Try launchctl service management (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if launchctl list | grep -q "com.agentstudio.daemon"; then
            launchctl stop "com.agentstudio.daemon" 2>/dev/null || true
        fi
    fi

    # Try systemd service management (Linux)
    if command -v systemctl >/dev/null 2>&1; then
        if systemctl is-active --quiet agent-studio 2>/dev/null; then
            sudo systemctl stop agent-studio 2>/dev/null || true
        fi
    fi

    # Try legacy methods as fallback
    if [ -f "$SCRIPT_DIR/service.sh" ]; then
        "$SCRIPT_DIR/service.sh" stop 2>/dev/null || true
    fi

    if [ -f "$APP_DIR/stop.sh" ]; then
        "$APP_DIR/stop.sh" 2>/dev/null || true
    fi

    # Kill any remaining processes only as last resort
    if command -v pkill >/dev/null 2>&1; then
        pkill -f "agent-studio" 2>/dev/null || true
    fi

    # Wait for service to stop and verify port is released
    local WAIT_COUNT=0
    local MAX_WAIT=15

    while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
        if ! lsof -i :$CONFIGURED_PORT >/dev/null 2>&1; then
            log "Port $CONFIGURED_PORT is now free"
            return 0
        fi

        # Force kill if still in use after 10 seconds
        if [ $WAIT_COUNT -eq 10 ]; then
            log "Force killing processes on port $CONFIGURED_PORT..."
            if command -v lsof >/dev/null 2>&1; then
                PIDS=$(lsof -ti :$CONFIGURED_PORT 2>/dev/null)
                if [ -n "$PIDS" ]; then
                    echo "$PIDS" | xargs kill -9 2>/dev/null || true
                fi
            fi
        fi

        sleep 1
        WAIT_COUNT=$((WAIT_COUNT + 1))
    done

    warn "Port $CONFIGURED_PORT may still be in use after stopping service"
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
    header_log "Updating dependencies and building application..."

    cd "$APP_DIR"

    # Check which package manager is available
    if [ -f "pnpm-lock.yaml" ] && command -v pnpm >/dev/null 2>&1; then
        log "Using pnpm..."
        log "Installing dependencies..."
        pnpm install

        log "Building shared packages..."
        pnpm --filter shared run build

        log "Building backend..."
        pnpm --filter backend run build

        log "Building frontend for production..."
        NODE_ENV=production pnpm --filter frontend run build

    elif command -v npm >/dev/null 2>&1; then
        log "Using npm..."
        log "Installing dependencies..."
        npm install

        log "Building shared packages..."
        npm --filter shared run build

        log "Building backend..."
        npm --filter backend run build

        log "Building frontend for production..."
        NODE_ENV=production npm --filter frontend run build

    else
        error "No package manager found. Please install npm or pnpm."
        exit 1
    fi

    success "Dependencies updated and full build completed"
    log "✅ Backend built for production"
    log "✅ Frontend built for production"
    log "✅ Application ready for production deployment"
}

# Start service
start_service() {
    header_log "Starting Agent Studio service..."

    # Check if service is already running and restart it to load new code
    if curl -s "http://localhost:$CONFIGURED_PORT/api/health" >/dev/null 2>&1; then
        log "Service is running on port $CONFIGURED_PORT, restarting to load updated code..."
        stop_service_for_restart
    fi

    # Ensure port is completely free before starting
    if lsof -i :$CONFIGURED_PORT >/dev/null 2>&1; then
        warn "Port $CONFIGURED_PORT is still in use, performing final cleanup..."
        if command -v lsof >/dev/null 2>&1; then
            PIDS=$(lsof -ti :$CONFIGURED_PORT 2>/dev/null)
            if [ -n "$PIDS" ]; then
                log "Force terminating remaining processes: $PIDS"
                echo "$PIDS" | xargs kill -9 2>/dev/null || true
                sleep 2
            fi
        fi
    fi

    local SERVICE_STARTED=false

    # Try to start using agent-studio management script first (preferred method)
    if [ -f "$APP_DIR/agent-studio" ]; then
        log "Starting service using agent-studio management script..."
        if "$APP_DIR/agent-studio" start >/dev/null 2>&1; then
            log "Service started via agent-studio script"
            SERVICE_STARTED=true
        else
            warn "agent-studio script failed to start service"
        fi
    fi

    # Try launchctl service management (macOS)
    if [[ "$OSTYPE" == "darwin"* ]] && [ "$SERVICE_STARTED" = "false" ]; then
        if [ -f "$HOME/Library/LaunchAgents/com.agentstudio.daemon.plist" ]; then
            log "Starting launchctl service..."
            if launchctl load "$HOME/Library/LaunchAgents/com.agentstudio.daemon.plist" 2>/dev/null; then
                if launchctl start "com.agentstudio.daemon" 2>/dev/null; then
                    log "Service started via launchctl"
                    SERVICE_STARTED=true
                else
                    launchctl unload "$HOME/Library/LaunchAgents/com.agentstudio.daemon.plist" 2>/dev/null || true
                    warn "Could not start launchctl service"
                fi
            else
                warn "Could not load launchctl service"
            fi
        fi
    fi

    # Try systemd service management (Linux)
    if command -v systemctl >/dev/null 2>&1 && [ "$SERVICE_STARTED" = "false" ]; then
        if systemctl is-enabled --quiet agent-studio 2>/dev/null; then
            log "Starting systemd service..."
            if sudo systemctl start agent-studio 2>/dev/null; then
                log "Service started via systemd"
                SERVICE_STARTED=true
            else
                warn "Could not start systemd service"
            fi
        fi
    fi

    # Try legacy service script
    if [ -f "$SCRIPT_DIR/service.sh" ] && [ "$SERVICE_STARTED" = "false" ]; then
        log "Trying legacy service script..."
        if "$SCRIPT_DIR/service.sh" start 2>/dev/null; then
            log "Service started via legacy script"
            SERVICE_STARTED=true
        fi
    fi

    # Fallback to start.sh script
    if [ -f "$APP_DIR/start.sh" ] && [ "$SERVICE_STARTED" = "false" ]; then
        log "Running start.sh script..."
        "$APP_DIR/start.sh" &
        local START_PID=$!
        sleep 2

        if kill -0 $START_PID 2>/dev/null; then
            log "Service started via start.sh script (PID: $START_PID)"
            SERVICE_STARTED=true
        fi
    fi

    # If nothing worked, report error
    if [ "$SERVICE_STARTED" = "false" ]; then
        error "All service start methods failed"
        return 1
    fi

    # Wait for service to be fully responsive
    log "Waiting for service to become responsive on port $CONFIGURED_PORT..."
    local START_WAIT_COUNT=0
    local MAX_START_WAIT=45

    while [ $START_WAIT_COUNT -lt $MAX_START_WAIT ]; do
        if curl -s "http://localhost:$CONFIGURED_PORT/api/health" >/dev/null 2>&1; then
            success "Agent Studio service is running and accessible on port $CONFIGURED_PORT"
            return 0
        fi

        sleep 1
        START_WAIT_COUNT=$((START_WAIT_COUNT + 1))

        # Show progress every 5 seconds
        if [ $((START_WAIT_COUNT % 5)) -eq 0 ]; then
            log "Still waiting for service to respond... (${START_WAIT_COUNT}s/${MAX_START_WAIT}s)"
        fi

        # If service management script was used, check status
        if [ $START_WAIT_COUNT -eq 20 ] && [ -f "$APP_DIR/agent-studio" ]; then
            log "Checking service status..."
            "$APP_DIR/agent-studio" status >/dev/null 2>&1 || true
        fi
    done

    error "Service failed to respond to health checks within $MAX_START_WAIT seconds"
    error "Service may have started but is not accessible on port $CONFIGURED_PORT"

    # Show troubleshooting information
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check service status: $APP_DIR/agent-studio status"
    echo "2. Check logs: $APP_DIR/agent-studio logs"
    echo "3. Check port: lsof -i :$CONFIGURED_PORT"
    echo "4. Manual restart: $APP_DIR/agent-studio restart"

    return 1
}

# Verify update
verify_update() {
    header_log "Verifying update..."

    # Check if service is running
    sleep 3

    if curl -s "http://localhost:$CONFIGURED_PORT/api/health" >/dev/null 2>&1; then
        success "Agent Studio is running and accessible on port $CONFIGURED_PORT"
    else
        warn "Agent Studio might not be running properly on port $CONFIGURED_PORT"
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
    echo "🌐 Application: http://localhost:$CONFIGURED_PORT/"
    echo "🔧 Local API: http://localhost:$CONFIGURED_PORT/api/*"
    echo "📑 Slides: http://localhost:$CONFIGURED_PORT/slides/*"
    echo ""
    echo "💡 Service Management:"
    echo "  • To restart service later: $0 --restart"
    echo "  • To check service status: curl http://localhost:$CONFIGURED_PORT/api/health"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "  • macOS service management: $APP_DIR/agent-studio [start|stop|restart|status|logs]"
        echo "  • Service is managed by launchctl: com.agentstudio.daemon"
    fi
    echo ""
    echo "If you encounter any issues, you can restore from backup:"
    echo "  $BACKUP_DIR/restore.sh"
}

# Run main function
main "$@"