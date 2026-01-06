#!/usr/bin/env node

/**
 * Script de prueba para enviar un email de feedback
 * Uso: node scripts/test-feedback-email.js
 */

require('dotenv').config({ path: '.env.local' });

async function testFeedbackEmail() {
  console.log('🧪 Iniciando prueba de envío de feedback...\n');
  
  // Verificar variables de entorno
  console.log('📋 Verificando variables de entorno:');
  console.log('  FEEDBACK_TO:', process.env.FEEDBACK_TO || '❌ NO CONFIGURADO');
  console.log('  RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO');
  console.log('  RESEND_FROM:', process.env.RESEND_FROM || '❌ NO CONFIGURADO');
  console.log('');
  
  if (!process.env.FEEDBACK_TO) {
    console.error('❌ FEEDBACK_TO no está configurado en .env.local');
    process.exit(1);
  }
  
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY no está configurado en .env.local');
    process.exit(1);
  }
  
  // Importar la función de envío
  const { sendFeedbackEmail } = require('../lib/resend');
  
  // Payload de prueba
  const testPayload = {
    rating: 5,
    positives: ['Funciona muy bien', 'Interfaz intuitiva'],
    negatives: ['Podría ser más rápido'],
    comments: 'Esta es una prueba de envío de feedback',
    playlistId: 'test-playlist-123',
    sessionEmail: 'test@example.com',
    intentText: 'reggaeton para fiesta',
    model: 'agent',
  };
  
  console.log('📤 Enviando email de prueba...');
  console.log('   Destino:', process.env.FEEDBACK_TO);
  console.log('   Payload:', JSON.stringify(testPayload, null, 2));
  console.log('');
  
  try {
    const result = await sendFeedbackEmail(testPayload);
    console.log('✅ Email enviado exitosamente!');
    console.log('   Resend ID:', result?.id);
    console.log('   Resultado completo:', JSON.stringify(result, null, 2));
    console.log('');
    console.log('📧 Revisa tu bandeja de entrada en:', process.env.FEEDBACK_TO);
    console.log('   (También revisa spam si no lo ves)');
  } catch (error) {
    console.error('❌ Error al enviar email:');
    console.error('   Mensaje:', error?.message);
    console.error('   Stack:', error?.stack);
    process.exit(1);
  }
}

testFeedbackEmail();


