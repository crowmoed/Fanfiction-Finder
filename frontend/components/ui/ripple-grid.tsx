'use client';

import { useEffect, useRef } from 'react';

interface RippleGridProps {
  gridColor?: string;
  gridSize?: number;
  gridThickness?: number;
  opacity?: number;
  mouseInteraction?: boolean;
  mouseInteractionRadius?: number;
  fadeDistance?: number;
  vignetteStrength?: number;
  rippleIntensity?: number;
  glowIntensity?: number;
  enableRainbow?: boolean;
}

export default function RippleGrid({
  gridColor = 'rgba(60, 50, 40, 0.45)',
  gridSize = 14,
  gridThickness = 1.5,
  opacity = 0.6,
  mouseInteraction = true,
  mouseInteractionRadius = 0.8,
  fadeDistance = 2.5,
  vignetteStrength = 1.2,
}: RippleGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({
    targetX: -9999,
    targetY: -9999,
    x: -9999,
    y: -9999,
    influence: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!mouseInteraction) return;
      const mouse = mouseRef.current;
      mouse.targetX = event.clientX;
      mouse.targetY = event.clientY;
      if (mouse.x < -9000) {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
      }
      mouse.influence = 1;
    };

    const onPointerLeave = () => {
      mouseRef.current.influence = 0;
    };

    const warp = (x: number, y: number) => {
      const mouse = mouseRef.current;
      const dx = mouse.x - x;
      const dy = mouse.y - y;
      const dist = Math.hypot(dx, dy);
      const radius = Math.min(width, height) * mouseInteractionRadius * 0.45;
      if (dist <= 0.001 || dist > radius) return { x, y };

      const t = 1 - dist / radius;
      const falloff = t * t * (3 - 2 * t);
      const pullStrength = 0.025 * mouse.influence * radius;
      const pull = falloff * pullStrength;
      return {
        x: x + (dx / dist) * pull,
        y: y + (dy / dist) * pull,
      };
    };

    const drawWarpedLine = (points: { x: number; y: number }[]) => {
      if (points.length === 0) return;
      const first = warp(points[0].x, points[0].y);
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i += 1) {
        const next = warp(points[i].x, points[i].y);
        ctx.lineTo(next.x, next.y);
      }
      ctx.stroke();
    };

    const draw = () => {
      const mouse = mouseRef.current;
      mouse.influence += ((mouse.influence > 0 ? 1 : 0) - mouse.influence) * 0.08;
      mouse.x += (mouse.targetX - mouse.x) * 0.07;
      mouse.y += (mouse.targetY - mouse.y) * 0.07;

      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = gridThickness;

      const step = gridSize;
      const segment = Math.max(6, step / 2);
      for (let x = 0; x <= width; x += step) {
        const points = [];
        for (let y = 0; y <= height; y += segment) points.push({ x, y });
        drawWarpedLine(points);
      }
      for (let y = 0; y <= height; y += step) {
        const points = [];
        for (let x = 0; x <= width; x += segment) points.push({ x, y });
        drawWarpedLine(points);
      }

      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) / fadeDistance,
        width / 2,
        height / 2,
        Math.max(width, height) / vignetteStrength
      );
      gradient.addColorStop(0, 'rgba(236,231,213,0)');
      gradient.addColorStop(1, 'rgba(236,231,213,0.72)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      frame = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerleave', onPointerLeave);
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [fadeDistance, gridColor, gridSize, gridThickness, mouseInteraction, mouseInteractionRadius, opacity, vignetteStrength]);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden />;
}
