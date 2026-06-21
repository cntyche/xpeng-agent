#!/usr/bin/env bash
# scripts/sync-upstream.sh
# Pull the latest OpenCode upstream, produce a diff against the current private-base,
# and prepare an automation report for the analysis Agent.
#
# Usage:
#   UPSTREAM_REMOTE=origin UPSTREAM_BRANCH=dev scripts/sync-upstream.sh
#
# Pre-requisites:
#   git remote add upstream https://github.com/sst/opencode.git   (only first time)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENCODE_DIR="$REPO_ROOT/opencode"
UPSTREAM_REMOTE="${UPSTREAM_REMOTE:-upstream}"
UPSTREAM_BRANCH="${UPSTREAM_BRANCH:-dev}"
BASE_BRANCH="${BASE_BRANCH:-dev}"

log() { printf "\033[1;34m[sync-upstream]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[sync-upstream]\033[0m %s\n" "$*" >&2; }

[ -d "$OPENCODE_DIR/.git" ] || { err "opencode/.git missing — not inside a submodule-like layout"; exit 1; }

(cd "$OPENCODE_DIR" && {
  log "Fetching $UPSTREAM_REMOTE/$UPSTREAM_BRANCH"
  git fetch "$UPSTREAM_REMOTE" "$UPSTREAM_BRANCH"

  log "Current branch:"
  git branch --show-current

  log "Diff stat $BASE_BRANCH..$UPSTREAM_REMOTE/$UPSTREAM_BRANCH"
  git --no-pager diff --stat "$BASE_BRANCH..$UPSTREAM_REMOTE/$UPSTREAM_BRANCH" || true

  log "Full diff saved to $REPO_ROOT/docs/update-notes/upstream-diff.patch"
  git diff "$BASE_BRANCH..$UPSTREAM_REMOTE/$UPSTREAM_BRANCH" > "$REPO_ROOT/docs/update-notes/upstream-diff.patch" || true

  log "Patch summary saved to $REPO_ROOT/docs/update-notes/upstream-diff-summary.txt"
  {
    echo "Upstream sync report"
    echo "Generated: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    echo "Base branch: $BASE_BRANCH"
    echo "Upstream: $UPSTREAM_REMOTE/$UPSTREAM_BRANCH"
    echo
    echo "== Diff stat =="
    git diff --stat "$BASE_BRANCH..$UPSTREAM_REMOTE/$UPSTREAM_BRANCH" || true
    echo
    echo "== Files touched =="
    git diff --name-only "$BASE_BRANCH..$UPSTREAM_REMOTE/$UPSTREAM_BRANCH" || true
  } > "$REPO_ROOT/docs/update-notes/upstream-diff-summary.txt"

  log "Updating private-base to merge upstream ..."
  git checkout "$BASE_BRANCH"
  git merge --no-ff "$UPSTREAM_REMOTE/$UPSTREAM_BRANCH" || {
    err "Merge conflict. Resolve manually with:"
    err "  cd $OPENCODE_DIR"
    err "  git status"
    err "  # resolve conflicts, then git commit"
    exit 1
  }
})

log "Upstream sync complete."
log "  diff patch: $REPO_ROOT/docs/update-notes/upstream-diff.patch"
log "  summary:    $REPO_ROOT/docs/update-notes/upstream-diff-summary.txt"
log "Next: analyze the diff and decide if private-core or private-agent patches need regeneration."
