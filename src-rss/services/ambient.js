/**
 * Slow ambient palette shift with readable complementary foreground.
 * Sets CSS variables on :root.
 */

function hsl(h, s, l, a = 1) {
  return a === 1
    ? `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`
    : `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}% / ${a})`;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function startAmbientPalette({
  periodMs = 90000,
  onFrame
} = {}) {
  const root = document.documentElement;
  let frameId = 0;
  let start = performance.now();

  function tick(now) {
    const t = ((now - start) % periodMs) / periodMs;
    // Full hue circuit, eased slightly so dwell feels gentle
    const hue = (t * 360) % 360;
    const comp = (hue + 180) % 360;

    // Soft pastel wash that still shifts noticeably
    const bgL = 90 + Math.sin(t * Math.PI * 2) * 4;
    const bgS = 28 + Math.sin(t * Math.PI * 2 + 1.2) * 8;
    const panelL = clamp(bgL + 5, 92, 98);
    const inkL = bgL > 55 ? 14 : 92;
    const mutedL = bgL > 55 ? 38 : 72;
    const accentL = bgL > 55 ? 28 : 68;
    const lineA = bgL > 55 ? 0.16 : 0.28;

    const vars = {
      '--bg': hsl(hue, bgS, bgL),
      '--panel': hsl(hue, Math.max(12, bgS - 10), panelL),
      '--ink': hsl(comp, 18, inkL),
      '--muted': hsl(comp, 12, mutedL),
      '--accent': hsl(comp, 42, accentL),
      '--line': hsl(comp, 10, inkL, lineA),
      '--btn-border': hsl(comp, 14, inkL, 0.22),
      '--error': bgL > 55 ? hsl(8, 55, 38) : hsl(8, 70, 72)
    };

    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }

    onFrame?.(vars);
    frameId = requestAnimationFrame(tick);
  }

  // Seed immediately so first paint isn't unstyled
  tick(start);
  frameId = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(frameId);
}
