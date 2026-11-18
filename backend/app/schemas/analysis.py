from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field
from typing_extensions import Annotated


FairnessStatus = Literal["fair_under_test", "potential_disparity", "insufficient_data"]
FairnessModule = Literal["sensor", "actuator", "communication", "resource_allocation"]


class AnalysisRequest(BaseModel):
    dataset_id: int
    module: FairnessModule
    group_column: Annotated[str, Field(min_length=1, max_length=180)]
    metric_column: Annotated[str, Field(min_length=1, max_length=180)]
    direction: Literal["higher", "lower"] = "higher"
    threshold_percent: float = Field(default=10.0, ge=0.0, le=500.0)
    minimum_group_size: int = Field(default=5, ge=2, le=1000)
    context_column: str | None = Field(default=None, max_length=180)


class GroupStatistics(BaseModel):
    group: str
    sample_size: int
    mean: float
    median: float
    minimum: float
    maximum: float
    std_dev: float | None
    confidence_interval_95: tuple[float, float] | None
    below_minimum_sample_size: bool
    context_standardized_mean: float | None = None


class ContextAdjustment(BaseModel):
    requested: bool
    applied: bool
    column: str | None = None
    method: str | None = None
    shared_contexts: list[str] = Field(default_factory=list)
    weights: dict[str, float] = Field(default_factory=dict)
    note: str | None = None


class AnalysisDetails(BaseModel):
    status: FairnessStatus
    status_label: str
    direction: Literal["higher", "lower"]
    threshold_percent: float
    minimum_group_size: int
    group_count: int
    total_observations: int
    best_group: str
    worst_group: str
    absolute_gap: float
    relative_gap_percent: float
    comparison_basis: str
    groups: list[GroupStatistics]
    context_adjustment: ContextAdjustment
    explanation: str
    caveat: str


class AnalysisSummary(BaseModel):
    id: int
    dataset_id: int
    dataset_name: str
    module: FairnessModule
    metric_column: str
    group_column: str
    direction: Literal["higher", "lower"]
    threshold_percent: float
    minimum_group_size: int
    status: FairnessStatus
    relative_gap_percent: float | None
    created_at: datetime


class AnalysisResponse(AnalysisSummary):
    result: AnalysisDetails


class AnalysisCompareRequest(BaseModel):
    analysis_ids: list[int] = Field(min_length=2, max_length=10)


class AnalysisComparisonResponse(BaseModel):
    analyses: list[AnalysisResponse]
