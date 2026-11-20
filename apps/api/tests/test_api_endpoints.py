import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.state import app_state
from app.db.session import get_db

client = TestClient(app)


def test_health_endpoint():
    app_state.status = "siap"
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ["memuat", "siap"]


def test_version_endpoint():
    response = client.get("/api/versi")
    assert response.status_code == 200
    assert response.json() == {"versi_kontrak": "1.2"}


def test_openapi_schema():
    response = client.get("/api/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    assert spec["info"]["version"] == "1.2"
    assert "/api/health" in spec["paths"]
    assert "/api/versi" in spec["paths"]
    assert "/api/aset" in spec["paths"]
    assert "/api/aset/{kode_aset}" in spec["paths"]
    assert "/api/aset/{kode_aset}/dampak" in spec["paths"]
    assert "/api/rekap/saluran" in spec["paths"]
    assert "/api/prioritas" in spec["paths"]
    assert "/api/kualitas-data" in spec["paths"]
    assert "/api/impor/susulan" in spec["paths"]


def test_not_found_error_format():
    # Mock db session returning None for unknown asset
    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_filter = MagicMock()
    mock_filter.first.return_value = None
    mock_query.filter.return_value = mock_filter
    mock_db.query.return_value = mock_query

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        response = client.get("/api/aset/UNKNOWN-CODE-99999")
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "code" in data["error"]
        assert "message" in data["error"]
        assert data["error"]["code"] == "NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_prioritas_invalid_limit_error_format():
    response = client.get("/api/prioritas?limit=0")
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]
    assert data["error"]["code"] == "BAD_REQUEST"

