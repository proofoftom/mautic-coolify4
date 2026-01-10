#!/bin/bash
# Mautic Theme Tester - Environment Setup
# Verifies Docker is running, loads credentials, starts dev-browser

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="${MAUTIC_PROJECT_DIR:-$(pwd)}"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.local.yaml"
ENV_FILE="$PROJECT_DIR/.env"

echo "🔧 Setting up Mautic theme testing environment..."

# Function to check if Docker Compose is running
check_docker() {
    if [ ! -f "$COMPOSE_FILE" ]; then
        echo -e "${RED}✗ Docker Compose file not found: $COMPOSE_FILE${NC}"
        echo "  Run this from the project root or set MAUTIC_PROJECT_DIR"
        return 1
    fi

    if ! docker compose -f "$COMPOSE_FILE" ps &>/dev/null; then
        echo -e "${YELLOW}⚠ Docker Compose not running${NC}"
        echo "  Starting: docker compose -f $COMPOSE_FILE up -d"
        docker compose -f "$COMPOSE_FILE" up -d
        echo -e "${GREEN}✓ Docker Compose started${NC}"
    else
        # Check if mautic_web is healthy
        if docker compose -f "$COMPOSE_FILE" ps | grep -q "mautic_web.*running"; then
            echo -e "${GREEN}✓ Docker Compose is running${NC}"
        else
            echo -e "${YELLOW}⚠ mautic_web container not healthy${NC}"
            docker compose -f "$COMPOSE_FILE" up -d
            sleep 3
        fi
    fi
}

# Function to load credentials from .env
load_credentials() {
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
        MAUTIC_ADMIN_USERNAME="${MAUTIC_ADMIN_USERNAME:-admin}"
        MAUTIC_ADMIN_PASSWORD="${MAUTIC_ADMIN_PASSWORD:-}"
        MAUTIC_URL="${MAUTIC_URL:-http://localhost:8080}"
    else
        echo -e "${YELLOW}⚠ .env file not found, using defaults${NC}"
        MAUTIC_ADMIN_USERNAME="admin"
        MAUTIC_ADMIN_PASSWORD=""
        MAUTIC_URL="http://localhost:8080"
    fi

    if [ -z "$MAUTIC_ADMIN_PASSWORD" ]; then
        echo -e "${RED}✗ MAUTIC_ADMIN_PASSWORD not set${NC}"
        echo "  Set it in .env or enter it now:"
        read -s MAUTIC_ADMIN_PASSWORD
    fi

    echo -e "${GREEN}✓ Credentials loaded (user: $MAUTIC_ADMIN_USERNAME)${NC}"
}

# Function to check/start dev-browser
check_dev_browser() {
    DEV_BROWSER_DIR="$HOME/.claude/plugins/cache/dev-browser-marketplace/dev-browser/*/skills/dev-browser"

    if [ ! -d "$DEV_BROWSER_DIR" ]; then
        echo -e "${RED}✗ dev-browser not found${NC}"
        return 1
    fi

    # Check if server is already running
    if curl -s http://localhost:9222 >/dev/null 2>&1; then
        echo -e "${GREEN}✓ dev-browser server is running${NC}"
        return 0
    fi

    echo "  Starting dev-browser server..."
    cd "$DEV_BROWSER_DIR" && ./server.sh &
    SERVER_PID=$!

    # Wait for server to be ready
    for i in {1..30}; do
        if curl -s http://localhost:9222 >/dev/null 2>&1; then
            echo -e "${GREEN}✓ dev-browser server started${NC}"
            return 0
        fi
        sleep 1
    done

    echo -e "${RED}✗ dev-browser server failed to start${NC}"
    return 1
}

# Export variables for use in other scripts
export MAUTIC_ADMIN_USERNAME
export MAUTIC_ADMIN_PASSWORD
export MAUTIC_URL
export PROJECT_DIR
export COMPOSE_FILE

# Run all checks
check_docker && load_credentials && check_dev_browser

echo -e "${GREEN}✓ Environment ready!${NC}"
