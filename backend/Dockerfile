FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/src

# System deps: postgresql, redis-server, netcat for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql postgresql-contrib redis-server netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

WORKDIR /app

COPY pyproject.toml README.md alembic.ini ./
COPY src ./src
COPY migrations ./migrations

RUN uv pip install --system \
    fastapi "uvicorn[standard]" sqlalchemy[ascio] asyncpg alembic \
    "starlette<1.3" \
    pydantic pydantic-settings python-jose[crypto] bcrypt \
    python-dotenv httpx psycopg[binary] email-validator pydantic-extra-types \
    resend stripe paystackapi python-multipart redis boto3

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["docker-entrypoint.sh"]
