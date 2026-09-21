"""Automated endpoint tests for MoiDoctar FastAPI backend."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"
    print("[PASS] /health passed")


def test_auth_and_user_flow():
    # 1. Sign in
    res = client.post(
        "/api/v1/auth/manualAuthentication",
        json={"type": "SIGNIN_MANUALLY", "email": "alex.morgan@moidoctar.com", "password": "Password123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "authorization" in data
    token = data["authorization"]
    print("[PASS] /api/v1/auth/manualAuthentication passed")

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get profile
    res_user = client.get("/api/v1/user/listData", headers=headers)
    assert res_user.status_code == 200
    user_data = res_user.json()["data"]
    assert user_data["email"] == "alex.morgan@moidoctar.com"
    print("[PASS] /api/v1/user/listData passed")

    # 3. Update profile
    res_update = client.put(
        "/api/v1/user/updateProfile",
        headers=headers,
        json={"userName": "Alex Morgan Updated", "phone": "+1 555 999 8888"},
    )
    assert res_update.status_code == 200
    assert res_update.json()["data"]["userName"] == "Alex Morgan Updated"
    print("[PASS] /api/v1/user/updateProfile passed")


def test_medications():
    res = client.get("/api/v1/medication")
    assert res.status_code == 200
    assert "data" in res.json()
    print("[PASS] GET /api/v1/medication passed")

    res_add = client.post(
        "/api/v1/medication/create",
        json={"name": "Amoxicillin", "dosage": "500mg", "time": "09:00 AM", "frequent": "morning", "supply": "20"},
    )
    assert res_add.status_code == 200
    meds = res_add.json()["data"]
    assert any(m["name"] == "Amoxicillin" for m in meds)
    print("[PASS] POST /api/v1/medication/create passed")


def test_triage():
    # Form data for /api/v1/triage/chat
    res = client.post(
        "/api/v1/triage/chat",
        data={"symptoms": "Severe chest pain and shortness of breath", "messages": "[]"},
    )
    assert res.status_code == 200
    assessment = res.json()
    assert assessment["urgency_level"] == "Urgent"
    assert "assessment_id" in assessment
    assert len(assessment["recommended_actions"]) > 0
    print("[PASS] POST /api/v1/triage/chat passed (Emergency case detected)")

    # Cache stats
    res_cache = client.get("/api/v1/cache/stats")
    assert res_cache.status_code == 200
    assert "hits" in res_cache.json()
    print("[PASS] GET /api/v1/cache/stats passed")


if __name__ == "__main__":
    print("\nRunning backend test suite...")
    test_health()
    test_auth_and_user_flow()
    test_medications()
    test_triage()
    print("\nALL BACKEND ENDPOINT TESTS PASSED SUCCESSFULLY!\n")
