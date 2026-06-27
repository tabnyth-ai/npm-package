#!/usr/bin/env bash
#
# test.sh — build the Tabnyth packages, pack them into real npm tarballs, and
# install them into the backend so you can use them EXACTLY as if they were
# published to npm. When you're happy, re-run with `publish` to push to npm.
#
# Why tarballs (npm pack) instead of `file:` / `npm link`?
#   `npm pack` produces the same .tgz npm would upload on publish — it honors
#   each package's "files" allowlist and runs prepack hooks. Installing that
#   tarball is the closest local thing to a real published install, so what you
#   test is what your users get. (`file:`/`npm link` symlink the whole source
#   dir, devDeps and all, which can hide packaging bugs.)
#
# Usage:
#   ./test.sh                 # build + pack + install into the backend (default)
#   ./test.sh install         # same as above
#   ./test.sh publish         # build + publish all packages to npm (asks first)
#   INCLUDE_MONGODB=1 ./test.sh   # also install/publish the mongodb adapter
#   ./test.sh publish --yes   # skip the publish confirmation prompt
#
set -euo pipefail

# ---- Resolve paths (work no matter where the script is called from) ---------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$SCRIPT_DIR"                 # the monorepo root (packages/*)
BACKEND_DIR="$(cd "$SCRIPT_DIR/../backend" && pwd)"
PACK_DIR="$PACKAGE_DIR/.pack"             # where the .tgz files land

MODE="${1:-install}"

# Core first (adapters peer-depend on it), then the adapters.
CORE_PKG="tabnyth"
PG_PKG="@tabnyth/postgres"
MONGO_PKG="@tabnyth/mongodb"

# Which adapters to ship into the backend. Backend uses Postgres; opt into
# Mongo with INCLUDE_MONGODB=1.
ADAPTER_PKGS=("$PG_PKG")
if [ "${INCLUDE_MONGODB:-0}" = "1" ]; then
  ADAPTER_PKGS+=("$MONGO_PKG")
fi

log()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }

# ---- Shared build -----------------------------------------------------------
build_all() {
  cd "$PACKAGE_DIR"

  if [ ! -d node_modules ]; then
    log "Installing workspace dependencies (first run)"
    npm install --no-fund --no-audit
  fi

  log "Building all packages (tabnyth + adapters)"
  npm run build
  ok "Build complete"
}

# Pack one workspace into $PACK_DIR and print the absolute tarball path.
pack_pkg() {
  local name="$1"
  local filename
  filename="$(
    npm pack --workspace "$name" --pack-destination "$PACK_DIR" --json \
      | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);process.stdout.write(a[0].filename)})'
  )"
  printf '%s/%s' "$PACK_DIR" "$filename"
}

# ---- install mode -----------------------------------------------------------
install_mode() {
  build_all

  log "Packing tarballs into $PACK_DIR"
  rm -rf "$PACK_DIR"
  mkdir -p "$PACK_DIR"

  local tarballs=()
  tarballs+=("$(pack_pkg "$CORE_PKG")")
  for pkg in "${ADAPTER_PKGS[@]}"; do
    tarballs+=("$(pack_pkg "$pkg")")
  done
  for t in "${tarballs[@]}"; do ok "packed $(basename "$t")"; done

  # Back up the backend manifest so the local-tarball install is reversible.
  log "Backing up backend manifest"
  cp "$BACKEND_DIR/package.json" "$BACKEND_DIR/package.json.pretest-bak"
  if [ -f "$BACKEND_DIR/package-lock.json" ]; then
    cp "$BACKEND_DIR/package-lock.json" "$BACKEND_DIR/package-lock.json.pretest-bak"
  fi

  log "Installing tarballs into the backend ($BACKEND_DIR)"
  cd "$BACKEND_DIR"
  # --save records them in package.json as file:.tgz refs (behaves like a real
  # dependency). They resolve the `tabnyth` peer to the core tarball we install.
  npm install "${tarballs[@]}" --save --no-fund --no-audit

  ok "Installed. The backend now uses the packed (published-shape) packages."
  cat <<EOF

Next:
  • Use it from the backend, e.g.:   cd "$BACKEND_DIR" && npx tabnyth --help
  • Import in code:                  import ... from "tabnyth"  /  "@tabnyth/postgres"
  • Re-run after code changes:       ./test.sh
  • Revert to your source/workspace setup:
        mv "$BACKEND_DIR/package.json.pretest-bak" "$BACKEND_DIR/package.json"
        $( [ -f "$BACKEND_DIR/package-lock.json.pretest-bak" ] && echo "mv \"$BACKEND_DIR/package-lock.json.pretest-bak\" \"$BACKEND_DIR/package-lock.json\"" )
        cd "$BACKEND_DIR" && npm install
  • Happy with it?  Publish:         ./test.sh publish
EOF
}

# ---- publish mode -----------------------------------------------------------
publish_mode() {
  if ! npm whoami >/dev/null 2>&1; then
    warn "You are not logged in to npm. Run 'npm login' first."
    exit 1
  fi

  build_all

  local publish_list=("$CORE_PKG" "${ADAPTER_PKGS[@]}")
  log "About to publish to npm as $(npm whoami):"
  for pkg in "${publish_list[@]}"; do
    printf '   - %s@%s\n' "$pkg" "$(node -p "require('$PACKAGE_DIR/packages/$(pkg_dir "$pkg")/package.json').version")"
  done

  if [ "${2:-}" != "--yes" ]; then
    printf '\nProceed with publish? [y/N] '
    read -r answer
    case "$answer" in
      y|Y|yes|YES) ;;
      *) warn "Aborted."; exit 1 ;;
    esac
  fi

  # Core first so the adapters' peer dependency exists on the registry.
  for pkg in "${publish_list[@]}"; do
    log "Publishing $pkg"
    # Scoped @tabnyth/* packages need --access public on first publish.
    if [[ "$pkg" == @* ]]; then
      npm publish --workspace "$pkg" --access public
    else
      npm publish --workspace "$pkg"
    fi
    ok "Published $pkg"
  done

  ok "All packages published."
}

# Map a package name to its packages/<dir> folder name.
pkg_dir() {
  case "$1" in
    "$CORE_PKG") echo "core" ;;
    "$PG_PKG") echo "postgres" ;;
    "$MONGO_PKG") echo "mongodb" ;;
    *) echo "$1" ;;
  esac
}

# ---- dispatch ---------------------------------------------------------------
case "$MODE" in
  install) install_mode ;;
  publish) publish_mode "$@" ;;
  *) warn "Unknown mode '$MODE'. Use: ./test.sh [install|publish]"; exit 1 ;;
esac
