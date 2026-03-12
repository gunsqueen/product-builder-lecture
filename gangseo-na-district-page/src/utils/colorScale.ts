const SCALE = ['#eff6ff', '#cfe0f8', '#9fbee9', '#6e9bd7', '#2f6fad'];

export function getColorByRate(value: number | undefined, min: number, max: number): string {
  if (value === undefined || Number.isNaN(value)) {
    return '#e2e8f0';
  }

  if (max <= min) {
    return SCALE[SCALE.length - 1];
  }

  const ratio = (value - min) / (max - min);
  const index = Math.max(0, Math.min(SCALE.length - 1, Math.floor(ratio * SCALE.length)));
  return SCALE[index];
}

export function getTurnoutColor(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) {
    return '#e2e8f0';
  }

  if (value < 0.6) return '#fee2e2';
  if (value < 0.7) return '#fecaca';
  if (value < 0.8) return '#fca5a5';
  return '#ef4444';
}

export function getLegendStops(metric: 'population' | 'households' | 'turnout'): Array<{ label: string; color: string }> {
  if (metric === 'turnout') {
    return [
      { label: '60% 미만', color: '#fee2e2' },
      { label: '60~69%', color: '#fecaca' },
      { label: '70~79%', color: '#fca5a5' },
      { label: '80% 이상', color: '#ef4444' },
    ];
  }

  return SCALE.map((color, index) => ({
    label: `${index + 1}단계`,
    color,
  }));
}
