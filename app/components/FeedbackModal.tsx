"use client";

import React, { useState } from "react";
import { toast } from "sonner";

type DefaultValues = {
  rating?: number | null;
  issue?: string;
  improve?: string;
  playlistId?: string;
  playlistName?: string;
  trackCount?: number;
  mode?: string;
  intentPrompt?: string;
  userEmail?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  defaultValues?: DefaultValues;
};

export default function FeedbackModal({ 
  open, 
  onClose, 
  onSubmitted,
  defaultValues = {}
}: Props) {
  const [rating, setRating] = useState<number>(defaultValues.rating || 0);
  const [positivesText, setPositivesText] = useState<string>(defaultValues.issue || "");
  const [negativesText, setNegativesText] = useState<string>(defaultValues.improve || "");
  const [comments, setComments] = useState<string>("");
  const [positiveChips, setPositiveChips] = useState<string[]>([]);
  const [negativeChips, setNegativeChips] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  // vienen de tu app - SIEMPRE usar el prompt automáticamente
  const prompt = defaultValues.intentPrompt || 'Prompt no disponible';
  const playlistId = defaultValues.playlistId || '';
  const userEmail = defaultValues.userEmail || 'anonymous';

  // Permitir envío siempre (feedback opcional)
  const canSend = !sending;

  async function sendFeedback() {
    if (sending) return;
    setSending(true);

    try {
      // Componer strings finales uniendo chips + textarea
      const positives = [...new Set([
        ...positiveChips,
        ...positivesText.split('\n').map(s => s.trim()).filter(Boolean)
      ])].join(' · ');

      const negatives = [...new Set([
        ...negativeChips,
        ...negativesText.split('\n').map(s => s.trim()).filter(Boolean)
      ])].join(' · ');

      // Payload con campos completos
      const payload = {
        rating,
        positives,      // ← ya con chips + textarea
        negatives,      // ← ya con chips + textarea
        comments: comments.trim(),
        prompt,         // ← AUTORELLENADO
        playlistId,
        userEmail,
      };

      console.log('[FEEDBACK] sending payload', payload);

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('[FEEDBACK-SEND] HTTP error', res.status, text);
        throw new Error(text || `HTTP ${res.status}`);
      }

      toast.success('¡Gracias por tu feedback!');
      onSubmitted();
      onClose(); // cierra el modal
    } catch (err) {
      console.error('[FEEDBACK-SEND] error', err);
      toast.error('No se pudo enviar. Reintenta.');
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-black-surface border border-gray-dark rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              ¿Cómo ha ido?
            </h2>
            {defaultValues.playlistName && (
              <p className="text-sm text-gray-text-secondary mt-1">
                &quot;{defaultValues.playlistName}&quot; ({defaultValues.trackCount || 0} tracks)
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-text-secondary hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Calificación (1-5) - Opcional
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`w-10 h-10 rounded-lg border transition-colors ${
                    rating !== null && rating >= star
                      ? 'bg-spotify-green border-spotify-green text-white'
                      : 'border-gray-dark text-gray-text-secondary hover:border-gray-400'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          
          {/* Pros */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Aciertos - Opcional
            </label>
            <textarea
              value={positivesText}
              onChange={(e) => setPositivesText(e.target.value)}
              className="spotify-textarea"
              placeholder="Ej: Canciones que encajan perfectamente, buena diversidad... (opcional)"
              rows={3}
              maxLength={800}
            />
            <div className="text-xs text-gray-text-secondary mt-1">
              {positivesText.length}/800 caracteres
            </div>
          </div>
          
          {/* Cons */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              A mejorar - Opcional
            </label>
            <textarea
              value={negativesText}
              onChange={(e) => setNegativesText(e.target.value)}
              className="spotify-textarea"
              placeholder="Ej: Más diversidad de artistas, mejor ordenación... (opcional)"
              rows={3}
              maxLength={800}
            />
            <div className="text-xs text-gray-text-secondary mt-1">
              {negativesText.length}/800 caracteres
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Comentarios adicionales - Opcional
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="spotify-textarea"
              placeholder="Cualquier otra cosa que quieras decir... (opcional)"
              rows={3}
              maxLength={800}
            />
            <div className="text-xs text-gray-text-secondary mt-1">
              {comments.length}/800 caracteres
            </div>
          </div>
          
          {/* Consent */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-4 h-4 text-spotify-green bg-black-surface border-gray-dark rounded focus:ring-spotify-green focus:ring-2"
            />
            <label htmlFor="consent" className="text-sm text-gray-text-secondary">
              Avisarme sobre mejoras futuras
            </label>
          </div>
          
          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="spotify-button-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={sendFeedback}
              disabled={!canSend}
              className="spotify-button flex-1 disabled:opacity-50"
            >
              {sending ? 'Enviando…' : 'Enviar feedback'}
            </button>
          </div>

          {/* Mensajes bajo el botón */}
          {errorMsg && <p className="mt-2 text-sm text-red-500">{errorMsg}</p>}
          {okMsg && <p className="mt-2 text-sm text-green-600">{okMsg}</p>}

          {/* Debug opcional */}
          {process.env.NEXT_PUBLIC_DEBUG_FEEDBACK === '1' && (
            <p className="text-xs opacity-60 mt-2">
              Debug feedback activo — mira la consola por [FEEDBACK-SEND]
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
