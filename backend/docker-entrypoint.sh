#!/usr/bin/env bash
set -euo pipefail

ROLE="${1:-api}"

case "$ROLE" in
  postgres)
    export PGDATA=/var/lib/postgresql/data
    mkdir -p "$PGDATA"
    chown -R postgres:postgres "$PGDATA"
    PG_VERSION="$(ls /usr/lib/postgresql/ 2>/dev/null | sort -V | tail -1 || echo '17')"
    DB_USER="${POSTGRES_USER:-vida}"
    DB_PASSWORD="${POSTGRES_PASSWORD:-vida}"
    DB_NAME="${POSTGRES_DB:-vida}"
    if [ ! -f "$PGDATA/PG_VERSION" ]; then
      echo "[vida:postgres] Initializing cluster (v${PG_VERSION})..."
      su - postgres -c "/usr/lib/postgresql/${PG_VERSION}/bin/initdb -D '$PGDATA' --no-locale --encoding=UTF8"
      echo "[vida:postgres] Bootstrapping role/db: ${DB_USER}/${DB_NAME}"
      su - postgres -c "/usr/lib/postgresql/${PG_VERSION}/bin/pg_ctl -D '$PGDATA' -o '-c listen_addresses=localhost' -w start"
      su - postgres -c "psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}' SUPERUSER;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
SQL"
      su - postgres -c "/usr/lib/postgresql/${PG_VERSION}/bin/pg_ctl -D '$PGDATA' -w stop"
    fi
    echo "[vida:postgres] Allowing container subnet in pg_hba.conf"
    echo "host all all 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"
    echo "host all all ::/0 md5" >> "$PGDATA/pg_hba.conf"
    echo "[vida:postgres] Starting..."
    exec su - postgres -c "/usr/lib/postgresql/${PG_VERSION}/bin/postgres -D '$PGDATA' -c 'listen_addresses=*'"
    ;;

  redis)
    echo "[vida:redis] Starting..."
    exec redis-server --bind 0.0.0.0
    ;;

  api)
    echo "[vida:api] Starting..."
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000
    ;;

  *)
    echo "Unknown role: $ROLE (expected: postgres | redis | api)" >&2
    exit 1
    ;;
esac
