#!/usr/bin/env bash
# scripts/save-patch.sh
# Generate a .patch file by diffing the current branch against the base branch.
# Use this after making changes under opencode/ to record them as a patch in patches/.
#
# Usage:
#   scripts/save-patch.sh <name>            # e.g. tool-registry, prompt-loader
#   BASE_BRANCH=dev scripts/save-patch.sh agent-runtime

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
XPENGAGENT_DIR="$REPO_ROOT/opencode"
PATCHES_DIR="$REPO_ROOT/patches"
BASE_BRANCH="${BASE_BRANCH:-dev}"

name="${1:-}"
[ -n "$name" ] || { echo "Usage: $0 <patch-name>"; exit 1; }

[ -d "$XPENGAGENT_DIR/.git" ] || { echo "opencode/.git missing"; exit 1; }

(cd "$XPENGAGENT_DIR" && {
  branch="$(git branch --show-current)"
  echo "[save-patch] current branch: $branch"
  echo "[save-patch] base branch:    $BASE_BRANCH"
  git diff "$BASE_BRANCH" > "$PATCHES_DIR/$name.patch" || true
  git status --short
})

if [ -s "$PATCHES_DIR/$name.patch" ]; then
  echo "[save-patch] wrote $PATCHES_DIR/$name.patch"
else
  echo "[save-patch] WARNING: empty diff produced"
fi
