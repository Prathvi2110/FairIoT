from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.database.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    datasets: Mapped[list["Dataset"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    reset_tokens: Mapped[list["PasswordReset"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    owner: Mapped[User] = relationship(back_populates="reset_tokens")


class Dataset(Base):
    __tablename__ = "datasets"
    __table_args__ = (UniqueConstraint("owner_id", "name", name="uq_dataset_owner_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_format: Mapped[str] = mapped_column(String(12), nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False)
    columns: Mapped[list[dict]] = mapped_column(JSON, nullable=False)
    preview_rows: Mapped[list[dict]] = mapped_column(JSON, nullable=False)
    missing_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duplicate_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    original_file: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    owner: Mapped[User] = relationship(back_populates="datasets")
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), index=True)
    module: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    group_column: Mapped[str] = mapped_column(String(180), nullable=False)
    metric_column: Mapped[str] = mapped_column(String(180), nullable=False)
    direction: Mapped[str] = mapped_column(String(20), nullable=False)
    threshold_percent: Mapped[float] = mapped_column(nullable=False)
    minimum_group_size: Mapped[int] = mapped_column(Integer, nullable=False)
    context_column: Mapped[str | None] = mapped_column(String(180), nullable=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    result_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    owner: Mapped[User] = relationship(back_populates="analyses")
    dataset: Mapped[Dataset] = relationship(back_populates="analyses")
    reports: Mapped[list["Report"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (UniqueConstraint("analysis_id", "format", name="uq_report_analysis_format"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True)
    format: Mapped[str] = mapped_column(String(8), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    analysis: Mapped[Analysis] = relationship(back_populates="reports")
