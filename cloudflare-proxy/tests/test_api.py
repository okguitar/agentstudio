"""API endpoint tests"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


# Setup test database
Base.metadata.create_all(bind=engine)
app.dependency_overrides[get_db] = override_get_db

# Test client
client = TestClient(app)

# Test API key (must match .env configuration)
TEST_API_KEY = "test-key-12345"


def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "Cloudflare Subdomain Proxy"


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_missing_api_key():
    """Test API endpoints without API key"""
    response = client.post("/api/subdomain/create", json={"localPort": 4936})
    assert response.status_code == 401


def test_invalid_api_key():
    """Test API endpoints with invalid API key"""
    response = client.post(
        "/api/subdomain/create",
        json={"localPort": 4936},
        headers={"X-API-Key": "invalid-key"}
    )
    assert response.status_code == 403


def test_check_subdomain_availability():
    """Test subdomain availability check"""
    response = client.get(
        "/api/subdomain/check/test-subdomain",
        headers={"X-API-Key": TEST_API_KEY}
    )
    assert response.status_code == 200
    data = response.json()
    assert "subdomain" in data
    assert "available" in data


def test_list_subdomains():
    """Test listing subdomains"""
    response = client.get(
        "/api/subdomain/list",
        headers={"X-API-Key": TEST_API_KEY}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "subdomains" in data


# Note: Full integration tests with Cloudflare API require valid credentials
# and should be run separately in a staging environment
