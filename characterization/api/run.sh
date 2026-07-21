#!/usr/bin/env bash
#
# Runs the API characterization (snapshot) suite against a running, seeded
# OpenBoxes instance (see docs/migration/RUNNING_LOCALLY.md).
#
# Usage:
#   ./run.sh                  # run the suite, fail on any snapshot diff
#   UPDATE_SNAPSHOTS=1 ./run.sh   # re-baseline: rewrite all snapshots
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
