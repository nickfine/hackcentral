#!/usr/bin/env bash

set -euo pipefail

NODE22_BIN="/opt/homebrew/opt/node@22/bin"

if [[ ! -x "${NODE22_BIN}/node" || ! -x "${NODE22_BIN}/npm" ]]; then
  echo "Node 22.22.0 was not found at ${NODE22_BIN}." >&2
  echo "Install Homebrew node@22 or update scripts/with-node22.sh for this machine." >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  echo "Usage: scripts/with-node22.sh <command> [args...]" >&2
  exit 1
fi

export PATH="${NODE22_BIN}:${PATH}"
exec "$@"
