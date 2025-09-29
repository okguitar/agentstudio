#!/bin/bash

# macOS Log Rotation Script for AI Editor Backend
# This script should be run via cron

LOG_DIR="/var/log/agent-studio-backend"
MAX_SIZE="10M"
RETENTION_DAYS="30"

# Function to get file size in bytes
get_file_size() {
    if [[ -f "$1" ]]; then
        stat -f%z "$1" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# Function to convert size string to bytes
size_to_bytes() {
    local size="$1"
    case "${size: -1}" in
        "K"|"k") echo $((${size%?} * 1024)) ;;
        "M"|"m") echo $((${size%?} * 1024 * 1024)) ;;
        "G"|"g") echo $((${size%?} * 1024 * 1024 * 1024)) ;;
        *) echo "${size}" ;;
    esac
}

# Convert MAX_SIZE to bytes
MAX_SIZE_BYTES=$(size_to_bytes "$MAX_SIZE")

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Rotate logs if they exceed max size
for log_file in "$LOG_DIR"/*.log; do
    if [[ -f "$log_file" ]]; then
        file_size=$(get_file_size "$log_file")
        
        if [[ "$file_size" -gt "$MAX_SIZE_BYTES" ]]; then
            timestamp=$(date +"%Y%m%d_%H%M%S")
            mv "$log_file" "${log_file}.${timestamp}"
            touch "$log_file"
            chown agent-studio:staff "$log_file"
            
            # Compress the rotated log
            gzip "${log_file}.${timestamp}"
        fi
    fi
done

# Remove old compressed logs
find "$LOG_DIR" -name "*.log.*.gz" -mtime +$RETENTION_DAYS -delete

# Ensure log files exist and have correct permissions
for log_name in "output.log" "error.log"; do
    log_file="$LOG_DIR/$log_name"
    if [[ ! -f "$log_file" ]]; then
        touch "$log_file"
    fi
    chown agent-studio:staff "$log_file"
done