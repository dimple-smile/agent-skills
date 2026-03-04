#!/bin/bash
# Dev-log service start script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Files
PORT_FILE="$SCRIPT_DIR/port.txt"
TUNNEL_URL_FILE="$SCRIPT_DIR/tunnel-url.txt"
PID_FILE="$SCRIPT_DIR/pid.txt"
SERVER_SCRIPT="$SCRIPT_DIR/dist/cli.cjs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

get_local_ip() {
    if command -v ip &> /dev/null; then
        ip route get 1 2>/dev/null | awk '{print $7; exit}' 2>/dev/null && return
    fi
    if command -v ifconfig &> /dev/null; then
        ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1 && return
    fi
    echo "localhost"
}

check_existing_service() {
    if [ ! -f "$PORT_FILE" ]; then
        log_info "No port.txt found, service not running"
        return 1
    fi

    PORT=$(cat "$PORT_FILE" 2>/dev/null || echo "")
    if [ -z "$PORT" ]; then
        log_warn "port.txt is empty"
        return 1
    fi

    log_info "Testing existing service on port $PORT..."
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/health" 2>/dev/null | grep -q "200"; then
        log_info "Service is healthy on port $PORT"
        return 0
    else
        log_warn "Service not responding on port $PORT"
        return 1
    fi
}

kill_old_process() {
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE" 2>/dev/null || echo "")
        if [ -n "$OLD_PID" ]; then
            if ps -p "$OLD_PID" > /dev/null 2>&1; then
                log_info "Killing old process with PID $OLD_PID"
                kill "$OLD_PID" 2>/dev/null || true
                sleep 0.5
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

print_startup_info() {
    local port="$1"
    local tunnel_url="$2"
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

    if [ -n "$tunnel_url" ]; then
        echo -e "  ${GREEN}Tunnel:${NC}  $tunnel_url"
    fi

    echo ""
    echo "Usage:"
    echo "  - Local HTTP page: use Local address"
    echo "  - Mobile (same WiFi): use Network address"
    echo "  - HTTPS page / Remote: use Tunnel address"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

start_service() {
    log_info "Starting dev-log service..."

    if [ ! -f "$SERVER_SCRIPT" ]; then
        log_error "Server script not found at $SERVER_SCRIPT"
        exit 1
    fi

    if ! command -v node &> /dev/null; then
        log_error "node is not installed or not in PATH"
        exit 1
    fi

    kill_old_process

    TEMP_OUTPUT=$(mktemp)
    node "$SERVER_SCRIPT" > "$TEMP_OUTPUT" 2>&1 &

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

    log_info "Waiting for service to be ready..."
    if wait_for_healthy "$NEW_PORT"; then
        # Wait for tunnel
        sleep 2

        TUNNEL_URL=""
        if [ -f "$TUNNEL_URL_FILE" ]; then
            TUNNEL_URL=$(cat "$TUNNEL_URL_FILE" 2>/dev/null || echo "")
        fi

        print_startup_info "$NEW_PORT" "$TUNNEL_URL"

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

main() {
    log_info "=== Dev-log service startup ==="

    if check_existing_service; then
        PORT=$(cat "$PORT_FILE")
        TUNNEL_URL=""
        if [ -f "$TUNNEL_URL_FILE" ]; then
            TUNNEL_URL=$(cat "$TUNNEL_URL_FILE" 2>/dev/null || echo "")
        fi

        print_startup_info "$PORT" "$TUNNEL_URL"

        log_info "Reusing existing service"
        echo "$PORT"
        exit 0
    fi

    log_info "Starting new service..."
    if start_service; then
        exit 0
    else
        log_error "Failed to start service"
        exit 1
    fi
}

main
