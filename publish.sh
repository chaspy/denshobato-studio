#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Publishing @chaspy/denshobato-* packages ==="
echo ""
echo "OTP will be prompted for each package."
echo ""

echo "📦 1/4: @chaspy/denshobato-core"
pnpm publish --filter @chaspy/denshobato-core --access public --no-git-checks

echo ""
echo "📦 2/4: @chaspy/denshobato-ui"
pnpm publish --filter @chaspy/denshobato-ui --access public --no-git-checks

echo ""
echo "📦 3/4: @chaspy/denshobato-vite-plugin"
pnpm publish --filter @chaspy/denshobato-vite-plugin --access public --no-git-checks

echo ""
echo "📦 4/4: @chaspy/denshobato-server"
pnpm publish --filter @chaspy/denshobato-server --access public --no-git-checks

echo ""
echo "✅ All packages published!"
echo ""
echo "Verify:"
echo "  npm view @chaspy/denshobato-core version"
echo "  npm view @chaspy/denshobato-ui version"
echo "  npm view @chaspy/denshobato-vite-plugin version"
echo "  npm view @chaspy/denshobato-server version"
