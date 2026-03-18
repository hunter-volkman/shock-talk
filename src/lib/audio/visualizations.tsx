import { useRef, useEffect } from 'react';
import type { AudioFeatureFrame } from './scorer';

const PALETTE = { low: { h: 145, s: 80, l: 48 }, mid: { h: 38, s: 95, l: 55 }, high: { h: 4, s: 88, l: 58 } };
const UI = { bg: '#09090b', surface: '#111114', grid: '#1a1a1f', gridLight: '#252530', text: '#52525b', textLight: '#71717a', reference: '#3b82f6', user: '#22c55e' };

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function freqToHSL(hz: number) {
  const norm = Math.max(0, Math.min(1, (hz - 350) / 1000));
  if (norm < 0.5) { const t = norm * 2; return { h: lerp(PALETTE.low.h, PALETTE.mid.h, t), s: lerp(PALETTE.low.s, PALETTE.mid.s, t), l: lerp(PALETTE.low.l, PALETTE.mid.l, t) }; }
  const t = (norm - 0.5) * 2; return { h: lerp(PALETTE.mid.h, PALETTE.high.h, t), s: lerp(PALETTE.mid.s, PALETTE.high.s, t), l: lerp(PALETTE.mid.l, PALETTE.high.l, t) };
}

function hsl(h: number, s: number, l: number, a = 1) { return `hsla(${h}, ${s}%, ${l}%, ${a})`; }

function useCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, deps: any[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr); draw(ctx, rect.width, rect.height);
  }, deps);
  return ref;
}

type VizProps = { frames: AudioFeatureFrame[]; currentFrame: number; width: number; height: number; mode?: 'reference' | 'user' };

export function Spectrogram({ frames, currentFrame, width, height, mode = 'reference' }: VizProps) {
  const canvasRef = useCanvas((ctx, w, h) => {
    const pad = { left: 40, right: 8, top: 20, bottom: 32 };
    const plotW = w - pad.left - pad.right, plotH = h - pad.top - pad.bottom;

    ctx.fillStyle = UI.surface; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = UI.bg; ctx.fillRect(pad.left, pad.top, plotW, plotH);

    ctx.strokeStyle = UI.grid; ctx.lineWidth = 1;
    ['2kHz', '1kHz', '500Hz'].forEach((label, i) => {
      const y = pad.top + (plotH / 4) * (i + 1);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
      ctx.fillStyle = UI.text; ctx.font = '9px system-ui'; ctx.textAlign = 'right'; ctx.fillText(label, pad.left - 4, y + 3);
    });

    if (frames.length > 0) {
      const visible = frames.slice(0, currentFrame + 1);
      const barW = Math.max(2, plotW / frames.length);
      visible.forEach((frame, i) => {
        const x = pad.left + (i / frames.length) * plotW;
        const freqNorm = Math.max(0, Math.min(1, (frame.spectralCentroid - 200) / 2000));
        const noteH = Math.max(4, frame.spectralSpread / 15);
        const y = pad.top + plotH * (1 - freqNorm) - noteH / 2;
        const c = freqToHSL(frame.spectralCentroid);
        const energy = Math.min(1, frame.rmsEnergy * 1.5);
        ctx.fillStyle = hsl(c.h, c.s, c.l, 0.3 + energy * 0.7); ctx.fillRect(x, y, barW, noteH);
        ctx.fillStyle = hsl(c.h, c.s - 10, c.l + 20, energy); ctx.fillRect(x, y + noteH / 2 - 1, barW, 2);
      });
      if (currentFrame < frames.length) { const x = pad.left + (currentFrame / frames.length) * plotW; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x, pad.top, 2, plotH); }
    }

    ctx.fillStyle = UI.text; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    const dur = frames.length > 0 ? frames[frames.length - 1].time : 2;
    [0, 0.5, 1].forEach(p => ctx.fillText((dur * p).toFixed(1) + 's', pad.left + plotW * p, h - 10));
    ctx.fillStyle = mode === 'reference' ? UI.reference : UI.user; ctx.font = '10px system-ui'; ctx.textAlign = 'left'; ctx.fillText(mode === 'reference' ? 'REFERENCE' : 'YOUR CALL', pad.left, 12);
  }, [frames, currentFrame, width, height, mode]);

  return <canvas ref={canvasRef} style={{ width, height, display: 'block', borderRadius: 8 }} />;
}

export function TimbralManifold({ frames, currentFrame, width, height, mode = 'reference' }: VizProps) {
  const trailRef = useRef<Array<{ x: number; y: number; h: number; s: number; l: number; size: number }>>([]);
  useEffect(() => { trailRef.current = []; }, [frames]);

  const canvasRef = useCanvas((ctx, w, h) => {
    const cx = w / 2, cy = h / 2, scale = Math.min(w, h) * 0.38;

    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.4);
    bgGrad.addColorStop(0, '#141418'); bgGrad.addColorStop(1, UI.surface);
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = UI.gridLight; ctx.lineWidth = 1;
    [0.33, 0.66, 1].forEach(r => { ctx.beginPath(); ctx.arc(cx, cy, scale * r, 0, Math.PI * 2); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(cx - scale * 1.15, cy); ctx.lineTo(cx + scale * 1.15, cy); ctx.moveTo(cx, cy - scale * 1.15); ctx.lineTo(cx, cy + scale * 1.15); ctx.stroke();

    ctx.fillStyle = UI.textLight; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('HIGH', cx, cy - scale - 12); ctx.fillText('LOW', cx, cy + scale + 18);
    ctx.textAlign = 'left'; ctx.fillText('QUIET', cx + scale + 10, cy + 3);
    ctx.textAlign = 'right'; ctx.fillText('LOUD', cx - scale - 10, cy + 3);

    const frame = frames[currentFrame];
    if (frame) {
      const rot = currentFrame * 0.008;
      const normC = (frame.spectralCentroid - 350) / 1000 - 0.5;
      const normE = frame.rmsEnergy - 0.5;
      const normS = frame.spectralSpread / 400;
      const x = cx + (normC * Math.cos(rot) - normS * 0.15 * Math.sin(rot)) * scale * 1.7;
      const y = cy - normE * scale * 1.7;
      const c = freqToHSL(frame.spectralCentroid);
      trailRef.current.push({ x, y, h: c.h, s: c.s, l: c.l, size: 5 + normS * 7 });
      if (trailRef.current.length > 70) trailRef.current.shift();
    }

    const trail = trailRef.current, len = trail.length;
    if (len === 0) return;
    const getAlpha = (age: number) => 0.12 + Math.pow(age, 1.3) * 0.88;

    if (len > 1) { ctx.lineCap = 'round'; for (let i = 1; i < len; i++) { const p0 = trail[i - 1], p1 = trail[i], age = i / len; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.strokeStyle = hsl(p1.h, p1.s, p1.l, getAlpha(age) * 0.5); ctx.lineWidth = 1.5 + age * 2; ctx.stroke(); } }

    trail.forEach((p, i) => {
      const age = i / len, alpha = getAlpha(age), size = p.size * (0.35 + age * 0.65);
      ctx.beginPath(); ctx.arc(p.x, p.y, size + 4, 0, Math.PI * 2); ctx.fillStyle = hsl(p.h, p.s, p.l, alpha * 0.2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fillStyle = hsl(p.h, p.s, p.l + 5, alpha); ctx.fill();
    });

    const last = trail[len - 1];
    if (last) {
      const glow = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, last.size + 25);
      glow.addColorStop(0, hsl(last.h, last.s, last.l, 0.5)); glow.addColorStop(0.4, hsl(last.h, last.s, last.l, 0.15)); glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(last.x, last.y, last.size + 25, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(last.x, last.y, last.size, 0, Math.PI * 2); ctx.fillStyle = hsl(last.h, last.s + 5, last.l + 10, 1); ctx.fill();
      ctx.beginPath(); ctx.arc(last.x, last.y, last.size * 0.35, 0, Math.PI * 2); ctx.fillStyle = hsl(last.h, last.s - 25, last.l + 25, 0.95); ctx.fill();
    }

    ctx.fillStyle = mode === 'reference' ? UI.reference : UI.user; ctx.font = '10px system-ui'; ctx.textAlign = 'left'; ctx.fillText(mode === 'reference' ? 'REFERENCE' : 'YOUR CALL', 12, 20);
  }, [frames, currentFrame, width, height, mode]);

  return <canvas ref={canvasRef} style={{ width, height, display: 'block', borderRadius: 8 }} />;
}