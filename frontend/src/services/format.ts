import type { FairnessStatus, ModuleKey } from '../types';

export const moduleLabels: Record<ModuleKey, string> = {
  sensor: 'Sensor fairness',
  actuator: 'Actuator fairness',
  communication: 'Communication fairness',
  resource_allocation: 'Resource allocation',
};

export const statusLabels: Record<FairnessStatus, string> = {
  fair_under_test: 'Fair under selected test',
  potential_disparity: 'Potential disparity',
  insufficient_data: 'Insufficient data',
};

export function formatDate(value: string, includeTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function statusClass(status: FairnessStatus) {
  if (status === 'potential_disparity') return 'badge badge-potential';
  if (status === 'insufficient_data') return 'badge badge-insufficient';
  return 'badge badge-fair';
}
