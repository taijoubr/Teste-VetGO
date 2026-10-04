import os
import shutil
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

db_url = settings.DATABASE_URL
# In Vercel / serverless environment, current directory is read-only.
# We must use /tmp/ for SQLite file.
if db_url.startswith("sqlite") and (os.getenv("VERCEL") or not os.access(".", os.W_OK)):
    tmp_db_path = "/tmp/vetgo.db"
    source_db = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "vetgo.db")
    if os.path.exists(source_db) and not os.path.exists(tmp_db_path):
        try:
            shutil.copy2(source_db, tmp_db_path)
        except Exception as e:
            print(f"Error copying DB to /tmp: {e}")
    db_url = f"sqlite:///{tmp_db_path}"

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

# Enable foreign keys for SQLite
if db_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

_db_initialized = False

def ensure_db_initialized():
    global _db_initialized
    if not _db_initialized:
        try:
            Base.metadata.create_all(bind=engine)
            from app.database.seed import init_db
            temp_session = SessionLocal()
            try:
                init_db(temp_session)
            finally:
                temp_session.close()
            _db_initialized = True
        except Exception as e:
            print(f"Warning initializing DB: {e}")

def get_db():
    ensure_db_initialized()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

