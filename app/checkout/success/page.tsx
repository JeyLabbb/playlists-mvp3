'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { mutate } from 'swr';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(false);
  const [webhookProcessed, setWebhookProcessed] = useState(false);

  // Auto-process webhook when component mounts
  useEffect(() => {
    if (sessionId && !webhookProcessed) {
      processWebhook();
    }
  }, [sessionId, webhookProcessed, processWebhook]);

  const processWebhook = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      console.log('[SUCCESS-PAGE] Associating purchase with current user for session:', sessionId);
      const webhookResponse = await fetch('/api/associate-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      });
      
      if (webhookResponse.ok) {
        const result = await webhookResponse.json();
        console.log('[SUCCESS-PAGE] Purchase associated successfully:', result);
        setWebhookProcessed(true);
        
        if (result.isFounder) {
          console.log('[SUCCESS-PAGE] User is now founder, refreshing profile data...');
          await mutate('/api/me');
          console.log('[SUCCESS-PAGE] Profile data refreshed');
        }
      } else {
        console.error('[SUCCESS-PAGE] Purchase association failed');
      }
    } catch (error) {
      console.error('[SUCCESS-PAGE] Error associating purchase:', error);
    }
  }, [sessionId]);

  const handleGoToProfile = () => {
    window.location.href = '/me?checkout=success';
  };

  const handleGoHome = () => {
    window.location.href = '/?checkout=success';
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0B0F14' }}
    >
      <div className="max-w-md mx-auto text-center px-4">
        <div 
          className="rounded-2xl shadow-2xl p-8"
          style={{ 
            backgroundColor: '#0F141B',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Success Icon */}
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgba(54, 226, 180, 0.1)' }}
          >
            <svg 
              className="w-8 h-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: '#36E2B4' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 
            className="text-3xl font-bold mb-4"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700
            }}
          >
            ¡Pago completado!
          </h1>
          
          <p 
            className="mb-6"
            style={{ 
              color: '#EAF2FF',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              opacity: 0.8
            }}
          >
            ✅ Pago completado. Tu cuenta se ha actualizado automáticamente.
          </p>

          {sessionId && (
            <div 
              className="rounded-lg p-4 mb-6"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <p 
                className="text-sm mb-1"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  opacity: 0.7
                }}
              >
                ID de Sesión:
              </p>
              <p 
                className="text-xs font-mono break-all"
                style={{ 
                  color: '#EAF2FF',
                  fontFamily: 'monospace',
                  opacity: 0.8
                }}
              >
                {sessionId}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGoToProfile}
              className="w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
              style={{
                backgroundColor: '#5B8CFF',
                color: '#0B0F14',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                border: 'none'
              }}
            >
              Ir a mi perfil
            </button>
            
            <button
              onClick={handleGoHome}
              className="w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#EAF2FF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              Volver al Inicio
            </button>
          </div>

          {/* Additional Info */}
          <div 
            className="mt-8 pt-6"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <p 
              className="text-sm"
              style={{ 
                color: '#EAF2FF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                opacity: 0.7
              }}
            >
              Recibirás un email de confirmación en breve. ¡Bienvenido al grupo FOUNDERS!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
