/*
 * Small pointer effects (Settings → Appearance), chosen separately: a trail that follows the
 * pointer, and an effect where you click. Both are drawn above everything, never catch clicks,
 * stay off over maps, and stay off for people who prefer less motion.
 */
import { useEffect } from 'react';
import { useSettings, type PointerClick, type PointerTrail } from '../settings';

export const TRAILS: [PointerTrail, string][] = [
  ['none', 'None'], ['smooth', 'Clean line'], ['dots', 'Dots'], ['cubes', 'Cubes'], ['stars', 'Stars'], ['bubbles', 'Bubbles'], ['comet', 'Comet'], ['rainbow', 'Rainbow'],
];
export const CLICKS: [PointerClick, string][] = [
  ['none', 'None'], ['ripple', 'Ripple'], ['sparkles', 'Sparkles'], ['burst', 'Burst'], ['pop', 'Pop'], ['confetti', 'Confetti'],
];

const LINE_TRAILS = new Set<PointerTrail>(['smooth', 'comet', 'rainbow']);

export function CursorFx() {
  const { pointerTrail: trail = 'none', pointerClick: click = 'none' } = useSettings();
  useEffect(() => {
    if (trail === 'none' && click === 'none') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const layer = document.createElement('div'); layer.className = 'cfx-layer'; document.body.appendChild(layer);
    const zoom = () => parseFloat(getComputedStyle(document.documentElement).zoom || '1') || 1;
    const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b7cf6';
    const spawn = (cls: string, x: number, y: number, life: number, style?: Record<string, string>) => {
      const el = document.createElement('span'); el.className = cls;
      const k = zoom(); el.style.left = x / k + 'px'; el.style.top = y / k + 'px';
      if (style) for (const [p, v] of Object.entries(style)) el.style.setProperty(p, v);
      layer.appendChild(el); window.setTimeout(() => el.remove(), life);
    };
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    // maps are for careful work: no effects over them (they'd sit under the brush circle)
    const quiet = (e: PointerEvent) => !!(e.target as Element | null)?.closest?.('.map-canvas');

    // line trails are drawn on one canvas: a list of recent points that fade out
    let canvas: HTMLCanvasElement | null = null, ctx: CanvasRenderingContext2D | null = null, raf = 0;
    const pts: { x: number; y: number; t: number }[] = [];
    const LIFE = trail === 'comet' ? 360 : trail === 'rainbow' ? 380 : 320;
    const resize = () => { if (!canvas) return; const d = window.devicePixelRatio || 1; canvas.width = innerWidth * d; canvas.height = innerHeight * d; ctx?.setTransform(d, 0, 0, d, 0, 0); };
    if (LINE_TRAILS.has(trail)) {
      canvas = document.createElement('canvas'); canvas.className = 'cfx-canvas'; layer.appendChild(canvas);
      ctx = canvas.getContext('2d'); resize(); window.addEventListener('resize', resize);
    }
    const draw = () => {
      raf = 0; if (!ctx || !canvas) return;
      const now = performance.now();
      while (pts.length && now - pts[0].t > LIFE) pts.shift();
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (pts.length > 1) {
        const col = accent();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const f = 1 - (now - b.t) / LIFE; // 1 = newest
          if (f <= 0) continue;
          ctx.globalAlpha = trail === 'comet' ? f * f : f * 0.85;
          ctx.lineWidth = trail === 'comet' ? 1 + f * 9 : trail === 'rainbow' ? 2 + f * 4 : 1 + f * 3.5;
          ctx.strokeStyle = trail === 'rainbow' ? `hsl(${(b.t / 4) % 360} 90% 62%)` : col;
          ctx.shadowBlur = trail === 'comet' ? 14 * f : 0; ctx.shadowColor = col;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        if (trail === 'comet') { const h = pts[pts.length - 1]; ctx.globalAlpha = 1 - (now - h.t) / LIFE; ctx.fillStyle = col; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(h.x, h.y, 4, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }
      if (pts.length) raf = requestAnimationFrame(draw);
    };

    let last = 0, lx = 0, ly = 0;
    const move = (e: PointerEvent) => {
      if (trail === 'none' || e.pointerType === 'touch') return;
      if (quiet(e)) { pts.length = 0; return; }
      const k = zoom(), x = e.clientX / k, y = e.clientY / k;
      if (ctx) { pts.push({ x, y, t: performance.now() }); if (!raf) raf = requestAnimationFrame(draw); return; }
      const now = performance.now();
      const gap = trail === 'dots' ? 6 : 14;
      if (now - last < 18 || Math.hypot(e.clientX - lx, e.clientY - ly) < gap) return;
      last = now; lx = e.clientX; ly = e.clientY;
      if (layer.childElementCount > 60) return;
      if (trail === 'dots') spawn('cfx-trail', e.clientX, e.clientY, 420);
      else if (trail === 'cubes') spawn('cfx-cube', e.clientX, e.clientY, 700, { '--r': `${rnd(-160, 160)}deg`, '--dx': `${rnd(-10, 10)}px`, '--s': `${rnd(5, 9)}px` });
      else if (trail === 'stars') spawn('cfx-star', e.clientX, e.clientY, 750, { '--r': `${rnd(-90, 90)}deg`, '--dx': `${rnd(-12, 12)}px`, '--s': `${rnd(7, 12)}px` });
      else if (trail === 'bubbles') spawn('cfx-bubble', e.clientX, e.clientY, 900, { '--dx': `${rnd(-8, 8)}px`, '--s': `${rnd(6, 13)}px` });
    };
    const down = (e: PointerEvent) => {
      if (click === 'none' || quiet(e)) return;
      const { clientX: x, clientY: y } = e;
      if (click === 'ripple') spawn('cfx-ripple', x, y, 520);
      else if (click === 'pop') spawn('cfx-pop', x, y, 450);
      else if (click === 'sparkles') for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + rnd(0, 0.6), d = rnd(14, 30);
        spawn('cfx-spark', x, y, 600, { '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d}px` });
      } else if (click === 'burst') for (let i = 0; i < 8; i++) spawn('cfx-ray', x, y, 420, { '--r': `${i * 45}deg` });
      else if (click === 'confetti') for (let i = 0; i < 10; i++) {
        const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), d = rnd(18, 42);
        spawn('cfx-confetti', x, y, 800, { '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d}px`, '--r': `${rnd(-300, 300)}deg`, '--c': `hsl(${Math.floor(rnd(0, 360))} 85% 62%)` });
      }
    };
    window.addEventListener('pointerdown', down, true); window.addEventListener('pointermove', move, true);
    return () => {
      window.removeEventListener('pointerdown', down, true); window.removeEventListener('pointermove', move, true);
      window.removeEventListener('resize', resize); cancelAnimationFrame(raf); layer.remove();
    };
  }, [trail, click]);
  return null;
}
