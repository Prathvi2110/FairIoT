from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


class ColumnProfile(BaseModel):
    name: str
    dtype: str
    kind: Literal["numeric", "categorical"]
    non_null_count: int
    missing_count: int
    unique_count: int


class DatasetSummary(BaseModel):
    id: int
    name: str
    filename: str
    file_format: Literal["csv", "xlsx", "xls"]
    row_count: int
    columns: list[ColumnProfile]
    missing_count: int
    duplicate_count: int
    created_at: datetime


class DatasetPreview(DatasetSummary):
    preview_rows: list[dict[str, Any]]


class SampleDataset(BaseModel):
    filename: str
    description: str
    simulated: bool
