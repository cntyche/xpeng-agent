#!/usr/bin/env bash
# scripts/apply-patches.sh
# Apply all (or specified) patches from patches/ directory onto the current branch.
# Use after switching branches or pulling upstream changes.
#
# Usage:
#   scripts/apply-patches.sh                  # apply all patches/*.patch
#   scripts/apply-patches.sh tool-registry    # apply patches/tool-registry.patch

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENCODE_DIR="$REPO_ROOT/opencode"
PATCHES_DIR="$REPO_ROOT/patches"

log() { printf "\033[1;34m[apply-patches]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[apply-patches]\033[0m %s\n" "$*" >&2; }

[ -d "$OPENCODE_DIR" ] || { err "opencode/ directory missing"; exit 1; }
[ -d "$PATCHES_DIR" ] || { err "patches/ directory missing"; exit 1; }

target="${1:-}"

apply_patch() {
  local patch_file="$1"
  log "Applying $(basename "$patch_file")"
  (cd "$OPENCODE_DIR" && git apply --whitespace=nowarn --3way "$patch_file") \
    || { err "Failed to apply $patch_file"; return 1; }
}

if [ -n "$target" ]; then
  if [ -f "$PATCHES_DIR/$target.patch" ]; then
    apply_patch "$PATCHES_DIR/$target.patch"
  else
    err "Patch not found: $PATCHES_DIR/$target.patch"
    exit 1
  fi
else
  shopt -s nullglob
  for p in "$PATCHES_DIR"/*.patch; do
    apply_patch "$p"
  done
fi

log "All requested patches applied."
