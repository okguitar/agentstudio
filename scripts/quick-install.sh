#!/bin/bash

# Agent Studio Quick Install - One-liner script
# This is a minimal wrapper that downloads and runs the full installer

set -e

GITHUB_REPO="git-men/agentstudio"
GITHUB_BRANCH="main"
REMOTE_INSTALL_URL="https://raw.githubusercontent.com/$GITHUB_REPO/$GITHUB_BRANCH/scripts/remote-install.sh"

# Colors
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << 'EOF'
    _                    _     ____  _             _ _       
   / \   __ _  ___ _ __ | |_  / ___|| |_ _   _  __| (_) ___  
  / _ \ / _` |/ _ \ '_ \| __| \___ \| __| | | |/ _` | |/ _ \ 
 / ___ \ (_| |  __/ | | | |_   ___) | |_| |_| | (_| | | (_) |
/_/   \_\__, |\___|_| |_|\__| |____/ \__|\__,_|\__,_|_|\___/ 
        |___/                                               
EOF
echo -e "${NC}"
echo "Quick Installer - Downloading and running full installer..."
echo ""

# Download and execute the remote installer
curl -fsSL "$REMOTE_INSTALL_URL" | bash