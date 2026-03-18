'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRecorder } from '@/lib/audio/hooks';
import { Spectrogram, TimbralManifold } from '@/lib/audio/visualizations';
import { CALLS, generateMockFrames } from '@/lib/calls';
import type { AudioFeatureFrame } from '@/lib/audio/scorer';

const COLORS = { bg: '#09090b', surface: '#111114', surfaceAlt: '#18181b', border: '#27272a', text: '#fafafa', textMuted: '#52525b', accent: '#22c55e', reference: '#3b82f6', danger: '#ef4444' };

export default function TrainPage() {
  const [callId, setCallId] = useState('yelp');
  const [refFrames, setRefFrames] = useState<AudioFeatureFrame[]>([]);
  const [playbackFrame, setPlaybackFrame] = useState(0);
  const [isPlayingRef, setIsPlayingRef] = useState(false);
  const [viewMode, setViewMode] = useState<'reference' | 'user'>('reference');

  const { state, frames: userFrames, result, startRecording, stopRecording, reset } = useRecorder(refFrames, { maxDuration: 10, minDuration: 0.5 });

  useEffect(() => { setRefFrames(generateMockFrames(callId)); setPlaybackFrame(0); setViewMode('reference'); reset(); }, [callId, reset]);

  useEffect(() => {
    if (!isPlayingRef) return;
    setPlaybackFrame(0);
    const interval = setInterval(() => setPlaybackFrame(f => { if (f >= refFrames.length - 1) { setIsPlayingRef(false); return 0; } return f + 1; }), 1000 / 30);
    return () => clearInterval(interval);
  }, [isPlayingRef, refFrames.length]);

  useEffect(() => {
    if (state !== 'complete' || userFrames.length === 0) return;
    setViewMode('user'); setPlaybackFrame(0);
    let frame = 0;
    const interval = setInterval(() => { setPlaybackFrame(frame); frame++; if (frame >= userFrames.length) clearInterval(interval); }, 1000 / 30);
    return () => clearInterval(interval);
  }, [state, userFrames.length]);

  const handleRecord = useCallback(() => { if (state === 'recording') stopRecording(); else { reset(); startRecording(); } }, [state, startRecording, stopRecording, reset]);
  const handlePlayRef = useCallback(() => { if (state === 'recording') return; setViewMode('reference'); setIsPlayingRef(p => !p); }, [state]);

  const displayFrames = viewMode === 'user' && userFrames.length > 0 ? userFrames : refFrames;
  const displayFrame = Math.min(playbackFrame, displayFrames.length - 1);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, color: COLORS.text, fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>SHOCKTALK</h1>
          <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>Train your turkey calls</p>
        </header>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {CALLS.map(call => (
            <button key={call.id} onClick={() => setCallId(call.id)} style={{ padding: '10px 16px', borderRadius: 6, border: `1px solid ${callId === call.id ? COLORS.accent : COLORS.border}`, background: callId === call.id ? 'rgba(34,197,94,0.1)' : COLORS.surface, color: callId === call.id ? COLORS.accent : COLORS.textMuted, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{call.name}</button>
          ))}
        </div>

        {result && (
          <div style={{ background: COLORS.surface, borderRadius: 12, padding: 20, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: result.score >= 80 ? COLORS.accent : result.score >= 50 ? '#eab308' : COLORS.danger, textShadow: `0 0 30px ${result.score >= 80 ? COLORS.accent : result.score >= 50 ? '#eab308' : COLORS.danger}40` }}>{result.score}</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 8 }}>{result.feedback}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, fontSize: 11, color: COLORS.textMuted }}>
              <span>Pitch: {result.breakdown.pitch}</span><span>Rhythm: {result.breakdown.rhythm}</span><span>Duration: {result.breakdown.duration}</span>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}><Spectrogram frames={displayFrames} currentFrame={displayFrame} width={448} height={130} mode={viewMode} /></div>
        <div style={{ marginBottom: 24 }}><TimbralManifold frames={displayFrames} currentFrame={displayFrame} width={448} height={300} mode={viewMode} /></div>

        {state === 'complete' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            {(['reference', 'user'] as const).map(m => (
              <button key={m} onClick={() => { setViewMode(m); setPlaybackFrame(0); const f = m === 'user' ? userFrames : refFrames; let i = 0; const int = setInterval(() => { setPlaybackFrame(i); i++; if (i >= f.length) clearInterval(int); }, 1000 / 30); }} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: viewMode === m ? COLORS.surfaceAlt : 'transparent', color: viewMode === m ? COLORS.text : COLORS.textMuted, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{m === 'reference' ? 'Reference' : 'Your Call'}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <button onClick={handleRecord} disabled={state === 'processing'} style={{ width: 120, height: 120, borderRadius: '50%', border: 'none', background: state === 'recording' ? COLORS.danger : COLORS.accent, boxShadow: state === 'recording' ? `0 0 0 4px rgba(239,68,68,0.3), 0 0 40px ${COLORS.danger}` : `0 4px 20px ${COLORS.accent}50`, cursor: state === 'processing' ? 'wait' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 24, color: '#fff' }}>{state === 'recording' ? '■' : '●'}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>{state === 'recording' ? 'Stop' : state === 'processing' ? '...' : 'Record'}</span>
          </button>
          <button onClick={handlePlayRef} disabled={state === 'recording'} style={{ padding: '10px 20px', borderRadius: 999, border: `1px solid ${COLORS.reference}`, background: isPlayingRef ? COLORS.reference : 'transparent', color: isPlayingRef ? '#fff' : COLORS.reference, fontSize: 13, fontWeight: 500, cursor: state === 'recording' ? 'not-allowed' : 'pointer', opacity: state === 'recording' ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{isPlayingRef ? '■' : '▶'}</span><span>{isPlayingRef ? 'Stop' : 'Play Reference'}</span>
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: COLORS.textMuted }}>
          {state === 'idle' && 'Listen to the reference, then record your attempt'}
          {state === 'recording' && 'Make your call — tap stop when done'}
          {state === 'processing' && 'Analyzing...'}
          {state === 'complete' && 'Compare your call to the reference'}
        </div>
      </div>
    </div>
  );
}