# Supabase RLS · Checklist (pendiente)

> Nota: las políticas exactas deben revisarse con el equipo de backend antes de activar RLS en producción. Este documento sirve como guía inicial.

## users
- **RLS ON**
- `select`: permitido para `auth.uid() = users.id` (usando `auth.jwt()` con claim `sub`).
- `update`: permitir actualizaciones de `usage_count`, `max_uses`, `plan`, `newsletter_opt_in`, `last_prompt_at` únicamente para el rol `service_role`.
- `insert` / `delete`: solo `service_role`.

## prompts
- **RLS ON**
- `select`: usuarios autenticados pueden leer sus propios prompts (`user_id = auth.uid()`).
- `insert`: solo `service_role`.
- `update`/`delete`: solo `service_role`.

## usage_events
- **RLS ON**
- `select`: usuarios autenticados pueden leer eventos con `user_id = auth.uid()` (opcional, o restringir solo a admin).
- `insert`: únicamente `service_role`.
- `update`/`delete`: solo `service_role`.

## playlists / payments
- Añadir columna `user_id` y replicar mismas políticas que en `usage_events`.
- Considerar vistas agregadas para VDControl si se necesita acceso admin sin exponer datos sensibles.

## newsletter
- **RLS ON**
- Solo `service_role` puede leer/escribir desde el backend (VDControl). Los usuarios finales no deberían tocar esta tabla directamente.

## friends / friend_requests
- **RLS ON**
- `friends`: permitir `select` cuando `auth.uid()` sea `user_id` o `friend_id`. `insert`/`delete` gestionadas por el backend con `service_role`.
- `friend_requests`: `select` para `sender_id = auth.uid()` o `receiver_id = auth.uid()`. `insert` permitido solo para `sender_id = auth.uid()`. `update` (aceptar/declinar) únicamente cuando `receiver_id = auth.uid()`; `delete` solo `service_role`.

## friend_activity
- **RLS ON**
- `select`: permitir cuando exista una fila en `friends` que vincule `user_id` y `auth.uid()`. Considerar materializar vista para feed.
- `insert`: backend (`service_role`) o RPC validada.

## social_threads / thread_participants / social_messages
- **RLS ON**
- `thread_participants`: `select`/`insert` permitido para `auth.uid()` cuando participa; `delete` solo backend.
- `social_messages`: `select`/`insert` cuando exista participación en `thread_participants`. `update`/`delete` restringido a `service_role`.

## Implementación
- Crear roles específicos en Supabase (`service_role` ya existe; considerar `analytics_role` para VDControl si fuese necesario).
- Aplicar políticas mediante el editor SQL de Supabase.
- Documentar cualquier cambio adicional aquí y sincronizar con `docs/refactor-plan.md`.

