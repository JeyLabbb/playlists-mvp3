# 📊 Cómo Ver Logs en Producción

## Ver Logs en Tiempo Real

### Opción 1: CLI de Vercel (Recomendado)

```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Ver logs en tiempo real (seguimiento continuo)
vercel logs --follow

# Ver logs de las últimas 100 líneas
vercel logs --output | tail -100

# Ver logs filtrados por tag
vercel logs --follow | grep "\[SUCCESS-PAGE-SERVER\]"
```

### Opción 2: Dashboard de Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto `playlists-mvp`
3. Ve a la pestaña **"Logs"** o **"Functions"**
4. Verás todos los logs en tiempo real

## Filtrar Logs por Tag

Los logs están etiquetados con prefijos para fácil identificación:

```bash
# Solo logs de procesamiento de pagos
vercel logs --follow | grep "\[SUCCESS-PAGE-SERVER\]"

# Solo logs de errores
vercel logs --follow | grep "❌"

# Solo logs de éxito
vercel logs --follow | grep "✅"

# Logs de un session_id específico
vercel logs --follow | grep "cs_live_xxx"
```

## Logs Importantes a Revisar

Cuando veas el error "El procesamiento tuvo un problema", busca estos logs:

1. **Inicio del procesamiento:**
   ```
   [SUCCESS-PAGE-SERVER] ===== INICIANDO PROCESAMIENTO =====
   [SUCCESS-PAGE-SERVER] Session ID recibido: cs_live_xxx
   ```

2. **Verificación de Founder Pass:**
   ```
   [SUCCESS-PAGE-SERVER] 🔍 Verificando si es Founder Pass...
   [SUCCESS-PAGE-SERVER] 🔍 ¿Es Founder Pass? { isFounderPass: true/false, ... }
   ```

3. **Actualización de Supabase:**
   ```
   [SUCCESS-PAGE-SERVER] 🔄 Actualizando Supabase...
   [SUCCESS-PAGE-SERVER] ✅✅✅ Supabase actualizado: { ... }
   ```

4. **Errores:**
   ```
   [SUCCESS-PAGE-SERVER] ❌❌❌ PROCESAMIENTO FALLÓ: { error: "...", ... }
   ```

## Ejemplo de Comando Completo

```bash
# Ver logs en tiempo real, filtrando solo los de success page
vercel logs --follow | grep --line-buffered "\[SUCCESS-PAGE-SERVER\]"
```

## Si No Tienes Acceso a Vercel CLI

Puedes ver los logs en el Dashboard de Vercel:
1. Ve a tu proyecto en Vercel
2. Click en "Logs" en el menú lateral
3. Filtra por función: busca "checkout/success"
4. Verás todos los logs en tiempo real

