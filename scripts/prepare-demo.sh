#!/usr/bin/env bash
# Prepare the source tree for a static-export "demo" build.
# This is a destructive operation; run only in CI on a fresh checkout.

set -euo pipefail

echo "[prepare-demo] Stripping API routes (incompatible with output: export)..."
rm -rf src/app/api

echo "[prepare-demo] Swapping force-dynamic → force-static in pages..."
find src/app -name "*.tsx" -type f -exec \
  sed -i.bak 's/export const dynamic = "force-dynamic"/export const dynamic = "force-static"/g' {} \;
find src/app -name "*.tsx.bak" -type f -delete

echo "[prepare-demo] Done."
