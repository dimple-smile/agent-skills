#!/bin/bash
# Dev-log service start script
# This script checks if the existing service is healthy and starts a new one if needed

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Files
PORT_FILE="$SCRIPT_DIR/port.txt"
PID_FILE="$SCRIPT_DIR/pid.txt"
SERVER_SCRIPT="$SCRIPT_DIR/server.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/logs" 2>/dev/null | grep -q "200"; then
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

# Start the service
start_service() {
    log_info "Starting dev-log service..."

    # Check if server.js exists
    if [ ! -f "$SERVER_SCRIPT" ]; then
        log_error "server.js not found at $SERVER_SCRIPT"
        exit 1
    fi

    # Check if node is available
    if ! command -v node &> /dev/null; then
        log_error "node is not installed or not in PATH"
        exit 1
    fi

    # Kill any old process
    kill_old_process

    # Start the server in background
    # Redirect output to log file for debugging
    node "$SERVER_SCRIPT" > /dev/null 2>&1 &

    # Wait a bit for the server to start
    sleep 1

    # Check if port file was created
    if [ -f "$PORT_FILE" ]; then
        NEW_PORT=$(cat "$PORT_FILE")
        log_info "Service started successfully on port $NEW_PORT"
        echo "$NEW_PORT"
        return 0
    else
        log_error "Failed to start service - port.txt not created"
        return 1
    fi
}

# Main flow
main() {
    log_info "=== Dev-log service startup ==="

    # Check if existing service is healthy
    if check_existing_service; then
        PORT=$(cat "$PORT_FILE")
        log_info "Reusing existing service on port $PORT"
        echo "$PORT"
        exit 0
    fi

    # Service not healthy or not running, start new service
    log_info "Starting new service..."
    if start_service; then
        exit 0
    else
        log_error "Failed to start service"
        exit 1
    fi
}

# Run main
main
