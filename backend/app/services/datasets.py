from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import HTTPException, UploadFile

from app.core.config import settings

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}


def _json_scalar(value: Any) -> Any:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value) if np.isfinite(value) else None
    if isinstance(value, (np.bool_,)):
        return bool(value)
    return value.item() if hasattr(value, "item") else value


def read_frame(raw: bytes, filename: str) -> pd.DataFrame:
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Upload a CSV or Excel (.xlsx, .xls) file.")
    try:
        if extension == ".csv":
            frame = pd.read_csv(BytesIO(raw), low_memory=False)
        else:
            engine = "openpyxl" if extension == ".xlsx" else "xlrd"
            frame = pd.read_excel(BytesIO(raw), engine=engine)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"The dataset could not be parsed: {exc}") from exc
    if frame.empty or len(frame.columns) == 0:
        raise HTTPException(status_code=422, detail="The dataset has no rows or columns.")
    frame.columns = [str(column).strip() for column in frame.columns]
    if any(not column for column in frame.columns) or len(set(frame.columns)) != len(frame.columns):
        raise HTTPException(status_code=422, detail="Column names must be non-empty and unique.")
    if len(frame.columns) > 300:
        raise HTTPException(status_code=422, detail="The dataset exceeds the 300-column limit.")
    if len(frame) > 500_000:
        raise HTTPException(status_code=413, detail="The dataset exceeds the 500,000-row limit.")
    return frame


def inspect_frame(frame: pd.DataFrame) -> dict[str, Any]:
    columns = []
    for column in frame.columns:
        series = frame[column]
        is_numeric = pd.api.types.is_numeric_dtype(series)
        columns.append({
            "name": str(column),
            "dtype": str(series.dtype),
            "kind": "numeric" if is_numeric else "categorical",
            "non_null_count": int(series.notna().sum()),
            "missing_count": int(series.isna().sum()),
            "unique_count": int(series.nunique(dropna=True)),
        })
    preview = [
        {str(key): _json_scalar(value) for key, value in row.items()}
        for row in frame.head(12).to_dict(orient="records")
    ]
    return {
        "row_count": int(len(frame)),
        "columns": columns,
        "preview_rows": preview,
        "missing_count": int(frame.isna().sum().sum()),
        "duplicate_count": int(frame.duplicated().sum()),
    }


async def read_upload(file: UploadFile) -> tuple[bytes, pd.DataFrame]:
    filename = Path(file.filename or "dataset.csv").name
    if Path(filename).suffix.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Upload a CSV or Excel (.xlsx, .xls) file.")
    raw = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if not raw:
        raise HTTPException(status_code=422, detail="The uploaded file is empty.")
    if len(raw) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Maximum upload size is {settings.max_upload_mb} MB.")
    return raw, read_frame(raw, filename)
