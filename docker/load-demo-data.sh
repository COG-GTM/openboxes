#!/usr/bin/env bash
#
# Loads the OpenBoxes demo dataset (products, locations, users, inventory,
# stock lists) into a running instance via the configuration-wizard API.
#
# Usage: ./load-demo-data.sh [base_url] [username] [password]
#   base_url defaults to http://localhost:8080/openboxes
#
# The demo data CSVs are fetched by the app itself from the upstream
# openboxes/openboxes repository (see openboxes.configurationWizard.dataInit
# in grails-app/conf/runtime.groovy), so the app container needs outbound
# internet access. The endpoint is idempotent enough for a fresh database;
# re-running it against an already-seeded database may create duplicates.

set -euo pipefail

BASE_URL="${1:-http://localhost:8080/openboxes}"
USERNAME="${2:-admin}"
PASSWORD="${3:-password}"

COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "Logging in to ${BASE_URL} as ${USERNAME}..."
curl --fail --silent --show-error --output /dev/null \
    --cookie-jar "$COOKIE_JAR" \
    "${BASE_URL}/auth/login"

# On success handleLogin responds with a redirect away from the login page;
# on bad credentials it re-renders the login view (200) or redirects back to
# /auth/login, so check the redirect target rather than relying on --fail.
LOGIN_REDIRECT="$(curl --fail --silent --show-error --output /dev/null \
    --cookie "$COOKIE_JAR" --cookie-jar "$COOKIE_JAR" \
    --data "username=${USERNAME}&password=${PASSWORD}" \
    --write-out '%{redirect_url}' \
    "${BASE_URL}/auth/handleLogin")"
if [ -z "$LOGIN_REDIRECT" ] || printf '%s' "$LOGIN_REDIRECT" | grep -q '/auth/login'; then
    echo "ERROR: login failed for user '${USERNAME}' (check credentials and that the app is fully started)." >&2
    exit 1
fi

echo "Loading demo data (this takes a minute or two)..."
# Unauthenticated requests are 302-redirected to the login page rather than
# rejected with an error code, so assert on the final status code (no --fail
# here so 4xx/5xx also reach the check below).
DEMO_STATUS="$(curl --silent --show-error --output /dev/null \
    --cookie "$COOKIE_JAR" \
    --max-time 600 \
    --write-out '%{http_code}' \
    "${BASE_URL}/api/config/data/demo")"
if [ "$DEMO_STATUS" != "200" ]; then
    echo "ERROR: demo data load failed (HTTP ${DEMO_STATUS})." >&2
    exit 1
fi

echo "Demo data loaded. Log in and choose a depot (e.g. Main Warehouse, Boston Warehouse, Chicago Warehouse) to see inventory."
