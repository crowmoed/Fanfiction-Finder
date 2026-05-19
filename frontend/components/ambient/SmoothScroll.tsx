'use client';

import { useEffect } from 'react';

export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let target = window.scrollY;
    let current = window.scrollY;
    let raf = 0;
    let active = false;

    const ease = 0.08;

    const tick = () => {
      const delta = target - current;
      if (Math.abs(delta) < 0.4) {
        current = target;
        window.scrollTo(0, current);
        active = false;
        return;
      }
      current += delta * ease;
      window.scrollTo(0, current);
      raf = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (active) return;
      active = true;
      raf = window.requestAnimationFrame(tick);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      const max = document.documentElement.scrollHeight - window.innerHeight;
      target = Math.max(0, Math.min(max, target + event.deltaY));
      start();
    };

    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const page = window.innerHeight * 0.9;
      let next = target;
      if (event.key === 'PageDown' || event.key === ' ') next += page;
      else if (event.key === 'PageUp') next -= page;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = max;
      else if (event.key === 'ArrowDown') next += 80;
      else if (event.key === 'ArrowUp') next -= 80;
      else return;
      event.preventDefault();
      target = Math.max(0, Math.min(max, next));
      start();
    };

    const onScroll = () => {
      if (!active) {
        target = window.scrollY;
        current = window.scrollY;
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return null;
}
