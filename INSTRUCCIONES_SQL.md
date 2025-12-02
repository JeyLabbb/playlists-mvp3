# 🚀 Instrucciones para Ejecutar el SQL

## ⚠️ IMPORTANTE: Usa el Script Correcto

**Ejecuta este archivo**: `SQL_COMPLETE_MIGRATION.sql`

❌ **NO uses**: `SQL_TRACKING_IMPROVEMENTS.sql` (está incompleto)

---

## 📝 Pasos para Ejecutar

### 1. Abre Supabase Dashboard
```
1. Ve a https://supabase.com
2. Selecciona tu proyecto de PLEIA
3. En el menú lateral, busca "SQL Editor"
4. Click en "SQL Editor"
```

### 2. Crea una Nueva Query
```
1. Click en "+ New query" (botón verde)
2. Dale un nombre descriptivo: "Newsletter Migration"
```

### 3. Copia el SQL Completo
```
1. Abre el archivo: SQL_COMPLETE_MIGRATION.sql
2. Selecciona TODO el contenido (Ctrl+A / Cmd+A)
3. Copia (Ctrl+C / Cmd+C)
```

### 4. Pega y Ejecuta
```
1. Pega el SQL en el editor de Supabase (Ctrl+V / Cmd+V)
2. Click en "Run" o presiona Ctrl+Enter / Cmd+Enter
3. Espera a que termine (debería tardar ~2-5 segundos)
```

### 5. Verifica los Resultados
Al final del script verás 3 tablas de verificación:

#### ✅ Tabla 1: Columnas Añadidas
Deberías ver 11 filas con estas columnas:
- `excluded_from_tracking`
- `mail_category`
- `ab_test_enabled`
- `subject_b`
- `test_duration`
- `test_duration_unit`
- `winner_criteria`
- `ab_test_evaluated_at`
- `ab_test_winner`
- `template_mode`
- `tracking_enabled`

#### ✅ Tabla 2: Columna Recipients
Deberías ver 1 fila:
- `ab_test_group`

#### ✅ Tabla 3: Campaña Welcome Founder
Deberías ver 1 fila con:
- `title`: "Welcome Founder Pass"
- `mail_category`: "founder"
- `tracking_enabled`: true

#### ✅ Tabla 4: Estadísticas
Verás un resumen de campañas por categoría

---

## 🔍 ¿Qué hace este SQL?

### Añade Columnas Nuevas
- ✅ `excluded_from_tracking` - Para excluir mails de métricas
- ✅ `mail_category` - Para categorizar mails (welcome, founder, etc.)
- ✅ Columnas de A/B testing (subject_b, test_duration, etc.)
- ✅ `template_mode` - Para plantillas (custom, pleia, minimal)
- ✅ `tracking_enabled` - Para habilitar tracking

### Crea Índices
- ✅ Mejora el rendimiento de búsquedas
- ✅ Acelera filtros por categoría y tracking

### Añade Constraints
- ✅ Valida que `mail_category` sea válido
- ✅ Valida que `template_mode` sea válido

### Crea Campaña Welcome Founder
- ✅ Campaña automática para nuevos founders
- ✅ Ya configurada con tracking habilitado

---

## ⚠️ Posibles Errores y Soluciones

### Error: "relation does not exist"
**Causa**: La tabla `newsletter_campaigns` no existe

**Solución**:
```sql
-- Primero verifica que la tabla existe:
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'newsletter_campaigns';

-- Si no existe, revisa que estés en el proyecto correcto
```

### Error: "column already exists"
**Causa**: Ya ejecutaste el script antes

**Solución**: 
✅ Esto es NORMAL y está OK. El script usa `IF NOT EXISTS` para evitar errores. Puedes ignorar este mensaje.

### Error: "duplicate key value violates unique constraint"
**Causa**: Ya existe una campaña Welcome Founder Pass

**Solución**: 
✅ Esto es NORMAL y está OK. El script detecta si ya existe y la actualiza en lugar de crear una nueva.

---

## ✅ Verificación Manual

Si quieres verificar que todo funcionó correctamente, ejecuta estos comandos UNO POR UNO:

### Verificar columna excluded_from_tracking
```sql
SELECT excluded_from_tracking 
FROM newsletter_campaigns 
LIMIT 1;
```
**Esperado**: Debe devolver `true` o `false` (no error)

### Verificar columna mail_category
```sql
SELECT mail_category 
FROM newsletter_campaigns 
LIMIT 1;
```
**Esperado**: Debe devolver 'general', 'welcome', 'founder', etc. (no error)

### Verificar campaña Welcome Founder
```sql
SELECT title, mail_category, tracking_enabled
FROM newsletter_campaigns
WHERE title = 'Welcome Founder Pass';
```
**Esperado**: 1 fila con title, mail_category='founder', tracking_enabled=true

### Ver todas las columnas nuevas
```sql
SELECT 
  excluded_from_tracking,
  mail_category,
  ab_test_enabled,
  template_mode,
  tracking_enabled
FROM newsletter_campaigns 
LIMIT 3;
```
**Esperado**: Tabla con 5 columnas y datos

---

## 🚀 Después del SQL

### 1. Reinicia la aplicación
```bash
# En tu terminal:
# Ctrl + C para detener el servidor
npm run dev
```

### 2. Prueba las funcionalidades
1. ✅ Ve a Newsletter HQ > Tracking
2. ✅ Click en "Excluir" en cualquier mail (debe funcionar)
3. ✅ Ve a Newsletter HQ > Plantillas (deben aparecer PLEIA Visual y Minimal)
4. ✅ Crea una campaña de prueba y envía un test email

---

## 📞 ¿Necesitas Ayuda?

### Logs Útiles
Si algo falla, revisa estos logs:

**En Supabase**:
- El panel de errores muestra en rojo cualquier problema
- Lee el mensaje completo del error

**En tu terminal**:
```bash
# Busca errores como:
# "column does not exist"
# "relation does not exist"
```

### Checklist de Troubleshooting
- [ ] ¿Copiaste TODO el contenido del archivo SQL?
- [ ] ¿Estás en el proyecto correcto de Supabase?
- [ ] ¿Esperaste a que termine la ejecución completa?
- [ ] ¿Reiniciaste la aplicación después del SQL?

---

## 🎉 ¡Todo Listo!

Si las verificaciones pasaron correctamente:
- ✅ El botón "Excluir" funcionará
- ✅ Los test emails se enviarán correctamente
- ✅ Las plantillas se aplicarán sin problemas
- ✅ El tracking de Welcome Founder funcionará

**¡Ahora puedes usar todas las funcionalidades nuevas!** 🚀

---

**Archivo a ejecutar**: `SQL_COMPLETE_MIGRATION.sql`  
**Tiempo estimado**: 2-5 segundos  
**Versión**: 2.0.0 - COMPLETA

