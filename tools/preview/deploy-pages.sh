#!/usr/bin/env bash
# Publishes the web preview to GitHub Pages: https://onderhalis.github.io/blobfit/
#
#   tools/preview/deploy-pages.sh
#
# Builds the committed, pushed source for the /blobfit sub-path and commits the result to the
# gh-pages branch, together with a workflow that verifies the live URL with the Playwright smoke
# test. The preview is the web build: it keeps data in the visitor's browser and is not the native app.
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ -n "$(git status --porcelain)" ]; then
  echo "Commit your changes first: the preview records the source commit it was built from." >&2
  exit 1
fi
source_commit=$(git rev-parse HEAD)
git fetch -q origin
if [ -z "$(git branch -r --contains "$source_commit")" ]; then
  echo "Push $source_commit first: the verification workflow checks it out from GitHub." >&2
  exit 1
fi

npm run build:pages
build_id="${source_commit:0:12}-$(date -u +%Y%m%dT%H%M%SZ)"
printf '{\n  "sourceCommit": "%s",\n  "buildId": "%s",\n  "kind": "web preview (not the native app)"\n}\n' "$source_commit" "$build_id" > dist/preview.json
mkdir -p dist/.github/workflows
cp tools/preview/verify-preview.yml dist/.github/workflows/verify-preview.yml

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
if git ls-remote --exit-code --heads origin gh-pages > /dev/null; then
  git clone -q --depth 1 --branch gh-pages "$(git remote get-url origin)" "$work"
  find "$work" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
else
  git -C "$work" init -q -b gh-pages
  git -C "$work" remote add origin "$(git remote get-url origin)"
fi
cp -a dist/. "$work"/
git -C "$work" add -A
git -C "$work" -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" \
  commit -q -m "Web preview of ${source_commit:0:12} (build $build_id)"
git -C "$work" push -q origin gh-pages
echo "Published build $build_id. The 'Verify web preview' workflow on gh-pages checks the live URL."
