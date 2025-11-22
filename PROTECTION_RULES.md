# 🛡️ REGLAS DE PROTECCIÓN - NO ELIMINAR NI MODIFICAR

## ⚠️ ADVERTENCIA CRÍTICA PARA AGENTES DE IA

**NUNCA** elimines o modifiques funcionalidades existentes al arreglar errores de build o TypeScript.

### Reglas Obligatorias:

1. **Al arreglar errores de build:**
   - ✅ Solo modifica el código que causa el error específico
   - ✅ No elimines funcionalidades existentes
   - ✅ No cambies la lógica de negocio
   - ✅ No ocultes componentes en la UI
   - ❌ NO uses `HUB_MODE` para desactivar funcionalidades
   - ❌ NO comentes código funcional
   - ❌ NO elimines imports de componentes que se usan

2. **Al trabajar con feature flags:**
   - ✅ `HUB_MODE` debe estar **SIEMPRE desactivado por defecto** (`false`)
   - ✅ Solo activar `HUB_MODE` si es explícitamente necesario para desarrollo interno
   - ✅ `PUBLIC_HUB_MODE` debe ser `false` por defecto (no heredar de `HUB_MODE`)
   - ❌ NO usar `HUB_MODE` para desactivar funcionalidades en producción

3. **Funcionalidades que DEBEN estar siempre activas:**
   - ✅ Login/registro con cuenta PLEIA (`/login`, `/register`)
   - ✅ OAuth con Google (`/api/auth/oauth`)
   - ✅ Página de Amigos (`/amigos`)
   - ✅ Página Trending (`/trending`)
   - ✅ Admin Newsletter (`/admin/newsletter`)
   - ✅ Sistema de referidos y ventaja de primeros 1000
   - ✅ Paywall y recordatorios de uso
   - ✅ Email de bienvenida al crear cuenta
   - ✅ Perfil con usos restantes (`/me`)
   - ✅ Todas las rutas del menú de navegación

4. **Al hacer commits:**
   - ✅ Verificar que todas las rutas principales funcionan
   - ✅ Verificar que el menú de navegación muestra todos los enlaces
   - ✅ Verificar que login/registro funciona
   - ✅ NO hacer commit si se han desactivado funcionalidades

5. **Variables de entorno críticas:**
   ```bash
   # HUB_MODE debe estar desactivado (no definido o = '0')
   # NO definir HUB_MODE=1 a menos que sea explícitamente necesario
   # NEXT_PUBLIC_HUB_MODE debe estar desactivado (no definido o = '0')
   ```

## 📋 Checklist antes de hacer commit:

- [ ] Todas las rutas del menú funcionan
- [ ] Login/registro con PLEIA funciona (no solo Spotify)
- [ ] OAuth con Google funciona
- [ ] Página de Amigos es accesible
- [ ] Admin Newsletter es accesible
- [ ] Sistema de referidos funciona
- [ ] Paywall aparece cuando se acaban los usos
- [ ] Perfil muestra usos restantes
- [ ] `HUB_MODE` está desactivado
- [ ] No hay funcionalidades comentadas o ocultas

## 🔍 Cómo verificar que todo funciona:

1. Abrir `http://localhost:3000`
2. Verificar menú burger tiene todas las opciones
3. Probar login/registro
4. Probar OAuth con Google
5. Navegar a `/amigos`, `/trending`, `/admin/newsletter`
6. Verificar que paywall aparece cuando se acaban usos

## 🚨 Si algo no funciona:

1. Verificar `HUB_MODE` en `.env.local` (debe estar desactivado)
2. Verificar que no hay código comentado
3. Verificar que no hay condiciones `if (HUB_MODE) return` que bloqueen funcionalidades
4. Revisar este documento y restaurar funcionalidades según estas reglas

