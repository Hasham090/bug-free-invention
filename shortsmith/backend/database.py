from sqlmodel import SQLModel, create_engine, Session
from pathlib import Path

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        db_path = Path("data/shortsmith.db")
        db_path.parent.mkdir(parents=True, exist_ok=True)
        _engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False},
        )
        SQLModel.metadata.create_all(_engine)
    return _engine


def get_session():
    with Session(get_engine()) as session:
        yield session
