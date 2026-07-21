#!/usr/bin/env bash
#
# Waits until the OpenBoxes app responds on its healthcheck endpoint.
# First boot runs the full Liquibase migration suite and can take several
# minutes.
#
# Usage: ./wait-for-app.sh [base_url] [timeout_seconds]

set -euo pipefail

BASE_URL="${1:-http://localhost:8080/openboxes}"
TIMEOUT="${2:-900}"

echo "Waiting up to ${TIMEOUT}s for ${BASE_URL}/health ..."
start=$(date +%s)
while true; do
    status=$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/health" || true)
    if [ "$status" = "200" ]; then
        echo "App is up ($(( $(date +%s) - start ))s)."
        exit 0
    fi
    if [ $(( $(date +%s) - start )) -ge "$TIMEOUT" ]; then
        echo "ERROR: app did not become healthy within ${TIMEOUT}s (last status: ${status})." >&2
        exit 1
    fi
    sleep 10
done
