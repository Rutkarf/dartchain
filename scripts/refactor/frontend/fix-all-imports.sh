#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
APP="$ROOT/apps/dartchain-frontend/Dart/src/app"

echo "🔧 Réparation des imports..."

# Trouver tous les fichiers .ts dans showcase
find "$APP/showcase" -name "*.ts" -type f | while read -r file; do
  echo "   📝 $file"
  
  # Remplacer ../../features/showcase-* par @showcase/*
  sed -i 's|\.\./\.\./features/showcase-|@showcase/|g' "$file"
  
  # Remplacer ../../../features/showcase-* par @showcase/*
  sed -i 's|\.\./\.\./\.\./features/showcase-|@showcase/|g' "$file"
  
  # Remplacer ../../core/ par @core/
  sed -i 's|\.\./\.\./core/|@core/|g' "$file"
  
  # Remplacer ../../../core/ par @core/
  sed -i 's|\.\./\.\./\.\./core/|@core/|g' "$file"
  
  # Remplacer ../../shared/ par @shared/
  sed -i 's|\.\./\.\./shared/|@shared/|g' "$file"
  
  # Remplacer ../../../shared/ par @shared/
  sed -i 's|\.\./\.\./\.\./shared/|@shared/|g' "$file"
done

echo "✅ Imports réparés"