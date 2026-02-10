#!/bin/bash

# Read dev-log script
# Usage: ./read-log.sh [sessionId]
#   - Without argument: Returns all logs
#   - With sessionId: Filters logs by sessionId
#
# Dependencies: jq (JSON processor)

set -euo pipefail

#-------------------------------------------------------------------------------
# Function: check_dependencies
# Description: Verify required command-line tools are available
# Returns: 0 if all dependencies present, exits with error otherwise
#-------------------------------------------------------------------------------
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        echo "Error: 'jq' is required but not installed." >&2
        echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)" >&2
        exit 1
    fi
}

#-------------------------------------------------------------------------------
# Function: validate_session_id
# Description: Validate sessionId argument is non-empty and not just whitespace
# Arguments: $1 - sessionId to validate
# Returns: 0 if valid, exits with error otherwise
#-------------------------------------------------------------------------------
validate_session_id() {
    local session_id="$1"

    # Check if empty or only whitespace
    if [[ -z "${session_id}" || "${session_id}" =~ ^[[:space:]]+$ ]]; then
        echo "Error: sessionId cannot be empty or whitespace." >&2
        exit 1
    fi

    # Warn if sessionId contains unusual characters (but allow it)
    if [[ "${session_id}" =~ [^a-zA-Z0-9_-] ]]; then
        echo "Warning: sessionId contains special characters which may not match log entries." >&2
    fi
}

#-------------------------------------------------------------------------------
# Function: is_valid_json
# Description: Check if a string contains valid JSON
# Arguments: $1 - JSON string to validate
# Returns: 0 if valid JSON, 1 otherwise
#-------------------------------------------------------------------------------
is_valid_json() {
    local json_string="$1"
    echo "${json_string}" | jq empty &> /dev/null
    return $?
}

#-------------------------------------------------------------------------------
# Function: read_logs
# Description: Read and return logs, optionally filtered by sessionId
# Arguments: $1 - (optional) sessionId to filter by
# Returns: Outputs JSON array of log entries to stdout
#-------------------------------------------------------------------------------
read_logs() {
    local session_id="${1:-}"

    # If log file doesn't exist, return empty array
    if [[ ! -f "${LOG_FILE}" ]]; then
        echo "[]"
        return 0
    fi

    # Read and validate JSON format
    local log_content
    log_content=$(cat "${LOG_FILE}")

    if ! is_valid_json "${log_content}"; then
        echo "Error: Log file contains invalid JSON: ${LOG_FILE}" >&2
        echo "[]" >&2
        exit 1
    fi

    # Return all logs or filter by sessionId
    if [[ -z "${session_id}" ]]; then
        echo "${log_content}" | jq -r '.'
    else
        echo "${log_content}" | jq -r --arg sid "${session_id}" '[.[] | select(.sessionId == $sid)]'
    fi
}

#-------------------------------------------------------------------------------
# Main execution
#-------------------------------------------------------------------------------

# Check dependencies
check_dependencies

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/dev-logs.json"

# Validate argument count
if [[ $# -gt 1 ]]; then
    echo "Warning: Multiple arguments provided. Only using first argument as sessionId." >&2
fi

# Process based on arguments
if [[ $# -eq 0 ]]; then
    # No argument: Return all logs
    read_logs
else
    # Has sessionId argument: Validate and filter
    SESSION_ID="$1"
    validate_session_id "${SESSION_ID}"
    read_logs "${SESSION_ID}"
fi
