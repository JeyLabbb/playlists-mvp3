-- ========================================
-- RESTAURAR TEMPLATES A SU ESTADO ORIGINAL
-- ========================================

-- 1. Restaurar todas las campañas existentes a template 'custom'
--    (excepto la de Welcome Founder Pass que debe ser 'pleia')
UPDATE newsletter_campaigns 
SET template_mode = 'custom'
WHERE template_mode = 'minimal'
  AND title != 'Welcome Founder Pass';

-- 2. Asegurarse de que Welcome Founder Pass use la plantilla 'pleia'
UPDATE newsletter_campaigns 
SET template_mode = 'pleia'
WHERE title = 'Welcome Founder Pass';

-- 3. Verificar los cambios
SELECT 
  id,
  title,
  subject,
  template_mode,
  mail_category,
  updated_at
FROM newsletter_campaigns
ORDER BY created_at DESC
LIMIT 10;

-- 4. Ver resumen de templates
SELECT 
  template_mode,
  COUNT(*) as total_campaigns
FROM newsletter_campaigns
GROUP BY template_mode;

-- ========================================
-- ✅ TEMPLATES RESTAURADOS
-- ========================================
-- Las campañas volverán a usar sus templates originales
-- Solo Welcome Founder Pass usará la plantilla PLEIA (la del card azul)


