"use client";
import { usePleiaSession } from "../../lib/auth/usePleiaSession";
import { useEffect } from "react";

export default function SessionWatcher() {
  const { status } = usePleiaSession();
  
  useEffect(() => {
    if (status === 'authenticated') {
      try {
        localStorage.setItem('ea_done', '1');
        localStorage.removeItem('ea_pending');
      } catch {}
    }
  }, [status]);
  
  return null;
}
