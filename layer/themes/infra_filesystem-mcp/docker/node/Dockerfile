FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    bash \
    git \
    make \
    g++ \
    python3 \
    chromium \
    firefox-esr

# Install global npm packages
RUN bun install -g \
    typescript \
    ts-node \
    @angular/cli \
    @vue/cli \
    create-react-app \
    yarn \
    pnpm

# Set up Playwright browsers
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Create workspace directory
WORKDIR /workspace

# Install test dependencies
RUN bun install -g \
    @cucumber/cucumber \
    @playwright/test \
    jest \
    mocha \
    chai

# Copy test runner script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]