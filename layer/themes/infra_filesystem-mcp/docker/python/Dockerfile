FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    bash \
    git \
    make \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install UV package manager
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:$PATH"

# Install Python packages
RUN pip install --no-cache-dir \
    pytest \
    pytest-cucumber \
    pytest-asyncio \
    fastapi \
    uvicorn \
    flask \
    django \
    pywebview \
    selenium \
    playwright

# Install poetry
RUN pip install poetry

# Create workspace directory
WORKDIR /workspace

# Copy test runner script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]