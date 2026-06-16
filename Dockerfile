# syntax=docker/dockerfile:1

# ---------- builder: install dependencies into an isolated venv ----------
FROM python:3.12.8-slim-bookworm AS builder
ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY requirements.txt .
RUN python -m venv /opt/venv \
 && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ---------- runtime: minimal, non-root, read-only friendly ----------
FROM python:3.12.8-slim-bookworm AS runtime

# Unprivileged user/group to run the app (no shell, no home writes needed).
RUN groupadd --system --gid 10001 app \
 && useradd  --system --uid 10001 --gid app --home-dir /app --shell /usr/sbin/nologin app

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DATA_DIR=/data \
    PORT=8080

WORKDIR /app

# Python dependencies built in the previous stage (no build tooling or caches here).
COPY --from=builder /opt/venv /opt/venv

# Application code + static assets. No secrets are ever copied or baked in.
COPY app.py ./app.py
COPY static ./static
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Writable data dir owned by the non-root user (the cache volume mounts here).
RUN mkdir -p /data \
 && chmod +x /app/docker-entrypoint.sh \
 && chown -R app:app /app /data

USER app

EXPOSE 8080

# Liveness: hit /healthz using only the stdlib (no curl in the image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','8080')+'/healthz', timeout=3)" || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
