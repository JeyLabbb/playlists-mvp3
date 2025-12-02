#!/bin/bash

# ============================================================
# SCRIPT: Inicializar Workflow "Out of Credits" en Newsletter HQ
# ============================================================

echo "🚀 Inicializando Workflow y Campaña en Newsletter HQ"
echo "===================================================="
echo ""

# 1. Deploy del endpoint de inicialización
echo "📦 1. Desplegando endpoint de inicialización..."
git add .
git commit -m "feat: endpoint para inicializar workflow out of credits" 2>/dev/null || echo "   (Sin cambios nuevos)"
git push origin main

echo "   ✅ Deploy iniciado"
echo ""

# 2. Esperar deploy
echo "⏳ 2. Esperando deploy de Vercel..."
echo "   (Esto toma 1-2 minutos)"
sleep 90
echo "   ✅ Deploy completado"
echo ""

# 3. Llamar al endpoint de inicialización
echo "🔧 3. Inicializando workflow y campaña..."
echo ""

response=$(curl -s https://playlists.jeylabbb.com/api/admin/newsletter/init-out-of-credits)

# Mostrar respuesta formateada
echo "📋 Respuesta:"
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

# 4. Verificar éxito
if echo "$response" | grep -q "success.*true"; then
    echo "✅ ¡ÉXITO!"
    echo ""
    echo "📊 Ahora puedes ver en Newsletter HQ:"
    echo ""
    echo "   🔄 WORKFLOWS:"
    echo "   https://playlists.jeylabbb.com/admin/newsletter?tab=workflows"
    echo '   → "Out of Credits · Automático" ✅'
    echo ""
    echo "   📧 CAMPAIGNS:"
    echo "   https://playlists.jeylabbb.com/admin/newsletter?tab=campaigns"
    echo '   → "Out of Credits · Automático" (0 sent)'
    echo ""
    echo "   Aparecerá con:"
    echo "   - Sent: 0"
    echo "   - Opens: 0"
    echo "   - Clicks: 0"
    echo "   - Status: Active ✅"
    echo ""
else
    echo "❌ Error al inicializar"
    echo "Ver respuesta arriba para detalles"
fi

echo ""
echo "✨ Proceso completado"
echo ""
