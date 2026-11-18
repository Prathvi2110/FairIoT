from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analysis.fairness import analyze_frame
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.entities import Analysis, Dataset, User
from app.schemas.analysis import AnalysisCompareRequest, AnalysisComparisonResponse, AnalysisRequest, AnalysisResponse, AnalysisSummary
from app.services.datasets import read_frame

router = APIRouter(prefix="/analyses", tags=["fairness analysis"])


def _summary(item: Analysis) -> dict:
    return {
        "id": item.id,
        "dataset_id": item.dataset_id,
        "dataset_name": item.dataset.name,
        "module": item.module,
        "group_column": item.group_column,
        "metric_column": item.metric_column,
        "direction": item.direction,
        "threshold_percent": item.threshold_percent,
        "minimum_group_size": item.minimum_group_size,
        "status": item.status,
        "relative_gap_percent": item.result_json.get("relative_gap_percent"),
        "created_at": item.created_at.isoformat(),
    }


@router.post("", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
def run_analysis(
    payload: AnalysisRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    dataset = db.scalar(select(Dataset).where(Dataset.id == payload.dataset_id, Dataset.owner_id == user.id))
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    frame = read_frame(dataset.original_file, dataset.filename)
    if payload.context_column and payload.context_column not in frame.columns:
        raise HTTPException(status_code=422, detail=f"Context column not found: {payload.context_column}")
    result = analyze_frame(
        frame=frame,
        group_column=payload.group_column,
        metric_column=payload.metric_column,
        direction=payload.direction,
        threshold_percent=payload.threshold_percent,
        minimum_group_size=payload.minimum_group_size,
        context_column=payload.context_column,
    )
    analysis = Analysis(
        owner_id=user.id,
        dataset_id=dataset.id,
        module=payload.module,
        group_column=payload.group_column,
        metric_column=payload.metric_column,
        direction=payload.direction,
        threshold_percent=payload.threshold_percent,
        minimum_group_size=payload.minimum_group_size,
        context_column=payload.context_column,
        status=result["status"],
        result_json=result,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return {**_summary(analysis), "result": result}


@router.get("", response_model=list[AnalysisSummary])
def list_analyses(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    analyses = db.scalars(
        select(Analysis).where(Analysis.owner_id == user.id).order_by(Analysis.created_at.desc()).limit(limit)
    ).all()
    return [_summary(item) for item in analyses]


@router.get("/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(analysis_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = db.scalar(select(Analysis).where(Analysis.id == analysis_id, Analysis.owner_id == user.id))
    if item is None:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return {**_summary(item), "result": item.result_json}


@router.post("/compare", response_model=AnalysisComparisonResponse)
def compare_analyses(
    payload: AnalysisCompareRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    analysis_ids = payload.analysis_ids
    if len(set(analysis_ids)) != len(analysis_ids):
        raise HTTPException(status_code=422, detail="Select between 2 and 10 distinct analyses to compare.")
    items = db.scalars(select(Analysis).where(Analysis.owner_id == user.id, Analysis.id.in_(analysis_ids))).all()
    if len(items) != len(analysis_ids):
        raise HTTPException(status_code=404, detail="One or more analyses were not found in your account.")
    ordered = {item.id: item for item in items}
    return {"analyses": [{**_summary(ordered[analysis_id]), "result": ordered[analysis_id].result_json} for analysis_id in analysis_ids]}


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(analysis_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    item = db.scalar(select(Analysis).where(Analysis.id == analysis_id, Analysis.owner_id == user.id))
    if item is None:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    db.delete(item)
    db.commit()
