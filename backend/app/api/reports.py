import csv
from io import BytesIO, StringIO
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.entities import Analysis, Report, User
from app.utils.csv import safe_csv_cell

router = APIRouter(prefix="/reports", tags=["reports"])


def _analysis(db: Session, analysis_id: int, user: User) -> Analysis:
    item = db.scalar(select(Analysis).where(Analysis.id == analysis_id, Analysis.owner_id == user.id))
    if item is None:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return item


def _csv_bytes(item: Analysis) -> bytes:
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["FairIoT analysis report — computed descriptive results"])
    writer.writerow(["Module", item.module, "Dataset", safe_csv_cell(item.dataset.name)])
    writer.writerow(["Metric", safe_csv_cell(item.metric_column), "Group column", safe_csv_cell(item.group_column)])
    writer.writerow(["Direction", item.direction, "Status", item.result_json["status_label"]])
    writer.writerow(["Relative gap (%)", item.result_json.get("relative_gap_percent"), "Threshold (%)", item.threshold_percent])
    writer.writerow(["Caveat", item.result_json.get("caveat", "")])
    writer.writerow([])
    writer.writerow(["Group", "Sample size", "Mean", "Median", "Minimum", "Maximum", "Std dev", "Approx. 95% CI low", "Approx. 95% CI high", "Context-standardized mean"])
    for group in item.result_json.get("groups", []):
        values = [safe_csv_cell(group.get("group")), group.get("sample_size"), group.get("mean"), group.get("median"), group.get("minimum"), group.get("maximum"), group.get("std_dev")]
        ci = group.get("confidence_interval_95") or [None, None]
        values += [ci[0], ci[1], group.get("context_standardized_mean")]
        writer.writerow(values)
    writer.writerow([])
    writer.writerow(["Interpretation", item.result_json.get("explanation", "")])
    context = item.result_json.get("context_adjustment", {})
    writer.writerow(["Context comparison", context.get("note", "No context adjustment was requested.")])
    return output.getvalue().encode("utf-8-sig")


def _pdf_bytes(item: Analysis) -> bytes:
    buffer = BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=38, leftMargin=38, topMargin=40, bottomMargin=36)
    styles = getSampleStyleSheet()
    dataset_name = escape(item.dataset.name)
    metric_name = escape(item.metric_column)
    group_name = escape(item.group_column)
    story = [
        Paragraph("FairIoT fairness analysis", styles["Title"]),
        Paragraph("Computed descriptive comparison — not a finding of discrimination or cause.", styles["BodyText"]),
        Spacer(1, 12),
        Paragraph(f"<b>Dataset:</b> {dataset_name} &nbsp; <b>Module:</b> {escape(item.module.replace('_', ' ').title())}", styles["BodyText"]),
        Paragraph(f"<b>Metric:</b> {metric_name} &nbsp; <b>Group:</b> {group_name} &nbsp; <b>Direction:</b> {escape(item.direction)}-is-better", styles["BodyText"]),
        Paragraph(f"<b>Status:</b> {escape(item.result_json['status_label'])} &nbsp; <b>Gap:</b> {item.result_json.get('relative_gap_percent', 0):.2f}% &nbsp; <b>Threshold:</b> {item.threshold_percent:.2f}%", styles["BodyText"]),
        Spacer(1, 12),
    ]
    data = [["Group", "n", "Mean", "Median", "Min", "Max", "Std dev"]]
    for group in item.result_json.get("groups", []):
        data.append([
            str(group["group"])[:24], str(group["sample_size"]),
            f"{group['mean']:.3f}", f"{group['median']:.3f}",
            f"{group['minimum']:.3f}", f"{group['maximum']:.3f}",
            "—" if group["std_dev"] is None else f"{group['std_dev']:.3f}",
        ])
    table = Table(data, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#102A43")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9E6EE")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#EFF7FB")]),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("PAD", (0, 0), (-1, -1), 5),
    ]))
    story.extend([table, Spacer(1, 12), Paragraph("<b>Explanation</b>", styles["Heading2"]), Paragraph(escape(item.result_json.get("explanation", "")), styles["BodyText"]), Spacer(1, 8)])
    context = item.result_json.get("context_adjustment", {})
    story.extend([Paragraph("<b>Context handling</b>", styles["Heading2"]), Paragraph(escape(context.get("note", "No context adjustment was requested.")), styles["BodyText"]), Spacer(1, 8), Paragraph(escape(item.result_json.get("caveat", "")), styles["Italic"])])
    document.build(story)
    return buffer.getvalue()


def _get_report(db: Session, item: Analysis, format_name: str) -> Report:
    report = db.scalar(select(Report).where(Report.analysis_id == item.id, Report.format == format_name))
    if report is not None:
        return report
    if format_name == "csv":
        content, media_type = _csv_bytes(item), "text/csv; charset=utf-8"
    else:
        content, media_type = _pdf_bytes(item), "application/pdf"
    report = Report(analysis_id=item.id, format=format_name, content_type=media_type, content=content)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/{analysis_id}/csv")
def download_csv(analysis_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Response:
    report = _get_report(db, _analysis(db, analysis_id, user), "csv")
    return Response(report.content, media_type=report.content_type, headers={"Content-Disposition": f'attachment; filename="fairiot-analysis-{analysis_id}.csv"'})


@router.get("/{analysis_id}/pdf")
def download_pdf(analysis_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Response:
    report = _get_report(db, _analysis(db, analysis_id, user), "pdf")
    return Response(report.content, media_type=report.content_type, headers={"Content-Disposition": f'attachment; filename="fairiot-analysis-{analysis_id}.pdf"'})
