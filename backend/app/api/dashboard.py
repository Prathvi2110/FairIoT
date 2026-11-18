from collections import Counter, defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.entities import Analysis, Dataset, User
from app.schemas.dashboard import DashboardStats
from app.services.datasets import read_frame

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
DEVICE_ID_NAMES = {"device_id", "deviceid", "hardware_id", "hardwareid", "device_serial", "device_serial_number", "sensor_id", "actuator_id", "node_id"}


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    datasets = db.scalars(select(Dataset).where(Dataset.owner_id == user.id)).all()
    analyses = db.scalars(
        select(Analysis).options(joinedload(Analysis.dataset))
        .where(Analysis.owner_id == user.id)
        .order_by(Analysis.created_at.desc())
    ).all()
    statuses = Counter(item.status for item in analyses)
    modules = Counter(item.module for item in analyses)
    unique_groups = set()
    fallback_groups = set()
    by_day: dict[date, int] = defaultdict(int)
    analyzed_dataset_ids = {item.dataset_id for item in analyses}
    for item in analyses:
        for group in item.result_json.get("groups", []):
            key = (item.dataset_id, item.group_column, group.get("group"))
            unique_groups.add(key)
            fallback_groups.add(key)
        by_day[item.created_at.date()] += 1

    device_keys = set()
    id_column_dataset_ids = set()
    dataset_by_id = {dataset.id: dataset for dataset in datasets}
    for dataset_id in analyzed_dataset_ids:
        dataset = dataset_by_id.get(dataset_id)
        if dataset is None:
            continue
        column_lookup = {str(column["name"]).strip().lower().replace(" ", "_"): str(column["name"]) for column in dataset.columns}
        id_column = next((column_lookup[name] for name in DEVICE_ID_NAMES if name in column_lookup), None)
        if id_column is None:
            continue
        id_column_dataset_ids.add(dataset_id)
        frame = read_frame(dataset.original_file, dataset.filename)
        device_keys.update((dataset_id, str(value)) for value in frame[id_column].dropna().unique())
    fallback_count = len({key for key in fallback_groups if key[0] not in id_column_dataset_ids})
    device_count = len(device_keys) + fallback_count
    if id_column_dataset_ids:
        basis = "Unique device IDs where available; compared groups otherwise"
    else:
        basis = "Distinct compared group values; no device ID column found"

    last_days = [date.today() - timedelta(days=offset) for offset in range(13, -1, -1)]
    return {
        "devices_analyzed": device_count,
        "devices_basis": basis,
        "datasets_uploaded": len(datasets),
        "groups_compared": len(unique_groups),
        "potential_disparities": statuses.get("potential_disparity", 0),
        "status_distribution": {
            "fair_under_test": statuses.get("fair_under_test", 0),
            "potential_disparity": statuses.get("potential_disparity", 0),
            "insufficient_data": statuses.get("insufficient_data", 0),
        },
        "module_distribution": dict(modules),
        "recent_analyses": [
            {
                "id": item.id,
                "dataset_name": item.dataset.name,
                "module": item.module,
                "metric_column": item.metric_column,
                "status": item.status,
                "created_at": item.created_at.isoformat(),
                "relative_gap_percent": item.result_json.get("relative_gap_percent"),
            }
            for item in analyses[:6]
        ],
        "trend": [{"date": day.isoformat(), "analyses": by_day.get(day, 0)} for day in last_days],
    }
