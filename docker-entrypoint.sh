#!/bin/bash
set -e

# Start nginx in the background
echo "Starting nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# Start backend
echo "Starting backend..."
cd /app/backend
pnpm run start &
BACKEND_PID=$!

# Function to handle shutdown
shutdown() {
    echo "Shutting down services..."
    kill $NGINX_PID $BACKEND_PID 2>/dev/null || true
    wait $NGINX_PID $BACKEND_PID 2>/dev/null || true
    exit 0
}

# Trap SIGTERM and SIGINT
trap shutdown SIGTERM SIGINT

# Wait for both processes
wait -n

# If one process exits, kill the other and exit
shutdown
