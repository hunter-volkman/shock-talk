import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioFeatureFrame, ScoringResult, calculateSimilarityScore } from './scorer';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing' | 'complete' | 'error';

export function useRecorder(referenceFrames: AudioFeatureFrame[], options: { maxDuration?: number; minDuration?: number } = {}) {
  const { maxDuration = 15, minDuration = 0.5 } = options;

  const [state, setState] = useState<RecorderState>('idle');
  const [frames, setFrames] = useState<AudioFeatureFrame[]>([]);
  const [currentFrame, setCurrentFrame] = useState<AudioFeatureFrame | null>(null);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const collectedRef = useRef<AudioFeatureFrame[]>([]);
  const smoothRef = useRef({ centroid: 0, energy: 0, spread: 0 });

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try { analyzerRef.current?.stop(); } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
    intervalRef.current = timeoutRef.current = analyzerRef.current = streamRef.current = audioContextRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startRecording = useCallback(async () => {
    setFrames([]); setCurrentFrame(null); setResult(null); setError(null);
    collectedRef.current = []; smoothRef.current = { centroid: 0, energy: 0, spread: 0 };
    setState('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 44100 });
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const Meyda = (await import('meyda')).default;
      startTimeRef.current = performance.now();

      analyzerRef.current = Meyda.createMeydaAnalyzer({
        audioContext: ctx, source, bufferSize: 512,
        featureExtractors: ['spectralCentroid', 'rms', 'spectralSpread', 'spectralFlatness'],
        callback: (f: any) => {
          const time = (performance.now() - startTimeRef.current) / 1000;
          const s = smoothRef.current, alpha = 0.3;
          const centroid = s.centroid ? alpha * f.spectralCentroid + (1 - alpha) * s.centroid : f.spectralCentroid;
          const energy = s.energy ? alpha * f.rms + (1 - alpha) * s.energy : f.rms;
          const spread = s.spread ? alpha * f.spectralSpread + (1 - alpha) * s.spread : f.spectralSpread;
          s.centroid = centroid; s.energy = energy; s.spread = spread;

          const frame: AudioFeatureFrame = {
            time, spectralCentroid: (centroid || 0) * ctx.sampleRate / 2,
            rmsEnergy: Math.min(1, energy || 0), spectralSpread: (spread || 0) * ctx.sampleRate / 2, spectralFlatness: f.spectralFlatness || 0,
          };
          collectedRef.current.push(frame);
          setCurrentFrame(frame);
        },
      });

      analyzerRef.current.start();
      setState('recording');
      intervalRef.current = window.setInterval(() => setFrames([...collectedRef.current]), 100);
      timeoutRef.current = window.setTimeout(() => stopRecording(), maxDuration * 1000);
    } catch (err: any) {
      cleanup();
      setError(err.name === 'NotAllowedError' ? 'Microphone access denied' : 'Recording failed');
      setState('error');
    }
  }, [maxDuration, cleanup]);

  const stopRecording = useCallback(() => {
    if (state !== 'recording') return;
    const finalFrames = [...collectedRef.current];
    const duration = (performance.now() - startTimeRef.current) / 1000;
    cleanup();
    setState('processing');

    setTimeout(() => {
      if (duration < minDuration) { setError('Recording too short'); setState('error'); return; }
      try {
        const res = calculateSimilarityScore(referenceFrames, finalFrames);
        setFrames(finalFrames); setResult(res); setState('complete');
      } catch { setError('Analysis failed'); setState('error'); }
    }, 100);
  }, [state, referenceFrames, minDuration, cleanup]);

  const reset = useCallback(() => {
    cleanup(); setFrames([]); setCurrentFrame(null); setResult(null); setError(null); setState('idle');
  }, [cleanup]);

  return { state, frames, currentFrame, result, error, startRecording, stopRecording, reset };
}