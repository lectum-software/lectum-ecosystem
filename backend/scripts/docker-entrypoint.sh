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
  echo "Applying Prisma migrations with prisma migrate deploy..."
  ./node_modules/.bin/prisma migrate deploy
else
  echo "Skipping Prisma migrations because RUN_DB_MIGRATIONS=${RUN_DB_MIGRATIONS:-false}."
fi

exec node dist/index.js
