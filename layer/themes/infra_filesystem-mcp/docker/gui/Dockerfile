FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install X11 and GUI dependencies
RUN apt-get update && apt-get install -y \
    # X11
    xvfb \
    x11vnc \
    x11-utils \
    xauth \
    # Window managers
    fluxbox \
    # GUI libraries
    libgtk-3-0 \
    libgtk-4-1 \
    libqt5gui5 \
    libqt6gui6 \
    # Browsers for testing
    chromium-browser \
    firefox \
    # CEF dependencies
    libxss1 \
    libnss3 \
    libasound2 \
    # Python GUI
    python3 \
    python3-pip \
    python3-tk \
    # Node.js for Electron
    nodejs \
    npm \
    # Utilities
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Python GUI packages
RUN pip3 install pywebview PyQt5 PyQt6 tkinter

# Install Electron
RUN bun install -g electron electron-builder

# Setup virtual display
ENV DISPLAY=:99
RUN echo '#!/bin/bash\nXvfb :99 -screen 0 1920x1080x24 &\nexec "$@"' > /entrypoint-xvfb.sh && \
    chmod +x /entrypoint-xvfb.sh

# Create workspace directory
WORKDIR /workspace

# Copy test runner script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint-xvfb.sh", "/entrypoint.sh"]