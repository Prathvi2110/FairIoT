from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.analysis import FairnessModule, FairnessStatus


class DashboardRecentAnalysis(BaseModel):
    id: int
    dataset_name: str
    module: FairnessModule
    metric_column: str
    status: FairnessStatus
    created_at: datetime
    relative_gap_percent: float


class DashboardTrendPoint(BaseModel):
    date: date
    analyses: int


class DashboardStats(BaseModel):
    devices_analyzed: int
    devices_basis: str
    datasets_uploaded: int
    groups_compared: int
    potential_disparities: int
    status_distribution: dict[FairnessStatus, int]
    module_distribution: dict[str, int]
    recent_analyses: list[DashboardRecentAnalysis]
    trend: list[DashboardTrendPoint]
