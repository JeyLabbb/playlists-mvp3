# 📊 Guía de Logs - Local y Producción

## 🔍 Ver Logs en Producción (Vercel)

### Opción 1: Dashboard de Vercel (Recomendado)
1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto `playlists-mvp`
3. Ve a la pestaña **"Logs"** o **"Functions"**
4. Verás todos los logs en tiempo real

### Opción 2: CLI de Vercel (Tiempo Real)
```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Ver logs en tiempo real
vercel logs --follow

# Ver logs de una función específica
vercel logs --follow | grep "AUTH"

# Ver logs de las últimas 100 líneas
vercel logs --output | tail -100
```

### Opción 3: Filtrar Logs por Tag
Los logs están etiquetados con prefijos para fácil identificación:
- `[AUTH]` - Autenticación y OAuth
- `[LOGIN]` - Login en cliente
- `[REGISTER]` - Registro en cliente
- `[PROCESS-PAYMENT]` - Procesamiento de pagos
- `[STRIPE WEBHOOK]` - Webhooks de Stripe
- `[STREAM]` - Generación de playlists

```bash
# Filtrar logs de autenticación
vercel logs --follow | grep "\[AUTH\]"

# Filtrar logs de pagos
vercel logs --follow | grep "\[PROCESS-PAYMENT\]"
```

## 🖥️ Ver Logs en Local

### Servidor (Terminal donde corre `npm run dev`)
Todos los logs del servidor aparecen en la terminal donde ejecutaste `npm run dev`:
```bash
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp
npm run dev
```

Verás logs como:
```
[AUTH] 🔍 OAuth environment detection: { ... }
[AUTH] ✅ Using localhost for local development: http://localhost:3000/auth/callback
```

### Cliente (Consola del Navegador)
1. Abre las **DevTools** del navegador (F12 o Cmd+Option+I)
2. Ve a la pestaña **"Console"**
3. Verás logs como:
```
[LOGIN] 🔍 getOrigin detection: { origin: "http://localhost:3000", ... }
[LOGIN] ✅ Detected LOCAL development, using: http://localhost:3000
```

## 📝 Estructura de Logs

### Logs de OAuth (Backend)
```javascript
[AUTH] 🔍 OAuth environment detection: {
  host: "localhost:3000",
  protocol: "http",
  NODE_ENV: "development",
  isVercel: false,
  isLocalDev: true,
  ...
}

[AUTH] ✅ Using localhost for local development: http://localhost:3000/auth/callback
```

### Logs de Login/Register (Frontend)
```javascript
[LOGIN] 🔍 getOrigin detection: {
  origin: "http://localhost:3000",
  isLocalhost: true,
  isVercelPreview: false,
  ...
}

[LOGIN] ✅ Detected LOCAL development, using: http://localhost:3000
```

## 🎯 Cómo Funciona la Detección de Entorno

### Reglas de Detección:

1. **Local Development:**
   - `NODE_ENV === 'development'`
   - `host` contiene `localhost`, `127.0.0.1`, o `192.168.`
   - NO hay `VERCEL_URL`
   - **Resultado:** Redirige a `http://localhost:3000`

2. **Producción:**
   - `NODE_ENV === 'production'` O hay `VERCEL_URL`
   - `host` contiene `playlists.jeylabbb.com` o `pleia.app`
   - **Resultado:** Redirige a `https://playlists.jeylabbb.com`

3. **Vercel Preview:**
   - `VERCEL_URL` existe pero NO es dominio de producción
   - **Resultado:** Redirige a `https://playlists.jeylabbb.com` (producción)

## 🐛 Debugging de OAuth

### Si OAuth redirige incorrectamente:

1. **Ver logs en producción:**
   ```bash
   vercel logs --follow | grep "\[AUTH\]"
   ```

2. **Ver logs en local:**
   - Terminal del servidor: logs con `[AUTH]`
   - Consola del navegador: logs con `[LOGIN]` o `[REGISTER]`

3. **Verificar variables de entorno:**
   ```bash
   # En local
   echo $NODE_ENV
   echo $VERCEL_URL
   
   # En producción (Vercel Dashboard)
   # Settings → Environment Variables
   ```

### Logs Importantes a Revisar:

- `[AUTH] 🔍 OAuth environment detection` - Muestra cómo se detectó el entorno
- `[AUTH] ✅ Using localhost/production redirect` - Muestra la URL final usada
- `[LOGIN] 🔍 getOrigin detection` - Muestra la detección en el cliente
- `[LOGIN] ✅ Detected LOCAL/PRODUCTION` - Muestra la decisión final

## 📊 Ejemplo de Flujo Completo

### En Local:
```
1. Usuario hace clic en "Iniciar sesión con Google"
2. [LOGIN] 🔍 getOrigin detection: { origin: "http://localhost:3000", ... }
3. [LOGIN] ✅ Detected LOCAL development, using: http://localhost:3000
4. POST /api/auth/oauth con redirectTo: "http://localhost:3000/auth/callback"
5. [AUTH] 🔍 OAuth environment detection: { isLocalDev: true, ... }
6. [AUTH] ✅ Using localhost for local development: http://localhost:3000/auth/callback
7. Google redirige a: http://localhost:3000/auth/callback
```

### En Producción:
```
1. Usuario hace clic en "Iniciar sesión con Google"
2. [LOGIN] 🔍 getOrigin detection: { origin: "https://playlists.jeylabbb.com", ... }
3. [LOGIN] ✅ Detected PRODUCTION domain, using: https://playlists.jeylabbb.com
4. POST /api/auth/oauth con redirectTo: "https://playlists.jeylabbb.com/auth/callback"
5. [AUTH] 🔍 OAuth environment detection: { isLocalDev: false, isProduction: true, ... }
6. [AUTH] ✅ Using production URL: https://playlists.jeylabbb.com/auth/callback
7. Google redirige a: https://playlists.jeylabbb.com/auth/callback
```

## 🔧 Troubleshooting

### Problema: OAuth redirige a localhost en producción
**Solución:** Verifica los logs:
```bash
vercel logs --follow | grep "\[AUTH\]"
```
Busca `isLocalDev: false` y `isProduction: true`. Si no aparecen, hay un problema con la detección.

### Problema: No veo logs en producción
**Solución:** 
1. Verifica que estés usando `console.log` (no `console.debug`)
2. Los logs aparecen con un pequeño delay en Vercel
3. Usa `vercel logs --follow` para ver en tiempo real

### Problema: Logs muy verbosos
**Solución:** Los logs están estructurados con prefijos. Filtra:
```bash
vercel logs --follow | grep "\[AUTH\]" | grep "✅\|⚠️"
```

## 📚 Referencias

- [Vercel Logs Documentation](https://vercel.com/docs/observability/logs)
- [Next.js Logging Best Practices](https://nextjs.org/docs/going-to-production#logging)

