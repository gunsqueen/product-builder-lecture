import type { AgeGroupStat, AgeRatioMetrics } from '../types';

interface ParsedAgeGroup {
  label: string;
  value: number;
  start: number;
  end: number | null;
}

export function normalizeAgeGroups(ageGroups: AgeGroupStat[]): ParsedAgeGroup[] {
  return ageGroups
    .map((group) => {
      const normalizedLabel = `${group.label}`.replace(/\s+/g, '').replace('세', '').replace('이상', '+');
      if (normalizedLabel.includes('+')) {
        const start = Number(normalizedLabel.replace('+', ''));
        return Number.isFinite(start)
          ? { label: group.label, value: Number(group.value) || 0, start, end: null }
          : null;
      }

      const matched = normalizedLabel.match(/(\d+)[~-](\d+)/);
      if (!matched) {
        return null;
      }

      return {
        label: group.label,
        value: Number(group.value) || 0,
        start: Number(matched[1]),
        end: Number(matched[2]),
      };
    })
    .filter((group): group is ParsedAgeGroup => Boolean(group));
}

export function calculateAgeRatioMetrics(ageGroups: AgeGroupStat[], totalPopulation: number): AgeRatioMetrics {
  if (!totalPopulation) {
    return {};
  }

  const normalized = normalizeAgeGroups(ageGroups);
  const age10to19 = sumExactBand(normalized, 10, 19);
  const age20to39 = sumRange(normalized, 20, 39);
  const age65Plus = sumRange(normalized, 65, null);

  return {
    age10to19Ratio: age10to19 > 0 ? age10to19 / totalPopulation : undefined,
    age2030Ratio: age20to39 > 0 ? age20to39 / totalPopulation : undefined,
    senior65Ratio: age65Plus > 0 ? age65Plus / totalPopulation : undefined,
  };
}

function sumExactBand(groups: ParsedAgeGroup[], start: number, end: number): number {
  const exact = groups.find((group) => group.start === start && group.end === end);
  return exact?.value ?? 0;
}

function sumRange(groups: ParsedAgeGroup[], start: number, end: number | null): number {
  return groups.reduce((sum, group) => sum + estimateOverlap(group, start, end), 0);
}

function estimateOverlap(group: ParsedAgeGroup, rangeStart: number, rangeEnd: number | null): number {
  const groupEnd = group.end ?? rangeEnd ?? group.start;
  const effectiveRangeEnd = rangeEnd ?? groupEnd;

  if (groupEnd < rangeStart) {
    return 0;
  }

  if (rangeEnd !== null && group.start > effectiveRangeEnd) {
    return 0;
  }

  if (group.end === null) {
    if (rangeEnd === null || group.start >= rangeStart) {
      return group.value;
    }
    return 0;
  }

  const overlapStart = Math.max(group.start, rangeStart);
  const overlapEnd = rangeEnd === null ? group.end : Math.min(group.end, rangeEnd);
  if (overlapStart > overlapEnd) {
    return 0;
  }

  const groupSpan = group.end - group.start + 1;
  const overlapSpan = overlapEnd - overlapStart + 1;
  return group.value * (overlapSpan / groupSpan);
}
