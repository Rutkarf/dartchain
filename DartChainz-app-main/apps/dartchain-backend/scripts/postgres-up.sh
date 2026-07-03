#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="dartchain-postgres"
IMAGE="postgres:16"
DB_NAME="dartchain"
DB_USER="dartchain"
DB_PASSWORD="dartchain"
VOLUME="dartchain_pg_data"

if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "PostgreSQL déjà démarré ($CONTAINER_NAME)"
elif docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "Démarrage du conteneur existant $CONTAINER_NAME..."
  docker start "$CONTAINER_NAME" >/dev/null
else
  echo "Création et démarrage de $CONTAINER_NAME..."
  docker run -d \
    --name "$CONTAINER_NAME" \
    -e "POSTGRES_DB=$DB_NAME" \
    -e "POSTGRES_USER=$DB_USER" \
    -e "POSTGRES_PASSWORD=$DB_PASSWORD" \
    -p 5432:5432 \
    -v "${VOLUME}:/var/lib/postgresql/data" \
    "$IMAGE" >/dev/null
fi

echo -n "Attente de PostgreSQL"
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    echo " — OK"
    echo "URL: jdbc:postgresql://localhost:5432/$DB_NAME"
    echo "User: $DB_USER / Password: $DB_PASSWORD"
    exit 0
  fi
  echo -n "."
  sleep 1
done

echo
echo "Erreur: PostgreSQL ne répond pas après 30 s" >&2
exit 1
