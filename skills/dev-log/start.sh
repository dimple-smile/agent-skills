#!/bin/bash
# Dev-log service start script
# This script checks if the existing service is healthy and starts a new one if needed
#
# Usage:
#   ./start.sh          # Start HTTP + HTTPS
#   ./start.sh --tunnel # Start with tunnel for remote access

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Files - check dist directory first (for bundled version)
if [ -f "$SCRIPT_DIR/dist/server.cjs" ]; then
    DIST_DIR="$SCRIPT_DIR/dist"
else
    DIST_DIR="$SCRIPT_DIR"
fi

PORT_FILE="$DIST_DIR/port.txt"
HTTPS_PORT_FILE="$DIST_DIR/https-port.txt"
TUNNEL_URL_FILE="$DIST_DIR/tunnel-url.txt"
PID_FILE="$DIST_DIR/pid.txt"
SERVER_SCRIPT="$DIST_DIR/server.cjs"

# Fallback to source if dist not exists
if [ ! -f "$SERVER_SCRIPT" ]; then
    SERVER_SCRIPT="$SCRIPT_DIR/server.cjs"
    PORT_FILE="$SCRIPT_DIR/port.txt"
    HTTPS_PORT_FILE="$SCRIPT_DIR/https-port.txt"
    TUNNEL_URL_FILE="$SCRIPT_DIR/tunnel-url.txt"
    PID_FILE="$SCRIPT_DIR/pid.txt"
fi

# Parse arguments
ENABLE_TUNNEL=false
for arg in "$@"; do
    case $arg in
        --tunnel|-t)
            ENABLE_TUNNEL=true
            shift
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print colored message
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get local IP address
get_local_ip() {
    # Try to get local IP
    if command -v ip &> /dev/null; then
        ip route get 1 2>/dev/null | awk '{print $7; exit}' 2>/dev/null && return
    fi
    if command -v ifconfig &> /dev/null; then
        ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1 && return
    fi
    echo "localhost"
}

# Check if existing service is healthy
check_existing_service() {
    if [ ! -f "$PORT_FILE" ]; then
        log_info "No port.txt found, service not running"
        return 1
    fi

    # Read port from file
    PORT=$(cat "$PORT_FILE" 2>/dev/null || echo "")
    if [ -z "$PORT" ]; then
        log_warn "port.txt is empty"
        return 1
    fi

    # Test if service is responding
    log_info "Testing existing service on port $PORT..."
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/health" 2>/dev/null | grep -q "200"; then
        log_info "Service is healthy on port $PORT"
        return 0
    else
        log_warn "Service not responding on port $PORT"
        return 1
    fi
}

# Kill old process by pid file
kill_old_process() {
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE" 2>/dev/null || echo "")
        if [ -n "$OLD_PID" ]; then
            # Check if process is running
            if ps -p "$OLD_PID" > /dev/null 2>&1; then
                log_info "Killing old process with PID $OLD_PID"
                kill "$OLD_PID" 2>/dev/null || true
                # Wait for process to terminate
                sleep 0.5
                # Force kill if still running
                if ps -p "$OLD_PID" > /dev/null 2>&1; then
                    log_warn "Force killing process $OLD_PID"
                    kill -9 "$OLD_PID" 2>/dev/null || true
                fi
            else
                log_info "Old process $OLD_PID not running"
            fi
        fi
        rm -f "$PID_FILE"
    fi
}

# Wait for service to be healthy
wait_for_healthy() {
    local port="$1"
    local max_attempts=10
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/health" 2>/dev/null | grep -q "200"; then
            return 0
        fi
        sleep 0.5
        attempt=$((attempt + 1))
    done
    return 1
}

# Print startup info
print_startup_info() {
    local port="$1"
    local https_port="$2"
    local tunnel_url="$3"
    local local_ip
    local_ip=$(get_local_ip)

    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}Dev-log server is running${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    echo "Available addresses:"
    echo -e "  ${GREEN}Local:${NC}   http://localhost:$port"

    if [ -n "$local_ip" ] && [ "$local_ip" != "localhost" ]; then
        echo -e "  ${GREEN}Network:${NC} http://$local_ip:$port"
    fi

    if [ -n "$https_port" ]; then
        echo -e "  ${GREEN}HTTPS:${NC}   https://localhost:$https_port"
    fi

    if [ -n "$tunnel_url" ]; then
        echo -e "  ${GREEN}Tunnel:${NC}  $tunnel_url"
    fi

    echo ""
    echo -e "${YELLOW}Note:${NC} HTTPS uses self-signed certificate."
    echo "      First visit will show a security warning - click \"Continue\" to proceed."
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

# Start the service
start_service() {
    log_info "Starting dev-log service..."

    # Check if server script exists
    if [ ! -f "$SERVER_SCRIPT" ]; then
        log_error "Server script not found at $SERVER_SCRIPT"
        exit 1
    fi

    # Check if node is available
    if ! command -v node &> /dev/null; then
        log_error "node is not installed or not in PATH"
        exit 1
    fi

    # Kill any old process
    kill_old_process

    # Build start command
    START_CMD="node \"$SERVER_SCRIPT\""
    if [ "$ENABLE_TUNNEL" = true ]; then
        START_CMD="$START_CMD --tunnel"
    fi

    # Start the server in background, capture output
    TEMP_OUTPUT=$(mktemp)
    eval "$START_CMD" > "$TEMP_OUTPUT" 2>&1 &

    # Wait for port file to be created
    local max_wait=5
    local waited=0
    while [ ! -f "$PORT_FILE" ] && [ $waited -lt $max_wait ]; do
        sleep 0.5
        waited=$((waited + 1))
    done

    if [ ! -f "$PORT_FILE" ]; then
        log_error "Failed to start service - port.txt not created"
        cat "$TEMP_OUTPUT" 2>/dev/null
        rm -f "$TEMP_OUTPUT"
        return 1
    fi

    NEW_PORT=$(cat "$PORT_FILE")

    # Wait for service to be healthy
    log_info "Waiting for service to be ready..."
    if wait_for_healthy "$NEW_PORT"; then
        # Read HTTPS port if available
        HTTPS_PORT=""
        if [ -f "$HTTPS_PORT_FILE" ]; then
            HTTPS_PORT=$(cat "$HTTPS_PORT_FILE" 2>/dev/null || echo "")
        fi

        # Read tunnel URL if available
        TUNNEL_URL=""
        if [ -f "$TUNNEL_URL_FILE" ]; then
            TUNNEL_URL=$(cat "$TUNNEL_URL_FILE" 2>/dev/null || echo "")
        fi

        # Print startup info
        print_startup_info "$NEW_PORT" "$HTTPS_PORT" "$TUNNEL_URL"

        echo "$NEW_PORT"
        rm -f "$TEMP_OUTPUT"
        return 0
    else
        log_error "Service started but health check failed"
        cat "$TEMP_OUTPUT" 2>/dev/null
        rm -f "$TEMP_OUTPUT"
        return 1
    fi
}

# Main flow
main() {
    log_info "=== Dev-log service startup ==="

    # Check if existing service is healthy
    if check_existing_service; then
        PORT=$(cat "$PORT_FILE")

        # Read HTTPS port
        HTTPS_PORT=""
        if [ -f "$HTTPS_PORT_FILE" ]; then
            HTTPS_PORT=$(cat "$HTTPS_PORT_FILE" 2>/dev/null || echo "")
        fi

        # Read tunnel URL
        TUNNEL_URL=""
        if [ -f "$TUNNEL_URL_FILE" ]; then
            TUNNEL_URL=$(cat "$TUNNEL_URL_FILE" 2>/dev/null || echo "")
        fi

        # Print info for existing service
        print_startup_info "$PORT" "$HTTPS_PORT" "$TUNNEL_URL"

        log_info "Reusing existing service"
        echo "$PORT"
        exit 0
    fi

    # Service not healthy or not running, start new service
    log_info "Starting new service..."
    if [ "$ENABLE_TUNNEL" = true ]; then
        log_info "Tunnel enabled for remote access"
    fi

    if start_service; then
        exit 0
    else
        log_error "Failed to start service"
        exit 1
    fi
}

# Run main
main
