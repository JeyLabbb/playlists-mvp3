# 🔓 Sesión Mock para Desarrollo Local

## ¿Qué es?

Un sistema que te permite trabajar en PLEIA 2.0 en local **sin tener que iniciar sesión** cada vez. Automáticamente estás logueado como `jorgejr200419@gmail.com`.

## ✅ Configuración Actual

### Usuario Mock por Defecto

```typescript
{
  user: {
    name: 'Jorge JR',
    email: 'jorgejr200419@gmail.com',
    image: null,
  },
  expires: '2099-12-31T23:59:59.999Z', // Nunca expira
}
```

## 🎯 ¿Dónde funciona?

### ✅ Funcionamiento Automático

**Solo en desarrollo** (`NODE_ENV === 'development'`):
- `/pleia2.0` - Acceso directo sin login
- `/api/pleia2/chat` - API acepta peticiones sin auth
- `/api/pleia2/create-playlist` - API acepta peticiones sin auth

**En producción** (Vercel):
- ❌ NO se usa la sesión mock
- ✅ Requiere autenticación real con NextAuth
- ✅ Redirige a `/login` si no estás autenticado

## 📁 Archivos Modificados

### `lib/auth/mock-session.ts`
Helper que gestiona la sesión:

```typescript
// En desarrollo → retorna sesión mock
// En producción → usa NextAuth normal
const session = await getSession();
```

### Archivos que lo usan:
- ✅ `app/pleia2.0/page.tsx`
- ✅ `app/api/pleia2/chat/route.ts`
- ✅ `app/api/pleia2/create-playlist/route.ts`

## 🔧 Cómo Funciona

### En Frontend (pleia2.0/page.tsx)

```typescript
// Detecta si está en desarrollo
const isDevelopment = process.env.NODE_ENV === 'development';

// Usa sesión mock en dev, real en prod
const activeSession = isDevelopment ? MOCK_SESSION : session;

// Solo redirige a login en producción
if (!isDevelopment && status === 'unauthenticated') {
  router.push('/login');
}
```

### En Backend (APIs)

```typescript
import { getSession } from '@/lib/auth/mock-session';

// Retorna sesión mock en dev, real en prod
const session = await getSession();
```

## 🚀 Uso en Desarrollo

1. **Inicia el servidor local**
   ```bash
   npm run dev
   ```

2. **Navega a `/pleia2.0`**
   ```
   http://localhost:3000/pleia2.0
   ```

3. **¡Ya estás logueado!** 🎉
   - No necesitas hacer login
   - Automáticamente eres `jorgejr200419@gmail.com`
   - Puedes usar todas las funciones

## 🔒 Seguridad en Producción

**Importante**: Este sistema es 100% seguro porque:

✅ **Solo funciona en desarrollo**
```typescript
if (process.env.NODE_ENV === 'development') {
  // Mock session
}
```

✅ **En Vercel** (producción):
- `NODE_ENV` automáticamente es `'production'`
- La sesión mock NO se usa
- NextAuth funciona normalmente
- Requiere login real

✅ **No hay riesgo de seguridad**:
- El código detecta el entorno automáticamente
- No hay flags que activar/desactivar
- Imposible que funcione en producción

## 📝 Cambiar el Usuario Mock

Si quieres usar otro email en desarrollo, edita `lib/auth/mock-session.ts`:

```typescript
const MOCK_SESSION = {
  user: {
    name: 'Tu Nombre',
    email: 'tuemail@ejemplo.com', // ← Cambia aquí
    image: null,
  },
  expires: '2099-12-31T23:59:59.999Z',
};
```

## 🎓 Explicación Técnica

### ¿Por qué esto funciona?

**En desarrollo**:
```
Usuario visita /pleia2.0
      ↓
useSession() del frontend puede estar "loading" o "unauthenticated"
      ↓
Pero usamos MOCK_SESSION en lugar de session
      ↓
activeSession siempre tiene datos
      ↓
No redirige a /login
      ↓
APIs reciben peticiones
      ↓
getSession() en backend retorna MOCK_SESSION
      ↓
Todo funciona sin login ✅
```

**En producción**:
```
Usuario visita /pleia2.0
      ↓
Si no está autenticado con NextAuth
      ↓
Redirige a /login
      ↓
Debe hacer login real
      ↓
APIs verifican sesión real con NextAuth
      ↓
Solo funciona si está autenticado ✅
```

## 💡 Ventajas

✅ **Desarrollo más rápido**
- No pierdes tiempo haciendo login
- No necesitas tener cuenta de Spotify configurada
- Pruebas inmediatas

✅ **Sin comprometer seguridad**
- Solo funciona en local
- Producción sigue 100% segura

✅ **Fácil de mantener**
- Un solo lugar para cambiar el usuario mock
- Se aplica automáticamente a todo PLEIA 2.0

## 🔍 Debugging

Para ver cuándo se usa la sesión mock, mira la consola del servidor:

```
🔓 [DEV] Usando sesión mock: jorgejr200419@gmail.com
```

Este log aparece cada vez que una API usa `getSession()` en desarrollo.

---

**Resumen**: En local estás siempre logueado como `jorgejr200419@gmail.com`. En producción funciona normalmente con NextAuth. 🚀

