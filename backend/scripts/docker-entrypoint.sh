#!/bin/sh
set -eu

should_run_migrations() {
  case "${RUN_DB_MIGRATIONS:-true}" in
    0|false|FALSE|False|no|NO|No)
      return 1
      ;;
    *)
      return 0
      ;;
  esac
}

if should_run_migrations; then
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "DATABASE_URL is required to run Prisma migrations." >&2
    exit 1
  fi

  if [ ! -f "prisma.config.ts" ]; then
    echo "prisma.config.ts is required to run Prisma migrations with Prisma 7." >&2
    exit 1
  fi

  echo "Aplicando atualizações seguras do banco..."
  umask 077
  migration_output="$(mktemp)"
  cleanup_migration_output() {
    rm -f "$migration_output"
  }
  trap cleanup_migration_output EXIT

  if ./node_modules/.bin/prisma migrate deploy >"$migration_output" 2>&1; then
    cleanup_migration_output
    trap - EXIT
    echo "Atualizações do banco concluídas."
  else
    migration_status=$?
    cleanup_migration_output
    trap - EXIT
    echo "Não foi possível concluir as atualizações do banco com segurança." >&2
    exit "$migration_status"
  fi
else
  echo "Skipping Prisma migrations because RUN_DB_MIGRATIONS=${RUN_DB_MIGRATIONS:-false}."
fi

exec node --enable-source-maps dist/index.js
