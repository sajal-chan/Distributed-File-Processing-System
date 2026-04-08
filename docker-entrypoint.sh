#!/bin/sh
set -e

echo "Waiting for database to be ready..."
until pg_isready -h postgres -p 5432 -U user 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is ready!"

echo "Running Prisma migrations..."
npx prisma migrate deploy || npx prisma db push --skip-generate || true

echo "Database setup complete!"

echo "Starting application..."
exec "$@"