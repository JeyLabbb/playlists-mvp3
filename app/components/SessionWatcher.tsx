"use client";
import { usePleiaSession } from "../../lib/auth/usePleiaSession";
import { useEffect } from "react";

export default function SessionWatcher() {
  const { status } = usePleiaSession();
  
  useEffect(() => {
    // Session watcher - no action needed
  }, [status]);
  
  return null;
}
