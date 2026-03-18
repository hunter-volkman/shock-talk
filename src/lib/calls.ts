import type { AudioFeatureFrame } from './audio/scorer';

export type CallType = { id: string; name: string; description: string; difficulty: 'easy' | 'medium' | 'hard'; category: 'hen' | 'gobbler' };

export const CALLS: CallType[] = [
  { id: 'yelp', name: 'Plain Yelp', description: 'Basic hen call', difficulty: 'easy', category: 'hen' },
  { id: 'cluck', name: 'Cluck', description: 'Short sharp notes', difficulty: 'easy', category: 'hen' },
  { id: 'gobble', name: 'Gobble', description: 'Rapid oscillation', difficulty: 'medium', category: 'gobbler' },
];

export function generateMockFrames(callId: string, duration = 2.5): AudioFeatureFrame[] {
  const fps = 30, frames: AudioFeatureFrame[] = [], numFrames = Math.floor(duration * fps);

  for (let i = 0; i < numFrames; i++) {
    const t = i / numFrames;
    let centroid: number, energy: number, spread: number;

    switch (callId) {
      case 'yelp': { const cycle = (t * 3.5) % 1, env = Math.pow(Math.sin(cycle * Math.PI), 1.5); centroid = 650 + env * 750; energy = env * 0.85 + 0.08; spread = 120 + env * 180; break; }
      case 'cluck': { const cycle = (t * 6) % 1, env = cycle < 0.15 ? Math.sin(cycle * Math.PI / 0.15) : 0; centroid = 450 + env * 250; energy = env * 0.95; spread = 80 + env * 120; break; }
      case 'gobble': { const wobble = Math.sin(t * 55) * 0.5 + 0.5, env = Math.sin(t * Math.PI) * 0.8 + 0.2; centroid = 520 + wobble * 380; energy = env * wobble * 0.75 + 0.15; spread = 160 + wobble * 140; break; }
      default: { centroid = 500; energy = 0.5; spread = 150; }
    }

    frames.push({ time: t * duration, spectralCentroid: centroid, rmsEnergy: energy, spectralSpread: spread, spectralFlatness: 0.3 });
  }
  return frames;
}