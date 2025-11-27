"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePleiaSession } from "../../lib/auth/usePleiaSession";
import { useAuthActions } from "../../lib/auth/clientActions";
import ReferralModule from "../components/ReferralModule";
import { useProfile } from "../../lib/useProfile";
// HUB_MODE eliminado - todas las funcionalidades siempre activas
import { useUsageStatus } from "../../lib/hooks/useUsageStatus";

const EMPTY_FORM = {
  displayName: "",
  username: "",
  bio: "",
  image: "",
};

const USERNAME_REGEX = /^[a-z0-9._-]{3,20}$/;

function deriveForm(profile, sessionUser) {
  const fallbackName =
    sessionUser?.name ||
    sessionUser?.user_metadata?.full_name ||
    sessionUser?.email?.split("@")[0] ||
    "";

  return {
    displayName: profile?.displayName || fallbackName,
    username:
      profile?.username ||
      sessionUser?.user_metadata?.username ||
      sessionUser?.email?.split("@")[0] ||
      "",
    bio: profile?.bio || "",
    image:
      profile?.image ||
      sessionUser?.user_metadata?.avatar_url ||
      sessionUser?.image ||
      "",
  };
}

export default function ProfilePage() {
  const authActions = useAuthActions();
  const { data: sessionData, status } = usePleiaSession();
  const sessionUser = sessionData?.user || null;
  const { login, logout } = authActions;
  const {
    isFounder,
    founderSince,
    plan,
    isEarlyFounderCandidate: profileIsEarly,
    mutate: mutateProfileMeta,
    data: profileData,
    loading: profileLoading,
    ready: profileReady,
  } = useProfile();
  
  // 🚨 OPTIMIZATION: Consolidar las dos llamadas a useUsageStatus en una sola
  const {
    data: usageStatus,
    remaining,
    maxUses,
    current,
    unlimited: hasUnlimitedUses,
    isLoading: usageLoading,
    refresh: refreshUsage,
    isEarlyFounderCandidate: usageIsEarly,
    data: usageStatusData,
  } = useUsageStatus({
    disabled: status !== "authenticated",
    refreshInterval: 45000,
  });
  
  // 🚨 CRITICAL: Usar la misma lógica que pricing - priorizar profileIsEarly, luego usageIsEarly
  // También verificar directamente en usageStatusData si está disponible
  const isEarlyFounderCandidate = 
    profileIsEarly || 
    usageIsEarly || 
    usageStatusData?.isEarlyFounderCandidate === true ||
    profileData?.isEarlyFounderCandidate === true;
  
  // 🚨 OPTIMIZATION: Eliminar logs innecesarios para mejor rendimiento
  // useEffect de logging removido

  const userEmail = useMemo(
    () => sessionUser?.email || "",
    [sessionUser?.email],
  );

  const localKey = useMemo(
    () => (userEmail ? `jey_user_profile:${userEmail}` : null),
    [userEmail],
  );

  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [usernameError, setUsernameError] = useState(null);

  const sessionUserRef = useRef(sessionUser);
  const remainingUses = useMemo(() => {
    if (hasUnlimitedUses || remaining === "unlimited") return "∞";
    if (typeof remaining === "number") {
      return Math.max(0, Math.round(remaining));
    }
    if (typeof maxUses === "number") {
      const consumed = typeof current === "number" ? current : usageStatus?.usage?.current ?? 0;
      return Math.max(0, Math.round(maxUses - consumed));
    }
    return undefined;
  }, [hasUnlimitedUses, remaining, maxUses, current, usageStatus]);

  const consumedUses = useMemo(() => {
    if (typeof current === "number") return Math.max(0, current);
    const fallback = usageStatus?.usage?.current ?? usageStatus?.used ?? 0;
    return typeof fallback === "number" ? Math.max(0, fallback) : undefined;
  }, [current, usageStatus]);

  const limitUses = useMemo(() => {
    if (hasUnlimitedUses) return "∞";
    if (typeof maxUses === "number") return maxUses;
    const fallback =
      usageStatus?.usage?.limit ??
      usageStatus?.limitPerWindow ??
      (usageStatus?.usage?.hasUnlimitedUses ? null : undefined);
    if (typeof fallback === "number") return fallback;
    return undefined;
  }, [hasUnlimitedUses, maxUses, usageStatus]);


  useEffect(() => {
    sessionUserRef.current = sessionUser;
  }, [sessionUser]);

  // 🚨 OPTIMIZATION: Eliminar refresh automático innecesario
  // useUsageStatus ya se actualiza automáticamente con refreshInterval
  // No necesitamos forzar un refresh adicional al cambiar de status

  const applyProfile = useCallback(
    (data, persist = false) => {
      if (!data) return;
      setProfile(data);
      const derived = deriveForm(data, sessionUserRef.current);
      setFormData(derived);
      setAvatarPreview(derived.image || null);
      if (persist && localKey) {
        try {
          localStorage.setItem(localKey, JSON.stringify(data));
        } catch (err) {
          console.warn("[PROFILE] Failed to persist profile locally", err);
        }
      }
    },
    [localKey],
  );

  useEffect(() => {
    if (!userEmail) {
      setProfile(null);
      setFormData(EMPTY_FORM);
      setAvatarPreview(null);
      setInitializing(true);
      return;
    }

    let cancelled = false;
    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      if (localKey) {
        try {
          const cached = localStorage.getItem(localKey);
          if (cached && !cancelled) {
            const parsed = JSON.parse(cached);
            applyProfile(parsed);
          }
        } catch (err) {
          console.warn("[PROFILE] Failed to parse cached profile", err);
        }
      }

      try {
        const response = await fetch("/api/profile", { credentials: "include" });
        const data = await response.json();

        if (cancelled) return;

        if (response.ok && data.success && data.profile) {
          applyProfile(data.profile, true);
          setError(null);
        } else {
          setError((prev) => prev || data.error || "No se pudo cargar tu perfil.");
        }
      } catch (err) {
        if (!cancelled) {
          setError((prev) => prev || "No se pudo cargar tu perfil. Revisa tu conexión e inténtalo de nuevo.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [userEmail, localKey, applyProfile]);

  useEffect(() => {
    if (!usernameError && success) {
      const timeout = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timeout);
    }
  }, [success, usernameError]);

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: field === "username" ? value.toLowerCase() : value,
    }));

    if (field === "username") {
      if (!value) {
        setUsernameError("El nombre de usuario es obligatorio.");
      } else if (!USERNAME_REGEX.test(value)) {
        setUsernameError(
          "Usa de 3 a 20 caracteres: letras minúsculas, números, puntos, guiones o guion bajo.",
        );
      } else {
        setUsernameError(null);
      }
    }

    if (field === "image") {
      setAvatarPreview(value || null);
    }
  };

  const handleRestore = () => {
    if (!localKey) return;
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        applyProfile(parsed);
        setSuccess("Restauramos la última versión guardada.");
        setError(null);
        setAvatarPreview(parsed?.image || null);
      }
    } catch (err) {
      setError("No se pudo restaurar tu perfil.");
    }
  };

  const handleSave = async () => {
    if (!userEmail) {
      login("/me");
      return;
    }

    if (usernameError) {
      setError(usernameError);
      return;
    }

    if (!USERNAME_REGEX.test(formData.username)) {
      setUsernameError(
        "Usa de 3 a 20 caracteres: letras minúsculas, números, puntos, guiones o guion bajo.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data?.available === false) {
          setUsernameError("Ese nombre de usuario ya está en uso.");
        }
        setError(data?.error || "No pudimos guardar tu perfil.");
        return;
      }

      applyProfile(data.profile, true);
      setSuccess("Guardamos tus cambios.");
      mutateProfileMeta?.();
      setAvatarPreview(data.profile?.image || null);
    } catch (err) {
      setError("No pudimos guardar tu perfil. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      localStorage.removeItem("ea_done");
      localStorage.removeItem("ea_pending");
      if (localKey) {
        localStorage.removeItem(localKey);
      }
    } catch (err) {
      console.warn("[PROFILE] Failed to clear local storage", err);
    }
    await logout("/");
    setTimeout(() => setLoggingOut(false), 500);
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", { method: "DELETE", credentials: "include" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data?.error || "No pudimos eliminar tu cuenta.");
        setDeletingAccount(false);
        return;
      }

      if (localKey) {
        localStorage.removeItem(localKey);
      }
      logout("/");
    } catch (err) {
      setError("No pudimos eliminar tu cuenta. Inténtalo más tarde.");
      setDeletingAccount(false);
    }
  };

  const effectivePlan = useMemo(() => {
    // 🚨 CRITICAL: Priorizar isFounder para detectar plan founder
    if (isFounder) {
      return "founder";
    }
    
    const usagePlan =
      usageStatus?.usage?.plan ||
      (typeof usageStatus?.plan === "string" ? usageStatus?.plan : null);
    const profilePlan =
      typeof profile?.plan === "string" && profile?.plan.length > 0 ? profile?.plan : null;
    const contextPlan =
      typeof plan === "string" && plan?.length > 0 ? plan : null;

    const resolved = usagePlan || contextPlan || profilePlan || "free";

    if (resolved === "hub") {
      return "free";
    }

    return resolved;
  }, [usageStatus, plan, profile, isFounder]);

  const planLabel = useMemo(() => {
    switch (effectivePlan) {
      case "founder":
        return "Founder";
      case "premium":
        return "PLEIA Premium";
      case "monthly":
        return "PLEIA+ mensual";
      case "hub":
        return "Gratuito";
      case "free":
      default:
        return "Gratuito";
    }
  }, [effectivePlan]);

  const isFounderPlan = effectivePlan === "founder";
  const previewImage = avatarPreview || formData.image || null;

  // 🚨 CRITICAL: profileLoaded debe ser true si tenemos sessionUser, incluso si initializing es true
  // Esto evita que se oculte el contenido mientras se carga
  const profileLoaded = !!sessionUser;

  // Solo mostrar loading si realmente no tenemos datos y estamos cargando
  if (status === "loading" && !sessionUser) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="text-gray-400">Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !sessionUser) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="pt-16 pb-12 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="text-6xl">👤</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Mi perfil
            </h1>
            <p className="text-gray-400 text-lg">
              Necesitas iniciar sesión para ver y editar tu perfil en PLEIA.
            </p>
            <button
              onClick={() => login("/me")}
              className="inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-8 py-4 rounded-xl transition shadow-lg"
            >
              <span className="text-lg">🔑</span>
              <span>Iniciar sesión</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="pt-16 pb-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-500">PLEIA</p>
              <h1 className="mt-2 text-2xl md:text-4xl font-bold leading-tight">
                Configura tu perfil
              </h1>
              <p className="mt-2 md:mt-3 text-gray-400 max-w-2xl text-sm md:text-base hidden md:block">
                Personaliza cómo te ven en PLEIA, gestiona tus datos y mantén tu
                cuenta segura. Esta información solo se usa para mejorar tu experiencia.
              </p>
              {/* 🚨 CRITICAL: Mostrar mensaje inmediatamente cuando isEarlyFounderCandidate esté disponible, sin esperar a que todo el perfil esté cargado */}
              {(isEarlyFounderCandidate || profileData?.isEarlyFounderCandidate === true || usageStatusData?.isEarlyFounderCandidate === true) && !isFounder && (
                <div className="mt-4 p-4 rounded-xl border-2" style={{ backgroundColor: 'rgba(255, 140, 0, 0.05)', borderColor: '#FF8C00' }}>
                  <p className="text-xs md:text-sm text-yellow-200 max-w-2xl">
                    🎉 <strong>Primeros 1000 usuarios.</strong> Founder Pass gratis invitando 3 amigos. <a href="/pricing#ventaja" className="underline hover:text-yellow-100">Ver ventaja</a>.
                  </p>
                </div>
              )}
            </div>
            <div
              className={
                `${
                  isFounderPlan
                    ? 'bg-gradient-to-br from-[#3d2a00] via-[#7f5f1f] to-[#f6c544] border border-[#f6c744]/50 shadow-[0_0_25px_rgba(246,197,68,0.35)]'
                    : 'bg-gray-900/80 border border-gray-700'
                } rounded-2xl p-5 space-y-3 w-full md:w-72`
              }
            >
              <div className={isFounderPlan ? 'text-xs uppercase tracking-[0.35em] text-[#fce9b1]' : 'text-sm uppercase tracking-wide text-gray-400'}>
                {isFounderPlan ? 'PLEIA FOUNDER' : 'Estado del plan'}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-3 w-3 rounded-full ${
                    isFounderPlan ? 'bg-[#f6c744] shadow-[0_0_12px_rgba(246,197,68,0.65)]' : 'bg-emerald-400'
                  } animate-pulse`}
                ></span>
                <div>
                  <div className={`text-lg font-semibold ${isFounderPlan ? 'text-[#ffe8a3] flex items-center gap-2' : ''}`}>
                    {isFounderPlan && <span className="text-xl" aria-hidden="true">👑</span>}
                    <span>{planLabel}</span>
                  </div>
                  <div className={`${isFounderPlan ? 'text-[11px] text-[#fce9b1]/80' : 'text-xs text-gray-500'}`}>
                    {isFounderPlan && founderSince
                      ? `Desde ${new Date(founderSince).toLocaleDateString()}`
                      : isFounderPlan
                        ? 'Acceso ilimitado asegurado'
                        : 'Modo PLEIA Hub activo'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className={`w-full rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
                  isFounderPlan
                    ? 'border border-[#f6c744]/60 text-[#ffeebf] hover:border-[#ffd369] hover:shadow-[0_0_20px_rgba(246,197,68,0.25)]'
                    : 'border border-gray-600 text-gray-200 hover:border-gray-400'
                }`}
              >
                {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </button>
            </div>
          </header>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
              {success}
            </div>
          )}

          {profileLoaded && (
            <section className="bg-gray-900/60 border border-gray-800 rounded-3xl p-8 shadow-xl space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl font-semibold uppercase overflow-hidden">
                    {previewImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={previewImage}
                        src={previewImage}
                        alt={formData.displayName || "Avatar"}
                        className="h-full w-full object-cover"
                        onError={() => {
                          setAvatarPreview(null);
                        }}
                      />
                    ) : (
                      (formData.displayName || userEmail)[0]?.toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wide text-gray-400">Cuenta</p>
                    <h2 className="text-2xl font-semibold">
                      {formData.displayName || sessionUser?.name || userEmail}
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">{userEmail}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving || !!usernameError}
                    className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button
                    onClick={handleRestore}
                    className="px-6 py-3 rounded-xl border border-gray-600 text-sm font-medium text-gray-200 hover:border-gray-400 transition"
                  >
                    Restaurar últimos datos
                  </button>
                </div>

                {!isFounder && typeof remainingUses !== "undefined" && (
                  <div className="mt-4 text-xs text-gray-500">
                    {remainingUses === "∞"
                      ? "Tienes usos ilimitados activos."
                      : `Te quedan ${remainingUses} playlists gratis.`}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nombre visible
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={handleFieldChange("displayName")}
                      placeholder="Tu nombre público"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nombre de usuario
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={handleFieldChange("username")}
                      placeholder="usuario"
                      className={`w-full rounded-xl px-4 py-3 text-sm outline-none ${
                        usernameError
                          ? "border border-red-500/60 bg-red-500/10 focus:border-red-400"
                          : "border border-white/10 bg-black/30 focus:border-white/40"
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Se usará en tus enlaces públicos. Solo minúsculas, números, guiones,
                      puntos o guion bajo.
                    </p>
                    {usernameError && (
                      <p className="text-xs text-red-300 mt-1">{usernameError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Foto de perfil
                    </label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                    <label className="rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-sm font-medium text-gray-100 hover:border-white/30 transition cursor-pointer">
                          Elegir archivo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;

                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = reader.result;
                            if (typeof result === "string") {
                              setFormData((prev) => ({
                                ...prev,
                                image: result,
                              }));
                              setAvatarPreview(result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                        <button
                          type="button"
                          className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-gray-100 hover:border-white/30 transition"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, image: "" }));
                            setAvatarPreview(null);
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                      <input
                        type="url"
                        value={formData.image}
                        onChange={handleFieldChange("image")}
                        placeholder="https://..."
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Puedes subir una imagen desde tus archivos o pegar una URL directa. Si la dejas vacía, usaremos una inicial.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={handleFieldChange("bio")}
                    rows={10}
                    maxLength={280}
                    placeholder="Cuéntanos quién eres, qué música te inspira o qué tipo de playlists te gusta crear."
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/40 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2 text-right">
                    {formData.bio.length} / 280 caracteres
                  </p>
                </div>
              </div>
            </section>
          )}

          {status === "authenticated" && userEmail && (
            <>
              {/* 🚨 OPTIMIZATION: Logs removidos para mejor rendimiento */}
              <ReferralModule userEmail={userEmail} />
            </>
          )}

          <section className="bg-red-500/10 border border-red-500/40 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-red-100">Zona peligrosa</h3>
                <p className="text-sm text-red-200/80">
                  Eliminar tu cuenta borrará tu perfil de PLEIA y cerrarás sesión
                  inmediatamente. Tus playlists generadas en PLEIAHub seguirán disponibles.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-5 py-2 rounded-lg border border-red-400 text-sm font-semibold text-red-200 hover:bg-red-500/10 transition"
              >
                Eliminar cuenta
              </button>
            </div>
          </section>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#0B0F12] p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-200">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-xl font-semibold">¿Eliminar tu cuenta?</h3>
            </div>
            <p className="text-sm text-gray-300">
              Esta acción eliminará tu perfil guardado y cerrarás sesión. Tus playlists en
              la cuenta PLEIAHub no se verán afectadas.
            </p>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-600 text-sm font-medium text-gray-200 hover:border-gray-400 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="px-4 py-2 rounded-lg bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deletingAccount ? "Eliminando..." : "Sí, eliminar cuenta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

