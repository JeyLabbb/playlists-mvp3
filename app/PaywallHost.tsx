"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePleiaSession } from "../lib/auth/usePleiaSession";
import { useUsageStatus } from "../lib/hooks/useUsageStatus";
import { useProfile } from "../lib/useProfile";
import { REFERRALS_ENABLED, canInvite } from "../lib/referrals";
import PaywallModal from "./components/paywall/PaywallModal";

const DEFAULT_USAGE = {
  usage: {
    current: 0,
    limit: 5,
    remaining: 5,
    hasUnlimitedUses: false,
    plan: "free",
  },
  used: 0,
  remaining: 5,
  unlimited: false,
  plan: "free",
};

function hasUnlimited(detail: any) {
  if (!detail) return false;
  if (detail?.isFounder) return true;
  const usage = detail?.usage || detail;
  return (
    usage?.unlimited === true ||
    usage?.usage?.hasUnlimitedUses === true ||
    usage?.remaining === "unlimited"
  );
}

export default function PaywallHost() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [payload, setPayload] = useState<any>(null);
  const { data: session } = usePleiaSession();
  const { isEarlyFounderCandidate } = useProfile();
  const usageDisabled = !session?.user;
  const {
    data: usageStatus,
    refresh: refreshUsage,
  } = useUsageStatus({
    disabled: usageDisabled,
    refreshInterval: usageDisabled ? 0 : 60000,
  });

  const effectiveUsage = useMemo(() => {
    if (payload?.usage) return payload.usage;
    if (usageStatus) return usageStatus;
    return DEFAULT_USAGE;
  }, [payload, usageStatus]);

  const closeHost = useCallback(() => {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("paywall:dismissed"));
      window.dispatchEvent(new CustomEvent("paywall:hide", { detail: { source: "user" } }));
    }
  }, []);

  const handleFounderCheckout = useCallback(() => {
    closeHost();
    if (typeof window !== "undefined") {
      window.location.href = "/pricing?plan=founder";
    }
  }, [closeHost]);

  const handleShowPayload = useCallback((detail: any) => {
    if (detail?.profilePending) {
      return;
    }
    const nextDetail = detail || { usage: DEFAULT_USAGE };
    if (hasUnlimited(nextDetail)) {
      setOpen(false);
      return;
    }
    setPayload((prev: any) => ({ ...(prev || {}), ...(nextDetail || {}) }));
    setOpen(true);
    if (!usageDisabled) {
      refreshUsage();
    }
  }, [usageDisabled, refreshUsage]);

  const handleHidePayload = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    (window as any).__showPaywall = (detail?: any) => handleShowPayload(detail);
    (window as any).__hidePaywall = () => handleHidePayload();

    const onShow = (event: any) => handleShowPayload(event?.detail);
    const onHide = () => handleHidePayload();

    window.addEventListener("paywall:show", onShow);
    window.addEventListener("paywall:hide", onHide);

    return () => {
      delete (window as any).__showPaywall;
      delete (window as any).__hidePaywall;
      window.removeEventListener("paywall:show", onShow);
      window.removeEventListener("paywall:hide", onHide);
    };
  }, [handleShowPayload, handleHidePayload]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const existing = document.getElementById("paywall-host-root");
    if (existing instanceof HTMLElement) {
      setPortalNode(existing);
      return;
    }

    const node = document.createElement("div");
    node.setAttribute("id", "paywall-host-root");
    document.body.appendChild(node);
    setPortalNode(node);

    return () => {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    // 🚨 CRITICAL: Si ya hay un payload con datos válidos, no sobrescribirlo
    // Solo actualizar con usageStatus si no hay payload o si el payload no tiene datos completos
    if (usageStatus) {
      setPayload((prev: any) => {
        // Si prev ya tiene datos válidos, hacer merge en lugar de reemplazar
        if (prev && prev.usage && typeof prev.usage.current === 'number') {
          return {
            ...prev,
            usage: {
              ...prev.usage,
              ...usageStatus.usage,
              // Priorizar valores de prev si existen y son más recientes
              current: prev.usage.current ?? usageStatus.usage?.current ?? 0,
              remaining: prev.usage.remaining ?? usageStatus.usage?.remaining ?? 0,
              limit: prev.usage.limit ?? usageStatus.usage?.limit ?? 5,
            },
            // Mantener advantage del payload si ya está calculado
            advantage: prev.advantage ?? (usageStatus.isEarlyFounderCandidate ? true : undefined),
            isEarlyFounderCandidate: prev.isEarlyFounderCandidate ?? usageStatus.isEarlyFounderCandidate,
          };
        }
        // Si no hay prev o no tiene datos válidos, usar usageStatus
        return {
          ...(prev || {}),
          usage: usageStatus,
          advantage: prev?.advantage ?? (usageStatus.isEarlyFounderCandidate ? true : undefined),
          isEarlyFounderCandidate: prev?.isEarlyFounderCandidate ?? usageStatus.isEarlyFounderCandidate,
        };
      });
      if (hasUnlimited({ usage: usageStatus })) {
        closeHost();
      }
    }
  }, [open, usageStatus, closeHost]);

  const combinedUsage = useMemo(() => {
    // 🚨 CRITICAL: Priorizar payload si tiene datos completos (viene de app/page.js con datos calculados)
    // Si payload tiene usage, usarlo directamente; si no, usar usageStatus o DEFAULT_USAGE
    const base =
      (payload?.usage && typeof payload.usage.current === 'number')
        ? payload.usage
        : payload ||
          usageStatus ||
          DEFAULT_USAGE;

    const plan =
      payload?.plan ||
      base?.plan ||
      base?.usage?.plan ||
      usageStatus?.plan ||
      DEFAULT_USAGE.plan;

    // 🚨 CRITICAL: Leer isEarlyFounderCandidate de múltiples fuentes
    // PRIORIDAD: payload > usageStatus > useProfile
    // Esto asegura que si app/page.js ya calculó y pasó el flag, se use ese
    const earlyFromPayload = payload?.isEarlyFounderCandidate === true;
    const earlyFromStatus = usageStatus?.isEarlyFounderCandidate === true;
    const earlyFromProfile = !!isEarlyFounderCandidate;
    
    const isEarlyCandidate = earlyFromPayload || earlyFromProfile || earlyFromStatus;

    // 🚨 CRITICAL: Priorizar canAccessAdvantage del payload (ya calculado en app/page.js)
    // Solo calcular si no está presente
    let advantage =
      payload?.canAccessAdvantage ??
      payload?.advantage ??
      base?.advantage ??
      (usageStatus?.isEarlyFounderCandidate ? true : undefined) ??
      false;

    // Solo calcular advantage si no está presente y tenemos datos para calcularlo
    if (advantage === false && REFERRALS_ENABLED && session?.user?.email) {
      try {
        advantage = canInvite(session.user.email, { isEarlyCandidate });
      } catch (error) {
        console.warn("[PAYWALL-HOST] Failed to evaluate referral advantage:", error);
      }
    }

    // 🚨 CRITICAL: Asegurar que el objeto retornado tenga la estructura correcta
    // que PaywallModal espera: usage.usage.current, usage.usage.limit, etc.
    
    // Determinar el objeto usage interno
    let usageObject;
    
    // Si payload tiene usage con estructura completa, usarlo directamente
    if (payload?.usage && typeof payload.usage.current === 'number') {
      usageObject = payload.usage;
    }
    // Si base tiene usage (de useUsageStatus), usarlo
    else if (base?.usage && typeof base.usage.current === 'number') {
      usageObject = base.usage;
    }
    // Si base es directamente un objeto usage (tiene current, limit, remaining)
    else if (typeof base?.current === 'number') {
      usageObject = {
        current: base.current,
        limit: base.limit ?? base.limitPerWindow ?? 5,
        remaining: base.remaining ?? 5,
        hasUnlimitedUses: base.unlimited ?? base.hasUnlimitedUses ?? false,
        plan: base.plan ?? 'free',
        maxUses: base.maxUses ?? base.limit ?? base.limitPerWindow ?? 5,
        lastPromptAt: base.lastPromptAt ?? base.counters?.last_prompt_at ?? null,
      };
    }
    // Si usageStatus tiene usage, usarlo
    else if (usageStatus?.usage && typeof usageStatus.usage.current === 'number') {
      usageObject = usageStatus.usage;
    }
    // Construir desde propiedades dispersas
    else {
      usageObject = {
        current: base?.current ?? base?.used ?? usageStatus?.usage?.current ?? usageStatus?.used ?? 0,
        limit: base?.limit ?? base?.limitPerWindow ?? usageStatus?.usage?.limit ?? usageStatus?.limitPerWindow ?? 5,
        remaining: base?.remaining ?? usageStatus?.usage?.remaining ?? usageStatus?.remaining ?? 5,
        hasUnlimitedUses: base?.unlimited ?? base?.hasUnlimitedUses ?? usageStatus?.unlimited ?? usageStatus?.usage?.hasUnlimitedUses ?? false,
        plan: base?.plan ?? usageStatus?.plan ?? 'free',
        maxUses: base?.maxUses ?? base?.limit ?? base?.limitPerWindow ?? usageStatus?.usage?.maxUses ?? usageStatus?.limitPerWindow ?? 5,
        lastPromptAt: base?.lastPromptAt ?? base?.counters?.last_prompt_at ?? usageStatus?.usage?.lastPromptAt ?? usageStatus?.counters?.last_prompt_at ?? null,
      };
    }
    
    const result = {
      ...base,
      // 🚨 CRITICAL: Estructura usage.usage que PaywallModal espera
      usage: usageObject,
      // Propiedades de nivel superior también (para compatibilidad)
      used: usageObject.current,
      remaining: typeof usageObject.remaining === 'number' ? usageObject.remaining : (usageObject.remaining === 'unlimited' ? Infinity : 5),
      limit: usageObject.limit,
      limitPerWindow: usageObject.limit,
      unlimited: usageObject.hasUnlimitedUses,
      plan,
      canAccessAdvantage: advantage,
      advantage: advantage, // También pasar como 'advantage' para compatibilidad
      isEarlyFounderCandidate: isEarlyCandidate, // Pasar también el flag para debug
    };

    // Debug: Log completo
    if (typeof window !== 'undefined') {
      console.log('[PAYWALL-HOST] ===== COMBINED USAGE =====');
      console.log('[PAYWALL-HOST] payload:', payload);
      console.log('[PAYWALL-HOST] usageStatus:', usageStatus);
      console.log('[PAYWALL-HOST] base:', base);
      console.log('[PAYWALL-HOST] usageObject:', usageObject);
      console.log('[PAYWALL-HOST] final result:', result);
      console.log('[PAYWALL-HOST] isEarlyCandidate:', isEarlyCandidate, 'advantage:', advantage);
    }

    return result;
  }, [payload, usageStatus, session?.user?.email, isEarlyFounderCandidate]);

  if (!mounted || !portalNode) return null;

  return createPortal(
    <PaywallModal
      isOpen={open && !hasUnlimited(payload)}
      onClose={closeHost}
      usage={combinedUsage}
      onBuyFounder={handleFounderCheckout}
    />,
    portalNode,
  );
}

