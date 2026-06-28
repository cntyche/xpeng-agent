#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/../dist"
RAW_OUTPUT="${1:-./release}"
VERSION="${2:-0.0.0-dev-$(date +%Y%m%d%H%M)}"

if [[ "$RAW_OUTPUT" != /* ]]; then
  OUTPUT_DIR="$(pwd)/$RAW_OUTPUT"
else
  OUTPUT_DIR="$RAW_OUTPUT"
fi

mkdir -p "$OUTPUT_DIR/$VERSION"

echo "Packaging xpengagent v${VERSION}..."

for dir in "$DIST_DIR"/xpengagent-*/; do
  name=$(basename "$dir")
  if [ ! -d "$dir/bin" ]; then
    echo "Skipping $name (no bin/)"
    continue
  fi

  os=$(echo "$name" | sed 's/xpengagent-//' | cut -d- -f1)
  ext="tar.gz"
  if [ "$os" = "windows" ]; then
    ext="zip"
  fi

  filename="${name}.${ext}"
  echo "  Creating ${filename}..."

  if [ "$ext" = "tar.gz" ]; then
    tar -czf "$OUTPUT_DIR/$VERSION/$filename" -C "$dir/bin" .
  else
    if command -v zip >/dev/null 2>&1; then
      (cd "$dir/bin" && zip -rq "$OUTPUT_DIR/$VERSION/$filename" .)
    else
      echo "  Falling back to tar.gz for $name (zip not installed)"
      tar -czf "${OUTPUT_DIR}/${VERSION}/${name}.tar.gz" -C "$dir/bin" .
    fi
  fi
done

cat > "$OUTPUT_DIR/$VERSION/version.json" << EOF
{
  "version": "${VERSION}",
  "name": "xpengagent",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

cp "$SCRIPT_DIR/install.sh" "$OUTPUT_DIR/$VERSION/install.sh"
chmod +x "$OUTPUT_DIR/$VERSION/install.sh"

echo ""
echo "Done! Release packages in: $OUTPUT_DIR/$VERSION/"
echo ""
echo "Files:"
ls -lh "$OUTPUT_DIR/$VERSION/"
echo ""
echo "Upload to server, then users can install with:"
echo "  curl -fsSL ${XPENGAGENT_BASE_URL:-https://your-server.com/xpengagent}/${VERSION}/install.sh | bash"
