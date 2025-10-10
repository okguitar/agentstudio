# Use Ubuntu as base image
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    NODE_VERSION=20 \
    PNPM_VERSION=10.18.1 \
    PORT=4936

# Install basic dependencies, Node.js, and nginx
RUN apt-get update && apt-get install -y \
    curl \
    git \
    ca-certificates \
    nginx \
    && curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./

# Copy all workspace modules
COPY shared ./shared
COPY frontend ./frontend
COPY backend ./backend

# Install dependencies (this creates workspace links)
RUN pnpm install --frozen-lockfile

# Clean any tsbuildinfo files and build all modules
RUN find . -name "*.tsbuildinfo" -delete && \
    pnpm --filter shared run build && \
    cd /app/frontend && pnpm exec vite build && cd /app && \
    pnpm --filter backend run build

# Copy frontend build to nginx directory
RUN cp -r /app/frontend/dist/* /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Expose ports (nginx on 80, backend on 4936)
EXPOSE 80 4936

# Health check (check both nginx and backend)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/ && curl -f http://localhost:4936/api/health || exit 1

# Start both nginx and backend
ENTRYPOINT ["docker-entrypoint.sh"]
