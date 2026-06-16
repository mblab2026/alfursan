#!/bin/sh
set -eu

# --- Fail fast: never start without the upstream API key -------------------
if [ -z "${SEATS_API_KEY:-}" ]; then
  echo "FATAL: SEATS_API_KEY is not set or empty. Set it in the environment (.env) before starting 'alfursan'. Refusing to start." >&2
  exit 1
fi

# --- Run the app -----------------------------------------------------------
# EXACTLY ONE worker: the in-process refresh scheduler must run once and only
# once. Never raise --workers. Concurrency is handled with threads.
# exec => gunicorn becomes PID 1 and receives SIGTERM directly for fast,
# graceful shutdown. Logs go only to stdout/stderr.
exec gunicorn \
  --workers 1 \
  --threads 4 \
  --timeout 120 \
  --graceful-timeout 25 \
  --worker-tmp-dir /tmp \
  --access-logfile - \
  --error-logfile - \
  --bind "0.0.0.0:${PORT:-8080}" \
  app:app
