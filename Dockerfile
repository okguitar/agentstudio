# Use Ubuntu as base image
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    NODE_VERSION=20 \
    PORT=4936 \
    HOME=/home/agentstudio

# Install basic dependencies and Node.js
RUN apt-get update && apt-get install -y \
    curl \
    git \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user with home directory
RUN useradd -m -s /bin/bash -d /home/agentstudio agentstudio

# Install agentstudio globally using npm (simpler than pnpm)
RUN npm install -g agentstudio

# Create necessary directories and set permissions
RUN mkdir -p /home/agentstudio/.agent-studio/{logs,data,config,backup} && \
    chown -R agentstudio:agentstudio /home/agentstudio

# Switch to non-root user for running the application
USER agentstudio
WORKDIR /home/agentstudio

# Expose backend port (default 4936, can be changed via environment)
EXPOSE 4936

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start agentstudio
CMD ["sh", "-c", "agentstudio start --port ${PORT}"]
