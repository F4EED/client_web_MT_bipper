#!/usr/bin/env bash
# Ancien nom — redirige vers install.sh (installation simple).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "${ROOT}/install.sh" "$@"
