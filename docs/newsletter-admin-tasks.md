# Tasks pendientes para el equipo (Newsletter Admin)

1. **Aplicar la migración de la base de datos**
   - Ejecutar `supabase db push` (o correr `supabase/migrations/20251115_newsletter_system.sql` manualmente).
   - Verificar que las tablas `newsletter_*` se crean correctamente.

2. **Configurar variables de entorno**
   - `RESEND_API_KEY` (si no existía).
   - `RESEND_NEWSLETTER_FROM` con el remitente definitivo.
   - `NEXT_PUBLIC_APP_URL` (dominio público para tracking).
   - `NEWSLETTER_CRON_SECRET` (token para el cron de jobs).

3. **Configurar cron / scheduler**
   - Crear job en Vercel (o similar) que haga `POST /api/admin/newsletter/jobs/run` cada 5 minutos.
   - Incluir header `x-cron-secret: $NEWSLETTER_CRON_SECRET`.

4. **Integrar workflows con eventos reales**
   - Cuando se cree un usuario o se cumpla la condición deseada, llamar a `POST /api/admin/newsletter/workflows/trigger` con `{ workflowId, email }`.

5. **Actualizar datos existentes**
   - Importar contactos actuales en `newsletter_contacts` (script manual o usar API `POST /api/admin/newsletter/contacts`).
   - Crear grupos iniciales (founders, beta testers, etc.) desde `/admin/newsletter`.

6. **Verificar tracking**
   - Enviar una campaña de prueba y confirmar que `/api/newsletter/track/open` y `/api/newsletter/track/click` registran eventos en `newsletter_events`.

7. **Revisar límites de envío**
   - Resend manda un email por destinatario para insertar tracking. Ajustar plan/limitaciones si la lista crece.

8. **Pendiente futuro**
   - Integrar import/export CSV.
   - Conectar workflows a nuevos triggers del producto.

