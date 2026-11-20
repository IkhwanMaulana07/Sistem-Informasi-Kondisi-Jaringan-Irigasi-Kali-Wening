from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    APP_ENV: str = "development"
    API_CONTRACT_VERSION: str = "1.2"
    DATABASE_URL: str = "postgresql+psycopg://irigasi:irigasi@db:5432/irigasi"
    DATA_DIR: str = "/app/data"
    INITIAL_ASSET_FILE: str = "aset_bangunan.csv"
    INITIAL_REPORT_FILE: str = "laporan_penelusuran.xlsx"
    CANAL_FILE: str = "saluran.geojson"
    PLOT_FILE: str = "petak_tersier.geojson"
    SUPPLEMENTAL_REPORT_FILE: str = "laporan_susulan.xlsx"
    WEB_ORIGIN: str = "http://localhost:8080"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
