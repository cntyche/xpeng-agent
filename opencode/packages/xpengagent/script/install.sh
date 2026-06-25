#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${XPENGAGENT_BASE_URL:-https://xpengagent.cc.cd/releases}"
VERSION="${XPENGAGENT_VERSION:-latest}"
INSTALL_DIR="${XPENGAGENT_INSTALL_DIR:-$HOME/.local/bin}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { printf "${GREEN}[INFO]${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }
error() { printf "${RED}[ERROR]${NC} %s\n" "$1" >&2; }

detect_platform() {
  local os arch abi avx2

  case "$(uname -s)" in
    Linux)  os="linux" ;;
    Darwin) os="darwin" ;;
    MINGW*|MSYS*|CYGWIN*|Windows_NT) os="windows" ;;
    *) error "Unsupported OS: $(uname -s)"; exit 1 ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) error "Unsupported arch: $(uname -m)"; exit 1 ;;
  esac

  abi=""
  if [ "$os" = "linux" ]; then
    if [ -f /etc/alpine-release ] || { command -v ldd >/dev/null 2>&1 && ldd --version 2>&1 | grep -qi musl; }; then
      abi="musl"
    fi
  fi

  avx2=false
  if [ "$arch" = "x64" ]; then
    if [ "$os" = "linux" ] && [ -f /proc/cpuinfo ]; then
      if grep -qi "avx2" /proc/cpuinfo 2>/dev/null; then
        avx2=true
      fi
    elif [ "$os" = "darwin" ] && command -v sysctl >/dev/null 2>&1; then
      if [ "$(sysctl -n hw.optional.avx2_0 2>/dev/null)" = "1" ]; then
        avx2=true
      fi
    fi
  fi

  local name="${os}-${arch}"
  if [ "$avx2" = false ] && [ "$arch" = "x64" ]; then
    name="${name}-baseline"
  fi
  if [ -n "$abi" ]; then
    name="${name}-${abi}"
  fi

  echo "${name}"
}

resolve_version() {
  if [ "$VERSION" = "latest" ]; then
    local version_url="${BASE_URL}/version.json"
    local version_json
    version_json=$(curl -fsSL "$version_url" 2>/dev/null) || {
      error "Failed to fetch version.json from ${version_url}"
      exit 1
    }
    VERSION=$(echo "$version_json" | grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"//')
    if [ -z "$VERSION" ]; then
      error "Could not parse version from version.json"
      exit 1
    fi
  fi
  info "Installing xpengagent v${VERSION}"
}

download() {
  local platform="$1"
  local ext="tar.gz"
  local bin_name="xpengagent"
  if [ "$ext" = "tar.gz" ]; then
    local filename="xpengagent-${platform}.tar.gz"
  fi

  case "$(echo "$platform" | cut -d- -f1)" in
    windows) ext="zip"; filename="xpengagent-${platform}.zip"; bin_name="xpengagent.exe" ;;
  esac

  local url="${BASE_URL}/${VERSION}/${filename}"

  if [ "$(echo "$platform" | cut -d- -f1)" = "windows" ] && ! command -v unzip >/dev/null 2>&1; then
    ext="tar.gz"
    filename="xpengagent-${platform}.tar.gz"
    bin_name="xpengagent.exe"
    url="${BASE_URL}/${VERSION}/${filename}"
  fi
  local tmpdir
  tmpdir=$(mktemp -d)
  local archive="${tmpdir}/${filename}"

  info "Downloading ${url}"
  curl -fsSL -o "$archive" "$url" || {
    error "Failed to download ${url}"
    rm -rf "$tmpdir"
    exit 1
  }

  info "Extracting..."
  if [ "$ext" = "tar.gz" ]; then
    tar -xzf "$archive" -C "$tmpdir"
  else
    command -v unzip >/dev/null 2>&1 || { error "unzip is required for Windows archives"; rm -rf "$tmpdir"; exit 1; }
    unzip -oq "$archive" -d "$tmpdir"
  fi

  local binary="${tmpdir}/${bin_name}"
  if [ ! -f "$binary" ]; then
    binary=$(find "$tmpdir" -name "$bin_name" -type f | head -1)
  fi
  if [ ! -f "$binary" ]; then
    error "Binary ${bin_name} not found in archive"
    rm -rf "$tmpdir"
    exit 1
  fi

  mkdir -p "$INSTALL_DIR"
  cp "$binary" "${INSTALL_DIR}/${bin_name}"
  chmod +x "${INSTALL_DIR}/${bin_name}"

  rm -rf "$tmpdir"

  info "Installed xpengagent to ${INSTALL_DIR}/${bin_name}"

  if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
    warn "Add ${INSTALL_DIR} to your PATH:"
    local shell_rc="$HOME/.bashrc"
    if [ -f "$HOME/.zshrc" ]; then shell_rc="$HOME/.zshrc"; fi
    warn "  echo 'export PATH=\"${INSTALL_DIR}:\$PATH\"' >> ${shell_rc}"
    warn "  source ${shell_rc}"
  fi
}

main() {
  info "XPENGagent Installer"

  resolve_version

  local platform
  platform=$(detect_platform)
  info "Detected platform: ${platform}"

  download "$platform"

  if [ -f "${INSTALL_DIR}/xpengagent" ]; then
    local installed_version
    installed_version=$("${INSTALL_DIR}/xpengagent" --version 2>/dev/null || echo "unknown")
    info "xpengagent ${installed_version} installed successfully!"
    info "Run 'xpengagent' to start."
  fi
}

main "$@"
