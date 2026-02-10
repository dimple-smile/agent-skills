#!/bin/bash

# Read dev-log script
# Usage: ./read-log.sh [sessionId]
#   - Without argument: Returns all logs
#   - With sessionId: Filters logs by sessionId

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/dev-logs.json"

# Check if log file exists
if [[ ! -f "${LOG_FILE}" ]]; then
    echo "[]" | jq -r '.'
    exit 0
fi

# Check if sessionId argument is provided
if [[ $# -eq 0 ]]; then
    # No argument: Return all logs
    cat "${LOG_FILE}" | jq -r '.'
else
    # Has sessionId argument: Filter logs by sessionId
    SESSION_ID="$1"
    cat "${LOG_FILE}" | jq -r --arg sid "${SESSION_ID}" '[.[] | select(.sessionId == $sid)]'
fi
