#!/usr/bin/env bash
# scripts/bootstrap.sh
# One-command bootstrap: install Bun, install deps, create workspace skeleton.
# Idempotent — safe to re-run.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
XPENGAGENT_DIR="$REPO_ROOT/opencode"

log() { printf "\033[1;34m[bootstrap]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[bootstrap]\033[0m %s\n" "$*" >&2; }
err() { printf "\033[1;31m[bootstrap]\033[0m %s\n" "$*" >&2; }

ensure_bun() {
  if command -v bun >/dev/null 2>&1; then
    log "Bun already installed: $(bun --version)"
    return
  fi
  warn "Bun not found. Falling back to npm install -g bun ..."
  if command -v npm >/dev/null 2>&1; then
    npm install -g bun
  elif command -v curl >/dev/null 2>&1; then
    curl -fsSL https://bun.sh/install | bash
  else
    err "Cannot install Bun: neither npm nor curl available."
    err "Install Bun manually: https://bun.sh"
    exit 1
  fi
  log "Bun installed: $(bun --version)"
}

install_xpengagent_deps() {
  if [ -d "$XPENGAGENT_DIR" ]; then
    log "Installing XPENGagent monorepo dependencies (--ignore-scripts to skip native builds)..."
    (
      cd "$XPENGAGENT_DIR"
      bun install --ignore-scripts
    )
  else
    warn "opencode/ directory not found. Skipping dep install."
  fi
}

ensure_workspace_dirs() {
  log "Ensuring workspace skeleton exists ..."
  mkdir -p \
    "$REPO_ROOT/private-agent/agents" \
    "$REPO_ROOT/private-agent/prompts/system" \
    "$REPO_ROOT/private-agent/prompts/agents" \
    "$REPO_ROOT/private-agent/prompts/skills" \
    "$REPO_ROOT/private-agent/prompts/output-format" \
    "$REPO_ROOT/private-agent/prompts/style" \
    "$REPO_ROOT/private-agent/tools" \
    "$REPO_ROOT/private-agent/memory" \
    "$REPO_ROOT/private-agent/ppt/renderer" \
    "$REPO_ROOT/private-agent/workflows" \
    "$REPO_ROOT/private-agent/config" \
    "$REPO_ROOT/workspace/uploads" \
    "$REPO_ROOT/workspace/knowledge-base/raw" \
    "$REPO_ROOT/workspace/knowledge-base/parsed" \
    "$REPO_ROOT/workspace/knowledge-base/embeddings" \
    "$REPO_ROOT/workspace/knowledge-base/index" \
    "$REPO_ROOT/workspace/knowledge-base/metadata" \
    "$REPO_ROOT/workspace/projects" \
    "$REPO_ROOT/workspace/outputs" \
    "$REPO_ROOT/workspace/sessions" \
    "$REPO_ROOT/docs/architecture" \
    "$REPO_ROOT/docs/opencode-analysis" \
    "$REPO_ROOT/docs/update-notes" \
    "$REPO_ROOT/scripts" \
    "$REPO_ROOT/patches"
}

verify_phase0() {
  if [ -d "$XPENGAGENT_DIR" ]; then
    log "Running bun run typecheck on packages/core ..."
    (cd "$XPENGAGENT_DIR/packages/core" && bun run typecheck) || warn "typecheck failed"
    log "Running bun run build on packages/xpengagent ..."
    (cd "$XPENGAGENT_DIR/packages/opencode" && bun run build) || warn "build failed"
  fi
}

main() {
  log "Repo root: $REPO_ROOT"
  ensure_bun
  install_xpengagent_deps
  ensure_workspace_dirs
  verify_phase0
  log "Bootstrap complete. Next steps:"
  log "  1. Read README.md"
  log "  2. Read docs/opencode-analysis/*.md"
  log "  3. Move to Phase 1 (control layer adaptation)"
}

main "$@"
