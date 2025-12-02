/**
 * Script para enviar email de prueba a jeylabbb@gmail.com
 * Ejecutar: npx tsx scripts/send-test-email-jeylabbb.ts
 */

// Cargar variables de entorno
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { sendOutOfCreditsEmail } from '../lib/email/outOfCreditsNotification';
import { getSupabaseAdmin } from '../lib/supabase/server';

async function sendTestEmail() {
  console.log('📧 Enviando email de prueba a jeylabbb@gmail.com\n');

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Supabase admin client not configured');
    return;
  }

  const testEmail = 'jeylabbb@gmail.com';

  // 1. Buscar o crear usuario
  console.log('1️⃣  Buscando usuario...');
  let { data: user, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('email', testEmail)
    .maybeSingle();

  if (findError) {
    console.error('❌ Error buscando usuario:', findError);
    return;
  }

  if (!user) {
    console.log('   ⚠️  Usuario no existe, creando...');
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: testEmail,
        plan: 'free',
        usage_count: 5,
        max_uses: 5,
        out_of_credits_email_sent: false,
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creando usuario:', createError);
      return;
    }

    user = newUser;
    console.log('   ✅ Usuario creado');
  } else {
    console.log('   ✅ Usuario encontrado');
    
    // Resetear flag si ya fue enviado antes
    if (user.out_of_credits_email_sent) {
      console.log('   🔄 Reseteando flag para re-enviar...');
      await supabase
        .from('users')
        .update({
          out_of_credits_email_sent: false,
          out_of_credits_email_sent_at: null,
        })
        .eq('id', user.id);
    }
  }

  console.log(`   📋 User ID: ${user.id}`);
  console.log(`   📊 Usage: ${user.usage_count}/${user.max_uses}\n`);

  // 2. Enviar email
  console.log('2️⃣  Enviando email...');
  const result = await sendOutOfCreditsEmail(user.id, testEmail);

  if (result.ok && result.emailSent) {
    console.log('   ✅ ¡Email enviado exitosamente!');
    console.log('   📬 Revisa la bandeja de jeylabbb@gmail.com');
    console.log('   📧 No olvides revisar spam si no aparece\n');
  } else if (result.ok && !result.emailSent) {
    const reason = 'reason' in result ? result.reason : 'unknown';
    console.log(`   ℹ️  Email no enviado: ${reason}\n`);
  } else {
    const errorMsg = 'error' in result ? result.error : 'Unknown error';
    console.error('   ❌ Error:', errorMsg, '\n');
  }

  // 3. Verificar en DB
  console.log('3️⃣  Verificando en base de datos...');
  const { data: updatedUser } = await supabase
    .from('users')
    .select('out_of_credits_email_sent, out_of_credits_email_sent_at')
    .eq('id', user.id)
    .single();

  console.log(`   📮 Flag: ${updatedUser?.out_of_credits_email_sent}`);
  console.log(`   📅 Sent at: ${updatedUser?.out_of_credits_email_sent_at || 'N/A'}\n`);

  console.log('✨ Test completado!\n');
}

sendTestEmail().catch((error) => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});

