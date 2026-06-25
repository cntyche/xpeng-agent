#!/usr/bin/env bash
# scripts/analyze-upstream-diff.sh
# Surface touch-points in upstream XPENGagent that may conflict with our modifications.
# Helps before merging.
#
# Usage:
#   scripts/analyze-upstream-diff.sh            # read docs/update-notes/upstream-diff.patch

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIFF="$REPO_ROOT/docs/update-notes/upstream-diff.patch"

[ -f "$DIFF" ] || { echo "Run scripts/sync-upstream.sh first to generate $DIFF"; exit 1; }

# Grep touch-points that our four-quadrant deep-modify affects.
QUADRANTS=(
  "src/agent"
  "src/tool"
  "src/session"
  "src/prompts"
  "packages/core/src/session"
  "packages/core/src/tool"
  "packages/core/src/system-context"
)

echo "Upstream diff path-touch analysis"
echo "=================================="
echo

for q in "${QUADRANTS[@]}"; do
  count=$(grep -c "^diff --git" "$DIFF" 2>/dev/null || echo 0)
  echo "## quadrant hint: $q"
  grep "^diff --git" "$DIFF" | grep -E "$q" || echo "  (no files matched)"
  echo
done

echo "Suspicious filename keywords (registry / prompt / session / agent):"
grep "^diff --git" "$DIFF" | grep -E "registry|prompt|session|agent|system-context|tool" || echo "  (no files matched)"
echo

echo "Conflict-risk tier-1 (system-context / V2 runner):"
grep "^diff --git" "$DIFF" | grep -E "system-context|runner/llm" || echo "  (no files matched)"
