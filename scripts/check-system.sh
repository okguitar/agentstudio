#!/bin/bash

# System Compatibility Checker for Agent Studio
# This script checks if your system is compatible with Agent Studio

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo "╔══════════════════════════════════════════╗"
echo "║   Agent Studio Compatibility Checker     ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
else
    OS="Unknown ($OSTYPE)"
fi

log "Operating System: $OS"

# Check GLIBC version (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v ldd >/dev/null 2>&1; then
        GLIBC_VERSION=$(ldd --version 2>/dev/null | head -n1 | sed -n 's/.*[^0-9]\([0-9][0-9]*\.[0-9][0-9]*\)$/\1/p')
        if [ -z "$GLIBC_VERSION" ]; then
            GLIBC_VERSION="unknown"
        fi
        log "GLIBC Version: $GLIBC_VERSION"

        if [ "$GLIBC_VERSION" != "unknown" ]; then
            GLIBC_MAJOR=$(echo "$GLIBC_VERSION" | cut -d. -f1)
            GLIBC_MINOR=$(echo "$GLIBC_VERSION" | cut -d. -f2)

            if [ "$GLIBC_MAJOR" -gt 2 ] || ([ "$GLIBC_MAJOR" -eq 2 ] && [ "$GLIBC_MINOR" -ge 28 ]); then
                success "GLIBC 2.28+ detected - Compatible with Node.js 22 (latest LTS)"
                RECOMMENDED_NODE="22 (latest LTS)"
            elif [ "$GLIBC_MAJOR" -eq 2 ] && [ "$GLIBC_MINOR" -ge 27 ]; then
                warn "GLIBC 2.27 detected - Compatible with Node.js 18"
                RECOMMENDED_NODE="18"
            elif [ "$GLIBC_MAJOR" -eq 2 ] && [ "$GLIBC_MINOR" -ge 17 ]; then
                warn "GLIBC $GLIBC_VERSION detected - Compatible with Node.js 16"
                RECOMMENDED_NODE="16"
            else
                error "GLIBC $GLIBC_VERSION is too old for modern Node.js"
                error "Please upgrade your system or use a newer distribution"
                RECOMMENDED_NODE="Not compatible"
            fi
        fi
    else
        warn "Cannot detect GLIBC version"
    fi
fi

echo ""
log "Checking dependencies..."

# Check curl
if command -v curl >/dev/null 2>&1; then
    success "✓ curl is installed"
else
    error "✗ curl is NOT installed (required)"
fi

# Check git
if command -v git >/dev/null 2>&1; then
    success "✓ git is installed"
    log "  Version: $(git --version)"
else
    warn "✗ git is NOT installed (recommended)"
fi

# Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'v' -f2 | cut -d'.' -f1)

    if [ "$NODE_MAJOR" -ge 18 ]; then
        success "✓ Node.js is installed: $NODE_VERSION"
    else
        warn "✗ Node.js $NODE_VERSION is too old (need 18+)"
    fi
else
    log "○ Node.js is NOT installed (will be installed automatically)"
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    success "✓ npm is installed: $(npm --version)"
else
    log "○ npm is NOT installed (will be installed with Node.js)"
fi

# Check pnpm
if command -v pnpm >/dev/null 2>&1; then
    success "✓ pnpm is installed: $(pnpm --version)"
else
    log "○ pnpm is NOT installed (optional, can be installed during setup)"
fi

# Check disk space
AVAILABLE_SPACE=$(df -BM . 2>/dev/null | tail -1 | awk '{print $4}' | sed 's/M//')
if [ -n "$AVAILABLE_SPACE" ] && [ "$AVAILABLE_SPACE" -gt 500 ]; then
    success "✓ Sufficient disk space available"
else
    warn "⚠ Low disk space (need at least 500MB)"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "Summary:"
echo "═══════════════════════════════════════════"
echo "Operating System: $OS"
if [ -n "$RECOMMENDED_NODE" ]; then
    echo "Recommended Node.js: $RECOMMENDED_NODE"
fi
echo ""

if [[ "$RECOMMENDED_NODE" == "Not compatible" ]]; then
    error "Your system is not compatible with Agent Studio"
    echo ""
    echo "Please upgrade your system to a newer distribution with GLIBC 2.17+"
    exit 1
else
    success "Your system is compatible with Agent Studio!"
    echo ""
    echo "To install Agent Studio, run:"
    echo "  curl -fsSL https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/remote-install.sh | bash"
    echo ""
fi
