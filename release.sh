#!/usr/bin/env bash
#
# release.sh — build & push a new AlFursan image to GHCR.
# Run on the DEV VM, inside the project folder (~/projects/alfursan-seats-finder).
#
# Usage:
#   ./release.sh           -> auto-increment the patch  (1.1.2 -> 1.1.3)
#   ./release.sh 1.2.0     -> explicit version (use for minor/major bumps)
#
# Prereq (already done once): docker-compose.yml uses
#   image: ghcr.io/mblab2026/alfursan:${TAG:-1.1.0}
#
set -euo pipefail

if [ ! -f docker-compose.yml ]; then
  echo "ERROR: run this from the project folder (docker-compose.yml not found)." >&2
  exit 1
fi

CURRENT="$(cat VERSION 2>/dev/null || echo 0.0.0)"

if [ -n "${1:-}" ]; then
  VERSION="$1"                       # explicit
else
  if ! echo "$CURRENT" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    echo "ERROR: VERSION ('$CURRENT') isn't X.Y.Z; pass one explicitly: $0 1.2.0" >&2
    exit 1
  fi
  IFS='.' read -r MA MI PA <<< "$CURRENT"
  VERSION="${MA}.${MI}.$((PA + 1))"  # auto-increment the patch
  echo "==> No version given; auto-bumping patch: ${CURRENT} -> ${VERSION}"
fi

echo "==> Setting version to ${VERSION}"
echo "${VERSION}" > VERSION

# Set TAG in .env (replace the line if present, otherwise add it).
if [ -f .env ] && grep -q '^TAG=' .env; then
  sed -i "s|^TAG=.*|TAG=${VERSION}|" .env
else
  echo "TAG=${VERSION}" >> .env
fi

echo "==> Resolved image:"
docker compose config | grep -m1 'image:'

echo "==> Building..."
docker compose build

echo "==> Pushing to GHCR..."
docker compose push

echo
echo "==> Done. Pushed ghcr.io/mblab2026/alfursan:${VERSION}"
echo "    Next:     on prod run  ./deploy.sh ${VERSION}"
echo "    Optional: git add -A && git commit -m \"release ${VERSION}\" && git push"
