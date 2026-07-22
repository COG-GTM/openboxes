#!/usr/bin/env bash
#
# Runs the OpenAPI contract-test suite against a running, seeded OpenBoxes
# instance (see docs/migration/RUNNING_LOCALLY.md). Each test performs real
# requests and validates the responses against the specs under openapi/specs/.
#
# Usage:
#   ./run.sh              # run the whole suite
#   ./run.sh -k category  # pass extra args to pytest
#
# Environment:
#   OB_BASE_URL  (default http://localhost:8080/openboxes)
#   OB_USERNAME  (default admin)
#   OB_PASSWORD  (default password)

set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
    python3 -m venv .venv
fi
.venv/bin/pip install --quiet -r requirements.txt
exec .venv/bin/python -m pytest -v "$@"
