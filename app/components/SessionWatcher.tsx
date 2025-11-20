"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function SessionWatcher() {
  const { status } = useSession();
  
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
