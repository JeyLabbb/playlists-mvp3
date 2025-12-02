/**
 * Script de prueba para el email "Out of Credits"
 * 
 * Uso:
 *   npm run tsx scripts/test-out-of-credits-email.ts <email>
 * 
 * Ejemplo:
 *   npm run tsx scripts/test-out-of-credits-email.ts test@example.com
 */

import { sendOutOfCreditsEmail, shouldSendOutOfCreditsEmail } from '../lib/email/outOfCreditsNotification';
import { getSupabaseAdmin } from '../lib/supabase/server';

async function testOutOfCreditsEmail(testEmail?: string) {
  console.log('🧪 Testing Out of Credits Email System\n');

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Supabase admin client not configured');
    console.error('   Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env.local');
    return;
  }

  // Get test email from argument or use default
  const email = testEmail || process.argv[2];
  if (!email) {
    console.error('❌ No email provided');
    console.error('   Usage: npm run tsx scripts/test-out-of-credits-email.ts <email>');
    return;
  }

  console.log(`📧 Testing with email: ${email}\n`);

  // Step 1: Find or create user
  console.log('1️⃣  Finding user in database...');
  const { data: user, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (findError) {
    console.error('❌ Error finding user:', findError);
    return;
  }

  if (!user) {
    console.log('   ⚠️  User not found, creating test user...');
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: email,
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

    console.log('   ✅ Test user created');
    console.log(`   📋 User ID: ${newUser.id}`);
  } else {
    console.log('   ✅ User found');
    console.log(`   📋 User ID: ${user.id}`);
    console.log(`   📊 Usage: ${user.usage_count}/${user.max_uses}`);
    console.log(`   📮 Email sent before: ${user.out_of_credits_email_sent}`);
  }

  const userId = user?.id || (await supabase.from('users').select('id').eq('email', email).single()).data?.id;
  if (!userId) {
    console.error('❌ Could not get user ID');
    return;
  }

  // Step 2: Check if should send
  console.log('\n2️⃣  Checking if email should be sent...');
  const shouldSend = await shouldSendOutOfCreditsEmail(userId);
  console.log(`   ${shouldSend ? '✅' : '❌'} Should send: ${shouldSend}`);

  if (!shouldSend) {
    console.log('\n   ℹ️  Email will not be sent because:');
    console.log('      - Email was already sent before, OR');
    console.log('      - User has remaining uses, OR');
    console.log('      - User has unlimited plan');
    console.log('\n   💡 To test sending, first reset the flag:');
    console.log(`      UPDATE users SET out_of_credits_email_sent = false WHERE id = '${userId}';`);
    return;
  }

  // Step 3: Send email
  console.log('\n3️⃣  Sending out-of-credits email...');
  const result = await sendOutOfCreditsEmail(userId, email);

  if (result.ok && result.emailSent) {
    console.log('   ✅ Email sent successfully!');
    console.log('   📬 Check your inbox (and spam folder)');
  } else if (result.ok && !result.emailSent) {
    console.log(`   ℹ️  Email not sent: ${result.reason}`);
  } else {
    console.error('   ❌ Failed to send email:', result.error);
  }

  // Step 4: Verify database update
  console.log('\n4️⃣  Verifying database update...');
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
}

// Run test
testOutOfCreditsEmail().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

