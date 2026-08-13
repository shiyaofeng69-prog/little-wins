#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
NODE_BIN="${NODE_BIN:-node}"

cd "$PROJECT_DIR"

"$PYTHON_BIN" -m pytest -q
"$PYTHON_BIN" -m compileall -q api scripts
"$NODE_BIN" node_modules/eslint/bin/eslint.js .
NODE_OPTIONS=--max-old-space-size=768 "$NODE_BIN" node_modules/vite/bin/vite.js build
git diff --check

echo "Little Wins self-test passed."
