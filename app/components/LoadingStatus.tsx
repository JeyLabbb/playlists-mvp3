import React from "react";

type Props = {
  message: string;   // p.ej. "Analizando tu intención…"
  show: boolean;     // true mientras esté cargando
  subtle?: boolean;
};

export default function LoadingStatus({ message, show, subtle }: Props) {
  if (!show) return null;

  return (
    <div className="w-full flex flex-col items-start gap-1">
      <p className={`thinking-text ${subtle ? "text-sm" : "text-base"} leading-6 loading-dots`}>
        {message}
      </p>
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-mist)' }}>
        <span className="inline-block h-2.5 w-2.5 rounded-full border border-current loading-pulse" style={{ borderColor: 'var(--color-electric)' }} />
        <span>Puede tardar unos minutos…</span>
      </div>
    </div>
  );
}
