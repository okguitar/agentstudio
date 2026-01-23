#!/bin/bash

# Feature Branch Deployment Script
# 快速部署和测试特性分支

set -e

# Configuration
BASE_DATA_DIR="${AGENTSTUDIO_HOME:-$HOME/agentstudio-home}"
PORT_RANGE_START=5000
PORT_RANGE_END=5999
DOMAIN_SUFFIX="${AGENTSTUDIO_DOMAIN:-preview.agentstudio.cc}"  # 特性分支预览域名

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

# Sanitize branch name for container/directory names
sanitize_branch_name() {
    local branch="$1"
    echo "$branch" | sed 's/[^a-zA-Z0-9_-]/-/g' | tr '[:upper:]' '[:lower:]'
}

# Find available port
find_available_port() {
    local start=$PORT_RANGE_START
    local end=$PORT_RANGE_END
    
    for port in $(seq $start $end); do
        if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo $port
            return 0
        fi
    done
    
    log_error "No available ports in range $start-$end"
    return 1
}

# Generate container name
get_container_name() {
    local branch="$1"
    echo "agentstudio-${branch}"
}

# Generate subdomain
get_subdomain() {
    local branch="$1"
    echo "${branch}.${DOMAIN_SUFFIX}"
}

# Check if container exists
container_exists() {
    local container_name="$1"
    docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"
}

# Check if container is running
container_running() {
    local container_name="$1"
    docker ps --format '{{.Names}}' | grep -q "^${container_name}$"
}

# Get container port
get_container_port() {
    local container_name="$1"
    docker inspect "$container_name" --format='{{range $p, $conf := .NetworkSettings.Ports}}{{if eq $p "4936/tcp"}}{{(index $conf 0).HostPort}}{{end}}{{end}}'
}

# Deploy feature branch
deploy() {
    log_info "Starting feature branch deployment..."
    
    # Get current branch
    local branch=$(get_current_branch)
    if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
        log_error "Cannot deploy main/master branch using this script"
        log_info "Use the standard deployment method instead"
        exit 1
    fi
    
    log_info "Current branch: $branch"
    
    # Sanitize branch name
    local safe_branch=$(sanitize_branch_name "$branch")
    log_info "Sanitized name: $safe_branch"
    
    # Create data directory
    local data_dir="${BASE_DATA_DIR}/${safe_branch}"
    mkdir -p "$data_dir"
    log_success "Created data directory: $data_dir"
    
    # Generate container name
    local container_name=$(get_container_name "$safe_branch")
    
    # Check if container already exists
    if container_exists "$container_name"; then
        log_warn "Container $container_name already exists"
        
        if container_running "$container_name"; then
            local existing_port=$(get_container_port "$container_name")
            local subdomain=$(get_subdomain "$safe_branch")
            
            log_info "Container is running:"
            log_info "  Container: $container_name"
            log_info "  Port: $existing_port"
            log_info "  URL: http://localhost:$existing_port"
            log_info "  Domain: http://$subdomain"
            
            read -p "Do you want to rebuild? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Skipping deployment"
                exit 0
            fi
            
            log_info "Stopping and removing existing container..."
            docker stop "$container_name" >/dev/null
            docker rm "$container_name" >/dev/null
        else
            log_info "Removing stopped container..."
            docker rm "$container_name" >/dev/null
        fi
    fi
    
    # Find available port
    local port=$(find_available_port)
    if [ $? -ne 0 ]; then
        exit 1
    fi
    log_success "Allocated port: $port"
    
    # Build Docker image
    log_info "Building Docker image..."
    local image_tag="agentstudio:${safe_branch}"
    docker build -t "$image_tag" . || {
        log_error "Docker build failed"
        exit 1
    }
    log_success "Image built: $image_tag"
    
    # Generate subdomain
    local subdomain=$(get_subdomain "$safe_branch")
    
    # Start container
    log_info "Starting container..."
    docker run -d \
        --name "$container_name" \
        --label "traefik.enable=true" \
        --label "traefik.http.routers.${safe_branch}.rule=Host(\`${subdomain}\`)" \
        --label "traefik.http.routers.${safe_branch}.entrypoints=websecure" \
        --label "traefik.http.routers.${safe_branch}.tls=true" \
        --label "traefik.http.routers.${safe_branch}.tls.certresolver=letsencrypt" \
        --label "traefik.http.services.${safe_branch}.loadbalancer.server.port=4936" \
        --label "agentstudio.branch=${branch}" \
        --label "agentstudio.deployed=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        -p "${port}:4936" \
        -v "${data_dir}:/home/agentstudio/.agent-studio" \
        -e NODE_ENV=production \
        -e PORT=4936 \
        --network agentstudio-network \
        --restart unless-stopped \
        "$image_tag" || {
        log_error "Failed to start container"
        exit 1
    }
    
    # Wait for container to be healthy
    log_info "Waiting for container to be healthy..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "http://localhost:${port}/api/health" >/dev/null 2>&1; then
            log_success "Container is healthy!"
            break
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -eq $max_attempts ]; then
            log_error "Container failed to become healthy"
            docker logs "$container_name" --tail 20
            exit 1
        fi
        
        sleep 2
    done
    
    # Success
    echo ""
    log_success "✨ Deployment successful!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Branch:     $branch"
    echo "  Container:  $container_name"
    echo "  Port:       $port"
    echo ""
    echo "  🌐 Access URLs:"
    echo "     Local:     http://localhost:$port"
    echo "     Domain:    http://$subdomain"
    echo ""
    echo "  📁 Data Directory:"
    echo "     $data_dir"
    echo ""
    echo "  🔧 Manage:"
    echo "     Logs:      docker logs -f $container_name"
    echo "     Stop:      docker stop $container_name"
    echo "     Remove:    ./scripts/remove-feature.sh"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Save deployment info
    local info_file="${data_dir}/.deployment-info.json"
    cat > "$info_file" <<EOF
{
  "branch": "$branch",
  "container": "$container_name",
  "port": $port,
  "subdomain": "$subdomain",
  "dataDir": "$data_dir",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "imageTag": "$image_tag"
}
EOF
    
    log_success "Deployment info saved to: $info_file"
}

# Main
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    *)
        echo "Usage: $0 [deploy]"
        exit 1
        ;;
esac
