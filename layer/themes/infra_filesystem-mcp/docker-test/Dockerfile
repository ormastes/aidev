# MCP Testing Container
FROM node:20-alpine

# Install required packages
RUN apk add --no-cache \
    python3 \
    py3-pip \
    git \
    bash \
    curl \
    jq \
    docker-cli

# Install Claude CLI (simulated for testing)
# In production, replace with actual Claude CLI installation
RUN npm install -g @modelcontextprotocol/sdk

# Set working directory
WORKDIR /app

# Copy MCP server files
COPY ../mcp-server*.js /app/mcp-servers/
COPY ../package.json /app/mcp-servers/
COPY ../package-lock.json /app/mcp-servers/

# Install MCP dependencies
WORKDIR /app/mcp-servers
RUN npm ci

# Copy test framework
WORKDIR /app
COPY ./src /app/src
COPY ./tests /app/tests
COPY ./prompts /app/prompts
COPY ./scripts /app/scripts

# Install test dependencies
COPY ./package.json /app/
RUN npm install

# Create results directory
RUN mkdir -p /results

# Set environment variables
ENV MCP_BASE_PATH=/workspace
ENV TEST_MODE=true
ENV NODE_ENV=test

# Make scripts executable
RUN chmod +x /app/scripts/*.sh

# Default command
CMD ["npm", "test"]