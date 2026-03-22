'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRecorder } from '@/lib/audio/hooks';
import { Spectrogram, TimbralManifold } from '@/lib/audio/visualizations';
import { CALLS, generateMockFrames } from '@/lib/calls';
import type { AudioFeatureFrame } from '@/lib/audio/scorer';

export default function TrainPage() {
  const [callId, setCallId] = useState('yelp');
  const [refFrames, setRefFrames] = useState<AudioFeatureFrame[]>([]);
  const [playbackFrame, setPlaybackFrame] = useState(0);
  const [isPlayingRef, setIsPlayingRef] = useState(false);
  const [viewMode, setViewMode] = useState<'reference' | 'user'>('reference');
  const [mounted, setMounted] = useState(false);

  const { state, frames: userFrames, result, startRecording, stopRecording, reset } = useRecorder(refFrames, { maxDuration: 10, minDuration: 0.5 });

  useEffect(() => { setMounted(true); }, []);
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

  const scoreColor = result ? (result.score >= 80 ? '#4ade80' : result.score >= 50 ? '#fbbf24' : '#f87171') : '#4ade80';

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        :root {
          --bg-deep: #050507;
          --bg-primary: #0a0a0c;
          --bg-elevated: #111115;
          --bg-glass: rgba(255, 255, 255, 0.03);
          --bg-glass-hover: rgba(255, 255, 255, 0.06);
          --border-subtle: rgba(255, 255, 255, 0.06);
          --border-medium: rgba(255, 255, 255, 0.1);
          --text-primary: #f4f4f5;
          --text-secondary: #a1a1aa;
          --text-muted: #52525b;
          --accent-green: #4ade80;
          --accent-green-dim: rgba(74, 222, 128, 0.15);
          --accent-blue: #60a5fa;
          --accent-blue-dim: rgba(96, 165, 250, 0.15);
          --accent-amber: #fbbf24;
          --accent-red: #f87171;
          --glow-green: 0 0 60px rgba(74, 222, 128, 0.3), 0 0 120px rgba(74, 222, 128, 0.1);
          --glow-red: 0 0 60px rgba(248, 113, 113, 0.4), 0 0 120px rgba(248, 113, 113, 0.15);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        html, body {
          background: var(--bg-deep);
          color: var(--text-primary);
          font-family: 'Outfit', -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }

        /* Animated background gradient orbs */
        .bg-orbs {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          animation: float 20s ease-in-out infinite;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(74, 222, 128, 0.3) 0%, transparent 70%);
          top: -100px;
          right: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(96, 165, 250, 0.25) 0%, transparent 70%);
          bottom: 20%;
          left: -80px;
          animation-delay: -7s;
        }

        .orb-3 {
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%);
          top: 40%;
          right: -50px;
          animation-delay: -14s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }

        /* Glass card effect */
        .glass-card {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
        }

        .glass-card-hover {
          transition: all 0.3s ease;
        }

        .glass-card-hover:hover {
          background: var(--bg-glass-hover);
          border-color: var(--border-medium);
          transform: translateY(-2px);
        }

        /* Pulse animation for recording */
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        @keyframes pulse-core {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .pulse-ring {
          animation: pulse-ring 1.5s ease-out infinite;
        }

        .pulse-core {
          animation: pulse-core 1s ease-in-out infinite;
        }

        /* Score counter animation */
        @keyframes score-pop {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        .score-animate {
          animation: score-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        /* Stagger fade in */
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fade-up {
          animation: fade-up 0.6s ease-out forwards;
        }

        .fade-up-1 { animation-delay: 0.1s; opacity: 0; }
        .fade-up-2 { animation-delay: 0.2s; opacity: 0; }
        .fade-up-3 { animation-delay: 0.3s; opacity: 0; }
        .fade-up-4 { animation-delay: 0.4s; opacity: 0; }

        /* Button styles */
        .btn-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 100px;
          font-family: 'Outfit', sans-serif;
          font-weight: 500;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-ghost {
          background: transparent;
          border: 1px solid var(--border-medium);
          color: var(--text-secondary);
        }

        .btn-ghost:hover:not(:disabled) {
          background: var(--bg-glass-hover);
          border-color: var(--text-muted);
          color: var(--text-primary);
        }

        .btn-ghost:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Call type chips */
        .chip {
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid var(--border-subtle);
          background: var(--bg-glass);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .chip:hover {
          background: var(--bg-glass-hover);
          color: var(--text-secondary);
        }

        .chip-active {
          background: var(--accent-green-dim);
          border-color: rgba(74, 222, 128, 0.3);
          color: var(--accent-green);
        }

        .chip-active:hover {
          background: var(--accent-green-dim);
        }

        /* View toggle */
        .toggle-group {
          display: inline-flex;
          background: var(--bg-glass);
          border-radius: 12px;
          padding: 4px;
          gap: 4px;
        }

        .toggle-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toggle-btn:hover {
          color: var(--text-secondary);
        }

        .toggle-btn-active {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }

        /* Mono text */
        .mono {
          font-family: 'JetBrains Mono', monospace;
        }

        /* Score breakdown */
        .breakdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .breakdown-bar {
          height: 4px;
          border-radius: 2px;
          background: var(--bg-elevated);
          flex: 1;
          overflow: hidden;
        }

        .breakdown-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Recording status indicator */
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-green);
        }

        .status-dot-recording {
          background: var(--accent-red);
          animation: pulse-core 0.8s ease-in-out infinite;
        }
      `}</style>

      {/* Background orbs */}
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Main container */}
      <div style={{ 
        position: 'relative', 
        zIndex: 1, 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          
          {/* Header */}
          <header className={`fade-up fade-up-1 ${mounted ? '' : ''}`} style={{ 
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <h1 style={{ 
                fontSize: 28, 
                fontWeight: 700, 
                letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #f4f4f5 0%, #a1a1aa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 4,
              }}>
                ShockTalk
              </h1>
              <p style={{ 
                fontSize: 13, 
                color: 'var(--text-muted)',
                fontWeight: 400,
              }}>
                Master your turkey calls
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: 'var(--bg-glass)',
              borderRadius: 100,
              border: '1px solid var(--border-subtle)',
            }}>
              <div className={`status-dot ${state === 'recording' ? 'status-dot-recording' : ''}`} />
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {state === 'recording' ? 'REC' : state === 'processing' ? '...' : 'READY'}
              </span>
            </div>
          </header>

          {/* Call type selector */}
          <div className="fade-up fade-up-2" style={{ 
            display: 'flex', 
            gap: 8, 
            marginBottom: 24,
            flexWrap: 'wrap',
          }}>
            {CALLS.map(call => (
              <button
                key={call.id}
                onClick={() => setCallId(call.id)}
                className={`chip ${callId === call.id ? 'chip-active' : ''}`}
              >
                {call.name}
              </button>
            ))}
          </div>

          {/* Score display */}
          {result && (
            <div className="glass-card score-animate" style={{ 
              padding: 24,
              marginBottom: 24,
              textAlign: 'center',
            }}>
              <div style={{ 
                fontSize: 72, 
                fontWeight: 700,
                lineHeight: 1,
                color: scoreColor,
                textShadow: `0 0 60px ${scoreColor}40`,
                marginBottom: 8,
              }}>
                <span className="mono">{result.score}</span>
              </div>
              <p style={{ 
                fontSize: 14, 
                color: 'var(--text-secondary)',
                marginBottom: 20,
                maxWidth: 280,
                margin: '0 auto 20px',
                lineHeight: 1.5,
              }}>
                {result.feedback}
              </p>
              
              {/* Score breakdown bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Pitch', value: result.breakdown.pitch, color: '#4ade80' },
                  { label: 'Rhythm', value: result.breakdown.rhythm, color: '#60a5fa' },
                  { label: 'Duration', value: result.breakdown.duration, color: '#fbbf24' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="breakdown-item">
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 60, textAlign: 'left' }}>
                      {label}
                    </span>
                    <div className="breakdown-bar">
                      <div 
                        className="breakdown-fill" 
                        style={{ width: `${value}%`, background: color }} 
                      />
                    </div>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)', width: 32 }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visualizations */}
          <div className="fade-up fade-up-3 glass-card" style={{ 
            padding: 16,
            marginBottom: 16,
            overflow: 'hidden',
          }}>
            <div style={{ marginBottom: 12 }}>
              <Spectrogram 
                frames={displayFrames} 
                currentFrame={displayFrame} 
                width={408} 
                height={120} 
                mode={viewMode} 
              />
            </div>
            <TimbralManifold 
              frames={displayFrames} 
              currentFrame={displayFrame} 
              width={408} 
              height={280} 
              mode={viewMode} 
            />
          </div>

          {/* View toggle */}
          {state === 'complete' && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div className="toggle-group">
                {(['reference', 'user'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => {
                      setViewMode(m);
                      setPlaybackFrame(0);
                      const f = m === 'user' ? userFrames : refFrames;
                      let i = 0;
                      const int = setInterval(() => {
                        setPlaybackFrame(i);
                        i++;
                        if (i >= f.length) clearInterval(int);
                      }, 1000 / 30);
                    }}
                    className={`toggle-btn ${viewMode === m ? 'toggle-btn-active' : ''}`}
                  >
                    {m === 'reference' ? 'Reference' : 'Your Call'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="fade-up fade-up-4" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: 20,
            marginTop: 8,
          }}>
            {/* Record button */}
            <div style={{ position: 'relative' }}>
              {/* Pulse rings when recording */}
              {state === 'recording' && (
                <>
                  <div style={{
                    position: 'absolute',
                    inset: -20,
                    borderRadius: '50%',
                    border: '2px solid var(--accent-red)',
                    opacity: 0.5,
                  }} className="pulse-ring" />
                  <div style={{
                    position: 'absolute',
                    inset: -10,
                    borderRadius: '50%',
                    border: '2px solid var(--accent-red)',
                    opacity: 0.3,
                  }} className="pulse-ring" />
                </>
              )}
              
              <button
                onClick={handleRecord}
                disabled={state === 'processing'}
                className={state === 'recording' ? 'pulse-core' : ''}
                style={{
                  position: 'relative',
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  border: 'none',
                  background: state === 'recording' 
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    : 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                  boxShadow: state === 'recording' ? 'var(--glow-red)' : 'var(--glow-green)',
                  cursor: state === 'processing' ? 'wait' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: state === 'recording' ? 24 : 32,
                  height: state === 'recording' ? 24 : 32,
                  borderRadius: state === 'recording' ? 4 : 16,
                  background: 'white',
                  transition: 'all 0.2s ease',
                }} />
              </button>
            </div>

            {/* Play reference button */}
            <button
              onClick={handlePlayRef}
              disabled={state === 'recording'}
              className="btn-pill btn-ghost"
              style={{
                background: isPlayingRef ? 'var(--accent-blue-dim)' : undefined,
                borderColor: isPlayingRef ? 'rgba(96, 165, 250, 0.3)' : undefined,
                color: isPlayingRef ? 'var(--accent-blue)' : undefined,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                {isPlayingRef ? (
                  <rect x="3" y="3" width="10" height="10" rx="1" />
                ) : (
                  <path d="M4 2.5v11l9-5.5-9-5.5z" />
                )}
              </svg>
              {isPlayingRef ? 'Stop' : 'Play Reference'}
            </button>
          </div>

          {/* Status text */}
          <p style={{ 
            textAlign: 'center', 
            marginTop: 32,
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
          }}>
            {state === 'idle' && 'Listen to the reference, then record your attempt'}
            {state === 'recording' && 'Make your call — tap to stop'}
            {state === 'processing' && 'Analyzing your call...'}
            {state === 'complete' && 'Compare your call to the reference above'}
          </p>

          {/* Footer */}
          <footer style={{
            marginTop: 48,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-muted)',
            opacity: 0.5,
          }}>
            Built for turkey season 2026
          </footer>

        </div>
      </div>
    </>
  );
}