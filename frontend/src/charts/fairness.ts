import type { GroupResult } from '../types';

export const fairnessChartColors = ['#0B8F87', '#549DB2', '#85BEB8', '#91A7C1', '#C18F56', '#879C77'];

export interface GroupChartDatum extends GroupResult {
  value: number;
  confidenceRange?: [number, number];
  observedRange: [number, number];
}

export function buildGroupChartData(groups: GroupResult[], contextAdjusted: boolean): GroupChartDatum[] {
  return groups.map((group) => {
    const value = contextAdjusted ? (group.context_standardized_mean ?? group.mean) : group.mean;
    const interval = group.confidence_interval_95;
    return {
      ...group,
      value,
      confidenceRange: !contextAdjusted && interval ? [Math.abs(value - interval[0]), Math.abs(interval[1] - value)] : undefined,
      observedRange: [Math.abs(value - group.minimum), Math.abs(group.maximum - value)],
    };
  });
}
