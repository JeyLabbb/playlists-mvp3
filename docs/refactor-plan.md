# Supabase Auth & Usage Refactor – Estado de la ejecución

_Última actualización: 2025-11-12_

## ✅ Avances completados

- Eliminado NextAuth en toda la app (`getServerSession`, `[...nextauth]`, `lib/auth/config.js`) y borrada la carpeta duplicada `web/`.
- Todos los endpoints críticos usan `getPleiaServerUser` + `user_id` (`usage`, `playlist/*`, `referrals/*`, `associate-purchase`, `auto-process`, `spotify/*`, etc.).
- `lib/billing/usageV2.ts` y `useUsageStatus` centralizan cuotas (`usage_count`, `max_uses`) y se integran en Paywall, `/`, `/me`.
- Migración de Admin (VDControl): métricas con `users`, tabs de prompts/usage/playlists/pagos y nueva sección Newsletter + Usuarios (alta/baja, stub envío).
- `package.json` actualizados con scripts `lint`, `typecheck`, `db:types`; dependencia `next-auth` eliminada.

## 🚧 En curso / pendientes

1. **Hook de uso en el resto de la UI**
   - [x] `app/my/page.js` (badge de usos + refresco manual).
   - [x] `Navigation` (pill + refresco manual).
   - [x] Paywall host (`PaywallHost.tsx`) sincronizado con `useUsageStatus`.
   - [x] Componentes de invitación / CTA (mostrar límite restante en `app/invite/page.tsx`).

2. **Seguridad y tipos**
   - [ ] Generar `types/supabase.ts` (`npm run db:types`).
   - [ ] Documentar y aplicar políticas RLS (`supabase/policies/README.md`) para `users`, `prompts`, `newsletter`, `usage_events`, `playlists`, `payments`.

3. **Documentación**
   - [x] Actualizar `README.md`, `ENV_SETUP.md`, `PRODUCTION.md`, `docs/usage-flow.md` con la info de Supabase, usos y scripts.

4. **Pruebas & CI**
   - [ ] Tests ligeros para `consumeUsage`/`refundUsage` + cobertura de newsletter endpoints.
   - [ ] Ejecutar `npm run typecheck && npm run lint && npm run build && npm test`.
   - [ ] Configurar workflow básico en `.github/workflows/ci.yml`.

5. **Entrega**
   - [ ] `CHANGELOG.md` con resumen de breaking changes.
   - [ ] Checklist en `docs/refactor-verification.md`.
   - [ ] Validar rama `feat/supabase-auth-usage-newsletter` lista para PR.

## Notas operativas

- **Uso de `users`**: todas las inserciones (`usage_events`, `playlists`, `payments`) ya aceptan `user_id`. Falta backfill para históricos.
- **Newsletter**: API `/api/admin/newsletter/*` finalizada; pendiente conectar con proveedor real (stub en `lib/email/newsletterProvider.ts`).
- **Supabase**: ejecutar `npm run db:types` tras cada cambio de esquema y versionar `types/supabase.ts`.

> Mantener este documento al día: marcar tareas a medida que se cierran y añadir bloqueadores en esta misma lista.


