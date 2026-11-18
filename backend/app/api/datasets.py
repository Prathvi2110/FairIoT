from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import PROJECT_ROOT
from app.database.session import get_db
from app.models.entities import Dataset, User
from app.schemas.datasets import DatasetPreview, DatasetSummary, SampleDataset
from app.services.datasets import inspect_frame, read_upload

router = APIRouter(prefix="/datasets", tags=["datasets"])
SAMPLE_DIR = PROJECT_ROOT / "datasets"


def _serialize(dataset: Dataset) -> dict:
    return {
        "id": dataset.id,
        "name": dataset.name,
        "filename": dataset.filename,
        "file_format": dataset.file_format,
        "row_count": dataset.row_count,
        "columns": dataset.columns,
        "missing_count": dataset.missing_count,
        "duplicate_count": dataset.duplicate_count,
        "created_at": dataset.created_at.isoformat(),
    }


@router.get("", response_model=list[DatasetSummary])
def list_datasets(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict]:
    datasets = db.scalars(select(Dataset).where(Dataset.owner_id == user.id).order_by(Dataset.created_at.desc())).all()
    return [_serialize(dataset) for dataset in datasets]


@router.post("", response_model=DatasetSummary, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    raw, frame = await read_upload(file)
    inspected = inspect_frame(frame)
    filename = Path(file.filename or "dataset.csv").name
    dataset_name = (name or Path(filename).stem).strip()[:180]
    if not dataset_name:
        raise HTTPException(status_code=422, detail="Dataset name cannot be empty.")
    dataset = Dataset(
        owner_id=user.id,
        name=dataset_name,
        filename=filename[:255],
        file_format=Path(filename).suffix.lower().lstrip("."),
        row_count=inspected["row_count"],
        columns=inspected["columns"],
        preview_rows=inspected["preview_rows"],
        missing_count=inspected["missing_count"],
        duplicate_count=inspected["duplicate_count"],
        original_file=raw,
    )
    db.add(dataset)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A dataset with this name already exists in your account.") from exc
    db.refresh(dataset)
    return _serialize(dataset)


@router.get("/samples", response_model=list[SampleDataset])
def list_samples() -> list[dict[str, str | bool]]:
    descriptions = {
        "sensor_fairness_sample.csv": "Simulated sensor accuracy, response time, calibration, and environmental conditions.",
        "actuator_fairness_sample.csv": "Simulated activation delay, command success, and response consistency.",
        "communication_fairness_sample.csv": "Simulated network latency, packet loss, bandwidth, and availability.",
        "resource_allocation_fairness_sample.csv": "Simulated CPU, memory, energy, bandwidth, and workload allocation.",
    }
    return [
        {"filename": name, "description": description, "simulated": True}
        for name, description in descriptions.items()
        if (SAMPLE_DIR / name).is_file()
    ]


@router.get("/samples/{filename}")
def download_sample(filename: str) -> FileResponse:
    allowed = {item["filename"] for item in list_samples()}
    if filename not in allowed:
        raise HTTPException(status_code=404, detail="Sample dataset not found.")
    return FileResponse(SAMPLE_DIR / filename, media_type="text/csv", filename=filename)


@router.get("/{dataset_id}", response_model=DatasetPreview)
def preview_dataset(dataset_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    dataset = db.scalar(select(Dataset).where(Dataset.id == dataset_id, Dataset.owner_id == user.id))
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return {**_serialize(dataset), "preview_rows": dataset.preview_rows}


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(dataset_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    dataset = db.scalar(select(Dataset).where(Dataset.id == dataset_id, Dataset.owner_id == user.id))
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    db.delete(dataset)
    db.commit()
