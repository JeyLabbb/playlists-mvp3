'use client';
import { useEffect, useRef, useState } from 'react';

type PL = { id: string; url: string };

type Props = {
  currentPrompt?: string;
};

const aciertosChips = [
  'nº de canciones (aprox)',
  'entendimiento del prompt',
  'variedad de artistas',
  'simplicidad de interfaz',
  'orden/transiciones',
  'otro'
] as const;

const fallosChips = [
  'poca relevancia',
  'repetición de artistas',
  'artistas mal interpretados',
  'demasiado mainstream',
  'demasiado nicho',
  'otro'
] as const;

function Stars({
  value, onChange, ariaLabel,
}: { value:number; onChange:(v:number)=>void; ariaLabel:string }) {
  const [hover, setHover] = useState<number | null>(null);
  const current = hover ?? value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={ariaLabel}>
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const active = current >= idx;
        return (
          <button
            key={idx}
            type="button"
            role="radio"
            aria-checked={value === idx}
            onMouseEnter={() => setHover(idx)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(idx)}
            className={`h-8 w-8 rounded-full transition-transform ${active ? 'scale-105' : 'opacity-60 hover:opacity-90'}`}
            title={`${idx} estrellas`}
          >
            <span className={`text-2xl leading-none ${active ? '' : 'text-gray-400'}`}>{active ? '★' : '☆'}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function FeedbackGate({ currentPrompt = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [playlist, setPlaylist] = useState<PL | null>(null);

  const [rating, setRating] = useState(0);
  const [aciertosSelected, setAciertosSelected] = useState<boolean[]>(new Array(aciertosChips.length).fill(false));
  const [fallosSelected, setFallosSelected] = useState<boolean[]>(new Array(fallosChips.length).fill(false));
  const aciertosRef = useRef<HTMLInputElement>(null);
  const fallosRef = useRef<HTMLInputElement>(null);
  const comentariosRef = useRef<HTMLTextAreaElement>(null);

  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Abrir al crear playlist
  useEffect(() => {
    const onCreated = (e: any) => { setPlaylist(e.detail as PL); setOpen(true); };
    window.addEventListener('playlist:created', onCreated);
    return () => window.removeEventListener('playlist:created', onCreated);
  }, []);

  // ESC + focus trap básico
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const sparkle =
    'before:absolute before:-inset-0.5 before:rounded-2xl before:bg-[conic-gradient(theme(colors.green.400),theme(colors.cyan.400),theme(colors.blue.400),theme(colors.green.400))] before:opacity-30 before:blur-sm before:animate-pulse';

  if (!open || !playlist) return null;

  const appendChip = (ref: React.RefObject<HTMLInputElement>, text: string) => {
    const el = ref.current;
    if (!el) return;
    const v = el.value.trim();
    el.value = v ? `${v}; ${text}` : text;
    el.focus();
  };

  const submit = async () => {
    if (rating === 0) {
      firstFocusRef.current?.focus();
      return;
    }
    
    // Componer strings finales uniendo chips + textarea
    const aciertosText = aciertosRef.current?.value ?? '';
    const fallosText = fallosRef.current?.value ?? '';
    
    const positives = [...new Set([
      ...aciertosChips.filter((_, i) => aciertosSelected[i]),
      ...aciertosText.split('\n').map(s => s.trim()).filter(Boolean)
    ])].join(' · ');

    const negatives = [...new Set([
      ...fallosChips.filter((_, i) => fallosSelected[i]),
      ...fallosText.split('\n').map(s => s.trim()).filter(Boolean)
    ])].join(' · ');

    const body = {
      rating: rating,
      positives,      // ← ya con chips + textarea
      negatives,      // ← ya con chips + textarea
      comments: comentariosRef.current?.value ?? '',
      prompt: currentPrompt,  // ← AUTORELLENADO
      playlistId: playlist.id,
      userEmail: 'jeylabbb@gmail.com', // For testing
    };

    try {
      const response = await fetch('/api/feedback', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        console.log('[FEEDBACK] Submitted successfully');
      } else {
        console.error('[FEEDBACK] Error:', await response.text());
      }
    } catch (error) {
      console.error('[FEEDBACK] Network error:', error);
    }
    
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <div className={`relative w-full max-w-lg rounded-2xl p-5 shadow-2xl mobile-modal-feedback ${sparkle}`} style={{ animationDuration: '2.2s', background: 'var(--color-night)' }}>
        <div className="relative rounded-2xl border p-4" style={{ background: 'var(--color-slate)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">¡Playlist creada! 🙌</h3>
              <p className="mt-1 text-sm text-gray-text-secondary">Tu feedback nos ayuda a mejorar 💛</p>
            </div>
          </div>

          {/* Estrellas */}
          <div className="mt-4">
            <label className="text-sm font-medium text-white">Valoración general</label>
            <div className="mt-2">
              <Stars value={rating} onChange={setRating} ariaLabel="Valoración general" />
            </div>
          </div>

          {/* Aciertos */}
          <div className="mt-4">
            <label className="text-sm font-medium text-white">¿Qué te gustó?</label>
            <input
              ref={aciertosRef}
              type="text"
              placeholder="Escribe lo que te gustó..."
              className="mt-2 w-full rounded-lg border p-3 text-white placeholder-gray-500 outline-none focus:border-spotify-green"
              style={{ background: 'var(--color-slate)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {aciertosChips.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  ref={i === 0 ? firstFocusRef : undefined}
                  onClick={() => {
                    const newSelected = [...aciertosSelected];
                    newSelected[i] = !newSelected[i];
                    setAciertosSelected(newSelected);
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    aciertosSelected[i] 
                      ? 'bg-spotify-green text-white' 
                      : 'bg-gray-dark text-gray-text-secondary hover:bg-spotify-green hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* A mejorar */}
          <div className="mt-4">
            <label className="text-sm font-medium text-white">¿Qué mejorarías?</label>
            <input
              ref={fallosRef}
              type="text"
              placeholder="Escribe lo que mejorarías..."
              className="mt-2 w-full rounded-lg border p-3 text-white placeholder-gray-500 outline-none focus:border-spotify-green"
              style={{ background: 'var(--color-slate)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {fallosChips.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    const newSelected = [...fallosSelected];
                    newSelected[i] = !newSelected[i];
                    setFallosSelected(newSelected);
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    fallosSelected[i] 
                      ? 'bg-spotify-green text-white' 
                      : 'bg-gray-dark text-gray-text-secondary hover:bg-spotify-green hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Comentarios */}
          <div className="mt-4">
            <label className="text-sm font-medium text-white" htmlFor="comments">Comentarios</label>
            <textarea
              id="comments"
              ref={comentariosRef}
              rows={2}
              placeholder="Algo más que quieras contarnos..."
              className="mt-2 w-full resize-y rounded-lg border p-3 text-white placeholder-gray-500 outline-none focus:border-spotify-green"
              style={{ background: 'var(--color-slate)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            />
          </div>

          {/* Botones */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button 
              type="button" 
              className="px-4 py-2 rounded-xl font-medium transition-all duration-200"
              style={{
                background: 'transparent',
                color: 'var(--color-accent-mixed)',
                border: '1px solid var(--color-accent-mixed)',
                fontFamily: 'var(--font-body)'
              }}
              onClick={() => setOpen(false)}
            >
              Saltar por ahora
            </button>
            <button
              type="button"
              className="px-6 py-2 rounded-xl font-semibold transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                color: '#0B0F12',
                border: 'none',
                fontFamily: 'var(--font-body)',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(71, 200, 209, 0.3)'
              }}
              onClick={submit}
            >
              Enviar
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-xl font-medium transition-all duration-200"
              style={{
                background: 'transparent',
                color: 'var(--color-accent-mixed)',
                border: '1px solid var(--color-accent-mixed)',
                fontFamily: 'var(--font-body)'
              }}
              onClick={() => { window.open(playlist.url, '_blank', 'noopener,noreferrer'); setOpen(false); }}
            >
              Abrir en Spotify
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}