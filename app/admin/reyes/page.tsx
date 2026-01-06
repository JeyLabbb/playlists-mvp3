'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function ReyesAdmin() {
  const [granting, setGranting] = useState(false);
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGrantFounder = async () => {
    if (!confirm('¿Convertir TODOS los usuarios a Founder? Esto es idempotente.')) {
      return;
    }

    setGranting(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/reyes/grant-founder', {
        method: 'POST',
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`${data.updated} usuarios convertidos a Founder`);
        setResult({ type: 'grant', ...data });
      } else {
        toast.error(data.error || 'Error al convertir usuarios');
      }
    } catch (error) {
      console.error('[REYES_ADMIN] Error granting founder:', error);
      toast.error('Error al convertir usuarios');
    } finally {
      setGranting(false);
    }
  };

  const handleSendEmail = async (resendOnly = false) => {
    const message = resendOnly 
      ? '¿Reenviar email de Reyes solo a usuarios que NO lo han recibido?'
      : '¿Enviar email de Reyes a TODOS los usuarios? Esto puede tardar varios minutos.';
    
    if (!confirm(message)) {
      return;
    }

    if (resendOnly) {
      setResending(true);
    } else {
      setSending(true);
    }
    setResult(null);
    
    try {
      const res = await fetch('/api/admin/reyes/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resendOnly }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.total === 0) {
          toast.info('No hay usuarios pendientes de recibir el email');
        } else {
          toast.success(`Emails enviados: ${data.sent} exitosos, ${data.failed} fallidos`);
        }
        setResult({ type: 'email', ...data });
      } else {
        toast.error(data.error || 'Error al enviar emails');
      }
    } catch (error) {
      console.error('[REYES_ADMIN] Error sending emails:', error);
      toast.error('Error al enviar emails');
    } finally {
      setSending(false);
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Reyes - Acciones Masivas</h1>

        <div className="space-y-6">
          {/* Grant Founder */}
          <div className="bg-gray-800 rounded-lg p-6 border border-blue-500/30">
            <h2 className="text-xl font-semibold mb-4">1. Convertir a Founder</h2>
            <p className="text-gray-400 mb-4">
              Convierte a TODOS los usuarios a Founder (plan ilimitado).
              <br />
              <span className="text-sm">Idempotente: si ya son Founder, no hace nada.</span>
            </p>
            <button
              onClick={handleGrantFounder}
              disabled={granting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium disabled:opacity-50"
            >
              {granting ? 'Convirtiendo...' : 'Grant Founder a Todos'}
            </button>
            {result?.type === 'grant' && (
              <div className="mt-4 p-4 bg-green-900/30 rounded text-sm">
                ✅ {result.updated} usuarios convertidos a Founder
              </div>
            )}
          </div>

          {/* Send Email */}
          <div className="bg-gray-800 rounded-lg p-6 border border-green-500/30">
            <h2 className="text-xl font-semibold mb-4">2. Enviar Email de Reyes</h2>
            <p className="text-gray-400 mb-4">
              Envía el email de Reyes con Founder Pass a usuarios.
              <br />
              <span className="text-sm">
                Rate limit: 2 emails/segundo (600ms entre cada uno). Solo se envían a usuarios que NO lo han recibido.
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleSendEmail(false)}
                disabled={sending || resending}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium disabled:opacity-50"
              >
                {sending ? 'Enviando...' : 'Enviar a Todos (Primera Vez)'}
              </button>
              <button
                onClick={() => handleSendEmail(true)}
                disabled={sending || resending}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white font-medium disabled:opacity-50"
              >
                {resending ? 'Reenviando...' : 'Reenviar Solo a los que Faltan'}
              </button>
            </div>
            {result?.type === 'email' && (
              <div className="mt-4 p-4 bg-green-900/30 rounded text-sm space-y-2">
                <div>✅ Enviados: {result.sent}</div>
                <div>❌ Fallidos: {result.failed}</div>
                <div>📊 Total procesados: {result.total}</div>
                {result.message && (
                  <div className="text-yellow-400">{result.message}</div>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-400">
                    Primeros errores ({result.errors.length}):
                    <ul className="list-disc list-inside mt-1 max-h-32 overflow-y-auto">
                      {result.errors.map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

