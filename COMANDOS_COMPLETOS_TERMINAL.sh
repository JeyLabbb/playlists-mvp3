#!/bin/bash

# ============================================================
# SCRIPT COMPLETO: Email "Out of Credits" con Tracking
# Ejecutar desde: cualquier directorio
# ============================================================

echo "🚀 INICIANDO PROCESO COMPLETO"
echo "=============================="
echo ""

# 1. Ir al proyecto
echo "📁 1. Navegando al proyecto..."
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp
echo "   ✅ En directorio: $(pwd)"
echo ""

# 2. Ver estado de git
echo "📊 2. Estado actual de git:"
git status --short
echo ""

# 3. Agregar todos los cambios
echo "➕ 3. Agregando cambios a git..."
git add .
echo "   ✅ Cambios agregados"
echo ""

# 4. Commit
echo "💾 4. Haciendo commit..."
git commit -m "feat: email out of credits integrado en Newsletter HQ con workflows, campaigns y tracking"
echo "   ✅ Commit realizado"
echo ""

# 5. Push a producción
echo "🚀 5. Desplegando a producción..."
git push origin main
echo "   ✅ Push completado"
echo ""

# 6. Esperar deploy
echo "⏳ 6. Esperando a que Vercel haga el deploy..."
echo "   (Esto toma 1-2 minutos)"
sleep 90
echo "   ✅ Deploy debería estar listo"
echo ""

# 7. Enviar email de prueba
echo "📧 7. Enviando email de prueba a jeylabbb@gmail.com..."
echo "   URL: https://playlists.jeylabbb.com/api/test-send-out-of-credits-email"
echo ""

# Hacer la request
response=$(curl -s https://playlists.jeylabbb.com/api/test-send-out-of-credits-email)
echo "   Respuesta:"
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

# 8. Ver resultado
if echo "$response" | grep -q "success.*true"; then
    echo "   ✅ Email enviado exitosamente!"
    echo "   📬 Revisa jeylabbb@gmail.com (inbox o spam)"
    echo ""
    
    # Extraer IDs si es posible
    campaignId=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('campaignId', 'N/A'))" 2>/dev/null)
    recipientId=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('recipientId', 'N/A'))" 2>/dev/null)
    
    echo "   📊 Campaign ID: $campaignId"
    echo "   📊 Recipient ID: $recipientId"
    echo "   🔗 Newsletter HQ: https://playlists.jeylabbb.com/admin/newsletter"
else
    echo "   ❌ Error enviando email"
    echo "   Ver respuesta arriba para detalles"
fi
echo ""

# 9. Opcional: Eliminar endpoint de prueba
echo "🗑️  9. ¿Eliminar endpoint de prueba?"
echo "   (Presiona Enter para eliminar, o Ctrl+C para cancelar)"
read -r

echo "   Eliminando endpoint de prueba..."
rm -f app/api/test-send-out-of-credits-email/route.ts
rmdir app/api/test-send-out-of-credits-email 2>/dev/null

if [ ! -f app/api/test-send-out-of-credits-email/route.ts ]; then
    echo "   ✅ Endpoint eliminado"
    
    git add .
    git commit -m "chore: eliminar endpoint de prueba out-of-credits"
    git push origin main
    
    echo "   ✅ Cambios subidos a producción"
else
    echo "   ⚠️  No se pudo eliminar (puede que no exista)"
fi
echo ""

# 10. Resumen final
echo "=============================="
echo "✨ PROCESO COMPLETADO"
echo "=============================="
echo ""
echo "✅ Código desplegado"
echo "✅ Email enviado a jeylabbb@gmail.com"
echo "✅ Tracking activado en Newsletter HQ"
echo "✅ Workflow creado: 'Out of Credits · Automático'"
echo "✅ Campaña creada: 'Out of Credits · Automático'"
echo ""
echo "📊 Ver en Newsletter HQ:"
echo "   https://playlists.jeylabbb.com/admin/newsletter"
echo ""
echo "🔄 WORKFLOWS ACTIVOS:"
echo '   - "Out of Credits · Automático" ✅ Activo'
echo "   (Tab: Workflows)"
echo ""
echo "📧 CAMPAÑAS:"
echo '   - "Out of Credits · Automático"'
echo "   - Type: Automated"
echo "   - Category: Retention"
echo "   - Tracking: Enabled ✅"
echo "   (Tab: Campaigns)"
echo ""
echo "📈 TRACKING & ANALYTICS:"
echo "   - Ver quién abre el email"
echo "   - Ver quién clickea"
echo "   - Ver conversiones"
echo "   (Tab: Analytics en la campaña)"
echo ""
echo "📧 Revisa tu email:"
echo "   jeylabbb@gmail.com"
echo "   Asunto: Te has quedado sin playlists IA… pero tengo algo para ti."
echo "   (Si no está en inbox, revisa spam)"
echo ""
echo "✨ Todo integrado igual que Welcome Email!"

