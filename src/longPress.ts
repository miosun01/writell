/*
 * Touch screens have no right click. Holding a finger still on something for half a second opens the
 * same menu right-clicking does (rename, colour, delete… on chapters, scenes, tabs, cards).
 * Text you write in, and the map, keep the phone's own long-press (selecting text, the map's tools).
 */
const HOLD_MS = 500, SLOP = 10;

let touchLast = false;
/** whether the last press was a finger (not a mouse or pen) */
export const lastPressWasTouch = () => touchLast;

export function installLongPress() {
  document.addEventListener('pointerdown', (e) => { touchLast = e.pointerType === 'touch'; }, true);
  let timer = 0;
  let start: { x: number; y: number; id: number } | null = null;
  let fired = false;
  const cancel = () => { clearTimeout(timer); start = null; };

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    cancel(); fired = false;
    const el = e.target as Element | null;
    if (!el || el.closest('input, textarea, select, [contenteditable="true"], .ProseMirror, .map-canvas, canvas')) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    const { clientX, clientY } = e;
    timer = window.setTimeout(() => {
      if (!start) return;
      start = null; fired = true;
      try { navigator.vibrate?.(8); } catch { /* not every phone can */ }
      // the list may have redrawn under the finger, so ask what's there now if the original is gone
      const at = el.isConnected ? el : document.elementFromPoint(clientX, clientY);
      at?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY, button: 2, buttons: 2, view: window }));
    }, HOLD_MS);
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (start && e.pointerId === start.id && Math.hypot(e.clientX - start.x, e.clientY - start.y) > SLOP) cancel();
  }, true);
  document.addEventListener('pointerup', cancel, true);
  document.addEventListener('pointercancel', cancel, true);
  // phones that already turn a long press into a right click (most Android browsers) don't get a second one
  document.addEventListener('contextmenu', (e) => { if (e.isTrusted && start) cancel(); }, true);
  // the finger lifting after the menu opened isn't a tap on what was under it
  // (phones also send pretend mouse presses when the finger lifts; those would close the menu straight away)
  for (const ev of ['mousedown', 'mouseup', 'click'] as const) {
    document.addEventListener(ev, (e) => { if (fired) { if (ev === 'click') fired = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  }
}

let lastTap: { id: string; t: number } | null = null;
/** true on the second quick tap of a finger on the same thing (phones don't reliably send double-clicks) */
export function doubleTap(id: string): boolean {
  if (!touchLast) { lastTap = null; return false; }
  const now = Date.now();
  const hit = !!lastTap && lastTap.id === id && now - lastTap.t < 400;
  lastTap = hit ? null : { id, t: now };
  return hit;
}
