"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import styles from "./AnimatedList.module.css";

type TrackItem = {
  title: string;
  artist: string;
  trackId?: string;
  openUrl?: string;
};

function AnimatedItem({
  children,
  delay = 0,
  index,
  onMouseEnter,
}: {
  children: React.ReactNode;
  delay?: number;
  index: number;
  onMouseEnter?: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { amount: 0.5, once: false });
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.18, delay }}
      className={styles.motionItem}
    >
      {children}
    </motion.div>
  );
}

export default function AnimatedList({
  items,
  onItemSelect,
  onItemRemove,
  className = "",
  itemClassName = "",
  displayScrollbar = true,
  initialSelectedIndex = -1,
}: {
  items: TrackItem[];
  onItemSelect?: (item: TrackItem, index: number) => void;
  onItemRemove?: (item: TrackItem, index: number) => void;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [topOpacity, setTopOpacity] = useState(0);
  const [bottomOpacity, setBottomOpacity] = useState(1);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setTopOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!items || items.length === 0) return;
      
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((p) => Math.min(p + 1, items.length - 1));
      } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((p) => Math.max(p - 1, 0));
      } else if (e.key === "Enter") {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          onItemSelect?.(items[selectedIndex], selectedIndex);
        }
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [items, selectedIndex, onItemSelect]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current || !items || items.length === 0) return;
    
    try {
      const container = listRef.current;
      if (!container) return;
      
      const selected = container.querySelector(`[data-index="${selectedIndex}"]`) as HTMLDivElement | null;
      if (selected && selected.parentNode) {
        const extra = 50;
        const cTop = container.scrollTop;
        const cH = container.clientHeight;
        const iTop = selected.offsetTop;
        const iBottom = iTop + selected.offsetHeight;
        if (iTop < cTop + extra) {
          container.scrollTo({ top: iTop - extra, behavior: "smooth" });
        } else if (iBottom > cTop + cH - extra) {
          container.scrollTo({ top: iBottom - cH + extra, behavior: "smooth" });
        }
      }
      setKeyboardNav(false);
    } catch (err) {
      // Ignore errors when elements are being removed
      console.warn('Scroll error:', err);
      setKeyboardNav(false);
    }
  }, [selectedIndex, keyboardNav, items]);

  return (
    <div className={`${styles.container} ${className}`}>
      <div
        ref={listRef}
        className={`${styles.scroll} ${!displayScrollbar ? styles.noScrollbar : ""}`}
        onScroll={handleScroll}
      >
        {items.map((item, idx) => (
          <AnimatedItem
            key={idx}
            delay={0.06}
            index={idx}
            onMouseEnter={() => setSelectedIndex(idx)}
          >
            <div className={`${styles.item} ${selectedIndex === idx ? styles.selected : ""} ${itemClassName}`}>
              <div 
                className={styles.trackInfo}
                onClick={() => {
                  setSelectedIndex(idx);
                  onItemSelect?.(item, idx);
                }}
              >
                <div className={styles.trackDetails}>
                  <div className={styles.trackTitle}>{item.title}</div>
                  <div className={styles.trackArtist}>{item.artist}</div>
                </div>
              </div>
              <div className={styles.actions}>
                {item.openUrl && (
                  <a
                    href={item.openUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.openBtn}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open
                  </a>
                )}
                {onItemRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemRemove(item, idx);
                    }}
                    className={styles.removeBtn}
                    title="Quitar de la playlist"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </AnimatedItem>
        ))}
      </div>
      <div className={styles.topGrad} style={{ opacity: topOpacity }} />
      <div className={styles.bottomGrad} style={{ opacity: bottomOpacity }} />
    </div>
  );
}
