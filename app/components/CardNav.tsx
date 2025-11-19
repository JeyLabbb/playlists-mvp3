"use client";

import { useLayoutEffect, useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { GoArrowUpRight } from "react-icons/go";
import styles from "./CardNav.module.css";
import { usePleiaSession } from "../../lib/auth/usePleiaSession";
import { useAuthActions } from "../../lib/auth/clientActions";
import { useProfile } from "../../lib/useProfile";

type NavLink = { label: string; href: string; ariaLabel?: string };
type NavSection = { label: string; links: NavLink[] };

type Props = {
  items: NavSection[];
  className?: string;
  ease?: string;
  baseColor?: string;
  menuColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
};

export default function CardNav({
  items,
  className = "",
  ease = "power3.out",
              baseColor = "var(--color-night)",
              menuColor = "var(--color-cloud)",
              buttonBgColor = "var(--gradient-primary)",
              buttonTextColor = "var(--color-night)",
}: Props) {
  const { data: session } = usePleiaSession();
  const { login } = useAuthActions();
  const router = useRouter();
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { isFounder } = useProfile();
  const navRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const calculateHeight = useCallback(() => {
    const navEl = navRef.current;
    if (!navEl) return 400;
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) return 400;

    const contentEl = navEl.querySelector(`.${styles.content}`) as HTMLDivElement | null;
    if (!contentEl) return 400;

    const prev = {
      visibility: contentEl.style.visibility,
      pointerEvents: contentEl.style.pointerEvents,
      position: contentEl.style.position,
      height: contentEl.style.height,
    };
    contentEl.style.visibility = "visible";
    contentEl.style.pointerEvents = "auto";
    contentEl.style.position = "static";
    contentEl.style.height = "auto";
    // force reflow
    void contentEl.offsetHeight;

    const topBar = 80;
    const padding = 80;
    const h = topBar + contentEl.scrollHeight + padding;

    contentEl.style.visibility = prev.visibility;
    contentEl.style.pointerEvents = prev.pointerEvents;
    contentEl.style.position = prev.position;
    contentEl.style.height = prev.height;

    return h;
  }, []);

  const createTimeline = useCallback(() => {
    const navEl = navRef.current;
    if (!navEl) return null;

    gsap.set(navEl, { height: 80, overflow: "hidden" });
    gsap.set(cardsRef.current, { y: 40, opacity: 0 });

    const tl = gsap.timeline({ paused: true });
    tl.to(navEl, { height: calculateHeight, duration: 0.35, ease });
    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.35, ease, stagger: 0.06 }, "-=0.1");
    return tl;
  }, [calculateHeight, ease]);

  useLayoutEffect(() => {
    try {
      const tl = createTimeline();
      tlRef.current = tl;
      return () => {
        try {
          tl?.kill();
          tlRef.current = null;
        } catch (err) {
          // Ignore cleanup errors
        }
      };
    } catch (err) {
      console.warn('Timeline creation error:', err);
      return () => {};
    }
  }, [ease, items, createTimeline]);

  useLayoutEffect(() => {
    const onResize = () => {
      try {
        if (!tlRef.current || !navRef.current) return;
        if (isExpanded) {
          const h = calculateHeight();
          gsap.set(navRef.current, { height: h });
          tlRef.current.kill();
          const newTl = createTimeline();
          if (newTl) {
            newTl.progress(1);
            tlRef.current = newTl;
          }
        } else {
          tlRef.current.kill();
          const newTl = createTimeline();
          if (newTl) tlRef.current = newTl;
        }
      } catch (err) {
        // Ignore resize errors during cleanup
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
  }, [isExpanded, calculateHeight, createTimeline]);

  const toggleMenu = () => {
    const tl = tlRef.current;
    if (!tl) return;
    if (!isExpanded) {
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      tl.play(0);
    } else {
      setIsHamburgerOpen(false);
      tl.eventCallback("onReverseComplete", () => setIsExpanded(false));
      tl.reverse();
    }
  };

  const closeMenu = () => {
    const tl = tlRef.current;
    if (!tl || !isExpanded) return;
    setIsHamburgerOpen(false);
    tl.eventCallback("onReverseComplete", () => setIsExpanded(false));
    tl.reverse();
  };

  const setCardRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) cardsRef.current[i] = el;
  };

  const ctaClick = async () => {
    if (session?.user) {
      router.push("/me");
    } else {
      // Función para leer cookie ea_snooze
      const getEaSnoozeCookie = () => {
        if (typeof window === 'undefined') return false;
        const cookies = document.cookie.split(';');
        const eaSnoozeCookie = cookies.find(cookie => 
          cookie.trim().startsWith('ea_snooze=')
        );
        return eaSnoozeCookie?.trim().split('=')[1] === '1';
      };

      // Usar login de Supabase
      login('/');
    }
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <nav
        ref={navRef}
        className={`${styles.nav} ${isExpanded ? styles.open : ""}`}
        style={{ backgroundColor: baseColor }}
      >
        <div className={styles.top}>
          <button
            className={`${styles.hamburger} ${isHamburgerOpen ? styles.open : ""}`}
            onClick={toggleMenu}
            aria-label={isExpanded ? "Cerrar menú" : "Abrir menú"}
            style={{ color: menuColor }}
          >
            <span className={styles.line} />
            <span className={styles.line} />
          </button>

                      <div className={styles.logo}>
                        <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: '46px', width: 'auto' }}>
                          <title>PLEIA — Logo completo</title>
                          <defs>
                            <linearGradient id="gradStar" x1="176" y1="176" x2="336" y2="336" gradientUnits="userSpaceOnUse">
                              <stop offset="0" stopColor="#36E2B4"/>
                              <stop offset="1" stopColor="#5B8CFF"/>
                            </linearGradient>
                          </defs>

                          {/* Texto PLEIA centrado */}
                          <text x="60" y="28" textAnchor="middle" fontFamily="Space Grotesk, Inter, system-ui" fontSize="18" fontWeight="600" letterSpacing="0.02em" fill="#F5F7FA">
                            PLEIA
                          </text>
                          
                          {/* Estrella nueva centrada arriba del texto */}
                          <g transform="translate(60, 10) scale(0.08)">
                            <path d="
                              M256 136
                              L276 210
                              L352 230
                              L276 250
                              L256 324
                              L236 250
                              L160 230
                              L236 210
                              Z" fill="url(#gradStar)"/>
                          </g>
                        </svg>
                      </div>

          <button
            type="button"
            className={styles.cta}
            style={{ 
              background: isFounder 
                ? 'linear-gradient(135deg, #FF8C00, #FFA500)' 
                : 'linear-gradient(135deg, #47C8D1, #5B8CFF)', 
              color: buttonTextColor,
              border: 'none'
            }}
            onClick={ctaClick}
          >
            {session?.user ? (
              <div className="flex items-center gap-2">
                <span>Mi perfil</span>
                {isFounder && (
                  <span 
                    className="ml-1"
                    style={{ color: '#FF8C00' }}
                    title="Founder"
                  >
                    👑
                  </span>
                )}
              </div>
            ) : (
              "Inicia sesión"
            )}
          </button>
        </div>

        <div className={styles.content} aria-hidden={!isExpanded}>
          {(items || []).slice(0, 3).map((sec, idx) => (
            <div
              key={`${sec.label}-${idx}`}
              className={styles.card}
              ref={setCardRef(idx)}
            >
              <div className={styles.cardLabel}>{sec.label}</div>
              <div className={styles.links}>
                {sec.links?.map((lnk, i) => (
                  <a 
                    key={`${lnk.label}-${i}`} 
                    className={styles.link} 
                    href={lnk.href} 
                    aria-label={lnk.ariaLabel || lnk.label}
                    onClick={(e) => {
                      // Si es un enlace mailto, dejarlo funcionar normalmente
                      if (lnk.href.startsWith('mailto:')) {
                        return;
                      }
                      
                      // Para enlaces internos, prevenir default y navegar programáticamente
                      e.preventDefault();
                      closeMenu();
                      router.push(lnk.href);
                    }}
                  >
                    <GoArrowUpRight className={styles.icon} aria-hidden="true" />
                    {lnk.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
