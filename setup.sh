#!/usr/bin/env bash
#
# alfursan — one-command setup
#
# Safe to run either inside a cloned repo or straight from the web:
#   curl -fsSL https://raw.githubusercontent.com/mblab2026/alfursan/main/setup.sh | bash
#
# It checks Docker, securely prompts for secrets (hidden input), writes a 0600 .env,
# ensures an image-based docker-compose.yml exists, then pulls and starts the app.
#
set -euo pipefail

IMAGE="ghcr.io/mblab2026/alfursan:1.1.0"
APP="alfursan"

say() { printf '==> %s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

# --- 1. Docker present? ------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  err "Docker is not installed or not on PATH. Install Docker Engine first."
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  err "The Docker Compose v2 plugin is missing. Install 'docker-compose-plugin' first."
  exit 1
fi

# A real terminal is required for hidden input, even when piped via 'curl | bash'.
if [ -r /dev/tty ]; then
  TTY=/dev/tty
else
  err "No TTY available for secure input. Re-run this script from an interactive shell."
  exit 1
fi

# --- 2. Prompt for secrets (hidden) -----------------------------------------
printf 'Enter SEATS_API_KEY (required): ' > "$TTY"
IFS= read -rs SEATS_API_KEY < "$TTY"; printf '\n' > "$TTY"
if [ -z "${SEATS_API_KEY}" ]; then
  err "SEATS_API_KEY is required. Nothing was written."
  exit 1
fi

printf 'Enter REFRESH_PASSWORD (optional — leave blank to auto-generate): ' > "$TTY"
IFS= read -rs REFRESH_PASSWORD < "$TTY"; printf '\n' > "$TTY"

GENERATED=0
if [ -z "${REFRESH_PASSWORD}" ]; then
  REFRESH_PASSWORD="$(openssl rand -base64 24 2>/dev/null || head -c 18 /dev/urandom | base64)"
  GENERATED=1
fi

# --- 3. Ensure an image-based compose file exists ---------------------------
# If you're inside the repo, the existing docker-compose.yml (build + image) is reused.
if [ ! -f docker-compose.yml ]; then
  say "writing docker-compose.yml (public image: ${IMAGE})"
  cat > docker-compose.yml <<YAML
services:
  alfursan:
    image: ${IMAGE}
    container_name: alfursan
    env_file: .env
    ports:
      - "8080:8080"
    volumes:
      - alfursan-data:/data
    tmpfs:
      - /tmp
    read_only: true
    security_opt:
      - no-new-privileges:true
    restart: unless-stopped

volumes:
  alfursan-data:
YAML
fi

# --- 4. Write .env (0600) ----------------------------------------------------
umask 077
cat > .env <<ENV
SEATS_API_KEY=${SEATS_API_KEY}
SEATS_SOURCE=saudia
ORIGIN_REGION=Asia
ORIGINS=
REFRESH_HOURS=6
REFRESH_PASSWORD=${REFRESH_PASSWORD}
ENV
chmod 600 .env
say "wrote .env (permissions 600)"

if [ "${GENERATED}" -eq 1 ]; then
  printf '\n'
  say "A REFRESH_PASSWORD was auto-generated. Save it now — it is shown only once:"
  printf '\n      %s\n\n' "${REFRESH_PASSWORD}"
fi

# --- 5. Pull & start ---------------------------------------------------------
say "pulling image and starting the container..."
docker compose pull
docker compose up -d

printf '\n'
say "${APP} is up. Local: http://localhost:8080   Health: http://localhost:8080/healthz"
say "Public (once the tunnel is mapped): https://alfursan.globalmblab.com"
