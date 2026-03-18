export type AudioFeatureFrame = {
  time: number;
  spectralCentroid: number;
  rmsEnergy: number;
  spectralSpread: number;
  spectralFlatness: number;
};

export type ScoreBreakdown = {
  pitch: number;
  rhythm: number;
  duration: number;
  overall: number;
};

export type ScoringResult = {
  score: number;
  breakdown: ScoreBreakdown;
  feedback: string;
};

const WEIGHTS = { pitch: 0.6, rhythm: 0.3, duration: 0.1 };

function normalize(arr: number[]): number[] {
  if (arr.length === 0) return [];
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min || 1;
  return arr.map(v => (v - min) / range);
}

function dtw(seq1: number[], seq2: number[]): number {
  const n = seq1.length;
  const m = seq2.length;
  if (n === 0 || m === 0) return Infinity;

  const window = Math.max(Math.floor(Math.max(n, m) * 0.2), 2);
  const dp: number[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
  dp[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    const jStart = Math.max(1, i - window);
    const jEnd = Math.min(m, i + window);
    for (let j = jStart; j <= jEnd; j++) {
      const cost = Math.abs(seq1[i - 1] - seq2[j - 1]);
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[n][m] / Math.max(n, m);
}

function calculatePitchScore(ref: AudioFeatureFrame[], user: AudioFeatureFrame[]): number {
  const refCentroid = normalize(ref.map(f => f.spectralCentroid));
  const userCentroid = normalize(user.map(f => f.spectralCentroid));
  const distance = dtw(refCentroid, userCentroid);
  return Math.max(0, Math.min(100, 100 - distance * 200));
}

function calculateRhythmScore(ref: AudioFeatureFrame[], user: AudioFeatureFrame[]): number {
  const refEnergy = ref.map(f => f.rmsEnergy);
  const userEnergy = user.map(f => f.rmsEnergy);
  const distance = dtw(refEnergy, userEnergy);
  return Math.max(0, Math.min(100, 100 - distance * 150));
}

function calculateDurationScore(ref: AudioFeatureFrame[], user: AudioFeatureFrame[]): number {
  const ratio = Math.min(ref.length, user.length) / Math.max(ref.length, user.length);
  return Math.round(Math.pow(ratio, 0.5) * 100);
}

function generateFeedback(pitch: number, rhythm: number, duration: number): string {
  if (pitch >= 85 && rhythm >= 85 && duration >= 80) return 'Excellent call! Field ready.';
  if (pitch >= 75 && rhythm >= 75) return 'Good call. Minor refinements possible.';
  const weakest = Math.min(pitch, rhythm, duration);
  if (weakest === pitch) return pitch < 50 ? 'Focus on matching the pitch contour.' : 'Pitch is close. Match frequency peaks.';
  if (weakest === rhythm) return rhythm < 50 ? 'Work on your timing.' : 'Rhythm is close. Mind the pauses.';
  if (weakest === duration) return 'Adjust your call length to match reference.';
  return 'Keep practicing.';
}

export function calculateSimilarityScore(ref: AudioFeatureFrame[], user: AudioFeatureFrame[]): ScoringResult {
  if (ref.length < 5 || user.length < 5) {
    return { score: 0, breakdown: { pitch: 0, rhythm: 0, duration: 0, overall: 0 }, feedback: 'Recording too short.' };
  }

  const pitch = calculatePitchScore(ref, user);
  const rhythm = calculateRhythmScore(ref, user);
  const duration = calculateDurationScore(ref, user);
  const raw = pitch * WEIGHTS.pitch + rhythm * WEIGHTS.rhythm + duration * WEIGHTS.duration;
  const overall = Math.round(Math.pow(raw / 100, 0.85) * 100);

  return {
    score: overall,
    breakdown: { pitch: Math.round(pitch), rhythm: Math.round(rhythm), duration: Math.round(duration), overall },
    feedback: generateFeedback(pitch, rhythm, duration),
  };
}