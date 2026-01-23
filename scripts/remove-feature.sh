#!/bin/bash

# Feature Branch Removal Script
# 快速下线特性分支部署

set -e

# Configuration
BASE_DATA_DIR="${AGENTSTUDIO_HOME:-$HOME/agentstudio-home}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get current git branch
get_current_branch() {
    git rev-parse --abbrev-ref HEAD
}

# Sanitize branch name
sanitize_branch_name() {
    local branch="$1"
    echo "$branch" | sed 's/[^a-zA-Z0-9_-]/-/g' | tr '[:upper:]' '[:lower:]'
}

# Generate container name
get_container_name() {
    local branch="$1"
    echo "agentstudio-${branch}"
}

# List all feature deployments
list_deployments() {
    log_info "Listing all feature branch deployments..."
    echo ""
    
    local containers=$(docker ps -a --filter "label=agentstudio.branch" --format "{{.Names}}")
    
    if [ -z "$containers" ]; then
        log_warn "No feature branch deployments found"
        return
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    printf "%-30s %-15s %-10s %-20s\n" "CONTAINER" "STATUS" "PORT" "BRANCH"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    while IFS= read -r container; do
        local status=$(docker inspect "$container" --format='{{.State.Status}}')
        local port=$(docker inspect "$container" --format='{{range $p, $conf := .NetworkSettings.Ports}}{{if eq $p "4936/tcp"}}{{if $conf}}{{(index $conf 0).HostPort}}{{else}}-{{end}}{{end}}{{end}}')
        local branch=$(docker inspect "$container" --format='{{index .Config.Labels "agentstudio.branch"}}')
        
        printf "%-30s %-15s %-10s %-20s\n" "$container" "$status" "$port" "$branch"
    done <<< "$containers"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Remove specific deployment
remove_deployment() {
    local target_branch="$1"
    
    if [ -z "$target_branch" ]; then
        # Use current branch if not specified
        target_branch=$(get_current_branch)
        
        if [ "$target_branch" = "main" ] || [ "$target_branch" = "master" ]; then
            log_error "Cannot remove main/master branch deployment"
            exit 1
        fi
    fi
    
    log_info "Removing deployment for branch: $target_branch"
    
    local safe_branch=$(sanitize_branch_name "$target_branch")
    local container_name=$(get_container_name "$safe_branch")
    local data_dir="${BASE_DATA_DIR}/${safe_branch}"
    
    # Check if container exists
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
        log_error "Container $container_name not found"
        log_info "Available deployments:"
        list_deployments
        exit 1
    fi
    
    # Show deployment info
    log_info "Container: $container_name"
    log_info "Data directory: $data_dir"
    echo ""
    
    # Confirm removal
    read -p "Do you want to remove this deployment? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Removal cancelled"
        exit 0
    fi
    
    # Stop and remove container
    log_info "Stopping container..."
    docker stop "$container_name" >/dev/null 2>&1 || true
    
    log_info "Removing container..."
    docker rm "$container_name" >/dev/null 2>&1 || true
    
    log_success "Container removed"
    
    # Ask about data directory
    if [ -d "$data_dir" ]; then
        echo ""
        read -p "Do you want to remove the data directory? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Removing data directory..."
            rm -rf "$data_dir"
            log_success "Data directory removed"
        else
            log_info "Data directory preserved: $data_dir"
        fi
    fi
    
    # Ask about Docker image
    local image_tag="agentstudio:${safe_branch}"
    if docker images -q "$image_tag" 2>/dev/null | grep -q .; then
        echo ""
        read -p "Do you want to remove the Docker image? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Removing Docker image..."
            docker rmi "$image_tag" >/dev/null 2>&1 || true
            log_success "Docker image removed"
        fi
    fi
    
    echo ""
    log_success "✨ Deployment removed successfully!"
}

# Clean up all stopped deployments
cleanup_all() {
    log_warn "This will remove all stopped feature branch deployments"
    echo ""
    read -p "Are you sure? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleanup cancelled"
        exit 0
    fi
    
    local stopped_containers=$(docker ps -a --filter "label=agentstudio.branch" --filter "status=exited" --format "{{.Names}}")
    
    if [ -z "$stopped_containers" ]; then
        log_info "No stopped deployments found"
        return
    fi
    
    log_info "Removing stopped containers..."
    while IFS= read -r container; do
        log_info "  Removing: $container"
        docker rm "$container" >/dev/null 2>&1 || true
    done <<< "$stopped_containers"
    
    log_success "Cleanup completed"
}

# Main
case "${1:-}" in
    list|ls)
        list_deployments
        ;;
    remove|rm)
        remove_deployment "$2"
        ;;
    cleanup)
        cleanup_all
        ;;
    *)
        echo "Feature Branch Deployment Management"
        echo ""
        echo "Usage:"
        echo "  $0 list                 List all deployments"
        echo "  $0 remove [branch]      Remove deployment (current branch if not specified)"
        echo "  $0 cleanup              Remove all stopped deployments"
        echo ""
        echo "Examples:"
        echo "  $0 list"
        echo "  $0 remove"
        echo "  $0 remove feature-new-ui"
        echo "  $0 cleanup"
        exit 1
        ;;
esac
