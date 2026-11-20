import os
import time
import sys
from sqlalchemy import create_engine, text

def wait_for_database(max_retries=30, delay_seconds=2):
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("[wait_for_db] DATABASE_URL not set, skipping wait.")
        return

    print(f"[wait_for_db] Waiting for database connection...")
    engine = create_engine(db_url, pool_pre_ping=True)

    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                print(f"[wait_for_db] Database connection successful on attempt {attempt}!")
                return
        except Exception as e:
            print(f"[wait_for_db] Attempt {attempt}/{max_retries} failed: {e}. Retrying in {delay_seconds}s...")
            time.sleep(delay_seconds)

    print(f"[wait_for_db] ERROR: Could not connect to database after {max_retries} attempts.")
    sys.exit(1)

if __name__ == "__main__":
    wait_for_database()
