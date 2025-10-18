"use client";

import { useLayoutEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { GoArrowUpRight } from "react-icons/go";
import styles from "./CardNav.module.css";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
  const router = useRouter();
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const calculateHeight = useCallback(() => {
    const navEl = navRef.current;
    if (!navEl) return 260;
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) return 260;

    const contentEl = navEl.querySelector(`.${styles.content}`) as HTMLDivElement | null;
    if (!contentEl) return 260;

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

    const topBar = 64;
    const padding = 16;
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

    gsap.set(navEl, { height: 64, overflow: "hidden" });
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

  const ctaClick = () => {
    if (session?.user) {
      router.push("/me");
    } else {
      // Dispatch event to open RequestAccessModal from page.js
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('request-access-modal:open'));
      }
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
                        <img 
                          src="/logo-pleia.svg?v=7" 
                          alt="PLEIA" 
                          style={{ 
                            height: '46px',
                            width: 'auto',
                            filter: 'drop-shadow(0 4px 12px rgba(54, 226, 180, 0.4))'
                          }}
                        />
                      </div>

          <button
            type="button"
            className={styles.cta}
            style={{ 
              background: 'linear-gradient(135deg, #36E2B4, #5B8CFF)', 
              color: buttonTextColor,
              border: 'none'
            }}
            onClick={ctaClick}
          >
            {session?.user ? "Mi perfil" : "Inicia sesión"}
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
