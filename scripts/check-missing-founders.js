#!/usr/bin/env node

/**
 * Script para verificar usuarios que deberían ser founder pero no lo son
 * Ejecuta: node scripts/check-missing-founders.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Importar KV
const { kv } = require('@vercel/kv');

async function checkMissingFounders() {
  console.log('🔍 Buscando usuarios que deberían ser founder...\n');

  try {
    // Obtener usuarios que no son founder
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, plan, founder_source, max_uses')
      .neq('plan', 'founder')
      .limit(1000);

    if (error) {
      console.error('❌ Error obteniendo usuarios:', error);
      return;
    }

    console.log(`📊 Total usuarios a verificar: ${users.length}\n`);

    const missingFounders = [];
    const errors = [];

    // Verificar cada usuario en KV
    for (const user of users) {
      try {
        const userEmail = user.email.toLowerCase();
        const profileKey = `jey_user_profile:${userEmail}`;
        
        // Intentar obtener el perfil de KV
        let profile = null;
        try {
          profile = await kv.get(profileKey);
        } catch (kvError) {
          // Si KV no está disponible, continuar
          continue;
        }

        if (profile && profile.referredQualifiedCount >= 1) {
          missingFounders.push({
            email: userEmail,
            referredQualifiedCount: profile.referredQualifiedCount,
            currentPlan: user.plan,
            founderSource: user.founder_source
          });
        }
      } catch (userError) {
        errors.push({ email: user.email, error: userError.message });
      }
    }

    console.log(`✅ Usuarios encontrados que necesitan founder: ${missingFounders.length}\n`);

    if (missingFounders.length > 0) {
      console.log('📋 Lista de usuarios:');
      missingFounders.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} - Referidos: ${user.referredQualifiedCount} - Plan actual: ${user.plan}`);
      });

      console.log('\n📝 SQL para corregir:');
      console.log('-- Ejecutar este SQL en Supabase para actualizar a founder:');
      console.log('\nUPDATE public.users');
      console.log('SET');
      console.log('  plan = \'founder\',');
      console.log('  max_uses = NULL,');
      console.log('  founder_source = \'referral\'');
      console.log('WHERE email IN (');
      missingFounders.forEach((user, index) => {
        const comma = index < missingFounders.length - 1 ? ',' : '';
        console.log(`  '${user.email}'${comma}`);
      });
      console.log(');\n');

      // Generar archivo SQL
      const fs = require('fs');
      const sqlContent = `-- SQL generado automáticamente para corregir usuarios que deberían ser founder
-- Generado el: ${new Date().toISOString()}
-- Total usuarios: ${missingFounders.length}

-- Verificar primero qué se actualizará:
SELECT 
  id,
  email,
  plan as current_plan,
  founder_source,
  max_uses,
  created_at
FROM public.users
WHERE email IN (
${missingFounders.map(u => `  '${u.email}'`).join(',\n')}
);

-- Si todo se ve bien, ejecutar el UPDATE:
UPDATE public.users
SET 
  plan = 'founder',
  max_uses = NULL,
  founder_source = 'referral'
WHERE email IN (
${missingFounders.map(u => `  '${u.email}'`).join(',\n')}
);

-- Verificar que se actualizó correctamente:
SELECT 
  id,
  email,
  plan,
  founder_source,
  max_uses
FROM public.users
WHERE email IN (
${missingFounders.map(u => `  '${u.email}'`).join(',\n')}
);
`;

      fs.writeFileSync('scripts/fix-missing-founders-generated.sql', sqlContent);
      console.log('✅ SQL guardado en: scripts/fix-missing-founders-generated.sql');
    } else {
      console.log('✅ No se encontraron usuarios que necesiten corrección.');
    }

    if (errors.length > 0) {
      console.log(`\n⚠️  Errores encontrados: ${errors.length}`);
      errors.forEach(err => {
        console.log(`  - ${err.email}: ${err.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar
checkMissingFounders().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

