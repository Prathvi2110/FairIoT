export type FairnessStatus = 'fair_under_test' | 'potential_disparity' | 'insufficient_data';
export type ModuleKey = 'sensor' | 'actuator' | 'communication' | 'resource_allocation';

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
}

export interface ColumnInfo {
  name: string;
  dtype: string;
  kind: 'numeric' | 'categorical';
  non_null_count: number;
  missing_count: number;
  unique_count: number;
}

export interface Dataset {
  id: number;
  name: string;
  filename: string;
  file_format: string;
  row_count: number;
  columns: ColumnInfo[];
  missing_count: number;
  duplicate_count: number;
  created_at: string;
  preview_rows?: Record<string, unknown>[];
}

export interface GroupResult {
  group: string;
  sample_size: number;
  mean: number;
  median: number;
  minimum: number;
  maximum: number;
  std_dev: number | null;
  confidence_interval_95: [number, number] | null;
  below_minimum_sample_size: boolean;
  context_standardized_mean?: number;
}

export interface AnalysisResult {
  id: number;
  dataset_id: number;
  dataset_name: string;
  module: ModuleKey;
  group_column: string;
  metric_column: string;
  direction: 'higher' | 'lower';
  threshold_percent: number;
  minimum_group_size: number;
  status: FairnessStatus;
  relative_gap_percent: number;
  created_at: string;
  result: {
    status: FairnessStatus;
    status_label: string;
    direction: 'higher' | 'lower';
    threshold_percent: number;
    minimum_group_size: number;
    group_count: number;
    total_observations: number;
    best_group: string;
    worst_group: string;
    absolute_gap: number;
    relative_gap_percent: number;
    comparison_basis: string;
    groups: GroupResult[];
    context_adjustment: {
      requested: boolean;
      applied: boolean;
      column?: string | null;
      method?: string;
      shared_contexts?: string[];
      weights?: Record<string, number>;
      note?: string;
    };
    explanation: string;
    caveat: string;
  };
}

export interface DashboardStats {
  devices_analyzed: number;
  devices_basis: string;
  datasets_uploaded: number;
  groups_compared: number;
  potential_disparities: number;
  status_distribution: Record<FairnessStatus, number>;
  module_distribution: Record<string, number>;
  recent_analyses: Array<{
    id: number;
    dataset_name: string;
    module: ModuleKey;
    metric_column: string;
    status: FairnessStatus;
    created_at: string;
    relative_gap_percent: number;
  }>;
  trend: Array<{ date: string; analyses: number }>;
}
