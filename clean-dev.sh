#!/bin/bash

# Script para limpiar completamente el cache y reiniciar el servidor de desarrollo

echo "🧹 Limpiando cache de Next.js..."

# Detener cualquier proceso de Next.js
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "next start" 2>/dev/null
sleep 1

# Eliminar todos los caches
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache
rm -rf .next/server/pages 2>/dev/null

echo "✅ Cache limpiado completamente"
echo ""
echo "🚀 Iniciando servidor de desarrollo..."
echo ""

# Iniciar el servidor
npm run dev

