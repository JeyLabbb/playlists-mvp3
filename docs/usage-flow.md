# Flujo de usos (Free Tier) – PLEIA 2025

Este documento resume cómo se consumen, persisten y exponen los usos gratuitos en la nueva infraestructura de cuentas PLEIA.

## 1. Identidad

- El usuario se autentica vía Supabase (`supabase.auth`).
- El identificador estable es `users.id` (UUID). El correo (`users.email`) se mantiene como alias para compatibilidad.

## 2. Tablas relevantes

| Tabla | Campos clave | Notas |
|-------|--------------|-------|
| `users` | `usage_count`, `max_uses`, `plan`, `is_founder`, `newsletter_opt_in`, `last_prompt_at` | `max_uses = null` ⇒ uso ilimitado. |
| `usage_events` | `user_id`, `delta`, `context`, `occurred_at`, `usage_before`, `usage_after` | Permite auditoría y refunds. |
| `prompts` | `user_id`, `prompt_text`, `created_at` | `last_prompt_at` se deriva de aquí. |

## 3. Consumo de uso

1. El cliente inicia `/api/playlist/stream` o `/api/playlist/llm`.
2. El backend llama a `consumeUsage({ userId, email })` **cuando llega la primera canción**:
   - Incrementa `users.usage_count`.
   - Inserta `usage_events` (`delta = +1`, `context = "playlist:first-track"`).
   - Actualiza `last_prompt_at`.
3. Si la generación falla antes de la primera canción no se descuenta nada.
4. Ante un error posterior (timeouts, Spotify), `refundUsage` revierte el decremento (`delta = -1`).

## 4. Límite y Paywall

- `getUsageSummary` calcula:
  - `remaining = max_uses - usage_count` (cuando `max_uses` es numérico).
  - `unlimited = max_uses === null || plan ∈ {founder, premium}`.
- `/api/usage/status` expone `usage`, `remaining`, `limit`, `counters`.
- El hook `useUsageStatus`:
  - Hace polling (default 30 s) y escucha eventos `usage-paywall-refresh`.
  - Devuelve `{ current, maxUses, remaining, unlimited }`.
  - Se usa en `/`, `/me`, Paywall modal y panel Admin.

## 5. Refunds manuales

`refundUsage` acepta un `usageEventId` (cuando corresponde). Sin id crea un evento compensatorio (`delta = -1`). El admin puede intervenir escribiendo en `usage_events`.

## 6. UI / Admin

- **Home / Paywall**: refrescan el hook tras cada generación y cuando llega el primer track (SSE).
- **Perfil (`/me`)**: muestra usos consumidos/restantes y permite refresco manual.
- **VDControl (`/admin/debug/db`)**:
  - Métricas por usuario (`usage_count`, `max_uses`, `plan`, newsletter).
  - Tabla con filtros rápidos.

## 7. Scripts útiles

```bash
# Regenerar tipos cuando cambie el esquema
npm run db:types

# Contar usuarios por plan (desde Supabase SQL)
select plan, count(*) from users group by 1 order by 1;
```

## 8. Próximos pasos (pendientes)

- Asegurar que `types/supabase.ts` y RLS reflejen los nuevos campos.
- Añadir pruebas unitarias para `consumeUsage` y `refundUsage`.
- Documentar el proceso de refunds manuales en el panel Admin.

> Mantener este documento sincronizado con cualquier cambio de lógica en `lib/billing/usageV2.ts` o `/api/usage/*`.

