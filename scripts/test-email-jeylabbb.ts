/**
 * Script para enviar email de prueba a jeylabbb@gmail.com
 * Ejecutar: npm run tsx scripts/test-email-jeylabbb.ts
 */

import { sendOutOfCreditsEmail } from '../lib/email/outOfCreditsNotification';
import { getSupabaseAdmin } from '../lib/supabase/server';

async function testEmailJeylabbb() {
  console.log('🧪 Testing Out of Credits Email for jeylabbb@gmail.com\n');

  const testEmail = 'jeylabbb@gmail.com';
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    console.error('❌ Supabase admin client not configured');
    console.error('   Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env.local');
    return;
  }

  // Step 1: Find or create user
  console.log('1️⃣  Finding user in database...');
  const { data: user, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('email', testEmail)
    .maybeSingle();

  if (findError) {
    console.error('❌ Error finding user:', findError);
    return;
  }

  let userId: string;

  if (!user) {
    console.log('   ⚠️  User not found, creating test user...');
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
      console.error('❌ Error creating user:', createError);
      return;
    }

    userId = newUser.id;
    console.log('   ✅ Test user created');
    console.log(`   📋 User ID: ${userId}`);
  } else {
    userId = user.id;
    console.log('   ✅ User found');
    console.log(`   📋 User ID: ${userId}`);
    console.log(`   📊 Usage: ${user.usage_count}/${user.max_uses}`);
    console.log(`   📮 Email sent before: ${user.out_of_credits_email_sent}`);
    
    // Reset flag para poder testear
    console.log('\n   🔄 Resetting flag to allow test...');
    await supabase
      .from('users')
      .update({
        out_of_credits_email_sent: false,
        out_of_credits_email_sent_at: null,
      })
      .eq('id', userId);
    console.log('   ✅ Flag reset');
  }

  // Step 2: Send email
  console.log('\n2️⃣  Sending out-of-credits email...');
  console.log('   📧 To: jeylabbb@gmail.com');
  console.log('   📨 Subject: Te has quedado sin playlists IA… pero tengo algo para ti.');
  console.log('');

  const result = await sendOutOfCreditsEmail(userId, testEmail);

  if (result.ok && result.emailSent) {
    console.log('   ✅✅✅ EMAIL SENT SUCCESSFULLY!');
    console.log('   📬 Check inbox at jeylabbb@gmail.com');
    console.log('   ⚠️  If not in inbox, check SPAM folder');
  } else if (result.ok && !result.emailSent) {
    const reason = 'reason' in result ? result.reason : 'unknown';
    console.log(`   ℹ️  Email not sent: ${reason}`);
  } else {
    const errorMsg = 'error' in result ? result.error : 'Unknown error';
    console.error('   ❌ Failed to send email:', errorMsg);
  }

  // Step 3: Verify database update
  console.log('\n3️⃣  Verifying database update...');
  const { data: updatedUser, error: verifyError } = await supabase
    .from('users')
    .select('out_of_credits_email_sent, out_of_credits_email_sent_at')
    .eq('id', userId)
    .single();

  if (verifyError) {
    console.error('   ❌ Error verifying:', verifyError);
    return;
  }

  console.log(`   📮 Email sent flag: ${updatedUser.out_of_credits_email_sent}`);
  console.log(`   📅 Sent at: ${updatedUser.out_of_credits_email_sent_at || 'N/A'}`);

  console.log('\n✨ Test complete!\n');
  console.log('📧 Email should arrive in 1-2 minutes at jeylabbb@gmail.com');
  console.log('🔍 Check both inbox and spam folder');
  console.log('');
}

// Run test
testEmailJeylabbb().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

