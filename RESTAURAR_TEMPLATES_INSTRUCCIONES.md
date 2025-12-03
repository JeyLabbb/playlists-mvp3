# 🔄 Restaurar Templates a Su Estado Original

## Problema
La plantilla `minimal` se aplicó a todos los mails por error. Necesitamos restaurarlos a su estado original.

## Solución en 2 Pasos

### Paso 1: Ejecutar SQL en Supabase

```bash
1. Abre Supabase Dashboard
2. Ve a SQL Editor
3. Copia y pega este código:
```

```sql
-- Restaurar todas las campañas a 'custom' (excepto Welcome Founder Pass)
UPDATE newsletter_campaigns 
SET template_mode = 'custom'
WHERE template_mode = 'minimal'
  AND title != 'Welcome Founder Pass';

-- Asegurar que Welcome Founder Pass use 'pleia'
UPDATE newsletter_campaigns 
SET template_mode = 'pleia'
WHERE title = 'Welcome Founder Pass';

-- Verificar los cambios
SELECT 
  title,
  template_mode,
  mail_category
FROM newsletter_campaigns
ORDER BY created_at DESC
LIMIT 10;
```

```bash
4. Click en "Run"
5. Verás una tabla con los mails y sus templates
```

### Paso 2: Reiniciar la Aplicación

```bash
# En tu terminal:
# Ctrl + C
npm run dev
```

## ✅ Resultado

Después de esto:
- ✅ Todos los mails volverán a usar `template_mode = 'custom'`
- ✅ Solo "Welcome Founder Pass" usará `template_mode = 'pleia'`
- ✅ La plantilla PLEIA (la de la tarjeta azul) solo se aplicará cuando lo elijas manualmente

## 🎨 Sobre la Plantilla PLEIA

La plantilla "PLEIA" ahora usa el **mismo diseño del mail de Founders**:
- 💙 Tarjeta azul con gradiente en la parte superior
- 📋 Info destacada: "Plan: / Estado: / Fecha:"
- 📝 Cuerpo del mail en fondo blanco/gris claro
- 📦 Cuadrito con beneficios o contenido importante
- 🎯 Botones con gradiente cyan-azul

Este diseño es perfecto para:
- Mails de bienvenida
- Anuncios importantes
- Confirmaciones de compra
- Mensajes especiales

## 📖 Cuándo Usar Cada Plantilla

### Custom (Por Defecto)
- Mails normales de newsletter
- Actualizaciones regulares
- Contenido general

### PLEIA (Tarjeta Azul)
- **Mail de Welcome Founder** ✅ (ya configurado)
- Mails importantes que quieras destacar
- Anuncios especiales
- Confirmaciones

### Minimal
- Mails muy enfocados en texto
- Comunicaciones simples
- Cuando NO quieras diseño elaborado

## 🔍 Verificación

Para verificar que todo volvió a la normalidad:

```sql
-- Ver cuántos mails hay con cada template
SELECT 
  template_mode,
  COUNT(*) as total
FROM newsletter_campaigns
GROUP BY template_mode;
```

Deberías ver algo como:
- `custom`: La mayoría de tus mails
- `pleia`: 1 (Welcome Founder Pass)
- `minimal`: 0 (o muy pocos si elegiste usar minimal manualmente)

## ⚠️ Importante

**NO** vuelvas a ejecutar el SQL de migración completo. Solo necesitas este script de restauración.

---

¿Todo listo? Tu sistema de templates está restaurado. ✅


